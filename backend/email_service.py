import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("uvicorn")


def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Sends a secure 6-digit OTP email for password reset.
    - If SMTP environment variables are configured (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD),
      dispatches via production SMTP server.
    - If SMTP is not configured, logs the dispatch gracefully for development/testing.
    """
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()
    from_email = os.environ.get("EMAILS_FROM", smtp_user or "no-reply@harvestledger.org").strip()

    if not smtp_host or not smtp_user or not smtp_password:
        logger.info(f"SMTP not configured. OTP verification code generated for {to_email}")
        return True

    subject = "Harvest Ledger — Your Password Reset Verification Code"
    
    html_content = f"""
    <!DOCTYPE html>
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
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        msg.attach(MIMEText(f"Your Harvest Ledger verification code is: {otp_code}. Valid for 10 minutes.", "plain"))
        msg.attach(MIMEText(html_content, "html"))

        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
            server.starttls()

        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Password reset OTP sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch OTP email to {to_email}: {e}")
        return False
