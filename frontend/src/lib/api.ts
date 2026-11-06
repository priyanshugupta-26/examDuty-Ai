export function getApiBaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || "").trim();

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("examduty_api_url");
    if (saved && saved.trim()) return saved.trim();

    // If an external production URL is configured
    if (url && url.startsWith("http") && !url.includes("localhost")) {
      return url.endsWith("/api") ? url : `${url.replace(/\/$/, "")}/api`;
    }

    // If running on localhost
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return url || "http://localhost:8000/api";
    }

    // When deployed on Render or cloud container without explicit backend URL, use relative proxy
    if (!url || url.includes("localhost")) {
      return "/api";
    }
  }

  if (url) {
    return url.endsWith("/api") ? url : `${url.replace(/\/$/, "")}/api`;
  }
  return "http://localhost:8000/api";
}

export const API_BASE_URL = getApiBaseUrl();

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface User {
  id: number;
  email: string;
  role: "admin" | "faculty";
  faculty_id?: number | null;
  is_active: boolean;
  faculty?: {
    id: number;
    faculty_code: string;
    name: string;
    department: string;
    designation: string;
    email: string;
    phone?: string;
    max_duties: number;
    past_duties: number;
  } | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SystemStats {
  total_faculty: number;
  total_halls: number;
  total_exams: number;
  total_allocations: number;
  is_sample_data: boolean;
  fairness_score?: number;
}

export interface DemoUser {
  role: "admin" | "faculty";
  name: string;
  email: string;
  password: string;
  badge: string;
}

export interface AllocationItem {
  id: number;
  exam_hall_id: number;
  exam_id: number;
  hall_id: number;
  faculty_id: number;
  faculty_name: string;
  faculty_code: string;
  faculty_dept: string;
  subject_name: string;
  subject_code: string;
  department_owner: string;
  date: string;
  session: "FN" | "AN";
  start_time: string;
  end_time: string;
  hall_name: string;
  hall_block: string;
  student_count: number;
  status: "draft" | "published" | "swapped";
  is_locked: boolean;
  created_by: string;
}

export interface AllocationResponse {
  allocations: AllocationItem[];
  is_published: boolean;
  total_allocations: number;
  fairness_score: number;
}

export interface SolveSettings {
  students_per_invigilator: number;
  avoid_own_department: boolean;
  avoid_back_to_back: boolean;
  fairness_weight: number;
  keep_locked: boolean;
}

export interface SolveResult {
  success: boolean;
  status: string;
  slots_filled?: number;
  fairness_score?: number;
  execution_time_ms: number;
  message: string;
  reasons?: string[];
  unfilled_slots?: string[];
}

export interface ValidationReport {
  conflicts: string[];
  warnings: string[];
  conflicts_count: number;
  unfilled_count: number;
  fairness_score: number;
  is_valid: boolean;
}

export interface FacultyItem {
  id: number;
  faculty_code: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  phone?: string;
  max_duties: number;
  past_duties: number;
  assigned_duties: number;
  unavailabilities: Array<{
    id: number;
    date: string;
    session: string;
    reason?: string;
  }>;
  is_active: boolean;
}

export interface HallItem {
  id: number;
  name: string;
  block: string;
  floor: number;
  capacity: number;
  is_active: boolean;
}

export interface ExamItem {
  id: number;
  date: string;
  session: "FN" | "AN";
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  branch: string;
  year: number;
  semester: number;
  department_owner: string;
  halls: Array<{
    exam_hall_id: number;
    hall_id: number;
    hall_name: string;
    student_count: number;
    invigilators_required: number;
    allocations_count: number;
  }>;
  total_students: number;
  invigilators_required: number;
  status: string;
}

export interface ImportPreviewRow {
  row_number: number;
  data: Record<string, string>;
  is_valid: boolean;
  errors: string[];
}

export interface ImportPreviewResponse {
  success: boolean;
  error?: string;
  total_rows: number;
  valid_rows_count: number;
  invalid_rows_count: number;
  rows: ImportPreviewRow[];
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  related_allocation_id?: number | null;
  is_read: boolean;
  created_at: string;
}

export interface SwapItem {
  id: number;
  allocation_id: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
  validation_message: string;
  is_valid: boolean;
  created_at: string;
  from_faculty: {
    id: number;
    name: string;
    code: string;
    department: string;
  };
  to_faculty?: {
    id: number;
    name: string;
    code: string;
    department: string;
  } | null;
  exam: {
    subject_name: string;
    subject_code: string;
    department_owner: string;
    date: string;
    session: string;
    start_time: string;
    end_time: string;
    hall_name: string;
    hall_block: string;
  };
}

export interface DashboardData {
  success: boolean;
  stats: {
    total_exams: number;
    total_halls: number;
    total_faculty: number;
    total_allocations: number;
    total_slots_needed: number;
    coverage_pct: number;
    fairness_score: number;
  };
  allocation_health: {
    conflicts_count: number;
    unfilled_count: number;
    fairness_score: number;
    average_duties: number;
  };
  fairness_chart: {
    bars: Array<{
      id: number;
      code: string;
      name: string;
      department: string;
      duties: number;
      past_duties: number;
      total_duties: number;
      max_duties: number;
    }>;
    average_duties: number;
    min_duties: number;
    max_duties: number;
  };
  upcoming_sessions: Array<{
    date: string;
    session: "FN" | "AN";
    time: string;
    subject_name: string;
    subject_code: string;
    branch: string;
    halls_count: number;
    student_count: number;
    status: string;
  }>;
  recent_activity: Array<{
    id: number;
    action: string;
    actor: string;
    summary: string;
    timestamp: string;
  }>;
}

export interface ReportsSummary {
  success: boolean;
  fairness: {
    fairness_score: number;
    total_faculty: number;
    total_allocations: number;
    average_duties: number;
    min_duties: number;
    max_duties: number;
    std_dev: number;
    least_busy_faculty: Array<{ name: string; department: string; duties: number }>;
    most_busy_faculty: Array<{ name: string; department: string; duties: number }>;
  };
  department_summary: Array<{
    department: string;
    faculty_count: number;
    assigned_duties: number;
    past_duties: number;
    total_duties: number;
    average_duties: number;
    exams_owned: number;
  }>;
  faculty_workload: Array<{
    id: number;
    faculty_code: string;
    name: string;
    department: string;
    designation: string;
    past_duties: number;
    assigned_duties: number;
    total_duties: number;
    max_duties: number;
    is_compliant: boolean;
    compliance_status: string;
  }>;
  total_exams: number;
  total_faculty: number;
  total_allocations: number;
}

export interface AuditLogItem {
  id: number;
  action: string;
  actor_id?: number | null;
  actor_name: string;
  actor_email: string;
  details_json?: string;
  summary: string;
  created_at: string;
}

export interface AuditLogResponse {
  success: boolean;
  total: number;
  limit: number;
  offset: number;
  logs: AuditLogItem[];
}

export interface FacultyDutyItem {
  id: number;
  exam_hall_id: number;
  date: string;
  session: "FN" | "AN";
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  branch: string;
  year: number;
  semester: number;
  hall_name: string;
  hall_block: string;
  hall_floor: number;
  student_count: number;
  status: string;
  is_locked: boolean;
  is_past: boolean;
}

export interface FacultyPortalDutiesResponse {
  faculty: {
    id: number;
    name: string;
    faculty_code: string;
    department: string;
    designation: string;
    email: string;
    max_duties: number;
    past_duties: number;
  };
  duties: FacultyDutyItem[];
  next_duty: FacultyDutyItem | null;
  total: number;
  upcoming: number;
  past: number;
}

export interface ChatDiffItem {
  allocation_id?: number;
  slot_id: string;
  date: string;
  session: string;
  subject_name: string;
  subject_code: string;
  hall_name: string;
  old_faculty_id?: number;
  old_faculty_name: string;
  new_faculty_id: number;
  new_faculty_name: string;
  reason: string;
}

export interface ChatActionItem {
  tool: string;
  params: Record<string, unknown>;
  summary: string;
}

export interface ChatResponse {
  message: string;
  actions_taken: ChatActionItem[];
  diff: ChatDiffItem[];
  needs_confirmation: boolean;
  pending_action_id?: string | null;
  can_undo: boolean;
}

export interface DutyExplanation {
  success: boolean;
  allocation_id: number;
  faculty_name: string;
  faculty_department: string;
  subject_name: string;
  subject_code: string;
  exam_department_owner: string;
  date: string;
  session: string;
  hall_name: string;
  hall_location: string;
  explanation: {
    department_shield: string;
    workload_equity: string;
    availability_verified: string;
    venue_suitability: string;
    human_summary: string;
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("examduty_token");
  }

  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("examduty_token", token);
    }
  }

  clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("examduty_token");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let err: ApiError;
      try {
        err = await response.json();
      } catch {
        err = {
          error: response.statusText,
          message: `Request failed with status ${response.status}`,
        };
      }
      throw err;
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  async getDemoUsers(): Promise<DemoUser[]> {
    return this.request<DemoUser[]>("/auth/demo-users");
  }

  // System endpoints
  async getSystemStats(): Promise<SystemStats> {
    return this.request<SystemStats>("/system/stats");
  }

  async adminCheck(): Promise<{ status: string; message: string; role: string }> {
    return this.request<{ status: string; message: string; role: string }>("/admin/check");
  }

  async facultyCheck(): Promise<{ status: string; message: string; role: string }> {
    return this.request<{ status: string; message: string; role: string }>("/faculty/check");
  }

  // Allocation Endpoints (Stage 3)
  async getAllocations(): Promise<AllocationResponse> {
    return this.request<AllocationResponse>("/allocation");
  }

  async solveAllocations(settings: Partial<SolveSettings>): Promise<SolveResult> {
    return this.request<SolveResult>("/allocation/solve", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  }

  async publishAllocations(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/allocation/publish", {
      method: "POST",
    });
  }

  async swapManual(allocation_id: number, target_faculty_id: number): Promise<{ success: boolean; broken_rule?: string; message?: string }> {
    return this.request<{ success: boolean; broken_rule?: string; message?: string }>("/allocation/swap-manual", {
      method: "POST",
      body: JSON.stringify({ allocation_id, target_faculty_id }),
    });
  }

  async toggleLock(allocation_id: number, is_locked: boolean): Promise<{ success: boolean; is_locked: boolean; message: string }> {
    return this.request<{ success: boolean; is_locked: boolean; message: string }>("/allocation/lock", {
      method: "POST",
      body: JSON.stringify({ allocation_id, is_locked }),
    });
  }

  async getValidation(): Promise<ValidationReport> {
    return this.request<ValidationReport>("/allocation/validation");
  }

  // Faculty CRUD (Stage 2)
  async listFaculty(): Promise<FacultyItem[]> {
    return this.request<FacultyItem[]>("/faculty");
  }

  async createFaculty(data: any): Promise<{ success: boolean; id: number; message: string }> {
    return this.request<{ success: boolean; id: number; message: string }>("/faculty", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateFaculty(id: number, data: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/faculty/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteFaculty(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/faculty/${id}`, {
      method: "DELETE",
    });
  }

  async addUnavailability(faculty_id: number, data: { date: string; session: string; reason?: string }): Promise<{ success: boolean; id: number; message: string }> {
    return this.request<{ success: boolean; id: number; message: string }>(`/faculty/${faculty_id}/unavailability`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteUnavailability(unavail_id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/faculty/unavailability/${unavail_id}`, {
      method: "DELETE",
    });
  }

  async getFacultyDuties(faculty_id: number): Promise<any[]> {
    return this.request<any[]>(`/faculty/${faculty_id}/duties`);
  }

  // Halls CRUD (Stage 2)
  async listHalls(): Promise<HallItem[]> {
    return this.request<HallItem[]>("/halls");
  }

  async createHall(data: any): Promise<{ success: boolean; id: number; message: string }> {
    return this.request<{ success: boolean; id: number; message: string }>("/halls", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateHall(id: number, data: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/halls/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async toggleHallActive(id: number): Promise<{ success: boolean; is_active: boolean; message: string }> {
    return this.request<{ success: boolean; is_active: boolean; message: string }>(`/halls/${id}/toggle-active`, {
      method: "PATCH",
    });
  }

  async deleteHall(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/halls/${id}`, {
      method: "DELETE",
    });
  }

  // Exams CRUD (Stage 2)
  async listExams(): Promise<ExamItem[]> {
    return this.request<ExamItem[]>("/exams");
  }

  async createExam(data: any): Promise<{ success: boolean; id: number; message: string }> {
    return this.request<{ success: boolean; id: number; message: string }>("/exams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateExam(id: number, data: any): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/exams/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteExam(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/exams/${id}`, {
      method: "DELETE",
    });
  }

  // Excel Import & Templates (Stage 2)
  getTemplateUrl(entity: string): string {
    return `${API_BASE_URL}/templates/${entity}`;
  }

  async previewImport(entity: string, file: File): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<ImportPreviewResponse>(`/import/${entity}/preview`, {
      method: "POST",
      body: formData,
    });
  }

  async commitImport(entity: string, rows: Record<string, string>[]): Promise<{ success: boolean; inserted_count: number; message: string }> {
    return this.request<{ success: boolean; inserted_count: number; message: string }>(`/import/${entity}/commit`, {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  // Stage 4: Faculty Portal & Notifications
  async getFacultyPortalDuties(): Promise<FacultyPortalDutiesResponse> {
    return this.request<FacultyPortalDutiesResponse>("/faculty-portal/me/duties");
  }

  getDutyLetterPdfUrl(): string {
    const token = this.getToken();
    return `${API_BASE_URL}/faculty-portal/me/duty-letter?token=${token || ""}`;
  }

  async downloadDutyLetterBlob(): Promise<Blob> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE_URL}/faculty-portal/me/duty-letter`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error("Failed to download duty letter");
    }
    return res.blob();
  }

  async downloadDutyLetterFile(facultyCode?: string): Promise<void> {
    const blob = await this.downloadDutyLetterBlob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VFSTR_Duty_Order_${facultyCode || "Faculty"}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async getInstructions(): Promise<Record<string, string>> {
    return this.request<Record<string, string>>("/instructions");
  }

  async getNotifications(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>("/notifications");
  }

  async getUnreadNotificationCount(): Promise<{ unread_count: number }> {
    return this.request<{ unread_count: number }>("/notifications/unread-count");
  }

  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/notifications/mark-all-read", {
      method: "POST",
    });
  }

  // Stage 5: Swap Requests
  async listSwaps(): Promise<SwapItem[]> {
    return this.request<SwapItem[]>("/swaps");
  }

  async createSwap(data: { allocation_id: number; to_faculty_id?: number | null; reason: string }): Promise<{
    success: boolean;
    id: number;
    is_valid: boolean;
    validation_message: string;
    message: string;
  }> {
    return this.request<{
      success: boolean;
      id: number;
      is_valid: boolean;
      validation_message: string;
      message: string;
    }>("/swaps", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async approveSwap(swap_id: number, feedback?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/swaps/${swap_id}/approve`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  }

  async rejectSwap(swap_id: number, feedback?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/swaps/${swap_id}/reject`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
  }

  // Stage 6: AI Assistant
  async assistantChat(message: string, history?: Array<{ role: string; content: string }>): Promise<ChatResponse> {
    return this.request<ChatResponse>("/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  }

  async assistantConfirm(pending_action_id: string): Promise<{ success: boolean; message: string; applied_count: number; can_undo: boolean }> {
    return this.request<{ success: boolean; message: string; applied_count: number; can_undo: boolean }>("/assistant/confirm", {
      method: "POST",
      body: JSON.stringify({ pending_action_id }),
    });
  }

  async assistantCancel(pending_action_id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/assistant/cancel", {
      method: "POST",
      body: JSON.stringify({ pending_action_id }),
    });
  }

  async assistantUndo(): Promise<{ success: boolean; message: string; can_undo: boolean }> {
    return this.request<{ success: boolean; message: string; can_undo: boolean }>("/assistant/undo", {
      method: "POST",
    });
  }

  async explainDuty(allocation_id: number): Promise<DutyExplanation> {
    return this.request<DutyExplanation>(`/assistant/explain-duty/${allocation_id}`);
  }

  // Stage 7: Analytics, Reports, Audit & System Reset
  async getDashboardData(): Promise<DashboardData> {
    return this.request<DashboardData>("/system/dashboard");
  }

  async getReportsSummary(): Promise<ReportsSummary> {
    return this.request<ReportsSummary>("/reports/summary");
  }

  async downloadReportsExcel(): Promise<void> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE_URL}/reports/export-excel`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error("Failed to export Excel report");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VFSTR_ExamDuty_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async getAuditLogs(params?: { action_type?: string; search?: string; limit?: number; offset?: number }): Promise<AuditLogResponse> {
    const q = new URLSearchParams();
    if (params?.action_type && params.action_type !== "all") q.set("action_type", params.action_type);
    if (params?.search) q.set("search", params.search);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const endpoint = `/audit-logs${q.toString() ? "?" + q.toString() : ""}`;
    return this.request<AuditLogResponse>(endpoint);
  }

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/system/reset-demo", {
      method: "POST",
    });
  }

  async getSettings(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/system/settings");
  }

  async updateSetting(key: string, payload: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/system/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
