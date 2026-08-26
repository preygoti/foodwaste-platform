import os
import json
import urllib.request
import urllib.error
import logging
from typing import Tuple, Optional

logger = logging.getLogger("uvicorn")


def send_otp_email(to_email: str, otp_code: str) -> Tuple[bool, Optional[str]]:
    """
    Dispatches a secure 6-digit OTP email for password reset via the Resend HTTP API.
    - Uses RESEND_API_KEY and EMAILS_FROM environment variables.
    - Returns (True, None) on success.
    - Returns (False, error_message) on delivery failure.
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
            logger.error("RESEND_API_KEY is not configured in production environment.")
            return False, "Email service not configured (missing RESEND_API_KEY in Render environment)"

        logger.info(f"Local dev mode: OTP verification code for {to_email} generated: {otp_code}")
        return True, None

    # Call Resend HTTPS REST API
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
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            status_code = resp.getcode()
            resp_body = resp.read().decode("utf-8")
            if status_code in (200, 201):
                logger.info(f"Password reset OTP successfully sent to {to_email} via Resend API: {resp_body}")
                return True, None
            else:
                logger.error(f"Resend API returned non-200 status {status_code}: {resp_body}")
                return False, f"Resend API error (status {status_code})"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        logger.error(f"Resend HTTPError {e.code}: {err_body}")
        try:
            err_json = json.loads(err_body)
            err_detail = err_json.get("message") or err_json.get("error") or err_body
        except Exception:
            err_detail = err_body
        return False, f"Email delivery failed: {err_detail}"
    except Exception as e:
        logger.error(f"Failed to call Resend API: {e}")
        return False, f"Email service unreachable: {str(e)}"
