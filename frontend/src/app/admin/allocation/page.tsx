"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Send,
  SlidersHorizontal,
  Lock,
  Unlock,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  Clock,
  Building2,
  Grid,
  List,
  Sparkles,
  HelpCircle,
  X,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  api,
  AllocationItem,
  SolveResult,
  ValidationReport,
  FacultyItem,
} from "@/lib/api";
import { toast } from "sonner";

export default function AllocationPage() {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [fairnessScore, setFairnessScore] = useState(100);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Settings drawer state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [studentsPerInv, setStudentsPerInv] = useState(30);
  const [avoidOwnDept, setAvoidOwnDept] = useState(true);
  const [avoidB2B, setAvoidB2B] = useState(true);
  const [fairnessWeight, setFairnessWeight] = useState(0.5);
  const [keepLocked, setKeepLocked] = useState(true);

  // Solver running state
  const [isSolving, setIsSolving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [solveResultModal, setSolveResultModal] = useState<SolveResult | null>(null);

  // Validation report state
  const [validation, setValidation] = useState<ValidationReport | null>(null);

  // Swap modal state
  const [swapTargetAllocation, setSwapTargetAllocation] = useState<AllocationItem | null>(null);
  const [facultyList, setFacultyList] = useState<FacultyItem[]>([]);
  const [selectedFacultyForSwap, setSelectedFacultyForSwap] = useState<number | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Filter state for list view
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");

  const loadData = async () => {
    try {
      const [allocData, valData, facData] = await Promise.all([
        api.getAllocations(),
        api.getValidation(),
        api.listFaculty(),
      ]);
      setAllocations(allocData.allocations);
      setIsPublished(allocData.is_published);
      setFairnessScore(allocData.fairness_score);
      setValidation(valData);
      setFacultyList(facData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load allocations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Run Solver
  const handleRunSolver = async () => {
    setIsSolving(true);
    try {
      const result = await api.solveAllocations({
        students_per_invigilator: studentsPerInv,
        avoid_own_department: avoidOwnDept,
        avoid_back_to_back: avoidB2B,
        fairness_weight: fairnessWeight,
        keep_locked: keepLocked,
      });

      if (result.success) {
        toast.success(result.message);
        setSolveResultModal(result);
        await loadData();
      } else {
        toast.error(result.message || "Solver could not find a feasible schedule.");
      }
    } catch (err: any) {
      toast.error(err.message || "Solver error.");
    } finally {
      setIsSolving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    if (validation && validation.conflicts_count > 0) {
      toast.error("Cannot publish while conflicts exist. Please resolve all conflicts first.");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await api.publishAllocations();
      toast.success(res.message);
      setIsPublished(true);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish allocations.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Toggle Lock
  const handleToggleLock = async (allocationId: number, currentLocked: boolean) => {
    try {
      const res = await api.toggleLock(allocationId, !currentLocked);
      setAllocations((prev) =>
        prev.map((a) => (a.id === allocationId ? { ...a, is_locked: res.is_locked } : a))
      );
      toast.info(res.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle lock.");
    }
  };

  // Manual Swap Submit
  const handlePerformSwap = async () => {
    if (!swapTargetAllocation || !selectedFacultyForSwap) return;
    setSwapError(null);

    try {
      const res = await api.swapManual(swapTargetAllocation.id, selectedFacultyForSwap);
      if (res.success) {
        toast.success(res.message);
        setSwapTargetAllocation(null);
        await loadData();
      } else {
        setSwapError(res.broken_rule || "Cannot reassign to this faculty.");
      }
    } catch (err: any) {
      setSwapError(err.message || "Failed to complete swap.");
    }
  };

  // Filtered allocations for list view
  const filteredAllocations = allocations.filter((a) => {
    const matchesSearch =
      a.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.hall_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDeptFilter === "ALL" || a.faculty_dept === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  // Unique sessions and halls for grid view
  const sessions = Array.from(new Set(allocations.map((a) => `${a.date}|${a.session}`)))
    .map((s) => {
      const [d, sess] = s.split("|");
      return { date: d, session: sess as "FN" | "AN" };
    })
    .sort((a, b) => (a.date === b.date ? (a.session === "FN" ? -1 : 1) : a.date.localeCompare(b.date)));

  const halls = Array.from(new Set(allocations.map((a) => a.hall_name))).sort();

  return (
    <div className="space-y-6">
      {/* Top Bar (Section 4.6) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Nov 2026 End-Semester Examinations
            </span>
            <Badge variant={isPublished ? "success" : "warning"}>
              {isPublished ? "Published (Live for Faculty)" : "Draft Mode"}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold text-text">Invigilation Duty Allocation</h2>
          <p className="text-xs text-text-muted">
            Constraint-optimized allocation powered by Google OR-Tools CP-SAT.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-surface-muted/60 px-3 py-1.5 rounded-lg border border-border/80 text-xs text-text-muted">
            <input
              type="checkbox"
              id="keep-locked"
              checked={keepLocked}
              onChange={(e) => setKeepLocked(e.target.checked)}
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="keep-locked" className="cursor-pointer select-none font-medium">
              Keep Locked
            </label>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setSettingsOpen(!settingsOpen)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          >
            Solver Settings
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleRunSolver}
            isLoading={isSolving}
            leftIcon={<Cpu className="h-4 w-4" />}
          >
            Run Auto-Allocation
          </Button>

          <Button
            variant="soft"
            size="md"
            onClick={handlePublish}
            disabled={isPublishing || (validation?.conflicts_count ?? 0) > 0 || allocations.length === 0}
            isLoading={isPublishing}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Publish & Notify
          </Button>
        </div>
      </div>

      {/* Main Grid: Content + Validation Side Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column (3/4): Allocations Views */}
        <div className="xl:col-span-3 space-y-4">
          {/* Subheader & View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
                Display:
              </span>
              <div className="flex items-center p-0.5 rounded-lg border border-border bg-surface">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary text-white shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Grid className="h-3.5 w-3.5" />
                  <span>Grid View</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-primary text-white shadow-xs"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>List View</span>
                </button>
              </div>
            </div>

            <span className="text-xs font-medium text-text-muted">
              Total Slots: <span className="font-bold text-text">{allocations.length}</span>
            </span>
          </div>

          {/* VIEW A: GRID VIEW */}
          {viewMode === "grid" && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-surface-muted border-b border-border z-20">
                    <tr>
                      <th className="p-3 border-r border-border font-bold text-text-muted w-36 uppercase text-[10px] tracking-wider">
                        Session / Hall
                      </th>
                      {halls.map((h) => (
                        <th
                          key={h}
                          className="p-3 border-r border-border font-bold text-text uppercase text-[10px] tracking-wider text-center min-w-[170px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {sessions.map(({ date, session }) => (
                      <tr key={`${date}-${session}`} className="hover:bg-surface-muted/20">
                        {/* Session Header Column */}
                        <td className="p-3 border-r border-border font-medium bg-surface-muted/30">
                          <div className="flex items-center gap-1.5 font-bold text-text">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            <span>{date}</span>
                          </div>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              session === "FN"
                                ? "bg-info-soft text-info"
                                : "bg-warning-soft text-warning"
                            }`}
                          >
                            {session === "FN" ? "FN (Morning)" : "AN (Afternoon)"}
                          </span>
                        </td>

                        {/* Hall Cells */}
                        {halls.map((hallName) => {
                          const cellAllocs = allocations.filter(
                            (a) => a.date === date && a.session === session && a.hall_name === hallName
                          );

                          return (
                            <td key={hallName} className="p-2 border-r border-border align-top">
                              {cellAllocs.length === 0 ? (
                                <div className="h-14 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-[11px] text-text-subtle">
                                  —
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {cellAllocs.map((a) => (
                                    <div
                                      key={a.id}
                                      className={`p-2 rounded-lg border transition-all text-xs relative group ${
                                        a.is_locked
                                          ? "bg-primary-soft/40 border-primary/40"
                                          : "bg-surface border-border hover:border-primary/50 shadow-xs"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-text truncate max-w-[110px]" title={a.faculty_name}>
                                          {a.faculty_name}
                                        </span>
                                        <button
                                          onClick={() => handleToggleLock(a.id, a.is_locked)}
                                          title={a.is_locked ? "Click to Unlock" : "Click to Pin/Lock"}
                                          className="text-text-subtle hover:text-primary transition-colors"
                                        >
                                          {a.is_locked ? (
                                            <Lock className="h-3.5 w-3.5 text-primary" />
                                          ) : (
                                            <Unlock className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100" />
                                          )}
                                        </button>
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
                                        <span className="font-semibold text-primary">{a.faculty_dept}</span>
                                        <span className="font-mono text-text-subtle">{a.subject_code}</span>
                                      </div>

                                      {/* Quick manual swap button */}
                                      <button
                                        onClick={() => {
                                          setSwapTargetAllocation(a);
                                          setSwapError(null);
                                        }}
                                        className="mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] py-0.5 rounded bg-surface-muted hover:bg-primary-soft hover:text-primary font-medium text-text-muted transition-colors"
                                      >
                                        <ArrowLeftRight className="h-2.5 w-2.5" />
                                        <span>Swap</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* VIEW B: LIST VIEW */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-subtle" />
                  <Input
                    placeholder="Search by faculty, subject code, or hall..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All Departments</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="S&H">S&H</option>
                </select>
              </div>

              {/* Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-muted border-b border-border text-text-muted uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Date & Session</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Hall</th>
                        <th className="p-3">Assigned Faculty</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Lock / Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {filteredAllocations.map((a) => (
                        <tr key={a.id} className="hover:bg-surface-muted/20">
                          <td className="p-3">
                            <span className="font-semibold text-text block">{a.date}</span>
                            <span className="text-[11px] text-text-subtle">
                              {a.session} ({a.start_time} - {a.end_time})
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-text block">{a.subject_name}</span>
                            <span className="font-mono text-[11px] text-primary">{a.subject_code}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-text">{a.hall_name}</span>
                            <span className="text-[11px] text-text-subtle block">{a.student_count} students</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-text">{a.faculty_name}</span>
                            <span className="text-[11px] text-text-muted block">
                              Dept: <span className="font-semibold">{a.faculty_dept}</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge variant={a.status === "published" ? "success" : "warning"}>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleLock(a.id, a.is_locked)}
                                className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted transition-colors"
                                title={a.is_locked ? "Pinned" : "Unlocked"}
                              >
                                {a.is_locked ? (
                                  <Lock className="h-4 w-4 text-primary" />
                                ) : (
                                  <Unlock className="h-4 w-4" />
                                )}
                              </button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSwapTargetAllocation(a);
                                  setSwapError(null);
                                }}
                              >
                                Swap
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column (1/4): Live Validation Panel (Section 4.6) */}
        <div className="xl:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Validation & Health</CardTitle>
                <Badge variant={validation?.conflicts_count === 0 ? "success" : "danger"}>
                  {validation?.conflicts_count === 0 ? "Valid ✓" : `${validation?.conflicts_count} Conflicts`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Fairness Score */}
              <div className="p-3 rounded-xl bg-surface-muted/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text">Fairness Score</span>
                  <span className="text-base font-bold text-accent tabular-numbers">
                    {validation?.fairness_score ?? fairnessScore} / 100
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${validation?.fairness_score ?? fairnessScore}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-subtle">
                  Standardized duty workload balance across faculty.
                </p>
              </div>

              {/* Conflicts List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-text uppercase tracking-wider block">
                  Hard Constraints
                </span>
                {validation?.conflicts && validation.conflicts.length > 0 ? (
                  <div className="space-y-1.5">
                    {validation.conflicts.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-danger-soft border border-danger/20 text-xs text-danger font-medium flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-success-soft border border-success/20 text-xs text-success font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>0 Overlaps • 0 Department Clashes</span>
                  </div>
                )}
              </div>

              {/* Warnings / Unfilled */}
              {validation?.warnings && validation.warnings.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-text uppercase tracking-wider block">
                    Capacity Warnings
                  </span>
                  {validation.warnings.map((w, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-warning-soft border border-warning/20 text-xs text-warning font-medium flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Auto Fix Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleRunSolver}
                isLoading={isSolving}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                Auto-Fix via Solver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SETTINGS DRAWER (Section 4.6) */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-surface border-l border-border h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-text">CP-SAT Solver Parameters</h3>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-1 rounded-lg text-text-subtle hover:text-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Controls */}
              <div className="space-y-5">
                {/* Students per Invigilator */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text uppercase tracking-wider">
                    Students per Invigilator (N)
                  </label>
                  <Input
                    type="number"
                    value={studentsPerInv}
                    onChange={(e) => setStudentsPerInv(Number(e.target.value))}
                    min={15}
                    max={60}
                    helperText="Default is 30. Produces ceil(students / N) slots per hall."
                  />
                </div>

                {/* Avoid Own Department Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-muted/30">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-text">Avoid Own Department</span>
                    <p className="text-[11px] text-text-muted">
                      Faculty cannot invigilate exams owned by their department.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={avoidOwnDept}
                    onChange={(e) => setAvoidOwnDept(e.target.checked)}
                    className="h-5 w-5 rounded text-primary focus:ring-primary"
                  />
                </div>

                {/* Avoid Back-to-Back Sessions */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-muted/30">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-bold text-text">Avoid Back-to-Back (FN + AN)</span>
                    <p className="text-[11px] text-text-muted">
                      Penalize assigning both morning and afternoon duty on the same day.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={avoidB2B}
                    onChange={(e) => setAvoidB2B(e.target.checked)}
                    className="h-5 w-5 rounded text-primary focus:ring-primary"
                  />
                </div>

                {/* Fairness Weight Slider */}
                <div className="space-y-2 p-3.5 rounded-xl border border-border bg-surface-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">Fairness Weight</span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {fairnessWeight.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={fairnessWeight}
                    onChange={(e) => setFairnessWeight(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[10px] text-text-subtle">
                    Higher weight enforces tighter min-max duty spread across all departments.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSettingsOpen(false);
                  handleRunSolver();
                }}
              >
                Apply & Solve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SOLVER RESULT SUMMARY MODAL (Section 4.6) */}
      {solveResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-success-soft text-success flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">Auto-Allocation Complete</h3>
                  <p className="text-xs text-text-muted">CP-SAT solver returned optimal solution.</p>
                </div>
              </div>
              <button
                onClick={() => setSolveResultModal(null)}
                className="p-1 rounded-lg text-text-subtle hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-[11px] text-text-subtle uppercase tracking-wider block">
                  Slots Filled
                </span>
                <span className="text-2xl font-bold text-text tabular-numbers">
                  {solveResultModal.slots_filled}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-[11px] text-text-subtle uppercase tracking-wider block">
                  Hard Conflicts
                </span>
                <span className="text-2xl font-bold text-success tabular-numbers">0</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-[11px] text-text-subtle uppercase tracking-wider block">
                  Fairness Score
                </span>
                <span className="text-2xl font-bold text-accent tabular-numbers">
                  {solveResultModal.fairness_score} / 100
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-[11px] text-text-subtle uppercase tracking-wider block">
                  Solve Time
                </span>
                <span className="text-2xl font-bold text-primary tabular-numbers">
                  {solveResultModal.execution_time_ms} ms
                </span>
              </div>
            </div>

            <p className="text-xs text-text-muted">
              All {solveResultModal.slots_filled} invigilation slots have been assigned to eligible faculty with zero department clashes or schedule overlaps.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="primary" size="md" onClick={() => setSolveResultModal(null)}>
                Review Allocations
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL SWAP DIALOG */}
      {swapTargetAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-text">Manual Reassignment</h3>
                <p className="text-xs text-text-muted">
                  Reassign duty for {swapTargetAllocation.subject_name} ({swapTargetAllocation.date} {swapTargetAllocation.session})
                </p>
              </div>
              <button
                onClick={() => setSwapTargetAllocation(null)}
                className="p-1 rounded-lg text-text-subtle hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface-muted/50 border border-border text-xs space-y-1">
              <p>
                <span className="text-text-muted">Current Assignee:</span>{" "}
                <span className="font-bold text-text">{swapTargetAllocation.faculty_name}</span> (
                {swapTargetAllocation.faculty_dept})
              </p>
              <p>
                <span className="text-text-muted">Exam Owner:</span>{" "}
                <span className="font-bold text-text">{swapTargetAllocation.department_owner}</span>
              </p>
            </div>

            {swapError && (
              <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-xs text-danger font-medium flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{swapError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text uppercase tracking-wider">
                Select Replacement Faculty:
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:ring-2 focus:ring-primary"
                value={selectedFacultyForSwap || ""}
                onChange={(e) => setSelectedFacultyForSwap(Number(e.target.value))}
              >
                <option value="">-- Choose faculty candidate --</option>
                {facultyList
                  .filter((f) => f.id !== swapTargetAllocation.faculty_id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department}) — {f.assigned_duties} duties assigned
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSwapTargetAllocation(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!selectedFacultyForSwap}
                onClick={handlePerformSwap}
              >
                Confirm Reassignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
