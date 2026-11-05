"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Building2,
  BookOpen,
  ArrowLeftRight,
  FileDown,
  AlertCircle,
  CheckCircle2,
  User,
  Shield,
  HelpCircle,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  Users,
  Check,
  X,
  Sparkles,
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
  DutyExplanation,
} from "@/lib/api";
import { toast } from "sonner";

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FacultyPortalDutiesResponse | null>(null);
  const [allFaculty, setAllFaculty] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "upcoming" | "past">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Swap Modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [selectedDutyForSwap, setSelectedDutyForSwap] = useState<FacultyDutyItem | null>(null);
  const [targetFacultyId, setTargetFacultyId] = useState<string>("");
  const [swapReason, setSwapReason] = useState<string>("");
  const [submittingSwap, setSubmittingSwap] = useState(false);

  // Explanation modal state (Stage 6)
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);
  const [selectedExplanation, setSelectedExplanation] = useState<DutyExplanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleExplainDuty = async (allocationId: number) => {
    setLoadingExplanation(true);
    setSelectedExplanation(null);
    setExplanationModalOpen(true);
    try {
      const res = await api.explainDuty(allocationId);
      setSelectedExplanation(res);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to load duty explanation.");
      setExplanationModalOpen(false);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getFacultyPortalDuties();
      setData(res);
    } catch (err) {
      console.error("Failed to load duties:", err);
      toast.error("Could not load your assigned duties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    api.listFaculty().then(setAllFaculty).catch(() => {});
  }, []);

  const faculty = data?.faculty || user?.faculty;
  const duties = data?.duties || [];
  const nextDuty = data?.next_duty;

  // Filter duties based on tab and search
  const filteredDuties = useMemo(() => {
    return duties.filter((d) => {
      if (filterTab === "upcoming" && d.is_past) return false;
      if (filterTab === "past" && !d.is_past) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.subject_name.toLowerCase().includes(q) ||
        d.subject_code.toLowerCase().includes(q) ||
        d.hall_name.toLowerCase().includes(q) ||
        d.branch.toLowerCase().includes(q)
      );
    });
  }, [duties, filterTab, searchQuery]);

  // Compute friendly countdown
  const getCountdownString = (dutyDate: string, startTime: string) => {
    try {
      const examDateTime = new Date(`${dutyDate}T${startTime}:00`);
      const now = new Date();
      const diffMs = examDateTime.getTime() - now.getTime();

      if (diffMs <= 0) return "In progress or completed";

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (diffDays > 0) {
        return `Starts in ${diffDays} day${diffDays > 1 ? "s" : ""} ${diffHours} hr${diffHours > 1 ? "s" : ""}`;
      }
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffHours > 0) {
        return `Starts in ${diffHours} hr${diffHours > 1 ? "s" : ""} ${diffMinutes} min`;
      }
      return `Starts in ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
    } catch {
      return "Upcoming";
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await api.downloadDutyLetterFile(faculty?.faculty_code);
      toast.success("Duty order letter downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF duty letter.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenSwapModal = (duty?: FacultyDutyItem) => {
    setSelectedDutyForSwap(duty || nextDuty || duties[0] || null);
    setTargetFacultyId("");
    setSwapReason("");
    setSwapModalOpen(true);
  };

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDutyForSwap) {
      toast.error("Please select a duty to swap.");
      return;
    }
    if (!swapReason.trim()) {
      toast.error("Please provide a reason for the swap request.");
      return;
    }

    setSubmittingSwap(true);
    try {
      const res = await api.createSwap({
        allocation_id: selectedDutyForSwap.id,
        to_faculty_id: targetFacultyId ? parseInt(targetFacultyId, 10) : null,
        reason: swapReason.trim(),
      });

      if (res.is_valid) {
        toast.success(`Swap Request Submitted! Engine verification: Valid ✓`);
      } else {
        toast.warning(`Swap Request Submitted with warning: ${res.validation_message}`);
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

  // Status badge styling
  const renderStatusBadge = (status: string, isPast: boolean) => {
    if (isPast) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-muted text-text-subtle border border-border/80">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Completed
        </span>
      );
    }
    switch (status) {
      case "published":
      case "allocated":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Allocated
          </span>
        );
      case "swapped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Swap Requested
          </span>
        );
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Faculty Invigilation Portal
            </span>
            <Badge variant="primary">{faculty?.department || "VFSTR Faculty"}</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text">
            Welcome back, {faculty?.name || user?.email}
          </h2>
          <p className="text-sm text-text-muted">
            {faculty?.designation || "Faculty Member"} • Code:{" "}
            <span className="font-mono font-medium">{faculty?.faculty_code || "VF-FAC"}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={downloadingPdf}
            leftIcon={<FileDown className="h-4 w-4" />}
          >
            Duty Letter (PDF)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenSwapModal()}
            disabled={duties.length === 0}
            leftIcon={<ArrowLeftRight className="h-4 w-4" />}
          >
            Request Swap
          </Button>
        </div>
      </div>

      {/* Next Duty Highlight Card (Section 4.8) */}
      {nextDuty ? (
        <Card className="border-l-4 border-l-primary overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Badge variant="warning">Next Assigned Duty</Badge>
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {getCountdownString(nextDuty.date, nextDuty.start_time)}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text tracking-tight">
                    {nextDuty.subject_name}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 font-mono">
                    Code: <span className="font-semibold text-text">{nextDuty.subject_code}</span> •{" "}
                    {nextDuty.branch} • Year {nextDuty.year}, Sem {nextDuty.semester}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-muted/60 border border-border/50">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-subtle font-medium">Date & Session</p>
                      <p className="font-semibold text-text">
                        {new Date(nextDuty.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        ({nextDuty.session === "FN" ? "Forenoon" : "Afternoon"})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-muted/60 border border-border/50">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-subtle font-medium">Duty Timing</p>
                      <p className="font-semibold text-text">
                        {nextDuty.start_time} – {nextDuty.end_time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-muted/60 border border-border/50">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-subtle font-medium">Assigned Hall</p>
                      <p className="font-semibold text-text">
                        {nextDuty.hall_name} ({nextDuty.hall_block}, Fl {nextDuty.hall_floor})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => handleExplainDuty(nextDuty.id)}
                  leftIcon={<HelpCircle className="h-4 w-4" />}
                >
                  Why did I get this duty?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSwapModal(nextDuty)}
                  leftIcon={<ArrowLeftRight className="h-4 w-4" />}
                >
                  Request Colleague Swap
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadPdf}
                  leftIcon={<FileDown className="h-4 w-4" />}
                >
                  Download Duty Order
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-base font-bold text-text">No Upcoming Invigilation Duties</h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              You currently have no active or upcoming exam duties assigned by the Exam Cell.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Duty Stats & Constraints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Allocated Duties
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-text tabular-numbers">
                {duties.length}
              </span>
              <span className="text-xs text-text-subtle">
                / max limit {faculty?.max_duties || 5}
              </span>
            </div>
            <div className="w-full bg-surface-muted rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (duties.length / (faculty?.max_duties || 5)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-text-subtle mt-2">
              Fairness score: optimized across all department faculty.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Department Conflict Rule
            </p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-sm font-bold text-text">Strict Protection Active</span>
            </div>
            <p className="text-[11px] text-text-subtle mt-2 leading-relaxed">
              Hard constraint enforced by CP-SAT solver: You are strictly never assigned to{" "}
              <span className="font-semibold text-text">{faculty?.department || "own department"}</span>{" "}
              examinations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Quick Navigations
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <Link
                href="/faculty/calendar"
                className="flex items-center justify-between p-2 rounded-lg bg-surface-muted/60 hover:bg-surface-muted text-xs font-semibold text-text border border-border/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Month Calendar View</span>
                </div>
                <span className="text-text-subtle">→</span>
              </Link>
              <Link
                href="/faculty/instructions"
                className="flex items-center justify-between p-2 rounded-lg bg-surface-muted/60 hover:bg-surface-muted text-xs font-semibold text-text border border-border/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-500" />
                  <span>Invigilation Instructions</span>
                </div>
                <span className="text-text-subtle">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duties Table Section */}
      <Card>
        <CardHeader className="p-5 pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-text">
                My Invigilation Duties Schedule
              </CardTitle>
              <p className="text-xs text-text-muted mt-0.5">
                Full list of all exam sessions assigned to you for End-Semester Examinations
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Filters */}
              <div className="flex p-0.5 rounded-lg bg-surface-muted border border-border">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterTab === "all"
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  All ({data?.total || duties.length})
                </button>
                <button
                  onClick={() => setFilterTab("upcoming")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterTab === "upcoming"
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Upcoming ({data?.upcoming ?? duties.filter((d) => !d.is_past).length})
                </button>
                <button
                  onClick={() => setFilterTab("past")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterTab === "past"
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Past ({data?.past ?? duties.filter((d) => d.is_past).length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-subtle" />
                <input
                  type="text"
                  placeholder="Filter subject/hall..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-surface text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-48"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-text-muted">Loading assigned duties...</div>
          ) : filteredDuties.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-10 w-10 text-text-subtle/50 mx-auto mb-2" />
              <p className="text-sm font-semibold text-text">No duties found</p>
              <p className="text-xs text-text-muted mt-1">
                {searchQuery
                  ? "No duties match your search query."
                  : "No duties available under this filter."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="p-3 pl-5">Date & Session</th>
                  <th className="p-3">Course / Subject</th>
                  <th className="p-3">Hall & Location</th>
                  <th className="p-3">Branch & Year</th>
                  <th className="p-3 text-center">Students</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs text-text">
                {filteredDuties.map((duty) => (
                  <tr
                    key={duty.id}
                    className={`hover:bg-surface-muted/40 transition-colors ${
                      duty.is_past ? "opacity-75" : ""
                    }`}
                  >
                    <td className="p-3 pl-5">
                      <div className="font-semibold text-text">
                        {new Date(duty.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[11px] text-text-subtle flex items-center gap-1 mt-0.5">
                        <Badge
                          variant={duty.session === "FN" ? "primary" : "warning"}
                          withDot={false}
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {duty.session}
                        </Badge>
                        <span>
                          {duty.start_time} – {duty.end_time}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-text">{duty.subject_name}</div>
                      <div className="text-[11px] text-text-muted font-mono">{duty.subject_code}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-text">{duty.hall_name}</div>
                      <div className="text-[11px] text-text-subtle">
                        {duty.hall_block}, Floor {duty.hall_floor}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-text font-medium">{duty.branch}</div>
                      <div className="text-[11px] text-text-subtle">
                        Year {duty.year}, Sem {duty.semester}
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className="font-semibold tabular-numbers text-text">
                        {duty.student_count}
                      </span>
                    </td>

                    <td className="p-3">{renderStatusBadge(duty.status, duty.is_past)}</td>

                    <td className="p-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExplainDuty(duty.id)}
                          title="Why did I get this duty?"
                          className="text-text-muted hover:text-primary"
                        >
                          <HelpCircle className="h-3.5 w-3.5 mr-1" />
                          Why this duty?
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSwapModal(duty)}
                          disabled={duty.is_past}
                          title="Request Swap"
                          className="text-text-muted hover:text-primary"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
                          Swap
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Swap Request Modal */}
      {swapModalOpen && selectedDutyForSwap && (
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
              {/* Duty Details Card */}
              <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                  Duty Selected for Swap
                </span>
                <div>
                  <h4 className="text-sm font-bold text-text">
                    {selectedDutyForSwap.subject_name} ({selectedDutyForSwap.subject_code})
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1">
                    <span>
                      📅 {selectedDutyForSwap.date} ({selectedDutyForSwap.session})
                    </span>
                    <span>⏰ {selectedDutyForSwap.start_time} - {selectedDutyForSwap.end_time}</span>
                    <span>🏛️ {selectedDutyForSwap.hall_name}</span>
                  </div>
                </div>
              </div>

              {/* Target Faculty Selection */}
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
                <p className="text-[11px] text-text-subtle">
                  Leave empty if you want the Exam Cell administrator to assign any eligible faculty.
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">
                  Reason for Swap Request <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. University doctoral defense scheduled, urgent medical appointment, official conference..."
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-surface text-xs text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              {/* Engine Validation Guarantee Notice */}
              <div className="p-3 rounded-xl bg-primary-soft/50 border border-primary/20 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-muted leading-relaxed">
                  <strong className="text-text font-semibold">Automatic Rule Validation:</strong> The
                  ExamDuty CP-SAT engine will automatically check availability, session overlaps,
                  department conflict protection, and maximum duty quotas before presenting to the
                  Chief Superintendent.
                </p>
              </div>

              {/* Action Buttons */}
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
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Why did I get this duty? Explanation Modal (Stage 6) */}
      {explanationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-text">Why did I get this duty?</h3>
              </div>
              <button
                onClick={() => setExplanationModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingExplanation ? (
              <div className="py-12 text-center text-xs text-text-muted">
                <Sparkles className="h-6 w-6 text-primary animate-spin mx-auto mb-2" />
                Analyzing CP-SAT solver constraints & equity metrics...
              </div>
            ) : selectedExplanation ? (
              <div className="space-y-4 text-xs">
                {/* Course Context Header */}
                <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Duty Details
                  </span>
                  <p className="text-sm font-bold text-text mt-0.5">
                    {selectedExplanation.subject_name} ({selectedExplanation.subject_code})
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    📅 {selectedExplanation.date} [{selectedExplanation.session}] • 🏛️ {selectedExplanation.hall_name} ({selectedExplanation.hall_location})
                  </p>
                </div>

                {/* 4 Constraint Pillars */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-700 dark:text-emerald-300 font-semibold">
                        Department Anti-Bias Shield
                      </strong>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        {selectedExplanation.explanation.department_shield}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-primary-soft/60 border border-primary/20 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-primary font-semibold">
                        Workload Equity & Fairness
                      </strong>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        {selectedExplanation.explanation.workload_equity}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted border border-border/70 flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-text font-semibold">
                        Availability Verified
                      </strong>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        {selectedExplanation.explanation.availability_verified}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted border border-border/70 flex items-start gap-2.5">
                    <Building2 className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-text font-semibold">
                        Venue & Capacity Match
                      </strong>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                        {selectedExplanation.explanation.venue_suitability}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Human Summary */}
                <div className="p-3 rounded-xl bg-surface border border-primary/20 bg-primary-soft/30 text-[11px] text-text-muted leading-relaxed">
                  <strong className="text-text">Summary: </strong>
                  {selectedExplanation.explanation.human_summary}
                </div>

                <div className="pt-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExplanationModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
