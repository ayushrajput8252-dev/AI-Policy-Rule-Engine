import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ..config import settings


def send_invite_email(to_email: str, role_title: str, interview_link: str) -> bool:
    if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
        print("[Email Service] SMTP not configured — skipping send.")
        return False

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = f"Your AI Screening Interview — {role_title}"

    body = (
        f"Hi,\n\nYou've been invited to a first-round AI screening interview for the "
        f"{role_title} role.\n\nWhen you're ready, click the link below to begin:\n"
        f"{interview_link}\n\nA few tips before you start:\n"
        "- Use a quiet room with a working camera and microphone.\n"
        "- Have your resume ready (PDF only).\n"
        "- The interview covers 11 questions and takes about 15-20 minutes.\n\n"
        "Good luck!\nAgenticFlow AI"
    )
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        return True
    except Exception as e:
        print(f"[Email Service Error] {e}")
        return False
