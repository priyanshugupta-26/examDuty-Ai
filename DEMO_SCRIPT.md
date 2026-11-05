# ExamDuty AI — 5-Minute Demonstration Script

> **Target Audience:** Hackathon Judges, University Leadership, Examination Cell Deans  
> **Total Time:** 5 Minutes  
> **Environment:** Localhost (`http://localhost:3000` & `http://localhost:8000`)

---

## ⏱️ Demonstration Timeline Summary

| Time | Phase | Target Screen | Key Takeaway / Value |
|---|---|---|---|
| **0:00 – 0:45** | 1. Admin Dashboard & Health | `/admin` | Zero conflicts, 95/100 fairness score, cohort distribution chart |
| **0:45 – 1:30** | 2. Excel Import & Data Prep | `/admin/exams`, `/admin/halls` | Downloadable templates, spreadsheet validation, hall availability |
| **1:30 – 2:30** | 3. CP-SAT Solver & Publishing | `/admin/allocation` | 61 slots solved in <1s, hard constraints guaranteed, one-click publish |
| **2:30 – 3:45** | 4. AI Assistant (Leave & Undo) | `/admin/assistant` | Natural language leave replacement, minimal-change solver, confirm/undo |
| **3:45 – 4:30** | 5. Faculty Portal & Explainability | `/faculty` | "Why this duty?", notification bell, institutional PDF duty letter |
| **4:30 – 5:00** | 6. Reports, Excel Export & Reset | `/admin/reports`, `/admin/settings` | Multi-sheet Excel export and 1-click clean demo reset |

---

## 🎬 Step-by-Step Script & Talking Points

### Minute 1: Login & Institutional Dashboard (0:00 – 0:45)

1. Open your browser to **`http://localhost:3000/login`**.
2. **Action:** Click the top demo pill: **"Admin (Exam Cell)"**.
   - *Notice:* The credentials `admin@vfstr.ac.in` and `admin123` auto-fill. Click **Sign In**.
3. **Screen:** **Admin Dashboard (`/admin`)**.
4. **Speaker Script:**
   > *"Welcome to ExamDuty AI, built for VFSTR university examination operations. Managing invigilation for hundreds of faculty across multi-slot exams is a classical combinatorial nightmare prone to bias, hall capacity violations, and department collisions.
   > 
   > Right on the dashboard, we see our 4 core metrics: 25 examinations, 12 halls, and 40 faculty members. The **Allocation Health** widget shows that our mathematical solver has achieved a **95/100 Fairness Score** with **zero hard conflicts** and **100% duty coverage**.
   > 
   > Below, the **Fairness Workload Bar Chart** displays individual faculty duties against a dashed reference line representing the cohort average of 2.7 duties per faculty member, proving tight variance across the entire institution."*

---

### Minute 2: Excel Import & Academic Data Management (0:45 – 1:30)

1. **Screen:** In the left sidebar, click **"Exams"** (`/admin/exams`).
   - Show the 25 scheduled exams across CSE, ECE, EEE, MECH, and CIVIL.
   - Point to the **"Download Template"** button: Exam cells can download pre-formatted Excel sheets (`VFSTR_Exams_Template.xlsx`) and upload schedules directly.
2. **Screen:** In the sidebar, click **"Halls"** (`/admin/halls`).
   - Switch between **Cards View** and **Table View**.
   - Point out capacity vs. required invigilators (governed by the 30:1 student-to-invigilator ratio).
   - Show the **"Disable"** toggle to take a hall offline for maintenance.
3. **Screen:** In the sidebar, click **"Faculty"** (`/admin/faculty`).
   - Search for **"Rao"** to find **Dr. K. Rao (VF-CSE-001)**.
   - Click **"View / Leave"** on Dr. K. Rao: point out that a medical leave request has already been logged for 12 Nov.

---

### Minute 3: CP-SAT Optimization Solver & Publishing (1:30 – 2:30)

1. **Screen:** In the sidebar, click **"Allocation"** (`/admin/allocation`).
2. **Speaker Script:**
   > *"Here is the Allocation Matrix. In many universities, exam superintendents spend 3 to 4 days manually drafting duty rosters on whiteboards. Let's see how Google OR-Tools CP-SAT solves this in less than a second."*
3. **Action:** Click **"Solver Settings"** at the top right to open the drawer:
   - Highlight the configurable constraints:
     - *Students per invigilator:* 30:1
     - *Avoid Own Department:* Hard constraint
     - *Avoid Back-to-Back sessions:* Soft constraint
     - *Fairness Weight:* 0.5
4. **Action:** Click the primary button **"Run Auto-Allocation"**.
   - **Result:** Within ~300ms, a completion dialog appears:
     - **Status:** Optimal
     - **Slots Filled:** 61 / 61
     - **Hard Conflicts:** 0
     - **Fairness Score:** 95 / 100
5. **Action:** Toggle to **Grid View**:
   - Show the session-by-hall grid.
   - Hover over any faculty badge and click the **Lock icon** (pinning it to ensure future re-allocations never move this duty).
6. **Action:** Click the green button **"Publish & Notify"**:
   - Status transitions from **Draft** to **Published**.
   - Notifications and simulated emails are instantly dispatched to all assigned faculty members.

---

### Minute 4: Autonomous AI Assistant — Leave Replacement & Undo (2:30 – 3:45)

1. **Screen:** In the sidebar, click **"AI Assistant"** (`/admin/assistant`).
2. **Speaker Script:**
   > *"The most stressful part of examination operations happens on the morning of an exam when a professor calls in sick. Instead of manually re-checking all 40 faculty timetables, the exam controller can simply talk to our AI Assistant."*
3. **Action:** Click the suggestion chip or type into the chat input:
   ```text
   Dr. K. Rao is on leave on 12 Nov, replace him
   ```
4. **Watch the Assistant Execution:**
   - The assistant invokes `mark_faculty_unavailable` for Dr. K. Rao on 2026-11-12.
   - It calls `reallocate_minimal`, which **freezes all other 60 unaffected duties** and re-solves only the vacant slot using CP-SAT.
   - It selects an optimal replacement from another department who is under their duty ceiling (e.g. Dr. B. V. Subbarao from CIVIL).
   - An **"Actions Taken"** card appears detailing each tool invocation, and an interactive **"Changes to Review"** diff is displayed.
5. **Action:** Click **"Apply Changes"**:
   - The reassignment is applied to the live database, and notifications are sent strictly to the affected faculty.
6. **Action:** Point out the **"Undo"** button and click it:
   - The system immediately restores the previous state, demonstrating enterprise-grade rollback safety.
7. **Action (Optional):** Type:
   ```text
   Who has the fewest duties?
   ```
   - The assistant queries `get_fairness_stats` and lists the faculty members with available capacity.

---

### Minute 5: Faculty Experience, Duty Letter & Reports (3:45 – 5:00)

1. **Action:** Log out of the Admin portal (top right profile avatar $\rightarrow$ **Sign Out**).
2. **Action:** At `/login`, click **"Faculty (Standard)"** (`p.sharma@vfstr.ac.in` / `faculty123`) and click **Sign In**.
3. **Screen:** **Faculty Portal (`/faculty`)**.
4. **Speaker Script:**
   > *"Now let's see the faculty perspective. Faculty members don't need to sift through 20-page circular PDFs to find their names."*
5. **Show Faculty Features:**
   - **Next Duty Hero Card:** Highlights the exact date, hall, block/floor, and session for their upcoming duty.
   - **Duties Table:** Shows subject code, branch, year, session, and student count.
   - **"Why did I get this duty?" Button:** Click this on any duty row.
     - *Result:* An explainability modal appears detailing why the solver chose this faculty member (department conflict checked, workload within limit, non-overlapping slot).
   - **Notification Bell:** Click the bell in the header to view targeted invigilation alert cards.
   - **Duty Order Letter:** Click **"Download Duty Letter (PDF)"**.
     - Open the downloaded PDF: show the formal VFSTR university letterhead, exam schedule table, invigilator instructions, and Controller of Examinations signature block.

6. **Wrap-Up: Reports & Demo Reset:**
   - Sign back in as Admin (`admin@vfstr.ac.in` / `admin123`).
   - Visit **"Reports" (`/admin/reports`)**:
     - Point to the department workload distribution and click **"Export to Excel (.xlsx)"** to demonstrate instant compliance reporting.
   - Visit **"Settings" (`/admin/settings`)**:
     - Click **"Reset Demo Data"** and confirm.
     - The entire environment is restored to its pristine demo state in 1 second, ready for the next demonstration!

---

## 🏆 Key Talking Points for Judges & Evaluators

- **Constraint Rigor:** We do not rely on LLM hallucinations to create schedules; mathematical constraints are strictly enforced by **Google OR-Tools CP-SAT**.
- **Agentic Value:** The AI Assistant acts as an orchestration layer with Gemini function calling, handling unstructured human requests while delegating mathematical decisions to the solver.
- **Fail-Safe Offline Mode:** If no Gemini API key is configured or network is unavailable, our deterministic rule-based engine automatically takes over without disruption.
- **Explainable AI:** Faculty transparency is prioritized with the "Why did I get this duty?" solver rationale modal.
- **Enterprise Ready:** Comprehensive audit logging, ReportLab PDF letter generation, and openpyxl multi-sheet reporting.

