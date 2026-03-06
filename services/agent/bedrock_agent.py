"""
Portal-specific drivers for different government schemes.
All drivers point to REAL, LIVE government portals - no mock URLs.
The visual navigator uses screenshot-based Claude vision to interact
with these portals, making it resilient to any DOM/UI changes.
"""
from typing import Dict, Any
from shared.schemas import SchemeType
from shared.logging_config import logger


class PortalDriver:
    """Base class for portal-specific drivers"""

    def __init__(self, scheme: SchemeType):
        self.scheme = scheme

    def get_url(self) -> str:
        """Get the live government portal URL"""
        raise NotImplementedError

    def get_workflow(self) -> list[str]:
        """Get expected workflow steps for the LLM to follow"""
        raise NotImplementedError

    def get_vision_context(self) -> str:
        """
        Returns a rich text description of the portal to help the
        vision model understand what it's looking at.
        """
        return ""

    def get_session_state(self) -> dict:
        """Get current session state for caching"""
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# PM-KISAN
# ─────────────────────────────────────────────────────────────────────────────
class PMKisanDriver(PortalDriver):
    """
    Driver for PM-KISAN portal — Pradhan Mantri Kisan Samman Nidhi
    Direct URL to Beneficiary Status (no CAPTCHA on status page)
    """

    LIVE_URL = "https://pmkisan.gov.in/BeneficiaryStatus_New.aspx"

    def __init__(self):
        super().__init__(SchemeType.PM_KISAN)

    def get_url(self) -> str:
        return self.LIVE_URL

    def get_workflow(self) -> list[str]:
        return [
            "1. Page loads: pmkisan.gov.in/BeneficiaryStatus_New.aspx",
            "2. Look for a dropdown or radio button to select search type (Mobile No / Aadhaar / Registration No)",
            "3. Select 'Registration No' or 'Aadhaar No' option based on available form_data",
            "4. Enter the value in the input field",
            "5. If a 'Get Data' or 'Search' button is visible, click it",
            "6. Extract the beneficiary name, payment status, installment details from the result table",
            "7. Return 'complete' action with extracted data",
        ]

    def get_vision_context(self) -> str:
        return """
        This is the PM-KISAN Beneficiary Status page on pmkisan.gov.in.
        The page has:
        - A dropdown or radio button group to select: "Registration No", "Aadhaar No", or "Mobile No"
        - A text input field where you enter the selected identifier
        - A "Get Data" button (orange or green) to submit the query
        - A result section showing beneficiary name, bank account info, and installment payment history
        
        Key: If you see a CAPTCHA, solve it using the vision capability.
        If page requires scrolling, scroll down to see the result table.
        """


# ─────────────────────────────────────────────────────────────────────────────
# e-Shram
# ─────────────────────────────────────────────────────────────────────────────
class EShramDriver(PortalDriver):
    """
    Driver for e-Shram portal — National Database of Unorganised Workers
    Supports self-registration with Aadhaar OTP
    """

    LIVE_URL = "https://eshram.gov.in/home"
    REGISTER_URL = "https://eshram.gov.in/register"

    def __init__(self):
        super().__init__(SchemeType.E_SHRAM)

    def get_url(self) -> str:
        return self.REGISTER_URL

    def get_workflow(self) -> list[str]:
        return [
            "1. Page loads: eshram.gov.in registration page",
            "2. Look for 'Self Registration' or 'Register on e-Shram' section",
            "3. Find the Aadhaar Number input field — enter citizen's Aadhaar",
            "4. Enter mobile number in the next field",
            "5. Check/tick the EPFO and ESIC consent checkboxes if visible",
            "6. Click 'Send OTP' button to request OTP to registered mobile",
            "7. If form_data contains OTP, enter it; otherwise mark step as needing_otp",
            "8. After OTP verified, fill personal details: name, DOB, gender, address",
            "9. Select 'Nature of Work' from dropdown (e.g., Construction, Agriculture)",
            "10. Upload Aadhaar or bank passbook if upload button visible",
            "11. Click Submit and capture the UAN (Universal Account Number) displayed",
            "12. Return 'complete' with reference_number = the UAN shown on screen",
        ]

    def get_vision_context(self) -> str:
        return """
        This is the e-Shram self-registration portal (eshram.gov.in).
        Key elements to look for:
        - Aadhaar Number text field (12 digits)
        - Mobile Number field
        - EPFO/ESIC member checkboxes (both should be checked NO for unorganised workers)
        - 'Send OTP' button
        - OTP verification field
        - Personal info fields: Name, DOB, Gender, Category
        - Bank account details section
        - Submit button
        - After submission: UAN card displayed (blue card with 12-digit UAN)
        """


# ─────────────────────────────────────────────────────────────────────────────
# EPFO / PF Status
# ─────────────────────────────────────────────────────────────────────────────
class EPFODriver(PortalDriver):
    """
    Driver for EPFO passbook / PF balance check
    Uses the UMANG App portal (unified) or direct EPFO member portal
    """

    LIVE_URL = "https://passbook.epfindia.gov.in/MemberPassBook/Login"

    def __init__(self):
        super().__init__(SchemeType.EPFO)

    def get_url(self) -> str:
        return self.LIVE_URL

    def get_workflow(self) -> list[str]:
        return [
            "1. Page loads: EPFO Member Passbook Portal (passbook.epfindia.gov.in)",
            "2. Find UAN (Universal Account Number) input field — enter 12-digit UAN",
            "3. Find Password field — enter password (from form_data if provided)",
            "4. Solve the CAPTCHA visible on page",
            "5. Click 'Login' button",
            "6. After login, navigate to 'View Passbook' or 'Balance' section",
            "7. Extract: current PF balance, employer name, last credited month",
            "8. Return 'complete' with extracted PF balance details",
        ]

    def get_vision_context(self) -> str:
        return """
        This is EPFO Member Passbook portal.
        Look for:
        - UAN Number input field
        - Password input field
        - CAPTCHA image with distorted characters
        - CAPTCHA input field
        - Login/Submit button
        - After login: Member ID, Name, PF balance, monthly credits table
        """


# ─────────────────────────────────────────────────────────────────────────────
# Widow Pension / State Pension Schemes
# ─────────────────────────────────────────────────────────────────────────────
class WidowPensionDriver(PortalDriver):
    """
    Driver for National Social Assistance Programme (NSAP)
    Covers widow pension (IGNOAPS / IGNWPS) application status check
    """

    LIVE_URL = "https://nsap.nic.in/nsap/faces/content/reportSearch.xhtml"

    def __init__(self):
        super().__init__(SchemeType.WIDOW_PENSION)

    def get_url(self) -> str:
        return self.LIVE_URL

    def get_workflow(self) -> list[str]:
        return [
            "1. Page loads: NSAP beneficiary search portal (nsap.nic.in)",
            "2. Find the State dropdown — select the citizen's state",
            "3. Find Scheme Type — select 'IGNOAPS' (elderly) or 'IGNWPS' (widow)",
            "4. Enter Sanction Order No or Aadhaar number in the search field",
            "5. Click Search or Submit button",
            "6. Extract: beneficiary name, pension amount, last payment date, bank details",
            "7. Return 'complete' with extracted pension status",
        ]

    def get_vision_context(self) -> str:
        return """
        This is the NSAP (National Social Assistance Programme) search portal.
        Look for:
        - State selection dropdown
        - Scheme dropdown (IGNOAPS, IGNWPS, NFBS etc.)
        - Search input for beneficiary ID or Aadhaar
        - Submit/Search button
        - Results table showing pension status, amounts, payment dates
        """


# ─────────────────────────────────────────────────────────────────────────────
# Ayushman Bharat (PMJAY)
# ─────────────────────────────────────────────────────────────────────────────
class AyushmanBharatDriver(PortalDriver):
    """
    Driver for Ayushman Bharat PM-JAY eligibility check
    """

    LIVE_URL = "https://pmjay.gov.in/am-i-eligible"

    def __init__(self):
        super().__init__(SchemeType.AYUSHMAN_BHARAT)

    def get_url(self) -> str:
        return self.LIVE_URL

    def get_workflow(self) -> list[str]:
        return [
            "1. Page loads: PM-JAY eligibility checker (pmjay.gov.in/am-i-eligible)",
            "2. Select state from dropdown",
            "3. Choose search type: Mobile, Ration Card, or RSBY URN",
            "4. Enter the value in the input field",
            "5. Enter CAPTCHA if present",
            "6. Click Search button",
            "7. Extract eligibility status: Eligible/Not Eligible, family details, card number",
            "8. Return 'complete' with eligibility information",
        ]

    def get_vision_context(self) -> str:
        return """
        This is the Ayushman Bharat PM-JAY eligibility checker.
        Look for:
        - State/UT dropdown
        - Search category buttons (Mobile number, Ration card, etc.)
        - Text input field
        - CAPTCHA image and input
        - Search button
        - Results: Green 'Eligible' panel or Red 'Not Eligible' panel
        """


# ─────────────────────────────────────────────────────────────────────────────
# Ration Card / PDS
# ─────────────────────────────────────────────────────────────────────────────
class RationCardDriver(PortalDriver):
    """
    Driver for NFSA (National Food Security Act) Ration Card portal.
    Covers ration card eligibility, status, and beneficiary lookup.
    """

    LIVE_URL = "https://nfsa.gov.in/portal/ration_card_state_portals_aa"

    def __init__(self):
        super().__init__(SchemeType.RATION_CARD)

    def get_url(self) -> str:
        return self.LIVE_URL

    def get_workflow(self) -> list[str]:
        return [
            "1. Page loads: NFSA ration card state portals page (nfsa.gov.in)",
            "2. Identify the citizen's state from form_data",
            "3. Click the state link/button to open state-specific ration card portal",
            "4. Find beneficiary search field — enter Aadhaar number or ration card number",
            "5. Click Search or Submit button",
            "6. Extract: ration card number, category (APL/BPL/AAY), family head name, members, entitlement",
            "7. Return 'complete' with extracted ration card details",
        ]

    def get_vision_context(self) -> str:
        return """
        This is the NFSA Ration Card portal (nfsa.gov.in).
        Look for:
        - State-wise links or dropdown (click the citizen's state)
        - After navigating to state portal: Aadhaar or RC number input field
        - Search/Submit button
        - Results showing: RC number, holder name, category (APL/BPL/AAY),
          number of units (kg of grain), member list
        """


# ─────────────────────────────────────────────────────────────────────────────
# Controller
# ─────────────────────────────────────────────────────────────────────────────
class BedrockAgentController:
    """Routes tasks to the correct live portal driver"""

    def __init__(self):
        self.drivers = {
            SchemeType.PM_KISAN:        PMKisanDriver(),
            SchemeType.E_SHRAM:         EShramDriver(),
            SchemeType.EPFO:            EPFODriver(),
            SchemeType.WIDOW_PENSION:   WidowPensionDriver(),
            SchemeType.AYUSHMAN_BHARAT: AyushmanBharatDriver(),
            SchemeType.RATION_CARD:     RationCardDriver(),
        }
        logger.info(
            f"BedrockAgentController initialized with {len(self.drivers)} "
            f"LIVE portal drivers: {list(self.drivers.keys())}"
        )

    async def get_driver(self, scheme) -> PortalDriver:
        """Get live portal driver for the scheme"""
        driver = self.drivers.get(scheme)
        if not driver:
            # If no specific driver, fall back to PM-KISAN as demo
            logger.warning(
                f"No driver for scheme '{scheme}', "
                f"available: {list(self.drivers.keys())}"
            )
            raise ValueError(
                f"Unsupported scheme: '{scheme}'. "
                f"Available: {list(self.drivers.keys())}"
            )
        logger.info(f"Using LIVE driver for {scheme} → {driver.get_url()}")
        return driver
