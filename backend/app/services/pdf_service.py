import io
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_duty_letter_pdf(
    faculty: Any,
    duties: List[Dict[str, Any]],
) -> io.BytesIO:
    """
    Generates a formal, printable PDF Duty Order Letter for a faculty member
    using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#3B5BDB")
    dark_text = colors.HexColor("#0F172A")
    muted_text = colors.HexColor("#475569")

    title_style = ParagraphStyle(
        "UniversityTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=primary_color,
        alignment=1,  # Center
    )

    subtitle_style = ParagraphStyle(
        "OfficeSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=dark_text,
        alignment=1,
    )

    address_style = ParagraphStyle(
        "Address",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=muted_text,
        alignment=1,
    )

    body_style = ParagraphStyle(
        "LetterBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=dark_text,
    )

    bold_body = ParagraphStyle(
        "LetterBodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=dark_text,
        alignment=0,
    )

    story = []

    # 1. Header
    story.append(Paragraph("VIGNAN'S FOUNDATION FOR SCIENCE, TECHNOLOGY & RESEARCH", title_style))
    story.append(Paragraph("(Deemed to be University) • Accredited with NAAC 'A+' Grade", address_style))
    story.append(Paragraph("Vadlamudi, Guntur District, Andhra Pradesh - 522213", address_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("OFFICE OF THE CONTROLLER OF EXAMINATIONS", subtitle_style))
    story.append(Paragraph("END-SEMESTER EXAMINATIONS — NOVEMBER 2026", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=10))

    # 2. Ref details & Date
    ref_table = Table(
        [
            [
                Paragraph("<b>Ref:</b> VFSTR/COE/DUTY/2026/ODD", body_style),
                Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d-%b-%Y')}", ParagraphStyle("RightDate", parent=body_style, alignment=2)),
            ]
        ],
        colWidths=[260, 260],
    )
    ref_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(ref_table)
    story.append(Spacer(1, 10))

    # 3. Addressee Info
    fac_name = getattr(faculty, "name", "Faculty Member")
    fac_code = getattr(faculty, "faculty_code", "VF-FAC")
    fac_dept = getattr(faculty, "department", "Engineering")
    fac_desig = getattr(faculty, "designation", "Faculty")

    addressee_data = [
        [Paragraph("<b>To:</b>", body_style), Paragraph(f"<b>{fac_name}</b> ({fac_code})", body_style)],
        ["", Paragraph(f"{fac_desig}, Department of {fac_dept}", body_style)],
        ["", Paragraph("VFSTR Deemed to be University, Vadlamudi", body_style)],
    ]
    to_table = Table(addressee_data, colWidths=[30, 490])
    to_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
    ]))
    story.append(to_table)
    story.append(Spacer(1, 10))

    # 4. Subject line & Order paragraph
    story.append(Paragraph("<b>SUB: APPOINTMENT ORDER AS INVIGILATOR — END-SEMESTER EXAMS NOV 2026 — REG.</b>", bold_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"You are hereby appointed as an <b>Invigilator</b> for the University End-Semester Theory Examinations "
        f"scheduled in November 2026. You are required to strictly discharge your invigilation duties as per the following roster:",
        body_style,
    ))
    story.append(Spacer(1, 10))

    # 5. Duty Table
    duty_table_headers = [
        Paragraph("<b>S.No</b>", table_header_style),
        Paragraph("<b>Date & Session</b>", table_header_style),
        Paragraph("<b>Exam Time</b>", table_header_style),
        Paragraph("<b>Course Code & Name</b>", table_header_style),
        Paragraph("<b>Hall / Block</b>", table_header_style),
        Paragraph("<b>Students</b>", table_header_style),
    ]

    duty_table_data = [duty_table_headers]

    for idx, d in enumerate(duties, start=1):
        subj_name = d.get("subject_name", "")
        subj_code = d.get("subject_code", "")
        dt = d.get("date", "")
        sess = d.get("session", "")
        st = d.get("start_time", "09:30 AM")
        et = d.get("end_time", "12:30 PM")
        hall = d.get("hall_name", "")
        blk = d.get("hall_block", "")
        cnt = str(d.get("student_count", 30))

        row = [
            Paragraph(str(idx), table_cell_style),
            Paragraph(f"<b>{dt}</b><br/>{sess}", table_cell_style),
            Paragraph(f"{st} to<br/>{et}", table_cell_style),
            Paragraph(f"<b>{subj_code}</b><br/>{subj_name}", table_cell_style),
            Paragraph(f"<b>{hall}</b><br/>({blk})", table_cell_style),
            Paragraph(cnt, table_cell_style),
        ]
        duty_table_data.append(row)

    if len(duties) == 0:
        duty_table_data.append([
            Paragraph("—", table_cell_style),
            Paragraph("No duties scheduled currently", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("—", table_cell_style),
        ])

    table = Table(duty_table_data, colWidths=[30, 85, 80, 195, 85, 45])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(table)
    story.append(Spacer(1, 14))

    # 6. Instructions Section
    story.append(Paragraph("<b>MANDATORY INSTRUCTIONS TO INVIGILATORS:</b>", bold_body))
    instructions = [
        "1. Report to the Exam Cell Control Room at least <b>30 minutes prior</b> to commencement of the session.",
        "2. Collect question paper packets, answer booklets, and attendance registers in person.",
        "3. Verify candidate Hall Tickets, Photo IDs, and ensure strict prohibition of mobile phones, smartwatches, or unauthorized chits.",
        "4. In case of any suspected malpractice, immediately confiscate material, mark answer sheet in red ink, and alert the Chief Superintendent.",
        "5. Hand over all answer scripts counted sequentially to the Control Room immediately after exam closure.",
    ]
    for inst in instructions:
        story.append(Paragraph(inst, body_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 20))

    # 7. Signature Block
    sig_data = [
        [
            Paragraph("<i>System Generated Order via ExamDuty AI</i>", address_style),
            Paragraph("<b>CONTROLLER OF EXAMINATIONS</b><br/>VFSTR Deemed to be University", ParagraphStyle("SigRight", parent=body_style, alignment=2)),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(KeepTogether(sig_table))

    doc.build(story)
    buffer.seek(0)
    return buffer

