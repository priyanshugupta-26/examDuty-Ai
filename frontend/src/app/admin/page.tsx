"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Building2,
  Users2,
  CheckCircle2,
  AlertCircle,
  Cpu,
  BotMessageSquare,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
  History,
  RotateCcw,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, DashboardData } from "@/lib/api";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardData();
      setData(res);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Failed to load dashboard metrics.");
      toast.error("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetDemoData();
      toast.success(res.message);
      setResetModalOpen(false);
      loadDashboard();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to reset demo data.");
    } finally {
      setIsResetting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-2xl bg-surface border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-surface border border-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-xl bg-surface border border-border" />
          <div className="lg:col-span-2 h-64 rounded-xl bg-surface border border-border" />
        </div>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <Card className="border-danger/30 bg-danger-soft/20 my-8">
        <CardContent className="p-8 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-danger mx-auto" />
          <div>
            <h3 className="text-base font-bold text-text">Dashboard Error</h3>
            <p className="text-xs text-text-muted mt-1">{error || "Unable to reach server."}</p>
          </div>
          <Button variant="primary" size="sm" onClick={loadDashboard} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Retry Loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { stats, allocation_health, fairness_chart, upcoming_sessions, recent_activity } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              VFSTR Examination Cell
            </span>
            <Badge variant="success">All Systems Operational</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text">Executive Control Dashboard</h2>
          <p className="text-sm text-text-muted">
            End-Semester Examinations Nov 2026 • Live schedule analytics, constraint integrity & audit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/allocation">
            <Button variant="primary" size="sm" leftIcon={<Cpu className="h-4 w-4" />}>
              Auto-Allocation
            </Button>
          </Link>
          <Link href="/admin/assistant">
            <Button variant="secondary" size="sm" leftIcon={<BotMessageSquare className="h-4 w-4" />}>
              AI Assistant
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetModalOpen(true)}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reset Demo
          </Button>
        </div>
      </div>

      {/* Row of 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Exams */}
        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Total Exams
                </p>
                <h3 className="text-2xl font-bold text-text mt-1 tabular-numbers">
                  {stats.total_exams}
                </h3>
                <p className="text-[11px] text-text-subtle mt-0.5">5 days • 2 sessions daily</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Halls in Use */}
        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Halls Available
                </p>
                <h3 className="text-2xl font-bold text-text mt-1 tabular-numbers">
                  {stats.total_halls}
                </h3>
                <p className="text-[11px] text-text-subtle mt-0.5">Blocks A, B, C active</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faculty Pool */}
        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Faculty Pool
                </p>
                <h3 className="text-2xl font-bold text-text mt-1 tabular-numbers">
                  {stats.total_faculty}
                </h3>
                <p className="text-[11px] text-text-subtle mt-0.5">Across 5 departments</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duties Allocated */}
        <Card className="shadow-xs hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Duties Allocated
                </p>
                <h3 className="text-2xl font-bold text-text mt-1 tabular-numbers">
                  {stats.total_allocations}
                </h3>
                <p className="text-[11px] text-text-subtle mt-0.5">
                  {stats.coverage_pct}% required slots filled
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Row: Allocation Health & Fairness Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Health Card */}
        <Card className="lg:col-span-1 shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-text">Allocation Health</CardTitle>
              <Badge variant={allocation_health.conflicts_count === 0 ? "success" : "danger"}>
                {allocation_health.conflicts_count === 0 ? "All Clear" : "Conflicts"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 border border-border/50">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text">Hard Rule Conflicts</p>
                <p className="text-[11px] text-text-subtle">Target 0 (Overlaps & Dept rule)</p>
              </div>
              <span className={`text-xl font-bold tabular-numbers ${
                allocation_health.conflicts_count === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger"
              }`}>
                {allocation_health.conflicts_count}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted/60 border border-border/50">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text">Unfilled Slots</p>
                <p className="text-[11px] text-text-subtle">Vacant exam hall posts</p>
              </div>
              <span className={`text-xl font-bold tabular-numbers ${
                allocation_health.unfilled_count === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
              }`}>
                {allocation_health.unfilled_count}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-muted/60 border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text">Fairness Index</span>
                <span className="text-base font-bold text-primary tabular-numbers">
                  {allocation_health.fairness_score} / 100
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${allocation_health.fairness_score}%` }}
                />
              </div>
              <p className="text-[11px] text-text-subtle">
                University average: <strong>{allocation_health.average_duties} duties</strong> per faculty.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fairness Bar Chart with Average Line */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-text">
                  Workload Fairness Distribution
                </CardTitle>
                <p className="text-xs text-text-muted mt-0.5">
                  Duties per faculty across departments with institutional average reference line
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-xs bg-primary" />
                  <span className="text-text-muted">Assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-danger" />
                  <span className="text-text-muted font-semibold">
                    Avg ({fairness_chart.average_duties})
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {/* Visual Bar Chart */}
            <div className="space-y-4">
              <div className="relative h-44 flex items-end gap-1.5 pt-6 pb-2 border-b border-border overflow-x-auto">
                {/* Horizontal Average Line */}
                <div
                  className="absolute left-0 right-0 border-b-2 border-dashed border-danger z-10 pointer-events-none"
                  style={{
                    bottom: `${Math.min(90, (fairness_chart.average_duties / (fairness_chart.max_duties + 1)) * 100)}%`,
                  }}
                >
                  <span className="absolute right-1 -top-4 text-[10px] font-bold text-danger bg-surface px-1 rounded">
                    Avg: {fairness_chart.average_duties}
                  </span>
                </div>

                {/* Bars */}
                {fairness_chart.bars.map((bar) => {
                  const maxRef = Math.max(fairness_chart.max_duties + 1, 4);
                  const heightPct = Math.min(100, (bar.total_duties / maxRef) * 100);
                  return (
                    <div
                      key={bar.id}
                      className="flex-1 min-w-[14px] max-w-[24px] flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Bar Fill */}
                      <div
                        className="w-full bg-primary/80 hover:bg-primary rounded-t-sm transition-all duration-200 cursor-pointer"
                        style={{ height: `${heightPct}%` }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                        <div className="bg-surface border border-border text-text text-[10px] p-2 rounded-lg shadow-lg whitespace-nowrap">
                          <p className="font-bold">{bar.name}</p>
                          <p className="text-text-muted font-mono">{bar.code} • {bar.department}</p>
                          <p className="text-primary font-semibold mt-0.5">
                            Total Workload: {bar.total_duties} duties
                          </p>
                          <p className="text-text-subtle text-[9px]">
                            ({bar.duties} assigned + {bar.past_duties} past)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Department breakdown legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted pt-1">
                <span>40 Faculty members ranked by workload equity</span>
                <Link
                  href="/admin/reports"
                  className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                >
                  View full fairness analytics →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lower Row: Upcoming Sessions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions List */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-text">Upcoming Exam Sessions</CardTitle>
                <p className="text-xs text-text-muted mt-0.5">Next examination slots scheduled across university blocks</p>
              </div>
              <Link href="/admin/exams">
                <Button variant="ghost" size="sm" className="text-xs text-text-muted hover:text-text">
                  All Exams →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {upcoming_sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">No upcoming exam sessions found.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    <th className="p-3 pl-5">Date & Session</th>
                    <th className="p-3">Course / Subject</th>
                    <th className="p-3 text-center">Halls & Students</th>
                    <th className="p-3 pr-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {upcoming_sessions.map((s, idx) => (
                    <tr key={idx} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="p-3 pl-5">
                        <div className="font-semibold text-text">{s.date}</div>
                        <div className="text-[11px] text-text-subtle flex items-center gap-1 mt-0.5">
                          <Badge variant={s.session === "FN" ? "primary" : "warning"} withDot={false} className="text-[10px] px-1 py-0">
                            {s.session}
                          </Badge>
                          <span>{s.time}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-text">{s.subject_name}</div>
                        <div className="text-[11px] text-text-muted font-mono">{s.subject_code} • {s.branch}</div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-semibold text-text">{s.halls_count} Halls</span>
                        <div className="text-[11px] text-text-subtle">{s.student_count} candidates</div>
                      </td>

                      <td className="p-3 pr-5 text-right">
                        <Badge variant={s.status === "Published" ? "success" : "neutral"}>
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="lg:col-span-1 shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-text">Recent Activity</CardTitle>
                <p className="text-xs text-text-muted mt-0.5">Live audit log trail</p>
              </div>
              <Link href="/admin/audit">
                <Button variant="ghost" size="sm" className="text-xs text-text-muted hover:text-text">
                  Audit Log →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {recent_activity.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">No recent activity logged.</div>
            ) : (
              recent_activity.map((act) => (
                <div key={act.id} className="p-2.5 rounded-xl bg-surface-muted/50 border border-border/50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[10px] text-primary truncate max-w-[180px]">
                      {act.action}
                    </span>
                    <span className="text-[10px] text-text-subtle">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-text leading-tight line-clamp-2">
                    {act.summary || "System operation completed."}
                  </p>
                  <p className="text-[10px] text-text-subtle">By: {act.actor}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reset Demo Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-danger">
                <RotateCcw className="h-5 w-5" />
                <h3 className="text-base font-bold text-text">Reset Demo Dataset?</h3>
              </div>
              <button
                onClick={() => setResetModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              This will restore the official VFSTR sample dataset: <strong>40 faculty across 5 departments</strong>, <strong>12 halls</strong>, <strong>25 exams</strong>, and regenerate <strong>unpublished draft allocations</strong> so you can cleanly rerun the full allocation workflow.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={isResetting}
                onClick={handleResetDemo}
                leftIcon={<Check className="h-4 w-4" />}
              >
                Confirm Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
