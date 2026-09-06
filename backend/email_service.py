import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple, Optional
import requests

logger = logging.getLogger("uvicorn")


def _get_email_html(otp_code: str) -> str:
    """Returns a modern, responsive HTML email template for OTP verification."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Password Reset Code</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f7f4ed;
      margin: 0;
      padding: 24px;
      color: #1a3325;
      -webkit-font-smoothing: antialiased;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5dbc4;
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 4px 16px rgba(26, 51, 37, 0.04);
    }}
    .brand {{
      font-size: 26px;
      font-weight: 700;
      color: #1a3325;
      margin-bottom: 4px;
      font-style: italic;
      letter-spacing: -0.5px;
    }}
    .subtitle {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #c1442d;
      font-weight: 700;
      margin-bottom: 24px;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #2c4436;
      margin: 0 0 16px;
    }}
    .otp-card {{
      background: #fdfbf7;
      border: 2px dashed #2d5940;
      border-radius: 14px;
      padding: 22px 16px;
      text-align: center;
      margin: 28px 0;
    }}
    .otp-label {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #557261;
      font-weight: 600;
      margin-bottom: 8px;
    }}
    .otp-code {{
      font-family: 'Courier New', Courier, Consolas, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #1a3325;
      text-indent: 10px;
    }}
    .note {{
      font-size: 12px;
      color: #6a8274;
      background: #f4eee1;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 20px;
    }}
    .footer {{
      font-size: 11px;
      color: #8c9e93;
      margin-top: 28px;
      border-top: 1px solid #e5dbc4;
      padding-top: 18px;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Harvest Ledger</div>
    <div class="subtitle">Security &bull; Password Reset Verification</div>
    
    <p>Hello,</p>
    <p>We received a request to reset the password for your Harvest Ledger account. Please use the 6-digit verification code below to authorize this change:</p>
    
    <div class="otp-card">
      <div class="otp-label">Your Verification Code</div>
      <div class="otp-code">{otp_code}</div>
    </div>
    
    <div class="note">
      ⏱ <strong>Valid for 10 minutes.</strong> Never share this code with anyone.
    </div>
    
    <p>If you did not initiate this request, you can safely ignore this email. Your password will remain unchanged.</p>
    
    <div class="footer">
      &copy; Harvest Ledger &bull; AI-Powered Food Waste Management &amp; Redistribution Platform<br>
      This is an automated system email. Please do not reply directly.
    </div>
  </div>
</body>
</html>"""


def _send_via_smtp(to_email: str, otp_code: str) -> Tuple[bool, Optional[str]]:
    """
    Sends OTP email using standard SMTP (Gmail App Password, Outlook, Custom SMTP, etc.).
    Environment variables:
      - SMTP_HOST / EMAIL_HOST (default: smtp.gmail.com)
      - SMTP_PORT / EMAIL_PORT (default: 587)
      - SMTP_USER / EMAIL_HOST_USER
      - SMTP_PASSWORD / EMAIL_HOST_PASSWORD / SMTP_PASS
      - SMTP_FROM / EMAILS_FROM (default: Harvest Ledger <SMTP_USER>)
    """
    host = os.environ.get("SMTP_HOST") or os.environ.get("EMAIL_HOST") or "smtp.gmail.com"
    port_str = os.environ.get("SMTP_PORT") or os.environ.get("EMAIL_PORT") or "587"
    user = os.environ.get("SMTP_USER") or os.environ.get("EMAIL_HOST_USER") or os.environ.get("SMTP_EMAIL", "").strip()
    password = os.environ.get("SMTP_PASSWORD") or os.environ.get("EMAIL_HOST_PASSWORD") or os.environ.get("SMTP_PASS", "").strip()
    from_email = os.environ.get("SMTP_FROM") or os.environ.get("EMAILS_FROM") or f"Harvest Ledger <{user}>"

    if not user or not password:
        return False, "SMTP credentials missing (SMTP_USER or SMTP_PASSWORD not set)"

    try:
        port = int(port_str)
    except ValueError:
        port = 587

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Harvest Ledger: {otp_code} is your password reset code"
    msg["From"] = from_email
    msg["To"] = to_email

    plain_text = f"Hello,\n\nYour Harvest Ledger password reset code is: {otp_code}\n\nThis code expires in 10 minutes.\nIf you did not request this, please ignore this email."
    html_text = _get_email_html(otp_code)

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_text, "html"))

    try:
        logger.info(f"[SMTP] Connecting to {host}:{port} for {to_email}...")
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(user, password)
        server.sendmail(user, [to_email], msg.as_string())
        server.quit()
        logger.info(f"[SMTP] Verification OTP successfully sent to {to_email}")
        return True, None
    except Exception as e:
        logger.error(f"[SMTP] Error sending email via SMTP: {e}")
        return False, f"SMTP Error: {str(e)}"


def _send_via_resend(to_email: str, otp_code: str, resend_api_key: str) -> Tuple[bool, Optional[str]]:
    """Sends OTP email via the Resend HTTP API."""
    from_email = os.environ.get("EMAILS_FROM", "Harvest Ledger <onboarding@resend.dev>").strip()
    if not from_email:
        from_email = "Harvest Ledger <onboarding@resend.dev>"

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
        "User-Agent": "HarvestLedger/1.0",
    }
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": f"Harvest Ledger: {otp_code} is your password reset code",
        "html": _get_email_html(otp_code),
    }

    try:
        logger.info(f"[Resend] Dispatching email to {to_email} with sender '{from_email}'...")
        response = requests.post(url, json=payload, headers=headers, timeout=15)
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
    except Exception as e:
        logger.error(f"[Resend] Request exception: {e}")
        return False, f"Email service error: {str(e)}"


def send_otp_email(to_email: str, otp_code: str) -> Tuple[bool, Optional[str]]:
    """
    Dispatches a secure 6-digit OTP email for password reset.
    Supported backends:
      1. SMTP (e.g. Gmail App Password, Outlook, custom SMTP via SMTP_USER & SMTP_PASSWORD)
      2. Resend API (via RESEND_API_KEY)
      3. Local Development Mode (logs OTP to console and provides debug code if neither is configured)
    """
    # 1. Check for SMTP configuration (Gmail / Custom SMTP)
    smtp_user = os.environ.get("SMTP_USER") or os.environ.get("EMAIL_HOST_USER") or os.environ.get("SMTP_EMAIL", "").strip()
    smtp_pass = os.environ.get("SMTP_PASSWORD") or os.environ.get("EMAIL_HOST_PASSWORD") or os.environ.get("SMTP_PASS", "").strip()
    if smtp_user and smtp_pass:
        return _send_via_smtp(to_email, otp_code)

    # 2. Check for Resend API configuration
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if resend_api_key:
        return _send_via_resend(to_email, otp_code, resend_api_key)

    # 3. If neither is configured:
    database_url = os.environ.get("DATABASE_URL", "")
    is_production = database_url.startswith("postgres") or os.environ.get("RENDER")

    if is_production:
        err = "Email service not configured. Please add SMTP credentials (SMTP_USER & SMTP_PASSWORD) or RESEND_API_KEY to your Render environment variables."
        logger.error(f"[EmailService] {err}")
        return False, err

    # Local development fallback
    print(f"\n=======================================================")
    print(f">> [LOCAL DEV OTP DISPATCH] To: {to_email}")
    print(f">> VERIFICATION CODE: {otp_code}")
    print(f"=======================================================\n")
    logger.info(f"[EmailService-Dev] Local mode: Verification OTP {otp_code} generated for {to_email}")
    return True, None
