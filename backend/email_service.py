import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Tuple, Optional
import requests

logger = logging.getLogger("uvicorn")


def _get_email_html(otp_code: str, purpose: str = "password_reset") -> str:
    """Returns a modern, responsive HTML email template for OTP verification."""
    is_reg = (purpose == "registration")
    title = "Verify Your Email Address" if is_reg else "Your Password Reset Code"
    subtitle = "Welcome &bull; Organization Registration Verification" if is_reg else "Security &bull; Password Reset Verification"
    body_text = (
        "Welcome to Harvest Ledger! Please use the 6-digit verification code below to verify your organization's email address and activate your account:"
        if is_reg
        else "We received a request to reset the password for your Harvest Ledger account. Please use the 6-digit verification code below to authorize this change:"
    )
    disclaimer = (
        "If you did not attempt to register an account on Harvest Ledger, you can safely ignore this email."
        if is_reg
        else "If you did not initiate this request, you can safely ignore this email. Your password will remain unchanged."
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
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
    <div class="subtitle">{subtitle}</div>
    
    <p>Hello,</p>
    <p>{body_text}</p>
    
    <div class="otp-card">
      <div class="otp-label">Your 6-Digit Verification Code</div>
      <div class="otp-code">{otp_code}</div>
    </div>
    
    <div class="note">
      ⏱ <strong>Valid for 10 minutes.</strong> Never share this code with anyone.
    </div>
    
    <p>{disclaimer}</p>
    
    <div class="footer">
      &copy; Harvest Ledger &bull; AI-Powered Food Waste Management &amp; Redistribution Platform<br>
      This is an automated system email. Please do not reply directly.
    </div>
  </div>
</body>
</html>"""


def _send_via_resend(to_email: str, otp_code: str, resend_api_key: str, purpose: str = "password_reset") -> Tuple[bool, Optional[str]]:
    """Sends OTP email via the Resend HTTP API (Port 443 HTTPS - Works on Render/Cloud)."""
    from_email = os.environ.get("EMAILS_FROM", "Harvest Ledger <onboarding@resend.dev>").strip()
    if not from_email:
        from_email = "Harvest Ledger <onboarding@resend.dev>"

    subject = f"Harvest Ledger: {otp_code} is your registration verification code" if purpose == "registration" else f"Harvest Ledger: {otp_code} is your password reset code"
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
        "User-Agent": "HarvestLedger/1.0",
    }
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": _get_email_html(otp_code, purpose),
    }

    try:
        logger.info(f"[Resend] Dispatching HTTPS email to {to_email} with sender '{from_email}'...")
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


def _send_via_brevo(to_email: str, otp_code: str, brevo_api_key: str, purpose: str = "password_reset") -> Tuple[bool, Optional[str]]:
    """
    Sends OTP email via Brevo (Sendinblue) HTTP API (Port 443 HTTPS - Works on Render/Cloud).
    Free tier allows 300 emails/day to ANY recipient without domain verification!
    """
    sender_email = os.environ.get("BREVO_SENDER_EMAIL") or os.environ.get("EMAILS_FROM") or "noreply@harvestledger.org"
    sender_name = "Harvest Ledger"
    if "<" in sender_email and ">" in sender_email:
        sender_name = sender_email.split("<")[0].strip() or "Harvest Ledger"
        sender_email = sender_email.split("<")[1].replace(">", "").strip()

    subject = f"Harvest Ledger: {otp_code} is your registration verification code" if purpose == "registration" else f"Harvest Ledger: {otp_code} is your password reset code"
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": brevo_api_key,
        "Content-Type": "application/json",
        "accept": "application/json",
    }
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": _get_email_html(otp_code, purpose),
        "textContent": f"Hello,\n\nYour Harvest Ledger verification code is: {otp_code}\n\nThis code expires in 10 minutes.",
    }

    try:
        logger.info(f"[Brevo] Dispatching HTTPS email to {to_email}...")
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in (200, 201, 202):
            res_data = response.json()
            msg_id = res_data.get("messageId", "ok")
            logger.info(f"[Brevo] Email successfully sent with ID '{msg_id}' to {to_email}")
            return True, None
        else:
            err_text = response.text
            logger.error(f"[Brevo] API failed with status {response.status_code}: {err_text}")
            try:
                err_data = response.json()
                err_msg = err_data.get("message") or err_text
            except Exception:
                err_msg = err_text
            return False, f"Brevo API error ({response.status_code}): {err_msg}"
    except Exception as e:
        logger.error(f"[Brevo] Request exception: {e}")
        return False, f"Brevo service error: {str(e)}"


def _send_via_sendgrid(to_email: str, otp_code: str, sendgrid_api_key: str, purpose: str = "password_reset") -> Tuple[bool, Optional[str]]:
    """Sends OTP email via SendGrid HTTP API (Port 443 HTTPS)."""
    from_email = os.environ.get("SENDGRID_FROM_EMAIL") or os.environ.get("EMAILS_FROM") or "noreply@harvestledger.org"
    from_name = "Harvest Ledger"
    if "<" in from_email and ">" in from_email:
        from_name = from_email.split("<")[0].strip() or "Harvest Ledger"
        from_email = from_email.split("<")[1].replace(">", "").strip()

    subject = f"Harvest Ledger: {otp_code} is your registration verification code" if purpose == "registration" else f"Harvest Ledger: {otp_code} is your password reset code"
    url = "https://api.sendgrid.com/v3/mail/send"
    headers = {
        "Authorization": f"Bearer {sendgrid_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_email, "name": from_name},
        "subject": subject,
        "content": [
            {"type": "text/html", "value": _get_email_html(otp_code, purpose)},
        ],
    }

    try:
        logger.info(f"[SendGrid] Dispatching HTTPS email to {to_email}...")
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code in (200, 201, 202):
            logger.info(f"[SendGrid] Email successfully sent to {to_email}")
            return True, None
        else:
            err_text = response.text
            logger.error(f"[SendGrid] API failed with status {response.status_code}: {err_text}")
            return False, f"SendGrid API error ({response.status_code}): {err_text}"
    except Exception as e:
        logger.error(f"[SendGrid] Request exception: {e}")
        return False, f"SendGrid service error: {str(e)}"


def _send_via_smtp(to_email: str, otp_code: str, purpose: str = "password_reset") -> Tuple[bool, Optional[str]]:
    """
    Sends OTP email using standard SMTP (port 587/465).
    Note: Cloud hosts like Render.com block raw outbound SMTP ports.
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

    subject = f"Harvest Ledger: {otp_code} is your registration verification code" if purpose == "registration" else f"Harvest Ledger: {otp_code} is your password reset code"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    plain_text = f"Hello,\n\nYour Harvest Ledger verification code is: {otp_code}\n\nThis code expires in 10 minutes."
    html_text = _get_email_html(otp_code, purpose)

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_text, "html"))

    try:
        logger.info(f"[SMTP] Connecting to {host}:{port} for {to_email}...")
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(user, password)
        server.sendmail(user, [to_email], msg.as_string())
        server.quit()
        logger.info(f"[SMTP] Verification OTP successfully sent to {to_email}")
        return True, None
    except OSError as e:
        logger.error(f"[SMTP] Network socket error (likely blocked by cloud hosting firewall): {e}")
        return False, (
            "Cloud host (Render) blocked raw outbound SMTP (Errno 101). "
            "Please configure an HTTPS email API (RESEND_API_KEY or BREVO_API_KEY) in Render environment variables."
        )
    except Exception as e:
        logger.error(f"[SMTP] Error sending email via SMTP: {e}")
        return False, f"SMTP Error: {str(e)}"


def send_otp_email(to_email: str, otp_code: str, purpose: str = "password_reset") -> Tuple[bool, Optional[str]]:
    """
    Dispatches a secure 6-digit OTP email for registration verification or password reset.
    Supported backends in priority order:
      1. Brevo HTTP API (BREVO_API_KEY - HTTPS port 443, sends to any recipient)
      2. Resend HTTP API (RESEND_API_KEY - HTTPS port 443)
      3. SendGrid HTTP API (SENDGRID_API_KEY - HTTPS port 443)
      4. Standard SMTP (SMTP_USER & SMTP_PASSWORD - Port 587/465)
      5. Local Development Mode / Fallback (logs code to console)
    """
    # 1. Brevo HTTP API (Port 443 HTTPS)
    brevo_api_key = os.environ.get("BREVO_API_KEY") or os.environ.get("SENDINBLUE_API_KEY", "").strip()
    if brevo_api_key:
        return _send_via_brevo(to_email, otp_code, brevo_api_key, purpose)

    # 2. Resend HTTP API (Port 443 HTTPS)
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if resend_api_key:
        return _send_via_resend(to_email, otp_code, resend_api_key, purpose)

    # 3. SendGrid HTTP API (Port 443 HTTPS)
    sendgrid_api_key = os.environ.get("SENDGRID_API_KEY", "").strip()
    if sendgrid_api_key:
        return _send_via_sendgrid(to_email, otp_code, sendgrid_api_key, purpose)

    # 4. Standard SMTP (Port 587/465)
    smtp_user = os.environ.get("SMTP_USER") or os.environ.get("EMAIL_HOST_USER") or os.environ.get("SMTP_EMAIL", "").strip()
    smtp_pass = os.environ.get("SMTP_PASSWORD") or os.environ.get("EMAIL_HOST_PASSWORD") or os.environ.get("SMTP_PASS", "").strip()
    if smtp_user and smtp_pass:
        return _send_via_smtp(to_email, otp_code, purpose)

    # 5. Local Dev & Testing Fallback
    database_url = os.environ.get("DATABASE_URL", "")
    is_production = database_url.startswith("postgres") or os.environ.get("RENDER")

    if is_production:
        err = "Email service not configured. Cloud hosting (Render) requires HTTPS email API (RESEND_API_KEY or BREVO_API_KEY) in environment variables."
        logger.error(f"[EmailService] {err}")
        return False, err

    # Local development fallback
    print(f"\n=======================================================")
    print(f">> [LOCAL DEV OTP DISPATCH] To: {to_email} ({purpose.upper()})")
    print(f">> VERIFICATION CODE: {otp_code}")
    print(f"=======================================================\n")
    logger.info(f"[EmailService-Dev] Local mode: Verification OTP {otp_code} generated for {to_email} ({purpose})")
    return True, None
