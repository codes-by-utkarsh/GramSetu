"""
Visual web navigator using multimodal LLM
Navigates websites by "seeing" the screen, not parsing DOM
Uses AWS Bedrock (Claude) for vision - no separate Anthropic API key needed
"""
from playwright.async_api import async_playwright, Page, Browser
from typing import Optional, Dict, Any, List
import base64
import io
from PIL import Image
import json
import os
import asyncio
from pathlib import Path

from shared.config import get_settings
from shared.schemas import AgentTask, AgentResult, JobStatus
from shared.logging_config import logger

settings = get_settings()


class VisualNavigator:
    """
    The "Ghost in the Machine"
    Navigates websites using visual understanding, not DOM selectors
    """
    
    VISION_PROMPT = """You are an expert web automation agent. You can see a screenshot of a webpage.

Your task: {task_description}

Analyze the screenshot and provide the NEXT action to take.

Available actions:
- click: Click an element (provide x, y coordinates)
- type: Type text into a field (provide x, y coordinates and text)
- scroll: Scroll the page (provide direction: up/down)
- wait: Wait for page to load
- extract: Extract text from a specific region
- complete: Task is complete (provide extracted data)

Respond ONLY with valid JSON:
{{
  "action": "click",
  "coordinates": {{"x": 450, "y": 300}},
  "text": "optional text to type",
  "reasoning": "why this action",
  "confidence": 0.95
}}

If you see a CAPTCHA, describe it and I'll solve it.
If you see an error or session timeout, indicate that."""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.playwright = None
        self._use_bedrock = False
        self._bedrock = None
        self._bedrock_model = settings.bedrock_model_id
        
        # Initialize AWS Bedrock client for Claude vision
        try:
            import boto3
            self._bedrock = boto3.client(
                'bedrock-runtime',
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )
            self._use_bedrock = True
            logger.info(f"Using AWS Bedrock ({self._bedrock_model}) for visual navigation")
        except Exception as e:
            self._use_bedrock = False
            logger.warning(f"AWS Bedrock not available for visual nav: {e}")
    
    async def initialize(self):
        """Start Playwright browser"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=settings.headless_browser,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ]
            )
            logger.info("Playwright browser initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            raise
    
    async def cleanup(self):
        """Close browser"""
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Browser cleaned up")
        except Exception as e:
            logger.warning(f"Browser cleanup warning: {e}")
    
    async def execute(
        self,
        driver: Any,
        task: AgentTask,
        session_state: Optional[Dict] = None
    ) -> AgentResult:
        """
        Execute task using visual navigation
        
        Args:
            driver: Portal-specific driver (has URL, expected flow)
            task: Task details
            session_state: Cached session cookies/state
        
        Returns:
            AgentResult with outcome
        """
        page = None
        steps_completed = []
        latest_screenshot = None
        
        try:
            # Create new page
            context = await self.browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()
            
            # Restore session if available
            if session_state and 'cookies' in session_state:
                await context.add_cookies(session_state['cookies'])
                logger.info("Session restored from cache")
            
            # Navigate to portal
            portal_url = driver.get_url()
            logger.info(f"Navigating to: {portal_url}")
            
            try:
                await page.goto(portal_url, wait_until='domcontentloaded', timeout=20000)
            except Exception as nav_err:
                logger.warning(f"Page load warning: {nav_err}")
            
            steps_completed.append(f"Navigated to {portal_url}")
            
            # Main execution loop
            max_steps = 20
            for step_num in range(max_steps):
                # Take screenshot
                screenshot_bytes = await page.screenshot(type="jpeg", quality=settings.screenshot_quality)
                
                # Save screenshot to disk for visualization
                screenshot_dir = Path("screenshots") / task.task_id
                screenshot_dir.mkdir(parents=True, exist_ok=True)
                screenshot_path = screenshot_dir / f"step_{step_num}.jpg"
                with open(screenshot_path, "wb") as f:
                    f.write(screenshot_bytes)
                
                # Get next action from vision model
                action = await self._get_next_action(
                    screenshot_bytes,
                    task_description=f"{task.action} for {task.scheme}",
                    form_data=task.form_data,
                    step_num=step_num
                )
                
                latest_screenshot = str(screenshot_path.absolute())
                logger.info(f"Step {step_num}: {action.get('action')} - {action.get('reasoning', '')} | Saved: {latest_screenshot}")
                
                # Execute action
                if action['action'] == 'complete':
                    # Task complete!
                    return AgentResult(
                        task_id=task.task_id,
                        status=JobStatus.COMPLETED,
                        result_data=action.get('extracted_data', {}),
                        acknowledgement_number=action.get('extracted_data', {}).get('reference_number'),
                        steps_completed=steps_completed,
                        screenshot_url=latest_screenshot
                    )
                
                elif action['action'] == 'click':
                    coords = action.get('coordinates', {})
                    x, y = coords.get('x', 640), coords.get('y', 360)
                    await page.mouse.click(x, y)
                    await page.wait_for_timeout(1000)
                    steps_completed.append(f"Clicked at ({x}, {y})")
                
                elif action['action'] == 'type':
                    coords = action.get('coordinates', {})
                    x, y = coords.get('x', 640), coords.get('y', 360)
                    text = action.get('text', '')
                    await page.mouse.click(x, y)
                    await page.keyboard.type(text, delay=50)  # Human-like typing
                    steps_completed.append(f"Typed: {text[:20]}...")
                
                elif action['action'] == 'scroll':
                    direction = action.get('direction', 'down')
                    await page.mouse.wheel(0, 300 if direction == 'down' else -300)
                    steps_completed.append(f"Scrolled {direction}")
                
                elif action['action'] == 'wait':
                    await page.wait_for_timeout(2000)
                    steps_completed.append("Waited for page load")
                
                elif action['action'] == 'solve_captcha':
                    # CAPTCHA detected
                    captcha_text = await self._solve_captcha(screenshot_bytes, action.get('captcha_region'))
                    if captcha_text:
                        # Type CAPTCHA
                        coords = action.get('coordinates', {})
                        x, y = coords.get('x', 640), coords.get('y', 360)
                        await page.mouse.click(x, y)
                        await page.keyboard.type(captcha_text)
                        steps_completed.append(f"Solved CAPTCHA: {captcha_text}")
                    else:
                        logger.warning("CAPTCHA solving failed")
                
                # Small delay between steps
                await asyncio.sleep(0.5)
            
            # Max steps reached
            return AgentResult(
                task_id=task.task_id,
                status=JobStatus.FAILED,
                error_message="Max steps reached without completion",
                steps_completed=steps_completed,
                screenshot_url=latest_screenshot
            )
            
        except Exception as e:
            logger.error(f"Visual navigation failed: {str(e)}", exc_info=True)
            return AgentResult(
                task_id=task.task_id,
                status=JobStatus.FAILED,
                error_message=str(e),
                steps_completed=steps_completed,
                screenshot_url=latest_screenshot
            )
        finally:
            if page:
                try:
                    await page.close()
                except Exception:
                    pass
    
    async def _call_vision_bedrock(self, image_base64: str, prompt: str, max_tokens: int = 500) -> str:
        """Call AWS Bedrock Claude with image"""
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        }
        
        # Use asyncio executor for boto3 sync call
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._bedrock.invoke_model(
                modelId=self._bedrock_model,
                body=json.dumps(payload)
            )
        )
        
        result = json.loads(response['body'].read())
        return result['content'][0]['text']
    
    async def _get_next_action(
        self,
        screenshot_bytes: bytes,
        task_description: str,
        form_data: Dict,
        step_num: int
    ) -> Dict[str, Any]:
        """
        Use multimodal LLM to determine next action
        """
        if not self._use_bedrock:
            # Fallback: simple rule-based navigation
            return {"action": "wait", "reasoning": "No vision model available, waiting..."}
        
        try:
            # Encode screenshot
            image_base64 = base64.b64encode(screenshot_bytes).decode()
            
            # Build prompt
            prompt = self.VISION_PROMPT.format(task_description=task_description)
            prompt += f"\n\nForm data to fill: {json.dumps(form_data)}"
            prompt += f"\n\nCurrent step: {step_num}"
            
            content = await self._call_vision_bedrock(image_base64, prompt, max_tokens=500)
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            action = json.loads(content)
            return action
            
        except json.JSONDecodeError as e:
            logger.warning(f"Vision model returned non-JSON: {e}")
            return {"action": "wait", "reasoning": "Could not parse vision response, waiting"}
        except Exception as e:
            logger.error(f"Vision model failed: {str(e)}")
            return {"action": "wait", "reasoning": f"Error: {str(e)}"}
    
    async def _solve_captcha(self, screenshot_bytes: bytes, region: Optional[Dict] = None) -> Optional[str]:
        """
        Solve CAPTCHA using vision model
        """
        if not self._use_bedrock:
            return None
            
        try:
            image_base64 = base64.b64encode(screenshot_bytes).decode()
            
            prompt = "You are a CAPTCHA solving assistant. Look at the image provided. Identify the CAPTCHA text or math problem within the image and provide ONLY the solved text or number as your response. Do not include any explanations or extra formatting. Just the final answer."
            
            if region:
                prompt += f" Focus on the region around coordinates (x:{region.get('x')}, y:{region.get('y')})."
            
            captcha_answer = await self._call_vision_bedrock(image_base64, prompt, max_tokens=20)
            captcha_answer = captcha_answer.strip()
            logger.info(f"CAPTCHA solved by vision: {captcha_answer}")
            return captcha_answer
            
        except Exception as e:
            logger.error(f"Failed to solve CAPTCHA: {str(e)}")
            return None
    
    async def _detect_error(self, screenshot_bytes: bytes) -> bool:
        """
        Detect if page shows an error
        """
        if not self._use_bedrock:
            return False
            
        try:
            image_base64 = base64.b64encode(screenshot_bytes).decode()
            
            prompt = "Analyze this page screenshot. Does it contain a prominent error message, access denied warning, or a critical failure notification (e.g. 500 error, 'service unavailable', red alert banner)? Respond with ONLY 'YES' or 'NO'."
            
            answer = await self._call_vision_bedrock(image_base64, prompt, max_tokens=10)
            has_error = "YES" in answer.upper()
            
            if has_error:
                logger.warning("Agent detected an error on the page via vision model.")
            return has_error
            
        except Exception as e:
            logger.error(f"Failed to detect error via vision: {str(e)}")
            return False
