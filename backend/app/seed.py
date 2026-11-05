import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import (
    User, Faculty, Hall, Exam, ExamHall, Allocation, SwapRequest, Unavailability, Setting, AuditLog, Notification
)
from .auth import hash_password

def seed_database(db: Session = None):
    close_at_end = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_at_end = True

    try:
        # Check if already seeded, if so clear or skip
        existing_admin = db.query(User).filter(User.email == "admin@vfstr.ac.in").first()
        if existing_admin:
            print("[SEED] Database already has data. Cleaning up for fresh seed...")
            # Delete in order of dependencies
            db.query(SwapRequest).delete()
            db.query(Notification).delete()
            db.query(AuditLog).delete()
            db.query(Allocation).delete()
            db.query(Unavailability).delete()
            db.query(ExamHall).delete()
            db.query(Exam).delete()
            db.query(Hall).delete()
            db.query(User).delete()
            db.query(Faculty).delete()
            db.query(Setting).delete()
            db.commit()

        print("[SEED] Seeding VFSTR Exam Cell dataset...")

        # 1. Admin User
        admin_user = User(
            email="admin@vfstr.ac.in",
            password_hash=hash_password("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.flush()

        # 2. Faculty Data (~40 faculty across 5 departments)
        # Departments: CSE, ECE, MECH, CIVIL, S&H
        departments_data = [
            ("CSE", [
                ("VF-CSE-001", "Dr. K. Rao", "Professor & HoD", "k.rao@vfstr.ac.in", "+91 98480 11001", 4, 1),
                ("VF-CSE-002", "Dr. M. S. Vani", "Associate Professor", "m.vani@vfstr.ac.in", "+91 98480 11002", 5, 2),
                ("VF-CSE-003", "Prof. N. Venkatesh", "Associate Professor", "n.venkatesh@vfstr.ac.in", "+91 98480 11003", 5, 0),
                ("VF-CSE-004", "Dr. S. K. Reddy", "Assistant Professor", "sk.reddy@vfstr.ac.in", "+91 98480 11004", 6, 2),
                ("VF-CSE-005", "Mrs. T. Anitha", "Assistant Professor", "t.anitha@vfstr.ac.in", "+91 98480 11005", 5, 1),
                ("VF-CSE-006", "Mr. B. Srikanth", "Assistant Professor", "b.srikanth@vfstr.ac.in", "+91 98480 11006", 6, 3),
                ("VF-CSE-007", "Dr. Ch. Babu", "Associate Professor", "ch.babu@vfstr.ac.in", "+91 98480 11007", 5, 0),
                ("VF-CSE-008", "Ms. D. Hema", "Assistant Professor", "d.hema@vfstr.ac.in", "+91 98480 11008", 6, 1),
            ]),
            ("ECE", [
                ("VF-ECE-001", "Dr. P. Sharma", "Professor & HoD", "p.sharma@vfstr.ac.in", "+91 98480 12001", 4, 2),
                ("VF-ECE-002", "Dr. G. Lakshmi", "Associate Professor", "g.lakshmi@vfstr.ac.in", "+91 98480 12002", 5, 1),
                ("VF-ECE-003", "Prof. R. Krishna Murthy", "Professor", "r.kmurthy@vfstr.ac.in", "+91 98480 12003", 4, 0),
                ("VF-ECE-004", "Dr. V. Prasad", "Assistant Professor", "v.prasad@vfstr.ac.in", "+91 98480 12004", 6, 2),
                ("VF-ECE-005", "Mr. A. Naresh", "Assistant Professor", "a.naresh@vfstr.ac.in", "+91 98480 12005", 5, 1),
                ("VF-ECE-006", "Mrs. K. Deepthi", "Assistant Professor", "k.deepthi@vfstr.ac.in", "+91 98480 12006", 6, 0),
                ("VF-ECE-007", "Dr. Y. Rajesh", "Associate Professor", "y.rajesh@vfstr.ac.in", "+91 98480 12007", 5, 3),
                ("VF-ECE-008", "Mr. L. Suresh", "Assistant Professor", "l.suresh@vfstr.ac.in", "+91 98480 12008", 6, 1),
            ]),
            ("MECH", [
                ("VF-MEC-001", "Dr. T. V. Ramana", "Professor & HoD", "tv.ramana@vfstr.ac.in", "+91 98480 13001", 4, 1),
                ("VF-MEC-002", "Dr. K. Srinivas", "Associate Professor", "k.srinivas@vfstr.ac.in", "+91 98480 13002", 5, 2),
                ("VF-MEC-003", "Prof. J. Mohan Rao", "Associate Professor", "j.mrao@vfstr.ac.in", "+91 98480 13003", 5, 0),
                ("VF-MEC-004", "Mr. P. Govind", "Assistant Professor", "p.govind@vfstr.ac.in", "+91 98480 13004", 6, 2),
                ("VF-MEC-005", "Dr. M. Naveen", "Assistant Professor", "m.naveen@vfstr.ac.in", "+91 98480 13005", 5, 1),
                ("VF-MEC-006", "Mrs. S. Pavani", "Assistant Professor", "s.pavani@vfstr.ac.in", "+91 98480 13006", 6, 1),
                ("VF-MEC-007", "Mr. D. Santosh", "Assistant Professor", "d.santosh@vfstr.ac.in", "+91 98480 13007", 5, 0),
                ("VF-MEC-008", "Dr. R. Jagadeesh", "Associate Professor", "r.jagadeesh@vfstr.ac.in", "+91 98480 13008", 5, 2),
            ]),
            ("CIVIL", [
                ("VF-CIV-001", "Dr. B. V. Subbarao", "Professor & HoD", "bv.subbarao@vfstr.ac.in", "+91 98480 14001", 4, 1),
                ("VF-CIV-002", "Dr. H. Sandhya", "Associate Professor", "h.sandhya@vfstr.ac.in", "+91 98480 14002", 5, 0),
                ("VF-CIV-003", "Mr. K. Mahesh", "Assistant Professor", "k.mahesh@vfstr.ac.in", "+91 98480 14003", 6, 2),
                ("VF-CIV-004", "Mrs. U. Bindu", "Assistant Professor", "u.bindu@vfstr.ac.in", "+91 98480 14004", 5, 1),
                ("VF-CIV-005", "Mr. C. Tarun", "Assistant Professor", "c.tarun@vfstr.ac.in", "+91 98480 14005", 6, 0),
                ("VF-CIV-006", "Dr. S. R. Murthy", "Associate Professor", "sr.murthy@vfstr.ac.in", "+91 98480 14006", 5, 2),
                ("VF-CIV-007", "Ms. V. Lavanya", "Assistant Professor", "v.lavanya@vfstr.ac.in", "+91 98480 14007", 6, 1),
                ("VF-CIV-008", "Mr. N. Phani", "Assistant Professor", "n.phani@vfstr.ac.in", "+91 98480 14008", 5, 1),
            ]),
            ("S&H", [
                ("VF-SNH-001", "Dr. A. Sudhakara Rao", "Professor & Dean", "a.sudhakar@vfstr.ac.in", "+91 98480 15001", 4, 0),
                ("VF-SNH-002", "Dr. Ch. Padmavathi", "Associate Professor (Maths)", "ch.padma@vfstr.ac.in", "+91 98480 15002", 5, 2),
                ("VF-SNH-003", "Dr. G. Ramanjaneyulu", "Associate Professor (Physics)", "g.ramanj@vfstr.ac.in", "+91 98480 15003", 5, 1),
                ("VF-SNH-004", "Dr. P. Sirisha", "Assistant Professor (Chemistry)", "p.sirisha@vfstr.ac.in", "+91 98480 15004", 6, 2),
                ("VF-SNH-005", "Mr. K. Sastry", "Assistant Professor (English)", "k.sastry@vfstr.ac.in", "+91 98480 15005", 6, 1),
                ("VF-SNH-006", "Dr. M. Prameela", "Associate Professor (Maths)", "m.prameela@vfstr.ac.in", "+91 98480 15006", 5, 0),
                ("VF-SNH-007", "Mr. E. Kalyan", "Assistant Professor (Physics)", "e.kalyan@vfstr.ac.in", "+91 98480 15007", 6, 3),
                ("VF-SNH-008", "Mrs. L. V. Swathi", "Assistant Professor (Chemistry)", "lv.swathi@vfstr.ac.in", "+91 98480 15008", 5, 1),
            ])
        ]

        faculty_records = []
        default_faculty_pass = hash_password("faculty123")

        for dept, fac_list in departments_data:
            for code, name, desig, email, phone, max_d, past_d in fac_list:
                faculty = Faculty(
                    faculty_code=code,
                    name=name,
                    department=dept,
                    designation=desig,
                    email=email,
                    phone=phone,
                    max_duties=max_d,
                    past_duties=past_d
                )
                db.add(faculty)
                db.flush()
                faculty_records.append(faculty)

                # Create user for each faculty
                user = User(
                    email=email,
                    password_hash=default_faculty_pass,
                    role="faculty",
                    faculty_id=faculty.id,
                    is_active=True
                )
                db.add(user)

        # 3. 12 Halls across blocks
        halls_data = [
            ("A-101", "A-Block", 1, 60),
            ("A-102", "A-Block", 1, 60),
            ("A-201", "A-Block", 2, 40),
            ("A-202", "A-Block", 2, 40),
            ("A-301", "A-Block", 3, 30),
            ("B-101", "B-Block", 1, 60),
            ("B-102", "B-Block", 1, 60),
            ("B-201", "B-Block", 2, 40),
            ("B-202", "B-Block", 2, 40),
            ("C-101", "C-Block", 1, 50),
            ("C-102", "C-Block", 1, 50),
            ("C-201", "C-Block", 2, 35),
        ]

        hall_records = []
        for name, block, floor, capacity in halls_data:
            hall = Hall(name=name, block=block, floor=floor, capacity=capacity, is_active=True)
            db.add(hall)
            db.flush()
            hall_records.append(hall)

        # 4. Exams (5 days x 2 sessions: 10 Nov - 14 Nov 2026, ~25 exams)
        exam_schedule = [
            # Day 1: 2026-11-10
            ("2026-11-10", "FN", "Data Structures & Algorithms", "21CS301", "CSE", 2, 3, "CSE"),
            ("2026-11-10", "FN", "Digital Signal Processing", "21EC301", "ECE", 2, 3, "ECE"),
            ("2026-11-10", "AN", "Thermodynamics", "21ME301", "MECH", 2, 3, "MECH"),
            ("2026-11-10", "AN", "Fluid Mechanics", "21CE301", "CIVIL", 2, 3, "CIVIL"),
            ("2026-11-10", "AN", "Engineering Mathematics III", "21SH301", "CSE/ECE", 2, 3, "S&H"),

            # Day 2: 2026-11-11
            ("2026-11-11", "FN", "Database Management Systems", "21CS302", "CSE", 2, 3, "CSE"),
            ("2026-11-11", "FN", "Microprocessors & Interfacing", "21EC302", "ECE", 2, 3, "ECE"),
            ("2026-11-11", "AN", "Manufacturing Technology", "21ME302", "MECH", 2, 3, "MECH"),
            ("2026-11-11", "AN", "Surveying & Geomatics", "21CE302", "CIVIL", 2, 3, "CIVIL"),
            ("2026-11-11", "AN", "Discrete Mathematical Structures", "21SH302", "CSE", 2, 3, "S&H"),

            # Day 3: 2026-11-12 (Busy day for demo scenario)
            ("2026-11-12", "FN", "Computer Networks & Protocols", "21CS303", "CSE", 3, 5, "CSE"),
            ("2026-11-12", "FN", "VLSI Design", "21EC303", "ECE", 3, 5, "ECE"),
            ("2026-11-12", "FN", "Heat Transfer", "21ME303", "MECH", 3, 5, "MECH"),
            ("2026-11-12", "AN", "Design of Reinforced Concrete Structures", "21CE303", "CIVIL", 3, 5, "CIVIL"),
            ("2026-11-12", "AN", "Probability & Statistics", "21SH303", "ECE/MECH", 2, 3, "S&H"),
            ("2026-11-12", "AN", "Software Engineering", "21CS304", "CSE", 3, 5, "CSE"),

            # Day 4: 2026-11-13
            ("2026-11-13", "FN", "Operating Systems Internals", "21CS305", "CSE", 3, 5, "CSE"),
            ("2026-11-13", "FN", "Antennas & Wave Propagation", "21EC304", "ECE", 3, 5, "ECE"),
            ("2026-11-13", "AN", "Kinematics of Machinery", "21ME304", "MECH", 2, 3, "MECH"),
            ("2026-11-13", "AN", "Structural Analysis", "21CE304", "CIVIL", 3, 5, "CIVIL"),

            # Day 5: 2026-11-14
            ("2026-11-14", "FN", "Artificial Intelligence & ML", "21CS401", "CSE", 4, 7, "CSE"),
            ("2026-11-14", "FN", "Wireless & Mobile Communications", "21EC401", "ECE", 4, 7, "ECE"),
            ("2026-11-14", "AN", "Finite Element Methods", "21ME401", "MECH", 4, 7, "MECH"),
            ("2026-11-14", "AN", "Transportation Engineering", "21CE401", "CIVIL", 4, 7, "CIVIL"),
            ("2026-11-14", "AN", "Professional Ethics & Human Values", "21SH401", "All", 4, 7, "S&H"),
        ]

        exam_records = []
        for date, session, sub_name, sub_code, branch, year, sem, dept in exam_schedule:
            st = "09:30 AM" if session == "FN" else "02:00 PM"
            et = "12:30 PM" if session == "FN" else "05:00 PM"
            exam = Exam(
                date=date,
                session=session,
                start_time=st,
                end_time=et,
                subject_name=sub_name,
                subject_code=sub_code,
                branch=branch,
                year=year,
                semester=sem,
                department_owner=dept
            )
            db.add(exam)
            db.flush()
            exam_records.append(exam)

        # 5. ExamHall allocations (mapping exams to halls with realistic student counts)
        hall_idx = 0
        for i, exam in enumerate(exam_records):
            # assign 1 or 2 halls per exam
            h1 = hall_records[hall_idx % len(hall_records)]
            hall_idx += 1
            std_cnt_1 = min(h1.capacity, 50)
            inv_req_1 = 2 if std_cnt_1 > 30 else 1
            eh1 = ExamHall(
                exam_id=exam.id,
                hall_id=h1.id,
                student_count=std_cnt_1,
                invigilators_required=inv_req_1
            )
            db.add(eh1)

            if exam.year in (2, 3) and i % 3 == 0:
                h2 = hall_records[hall_idx % len(hall_records)]
                hall_idx += 1
                std_cnt_2 = min(h2.capacity, 40)
                inv_req_2 = 2 if std_cnt_2 > 30 else 1
                eh2 = ExamHall(
                    exam_id=exam.id,
                    hall_id=h2.id,
                    student_count=std_cnt_2,
                    invigilators_required=inv_req_2
                )
                db.add(eh2)

        # 6. Unavailability / Leave: Dr. K. Rao on leave on 2026-11-12 FN (Demo Scenario from Section 9)
        dr_rao = next(f for f in faculty_records if f.faculty_code == "VF-CSE-001")
        leave = Unavailability(
            faculty_id=dr_rao.id,
            date="2026-11-12",
            session="FN",
            reason="Medical emergency (sick leave)"
        )
        db.add(leave)

        # 7. System Settings
        now_iso = datetime.now(timezone.utc).isoformat()
        settings_payload = {
            "sample_data": {"is_sample": True, "seeded_at": now_iso},
            "solver_settings": {
                "students_per_invigilator": 30,
                "avoid_own_department": True,
                "avoid_back_to_back": True,
                "fairness_weight": 0.5,
                "max_duties_default": 5
            },
            "instructions": {
                "before_exam": "Report to the Exam Cell 30 minutes before session commencement. Collect answer booklets, question papers, and attendance sheets.",
                "during_exam": "Verify student ID cards, hall tickets, and ensure no unauthorized electronic devices or chits are present in the hall.",
                "malpractice": "Immediately seize the unauthorized material, mark the answer script with red ink, record student details and report to the Chief Superintendent.",
                "after_exam": "Count all answer booklets, verify against the attendance sheet, bundle sequentially and submit to the Exam Control Room.",
                "emergency_contacts": "Exam Cell Helpline: +91 863 2344700 | Chief Controller: Ext 101"
            }
        }
        for k, v in settings_payload.items():
            setting = Setting(key=k, value_json=json.dumps(v))
            db.add(setting)

        # 8. Generate initial unpublished draft allocations using the solver
        db.flush()
        from .solver.cp_solver import (
            FacultyInput, SlotInput, UnavailabilityInput, SolverSettings, run_cp_sat_solver
        )
        faculty_inputs = [
            FacultyInput(
                id=f.id,
                faculty_code=f.faculty_code,
                name=f.name,
                department=f.department,
                designation=f.designation,
                max_duties=f.max_duties,
                past_duties=f.past_duties,
            )
            for f in faculty_records
        ]
        unavail_inputs = [
            UnavailabilityInput(
                faculty_id=leave.faculty_id,
                date=leave.date,
                session=leave.session,
                reason=leave.reason,
            )
        ]
        slots = []
        exam_halls = db.query(ExamHall).all()
        for eh in exam_halls:
            exam = db.query(Exam).filter(Exam.id == eh.exam_id).first()
            hall = db.query(Hall).filter(Hall.id == eh.hall_id).first()
            for pos in range(eh.invigilators_required):
                slots.append(
                    SlotInput(
                        slot_id=f"eh_{eh.id}_p{pos}",
                        exam_hall_id=eh.id,
                        exam_id=exam.id,
                        hall_id=hall.id,
                        date=exam.date,
                        session=exam.session,
                        department_owner=exam.department_owner,
                        position=pos,
                        is_locked=False,
                    )
                )

        solver_res = run_cp_sat_solver(
            faculty_list=faculty_inputs,
            slots=slots,
            unavailabilities=unavail_inputs,
            settings=SolverSettings(fairness_weight=0.5)
        )

        for alloc in solver_res.allocations:
            new_alloc = Allocation(
                exam_hall_id=alloc.exam_hall_id,
                faculty_id=alloc.faculty_id,
                status="draft",  # Unpublished draft state as required!
                is_locked=False,
                created_by="solver",
            )
            db.add(new_alloc)

        # 9. Initial Audit Log
        audit = AuditLog(
            actor_user_id=admin_user.id,
            action="SYSTEM_INIT_SEED",
            details_json=json.dumps({
                "message": f"Initialized sample university dataset with 40 faculty, 12 halls, 25 exams, and {len(solver_res.allocations)} draft allocations",
                "is_sample": True
            })
        )
        db.add(audit)

        # 10. Initial Welcome Notification for Dr. Rao
        dr_rao_user = db.query(User).filter(User.faculty_id == dr_rao.id).first()
        if dr_rao_user:
            notif = Notification(
                user_id=dr_rao_user.id,
                type="system",
                title="Exam Schedule Published for Nov 2026",
                body="The End-Semester Exam Schedule has been drafted. Please verify your profile and mark unavailabilities if any.",
                is_read=False
            )
            db.add(notif)

        db.commit()
        print(f"[SEED] Successfully seeded: {len(faculty_records)} faculty, {len(hall_records)} halls, {len(exam_records)} exams.")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] Failed to seed database: {e}")
        raise e
    finally:
        if close_at_end:
            db.close()

def reset_and_seed_demo_data(db: Session, actor_user_id = None) -> dict:
    seed_database(db)
    if actor_user_id:
        audit = AuditLog(
            actor_user_id=actor_user_id,
            action="RESET_DEMO_DATA",
            details_json=json.dumps({"message": "Admin triggered full reset to seeded demo dataset with draft allocations."})
        )
        db.add(audit)
        db.commit()
    return {
        "success": True,
        "message": "Demo data successfully reset to initial sample state with 40 faculty, 12 halls, 25 exams, and unpublished draft allocations."
    }

if __name__ == "__main__":
    seed_database()
