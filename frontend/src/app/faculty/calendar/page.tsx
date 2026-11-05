"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  FileDown,
  ArrowLeftRight,
  ShieldAlert,
  Info,
  X,
  ArrowLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  FacultyDutyItem,
  FacultyPortalDutiesResponse,
  FacultyItem,
} from "@/lib/api";
import { toast } from "sonner";

export default function FacultyCalendarPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FacultyPortalDutiesResponse | null>(null);
  const [allFaculty, setAllFaculty] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar navigation state: default to November 2026 (exam period)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 10, 1)); // 10 = Nov
  const [selectedDuty, setSelectedDuty] = useState<FacultyDutyItem | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [targetFacultyId, setTargetFacultyId] = useState("");
  const [swapReason, setSwapReason] = useState("");
  const [submittingSwap, setSubmittingSwap] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getFacultyPortalDuties();
      setData(res);
      // If there are duties, check if any is in a different month
      if (res.duties.length > 0) {
        const firstDate = new Date(res.duties[0].date);
        setCurrentDate(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load duty calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    api.listFaculty().then(setAllFaculty).catch(() => {});
  }, []);

  const duties = data?.duties || [];
  const faculty = data?.faculty || user?.faculty;

  // Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar cells
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      duties: FacultyDutyItem[];
      isLeave?: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, day);
      const dateStr = prevDate.toISOString().split("T")[0];
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        duties: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(day).padStart(2, "0");
      const dateStr = `${year}-${mStr}-${dStr}`;

      const dayDuties = duties.filter((d) => d.date === dateStr);
      // Demo leave check for Dr. K. Rao (12 Nov)
      const isLeave =
        faculty?.faculty_code === "VF-CSE-001" && dateStr === "2026-11-12";

      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        duties: dayDuties,
        isLeave,
      });
    }

    // Next month padding to complete 35 or 42 grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split("T")[0];
      cells.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        duties: [],
      });
    }

    return cells;
  }, [year, month, duties, faculty]);

  const handleDownloadPdf = async () => {
    try {
      await api.downloadDutyLetterFile(faculty?.faculty_code);
      toast.success("Duty order letter downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF duty letter.");
    }
  };

  const handleOpenSwapModal = (duty: FacultyDutyItem) => {
    setSelectedDuty(duty);
    setTargetFacultyId("");
    setSwapReason("");
    setSwapModalOpen(true);
  };

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDuty) return;
    if (!swapReason.trim()) {
      toast.error("Please enter a reason for the swap");
      return;
    }

    setSubmittingSwap(true);
    try {
      const res = await api.createSwap({
        allocation_id: selectedDuty.id,
        to_faculty_id: targetFacultyId ? parseInt(targetFacultyId, 10) : null,
        reason: swapReason.trim(),
      });

      if (res.is_valid) {
        toast.success("Swap Request Submitted! Validation: Valid ✓");
      } else {
        toast.warning(`Swap Request Submitted: ${res.validation_message}`);
      }

      setSwapModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to submit swap request");
    } finally {
      setSubmittingSwap(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/faculty"
            className="p-2 rounded-xl text-text-muted hover:bg-surface-muted hover:text-text border border-border/60 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span>Exam Invigilation Calendar</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Visual monthly schedule of assigned examination duties
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Switcher */}
          <div className="flex items-center gap-2 bg-surface-muted p-1 rounded-xl border border-border">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-text px-2 min-w-[120px] text-center">
              {monthName} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPdf}
            leftIcon={<FileDown className="h-4 w-4" />}
          >
            Duty Letter (PDF)
          </Button>
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-surface border border-border text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-text-subtle font-medium">Session Color Key:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="font-semibold text-text">Forenoon (FN: 09:30 AM – 12:30 PM)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span className="font-semibold text-text">Afternoon (AN: 02:00 PM – 05:00 PM)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-danger" />
            <span className="font-semibold text-text">Leave / Unavailable</span>
          </div>
        </div>

        <span className="text-text-muted font-medium">
          Total Assigned Duties: <strong className="text-text font-bold">{duties.length}</strong>
        </span>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 border-b border-border bg-surface-muted/60 text-center text-xs font-bold text-text-muted py-2.5">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
            {calendarDays.map((cell, idx) => (
              <div
                key={idx}
                className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors ${
                  cell.isCurrentMonth
                    ? "bg-surface hover:bg-surface-muted/30"
                    : "bg-surface-muted/30 opacity-40"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      cell.isCurrentMonth ? "text-text" : "text-text-subtle"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                  {cell.duties.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </div>

                {/* Duty Chips or Leave Indicator */}
                <div className="space-y-1.5 my-1">
                  {cell.isLeave && (
                    <div className="p-1 rounded bg-danger-soft border border-danger/20 text-[10px] text-danger font-semibold flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 shrink-0" />
                      <span className="truncate">Leave: Medical</span>
                    </div>
                  )}

                  {cell.duties.map((duty) => (
                    <button
                      key={duty.id}
                      onClick={() => setSelectedDuty(duty)}
                      className={`w-full text-left p-1.5 rounded-lg border text-[11px] leading-tight transition-transform hover:scale-[1.02] shadow-xs cursor-pointer ${
                        duty.session === "FN"
                          ? "bg-primary-soft/80 border-primary/30 text-primary-dark hover:bg-primary-soft"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[10px]">
                        <span className="uppercase">{duty.session}</span>
                        <span>{duty.hall_name}</span>
                      </div>
                      <p className="font-semibold truncate mt-0.5">{duty.subject_name}</p>
                      <p className="text-[10px] opacity-80 mt-0.5 truncate">{duty.subject_code}</p>
                    </button>
                  ))}
                </div>

                <div />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Duty Details Modal / Drawer */}
      {selectedDuty && !swapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Badge variant={selectedDuty.session === "FN" ? "primary" : "warning"}>
                  {selectedDuty.session} Session
                </Badge>
                <h3 className="text-base font-bold text-text">Duty Details</h3>
              </div>
              <button
                onClick={() => setSelectedDuty(null)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] text-text-subtle font-bold uppercase tracking-wider">
                  Subject & Course
                </p>
                <p className="text-base font-bold text-text mt-0.5">{selectedDuty.subject_name}</p>
                <p className="text-xs text-text-muted font-mono">{selectedDuty.subject_code}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedDuty.branch} • Year {selectedDuty.year}, Semester {selectedDuty.semester}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded-xl bg-surface-muted/60 border border-border/50">
                  <p className="text-[10px] text-text-subtle font-medium">Date & Time</p>
                  <p className="font-semibold text-text mt-0.5">{selectedDuty.date}</p>
                  <p className="text-text-muted">
                    {selectedDuty.start_time} - {selectedDuty.end_time}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-muted/60 border border-border/50">
                  <p className="text-[10px] text-text-subtle font-medium">Hall & Candidates</p>
                  <p className="font-semibold text-text mt-0.5">{selectedDuty.hall_name}</p>
                  <p className="text-text-muted">
                    {selectedDuty.hall_block}, Floor {selectedDuty.hall_floor} ({selectedDuty.student_count} students)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                leftIcon={<FileDown className="h-4 w-4" />}
              >
                Duty Letter
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenSwapModal(selectedDuty)}
                leftIcon={<ArrowLeftRight className="h-4 w-4" />}
              >
                Request Swap
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      {swapModalOpen && selectedDuty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-text">Request Duty Swap</h3>
              </div>
              <button
                onClick={() => setSwapModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSwap} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border/60">
                <p className="text-xs font-bold text-text">
                  {selectedDuty.subject_name} ({selectedDuty.subject_code})
                </p>
                <p className="text-xs text-text-muted mt-1">
                  📅 {selectedDuty.date} ({selectedDuty.session}) • 🏛️ {selectedDuty.hall_name}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">
                  Exchange with Colleague (Optional)
                </label>
                <select
                  value={targetFacultyId}
                  onChange={(e) => setTargetFacultyId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Open to Any Available Faculty / Exam Cell Pool --</option>
                  {allFaculty
                    .filter((f) => f.id !== faculty?.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department}) - {f.designation} [{f.faculty_code}]
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">
                  Reason for Swap Request <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Academic duty clash, medical reason..."
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSwapModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingSwap}
                >
                  Submit Swap Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
