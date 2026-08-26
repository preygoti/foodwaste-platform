import os
import logging
from typing import Tuple, Optional
import requests

logger = logging.getLogger("uvicorn")


def send_otp_email(to_email: str, otp_code: str) -> Tuple[bool, Optional[str]]:
    """
    Dispatches a secure 6-digit OTP email for password reset via the Resend HTTP API.
    - Uses RESEND_API_KEY and EMAILS_FROM environment variables.
    - Sends POST to https://api.resend.com/emails.
    - Returns (True, None) on success.
    - Returns (False, error_message) on failure.
    """
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get("EMAILS_FROM", "Harvest Ledger <onboarding@resend.dev>").strip()
    if not from_email:
        from_email = "Harvest Ledger <onboarding@resend.dev>"

    # HTML Email Template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fcfaf5; margin: 0; padding: 24px; color: #1f3a2e; }}
    .container {{ max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #ece1c8; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }}
    .brand {{ font-size: 24px; font-weight: 700; color: #1f3a2e; margin-bottom: 8px; font-style: italic; }}
    .badge {{ display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #c1442d; font-weight: 600; margin-bottom: 20px; }}
    .otp-box {{ background: #f4eee1; border: 1px dashed #2d5940; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2d5940; }}
    .footer {{ font-size: 12px; color: #1f3a2e88; margin-top: 24px; border-top: 1px solid #ece1c8; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Harvest Ledger</div>
    <div class="badge">Security &amp; Password Reset</div>
    <p>Hello,</p>
    <p>We received a request to reset the password for your Harvest Ledger account. Use the 6-digit verification code below to complete your reset:</p>
    <div class="otp-box">
      <div class="otp-code">{otp_code}</div>
    </div>
    <p>This code is strictly valid for <strong>10 minutes</strong>. If you did not initiate this request, please disregard this email and your account password will remain secure.</p>
    <div class="footer">
      &copy; Harvest Ledger &bull; AI-Powered Food Waste Management Platform
    </div>
  </div>
</body>
</html>"""

    # If RESEND_API_KEY is not configured:
    if not resend_api_key:
        database_url = os.environ.get("DATABASE_URL", "")
        is_production = database_url.startswith("postgres") or os.environ.get("RENDER")

        if is_production:
            logger.error("[Resend] Cannot dispatch email: RESEND_API_KEY is missing from Render environment variables.")
            return False, "Email service not configured (missing RESEND_API_KEY in Render environment)"

        logger.info(f"[Resend-Dev] Local mode: verification code generated successfully for recipient.")
        return True, None

    logger.info(f"[Resend] Dispatching email to {to_email} with sender '{from_email}'...")

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
        "User-Agent": "HarvestLedger/1.0",
    }
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": "Harvest Ledger — Your Password Reset Verification Code",
        "html": html_content,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        logger.info(f"[Resend] API response status code: {response.status_code}")

        if response.status_code in (200, 201):
            res_data = response.json()
            email_id = res_data.get("id", "unknown")
            logger.info(f"[Resend] Email successfully sent with ID '{email_id}' to {to_email}")
            return True, None
        else:
            err_text = response.text
            logger.error(f"[Resend] API failed with status {response.status_code}: {err_text}")
            try:
                err_data = response.json()
                err_msg = err_data.get("message") or err_data.get("error") or err_text
            except Exception:
                err_msg = err_text
            return False, f"Resend API error ({response.status_code}): {err_msg}"

    except requests.exceptions.RequestException as e:
        logger.error(f"[Resend] Request exception contacting api.resend.com: {e}")
        return False, f"Email service request failed: {str(e)}"
    except Exception as e:
        logger.error(f"[Resend] Unexpected error: {e}")
        return False, f"Unexpected email error: {str(e)}"
