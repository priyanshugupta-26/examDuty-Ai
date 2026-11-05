import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "examcell@vfstr.ac.in")

def send_email(
    to_email: str,
    subject: str,
    html_body: Optional[str] = None,
    text_body: Optional[str] = None,
    body: Optional[str] = None
) -> bool:
    """
    Sends an email using configured SMTP credentials.
    If SMTP is not configured or fails, logs the email clearly to the console
    and never crashes.
    """
    raw_text = text_body or body or html_body or ""
    raw_html = html_body or f"<pre>{raw_text}</pre>"

    if not SMTP_HOST:
        print("\n" + "=" * 65)
        print(f"[EMAIL SERVICE - FALLBACK LOG] (SMTP Not Configured)")
        print(f"To:      {to_email}")
        print(f"From:    {FROM_EMAIL}")
        print(f"Subject: {subject}")
        print("-" * 65)
        print(raw_text)
        print("=" * 65 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email

        if raw_text:
            msg.attach(MIMEText(raw_text, "plain"))
        if raw_html:
            msg.attach(MIMEText(raw_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
        
        print(f"[EMAIL SERVICE] Successfully sent email to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL SERVICE WARNING] Failed to send SMTP email to {to_email}: {e}")
        print(f"[EMAIL SERVICE FALLBACK] To: {to_email} | Subject: {subject}")
        return False


def send_duty_allocation_email(faculty_name: str, faculty_email: str, duty_count: int, duties: List[dict]):
    """Formats and dispatches duty assignment email to a faculty member."""
    subject = f"Official Exam Duty Roster — VFSTR End-Semester Nov 2026"
    
    duties_html = "".join([
        f"<li><b>{d.get('date')} ({d.get('session')}):</b> {d.get('subject_name')} ({d.get('subject_code')}) — <i>{d.get('hall_name')}</i> ({d.get('start_time')} - {d.get('end_time')})</li>"
        for d in duties
    ])

    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #0F172A; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #E2E8F0; rounded: 8px;">
        <h2 style="color: #3B5BDB; margin-bottom: 4px;">Vignan's Foundation for Science, Technology & Research (VFSTR)</h2>
        <h3 style="margin-top: 0; color: #475569;">Examination Control Division — Duty Order</h3>
        <p>Dear <b>{faculty_name}</b>,</p>
        <p>The examination invigilation schedule for the upcoming End-Semester Examinations (Nov 2026) has been finalized and published.</p>
        <p>You have been allocated <b>{duty_count} invigilation session(s)</b>:</p>
        <ul>
            {duties_html}
        </ul>
        <p style="margin-top: 20px;">
            Please log in to the <a href="http://localhost:3000/faculty" style="color: #3B5BDB; font-weight: bold;">ExamDuty Portal</a> to download your official PDF Duty Letter and view instructions.
        </p>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 30px;">
            Controller of Examinations • VFSTR Deemed to be University, Vadlamudi, Guntur
        </p>
    </div>
    """

    text_duties = "\n".join([
        f"- {d.get('date')} {d.get('session')}: {d.get('subject_name')} [{d.get('subject_code')}] in Hall {d.get('hall_name')}"
        for d in duties
    ])
    text_body = f"""VFSTR Examination Control Division
Dear {faculty_name},

You have been allocated {duty_count} invigilation session(s):
{text_duties}

Log in to http://localhost:3000/faculty to download your official Duty Letter.
"""

    return send_email(faculty_email, subject, html_body, text_body)

