"""
Redis client wrapper for job queue and caching
Used by all services for async communication
"""
import redis.asyncio as redis
from typing import Optional, Any
import json
from shared.config import get_settings
from shared.logging_config import logger

settings = get_settings()


class RedisClient:
    """Async Redis client wrapper"""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._memory_fallback = {}
    
    async def connect(self):
        """Establish Redis connection"""
        try:
            self.client = await redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self.client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis not available, falling back to in-memory storage: {str(e)}")
            self.client = None
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            logger.info("Redis connection closed")
    
    async def set_json(self, key: str, value: Any, expire: Optional[int] = None):
        """Store JSON-serializable value"""
        json_str = json.dumps(value)
        if self.client:
            try:
                await self.client.set(key, json_str, ex=expire)
                return
            except Exception:
                pass
        self._memory_fallback[key] = json_str
    
    async def get_json(self, key: str) -> Optional[Any]:
        """Retrieve JSON value"""
        if self.client:
            try:
                value = await self.client.get(key)
                if value:
                    return json.loads(value)
            except Exception:
                pass
                
        if key in self._memory_fallback:
            return json.loads(self._memory_fallback[key])
        return None
    
    async def publish(self, channel: str, message: dict):
        """Publish message to channel"""
        if self.client:
            try:
                await self.client.publish(channel, json.dumps(message))
            except Exception:
                pass
    
    async def enqueue_job(self, queue_name: str, job_data: dict):
        """Add job to queue"""
        if self.client:
            try:
                await self.client.rpush(queue_name, json.dumps(job_data))
                logger.info(f"Job enqueued to {queue_name}", job_id=job_data.get("job_id"))
                return
            except Exception:
                pass
        
        # In-memory List fallback
        if queue_name not in self._memory_fallback:
            self._memory_fallback[queue_name] = []
        self._memory_fallback[queue_name].append(json.dumps(job_data))
        logger.info(f"Job enqueued to in-memory {queue_name}", job_id=job_data.get("job_id"))
    
    async def dequeue_job(self, queue_name: str, timeout: int = 5) -> Optional[dict]:
        """Pop job from queue (blocking)"""
        if self.client:
            try:
                result = await self.client.blpop(queue_name, timeout=timeout)
                if result:
                    _, job_json = result
                    return json.loads(job_json)
            except Exception:
                pass
                
        # In-memory List fallback
        if queue_name in self._memory_fallback and len(self._memory_fallback[queue_name]) > 0:
            job_json = self._memory_fallback[queue_name].pop(0)
            return json.loads(job_json)
        return None


# Global instance
redis_client = RedisClient()


async def get_redis() -> RedisClient:
    """Dependency injection for FastAPI"""
    if not redis_client.client:
        await redis_client.connect()
    return redis_client
