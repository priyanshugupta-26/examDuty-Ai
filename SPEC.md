# PROJECT: ExamDuty AI — Examination Management & Duty Allocation Agent
# For: VFSTR (Vignan's Foundation for Science, Technology & Research) — Agentic AI Hackathon 2.0, Track 1, Problem 1

You are a senior full-stack engineer AND a senior product designer. Build a complete, working, demo-ready web application. Quality bar: it must look and feel like a polished modern SaaS product (think Linear / Stripe Dashboard / Notion level of clarity), not a college project. Work in the stages listed at the end. After each stage: run it, test it, fix errors, and only then continue. Never leave placeholder "TODO" screens.

--------------------------------------------------------------------
## 1. PRODUCT SUMMARY
Faculty invigilation duties are allocated manually today, causing clashes, unequal duty distribution and communication gaps. ExamDuty AI automatically allocates faculty to exam halls using a constraint solver (hard rules + fairness), shows each faculty member their duties, notifies them, and includes an AI agent that handles last-minute changes in plain English ("Dr. Rao is sick on 12 Nov, replace him") with minimal disruption.

Users: (1) Admin / Exam Cell, (2) Faculty. Two roles only.

--------------------------------------------------------------------
## 2. TECH STACK (fixed, do not change)
- Frontend: Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui + lucide-react icons + Recharts (charts) + TanStack Table (tables) + react-hook-form + zod + sonner (toasts) + framer-motion (subtle animations only).
- Backend: Python FastAPI + SQLAlchemy + SQLite (file DB, zero setup) + Pydantic.
- Solver: Google OR-Tools CP-SAT.
- AI agent: Google Gemini API (gemini-2.0-flash or latest flash) using function/tool calling. API key from env GEMINI_API_KEY. If the key is missing, fall back to a deterministic rule-based intent parser so the demo still works offline.
- Auth: JWT (access token, httpOnly cookie or Authorization header), bcrypt password hashing, role-based route protection on BOTH backend and frontend.
- Excel: openpyxl / pandas for import and for downloadable templates.
- PDF: reportlab for duty letters.
- Email: SMTP via env vars; if not configured, log the email to console and store it in the in-app notification table (never crash).
- Structure as a monorepo: /backend, /frontend, /README.md, /docker-compose.yml (optional), .env.example.
- Backend runs on :8000, frontend on :3000, CORS configured.

--------------------------------------------------------------------
## 3. DESIGN SYSTEM (follow strictly — consistency is the #1 priority)

### 3.1 Design principles
1. Clarity over decoration. A first-time user must understand any screen in 5 seconds.
2. One primary action per screen, visually dominant.
3. Generous whitespace, strong hierarchy, consistent alignment on an 8px grid.
4. Color is used for meaning (status), not decoration.
5. Every screen has: loading skeleton, empty state (with illustration/icon + helpful text + action button), error state, and success feedback.

### 3.2 Color tokens (define as CSS variables in globals.css and map into tailwind.config)
Light theme (default):
- --bg: #F8FAFC (page background, slate-50)
- --surface: #FFFFFF (cards)
- --surface-muted: #F1F5F9 (table headers, subtle blocks)
- --border: #E2E8F0
- --text: #0F172A (primary text)
- --text-muted: #475569 (secondary text)
- --text-subtle: #94A3B8 (hints, placeholders)
- --primary: #3B5BDB (indigo-blue; buttons, active nav, links)
- --primary-hover: #364FC7
- --primary-soft: #EDF2FF (selected rows, active nav background, badges)
- --accent: #0CA678 (teal-green; positive highlights, "balanced" fairness)
- --success: #12B886 / soft #E6FCF5
- --warning: #F59F00 / soft #FFF9DB
- --danger: #E03131 / soft #FFF5F5
- --info: #1C7ED6 / soft #E7F5FF
Dark theme (toggle in header, persisted): bg #0B1120, surface #111A2E, muted surface #17223B, border #24314D, text #E6EAF2, muted text #9AA7C0, primary #748FFC, primary-soft rgba(116,143,252,0.14); status colors lightened accordingly. Verify WCAG AA contrast (4.5:1 body text) in both themes.
Chart palette (colorblind-safe, in order): #3B5BDB, #0CA678, #F59F00, #E64980, #7048E8, #1098AD.
Status color mapping used everywhere: Allocated=success, Pending/Unassigned=warning, Conflict/Leave=danger, Swap requested=info, Completed=neutral slate.

### 3.3 Typography
- Headings: "Plus Jakarta Sans" (600/700). Body/UI: "Inter" (400/500/600). Codes/IDs (subject code, hall id): "JetBrains Mono". Load via next/font.
- Scale: H1 30/36 (page title), H2 22/28, H3 18/24, body 14/20 (default), small 12/16. Tabular numbers (font-variant-numeric: tabular-nums) for all counts and dates.

### 3.3b Spacing, shape, elevation
- 8px spacing grid. Card radius 12px, inputs/buttons radius 8px, badges fully rounded.
- Cards: 1px border + very soft shadow (0 1px 2px rgba(15,23,42,0.06)). Hover on interactive cards: shadow-md + border-primary/30. No heavy shadows, no gradients except one subtle gradient on the login hero panel (primary → #5C7CFA).
- Max content width 1280px, page padding 24px desktop / 16px mobile.

### 3.4 Layout
- Desktop: fixed left sidebar (240px, collapsible to 72px icon-only) + top header (page title, global search, notification bell with unread badge, theme toggle, user menu) + main content.
- Mobile/tablet: sidebar becomes a slide-over drawer; tables become stacked cards; everything fully responsive down to 360px.
- Breadcrumbs on inner pages. Sticky table headers. Keyboard accessible, visible focus rings (2px primary), aria-labels, semantic HTML.
- Admin sidebar: Dashboard, Exam Schedule, Halls, Faculty, Allocation, AI Assistant, Swap Requests, Notifications, Reports, Settings, Audit Log.
- Faculty sidebar: My Duties, Calendar, Swap Requests, Instructions, Notifications, Profile.

### 3.5 Component rules
- Buttons: primary (filled), secondary (outline), ghost, destructive; sizes sm/md/lg; loading spinner state; icons on the left.
- Badges for status with soft background + colored text + dot.
- Tables: search, column sort, filters, pagination, row hover, empty state, CSV/Excel export button.
- Forms: labels above inputs, inline validation messages, helper text, disabled states.
- Modals/drawers via shadcn Dialog/Sheet. Confirm dialogs for destructive actions.
- Toasts for every mutation (success/error).
- Stat cards: big number, label, small trend/context line, icon in a soft colored square.
- Microcopy: plain, friendly, no jargon. Example: "No duties assigned yet — you're all clear." not "Null result set."

--------------------------------------------------------------------
## 4. PAGES & EXACT CONTENT

### 4.1 Login (/login) — split layout
Left: brand panel with subtle gradient, logo mark, headline "Fair, conflict-free exam duties in one click", 3 bullet benefits with icons. Right: clean form (email, password, show/hide, "Sign in" button, error message area). Include a small "Demo access" collapsible showing demo admin/faculty credentials (sample only).

### 4.2 Admin Dashboard (/admin)
- Row of 4 stat cards: Total Exams, Halls in Use, Faculty Available, Duties Allocated (with % coverage).
- "Allocation Health" card: Conflicts (target 0, green when 0), Unfilled slots, Fairness score (0–100, with explanation tooltip).
- Fairness bar chart: duties per faculty (sorted), with average line.
- Upcoming exam sessions list (next 5), each with date, session, hall count, status badge.
- Quick actions: "Import Excel", "Run Auto-Allocation", "Ask AI Assistant".
- Recent activity feed (from audit log).

### 4.3 Exam Schedule (/admin/exams)
Table: Date, Session (FN/AN), Subject Name, Subject Code (mono), Branch, Year, Semester, Hall(s), Student count, Invigilators required, Status. Add/Edit via side sheet. Excel import with preview step: show parsed rows, highlight invalid rows in red with reasons, confirm to commit. "Download template" button.

### 4.4 Halls (/admin/halls)
Cards/table: Hall name, Block/Building, Floor, Capacity, Active toggle. Excel import. Inline edit.

### 4.5 Faculty (/admin/faculty)
Table: Name, Faculty ID, Department, Designation, Email, Phone, Max duties, Past duty count (carry-over), Status. Row drawer with tabs: Profile, Availability/Leave (calendar picker to mark unavailable date+session with reason), Duty history. Excel import.

### 4.6 Allocation (/admin/allocation) — the hero screen
- Top bar: select exam period, "Run Auto-Allocation" primary button, "Re-run (keep locked)" option, "Publish & Notify" button (disabled until zero conflicts).
- Settings drawer: invigilators per N students (default 30), max duties per faculty, avoid own-department toggle, avoid back-to-back sessions toggle, fairness weight slider.
- Main view: toggle between (a) Grid view: rows = sessions (date+FN/AN), columns = halls, cells = assigned faculty chips (drag-and-drop to manually swap with live rule validation; lock icon to pin an assignment) and (b) List view table.
- Right panel: live "Validation" list: conflicts, warnings, unfilled slots with one-click "Fix" suggestions.
- After running, show a result summary modal: slots filled, conflicts 0, fairness before/after, time taken (ms).
- Draft vs Published state. Nothing is sent to faculty until Published.

### 4.6b AI Assistant (/admin/assistant)
Chat UI (messages, typing indicator, suggestion chips: "Replace a faculty on leave", "Who has the fewest duties?", "Show conflicts on 12 Nov"). The agent must show a visible "Actions taken" card under its reply listing each tool call (e.g., "Marked Dr. Rao unavailable 12 Nov FN → Re-ran solver → 2 assignments changed → 2 notifications queued") with a "View changes" diff and an "Undo" button. Destructive/bulk changes require a confirm step ("Apply these 2 changes?").

### 4.7 Swap Requests (both roles)
Faculty: create request (pick my duty, optional target colleague, reason). Admin: approve/reject. Backend validates all hard rules for the swap automatically and shows "Valid ✓" or the exact broken rule before approval.

### 4.8 Faculty: My Duties (/faculty)
- Header greeting + next duty highlight card (date, time, hall, subject, countdown).
- Table/cards of all duties: Hall, Block/Floor, Subject name, Subject code, Branch, Year, Session & time, Number of students in hall, Status. Filters: upcoming/past. "Download duty letter (PDF)", "Request swap" per row.
- Calendar view (month) with colored duty markers.
- Instructions page: structured accordion — Before the exam, During the exam, Malpractice handling, After the exam, Emergency contacts — editable by admin in Settings.

### 4.9 Notifications (both roles)
List with unread state, type icons (assigned, changed, swapped, reminder), mark all read, deep link to the related duty. Bell dropdown shows latest 5.

### 4.10 Reports (admin)
Fairness report (duties per faculty, min/max/avg/std-dev), department-wise distribution, hall utilization, export to Excel/PDF.

### 4.11 Audit Log (admin)
Who did what, when (imports, runs, manual edits, agent actions, publishes). Filterable.

--------------------------------------------------------------------
## 5. DATABASE MODELS (SQLAlchemy)
User(id, email, password_hash, role[admin|faculty], faculty_id nullable, is_active)
Faculty(id, faculty_code, name, department, designation, email, phone, max_duties, past_duties)
Hall(id, name, block, floor, capacity, is_active)
Exam(id, date, session[FN|AN], start_time, end_time, subject_name, subject_code, branch, year, semester, department_owner)
ExamHall(id, exam_id, hall_id, student_count, invigilators_required)
Unavailability(id, faculty_id, date, session, reason)
Allocation(id, exam_hall_id, faculty_id, status[draft|published|swapped], is_locked, created_by[solver|admin|agent], created_at)
SwapRequest(id, from_allocation_id, to_faculty_id nullable, reason, status, validation_message)
Notification(id, user_id, type, title, body, related_allocation_id, is_read, created_at)
AuditLog(id, actor_user_id, action, details_json, created_at)
Setting(key, value_json)  # rule parameters, instructions content
Add proper indexes and foreign keys.

--------------------------------------------------------------------
## 6. SOLVER SPEC (OR-Tools CP-SAT) — most important logic
Decision variable x[f, s] ∈ {0,1} per faculty f and invigilator-slot s (slot = exam_hall × position).
HARD constraints:
1. Every slot filled by exactly one faculty (if infeasible, return a clear explanation of which sessions lack faculty).
2. A faculty has at most one duty per (date, session) — no overlap.
3. Respect Unavailability (leave) strictly.
4. A faculty cannot invigilate an exam owned by their own department (configurable toggle).
5. Invigilators per hall = ceil(student_count / N), N default 30 (configurable).
6. Each faculty ≤ max_duties.
7. Locked allocations stay fixed.
SOFT objectives (weighted, minimize):
- Minimize (max_duties_assigned − min_duties_assigned), counting past_duties carry-over.
- Penalize back-to-back sessions on the same day (configurable).
- Prefer minimal change vs previous allocation during re-runs (large penalty per changed assignment).
Set a time limit (e.g., 20s) and num_workers=8; return status, objective, and per-faculty counts. Expose a function reallocate_minimal(changes) used by the agent, which fixes all unaffected assignments and only re-solves the affected slots. Write pytest tests for each hard constraint, for infeasible cases, and for minimal-change re-allocation.

--------------------------------------------------------------------
## 7. AI AGENT SPEC (Gemini function calling)
System prompt: "You are the exam-cell assistant for VFSTR. Use tools; never invent data; confirm before applying bulk changes; keep replies short and clear."
Tools (each logged to AuditLog and returned in the 'Actions taken' card):
- get_faculty_duties(faculty_name_or_id)
- list_conflicts(date?)
- mark_faculty_unavailable(faculty, date, session?, reason)
- reallocate_minimal(date?, session?)  → returns diff of changed assignments
- explain_assignment(allocation_id | faculty+date+session) → human reason using duty counts vs average, constraints satisfied, availability
- find_replacement(faculty, date, session) → ranked candidates with reasons
- send_notifications(allocation_ids)
- get_fairness_stats()
Flow for "Dr. X is on leave on 12 Nov": resolve faculty (ask if ambiguous) → mark unavailable → reallocate_minimal → present diff → on confirm, apply and notify ONLY affected faculty. Faculty-facing "Why did I get this duty?" explain feature (button on each duty row) calls explain_assignment. Rule-based fallback parser if no API key.

--------------------------------------------------------------------
## 8. SECURITY & PRIVACY
bcrypt hashing; JWT with expiry; role guards (admin-only endpoints return 403 for faculty); faculty can only read their own duties/notifications; input validation (Pydantic/zod); file upload type and size limits; rate-limit login; no secrets in code (.env); audit log for admin actions; CORS restricted to frontend origin.

--------------------------------------------------------------------
## 9. DATA RULES
- Provide a seed script with clearly labelled SAMPLE data (a "SAMPLE DATA" banner visible in the admin UI while sample data is loaded): ~40 faculty across 5 departments, 12 halls, 5 exam days × 2 sessions, ~25 exams. Include a "Reset sample data" and "Clear all & import real data" button in Settings.
- Provide downloadable Excel templates for faculty, halls, exams and leave with exact column names and example rows.
- Never present sample data as real institutional data.
- Seed a ready demo scenario: after running allocation, one faculty on leave on a busy day, so the AI replacement demo works in seconds.

--------------------------------------------------------------------
## 10. NON-FUNCTIONAL REQUIREMENTS
- Responsive, accessible (keyboard nav, aria labels, AA contrast), dark mode.
- Fast: allocation of 40 faculty × 50 slots under 5 seconds; page loads with skeletons.
- Clean code: typed API client in frontend, service layer in backend, OpenAPI docs at /docs, consistent error format {error, message, details}.
- Android add-on (optional, last): make the frontend a PWA (manifest + service worker + installable) so it can be wrapped as an Android app (Capacitor).

--------------------------------------------------------------------
## 11. BUILD STAGES (stop and verify after each)
Stage 1: Repo scaffold, design tokens, layout shell (sidebar, header, theme toggle), login + JWT + role guards, DB models, seed script.
Stage 2: Excel import/templates with preview+validation for faculty, halls, exams, leave; CRUD pages.
Stage 3: CP-SAT solver + pytest tests + Allocation page (grid/list, validation panel, settings drawer, publish).
Stage 4: Faculty dashboard (duties, calendar, instructions, PDF duty letter), notifications (in-app + email fallback).
Stage 5: Swap requests with automatic rule validation.
Stage 6: AI assistant (tool calling, actions-taken card, undo, explain feature, offline fallback).
Stage 7: Reports, audit log, fairness charts, dashboard polish, empty/loading/error states everywhere.
Stage 8: PWA setup, final QA pass (responsive, dark mode, accessibility), README with setup + demo script + architecture diagram.

## 12. DELIVERABLES
Working app, README (install, env vars, run, demo walkthrough), .env.example, seed data, sample Excel templates, pytest suite passing, and a short DEMO_SCRIPT.md (5-minute flow: login → import → run allocation → fairness chart → AI leave replacement → faculty view → duty letter).

## 13. DO NOT
- Do not use random/lorem content in the UI; use realistic university copy.
- Do not use more than the defined colors; no neon, no rainbow gradients.
- Do not skip loading/empty/error states.
- Do not hardcode secrets.
- Do not build features outside this spec until all stages pass.