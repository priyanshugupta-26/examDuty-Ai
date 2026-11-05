"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  RotateCcw,
  AlertTriangle,
  Sliders,
  FileText,
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Info,
  Clock,
  BookOpen,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SolverSettings {
  students_per_invigilator: number;
  avoid_own_department: boolean;
  avoid_back_to_back: boolean;
  fairness_weight: number;
  max_duties_default: number;
}

interface InstructionsData {
  before_exam: string;
  during_exam: string;
  malpractice: string;
  after_exam: string;
  emergency_contacts: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings state
  const [sampleDataInfo, setSampleDataInfo] = useState<{ is_sample?: boolean; seeded_at?: string } | null>(null);
  const [solverSettings, setSolverSettings] = useState<SolverSettings>({
    students_per_invigilator: 30,
    avoid_own_department: true,
    avoid_back_to_back: true,
    fairness_weight: 0.5,
    max_duties_default: 4,
  });
  const [instructions, setInstructions] = useState<InstructionsData>({
    before_exam: "",
    during_exam: "",
    malpractice: "",
    after_exam: "",
    emergency_contacts: "",
  });

  // Action states
  const [savingSolver, setSavingSolver] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSettings();
      if (res.sample_data && typeof res.sample_data === "object") {
        setSampleDataInfo(res.sample_data as { is_sample?: boolean; seeded_at?: string });
      }
      if (res.solver_settings && typeof res.solver_settings === "object") {
        setSolverSettings(res.solver_settings as SolverSettings);
      }
      if (res.instructions && typeof res.instructions === "object") {
        setInstructions(res.instructions as InstructionsData);
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Failed to load examination settings.");
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSolver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSolver(true);
      await api.updateSetting("solver_settings", solverSettings as unknown as Record<string, unknown>);
      toast.success("CP-SAT solver parameters updated successfully!");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to save solver parameters.");
    } finally {
      setSavingSolver(false);
    }
  };

  const handleSaveInstructions = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingInstructions(true);
      await api.updateSetting("instructions", instructions as unknown as Record<string, unknown>);
      toast.success("Faculty invigilation guidelines published!");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to save instructions.");
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleResetDemoData = async () => {
    try {
      setIsResetting(true);
      toast.info("Resetting demo database & computing draft allocations...");
      const res = await api.resetDemoData();
      toast.success(res.message);
      setResetModalOpen(false);
      await loadSettings();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to reset demo dataset.");
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-surface border border-border" />
        <div className="h-44 rounded-xl bg-surface border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 rounded-xl bg-surface border border-border" />
          <div className="h-96 rounded-xl bg-surface border border-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-danger/30 bg-danger-soft/20 my-8">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-danger mx-auto" />
          <div>
            <h3 className="text-base font-bold text-text">Settings Unreachable</h3>
            <p className="text-xs text-text-muted mt-1">{error}</p>
          </div>
          <Button variant="primary" size="sm" onClick={loadSettings} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Retry Loading Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-surface via-surface to-accent/5 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Settings className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-text">Examination Settings & Rules</h1>
            </div>
            <p className="text-sm text-text-muted max-w-2xl">
              Solver constraints, invigilation guidelines handbook, and demonstration state control for the examination committee.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSettings}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Prominent Demo State Management / Reset Demo Data Section */}
      <Card className="border-accent/30 bg-gradient-to-r from-surface via-surface to-accent/5 shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-white">
                <RotateCcw className="h-3.5 w-3.5" />
              </span>
              <CardTitle className="text-base font-bold text-text">
                Demonstration State Management
              </CardTitle>
            </div>
            <Badge variant="outline" className="border-accent/40 text-accent text-xs">
              Demo Environment
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl text-xs text-text-muted">
              <p className="leading-relaxed">
                Restore the canonical VFSTR university demonstration dataset with{" "}
                <span className="font-semibold text-text">40 faculty members</span>,{" "}
                <span className="font-semibold text-text">12 exam halls</span>, and{" "}
                <span className="font-semibold text-text">25 scheduled examinations</span>.
              </p>
              <p className="leading-relaxed text-[11px] text-text-muted/80">
                This executes the OR-Tools CP-SAT solver and resets all duty assignments to an{" "}
                <span className="font-semibold text-accent">unpublished draft state</span> with zero conflicts
                so you can cleanly rerun the full demonstration workflow from scratch.
              </p>
              {sampleDataInfo?.seeded_at && (
                <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-text-muted">
                  <Clock className="h-3 w-3" />
                  Last initialized: {new Date(sampleDataInfo.seeded_at).toLocaleString()}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              onClick={() => setResetModalOpen(true)}
              disabled={isResetting}
              leftIcon={
                isResetting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )
              }
              className="bg-accent hover:bg-accent/90 text-white shrink-0 shadow-xs"
            >
              Reset Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid: Solver Parameters & Faculty Handbook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CP-SAT Solver Parameters */}
        <Card className="border-border bg-surface shadow-xs">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent" />
                <CardTitle className="text-base font-semibold text-text">
                  Optimization & Solver Rules
                </CardTitle>
              </div>
              <Badge variant="neutral" className="text-[10px]">
                CP-SAT Config
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              Tune mathematical solver constraints and fairness objective weights for invigilator allocation.
            </p>
          </CardHeader>

          <CardContent className="p-5 pt-2">
            <form onSubmit={handleSaveSolver} className="space-y-4">
              {/* Ratio: Students per invigilator */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text flex items-center justify-between">
                  <span>Students per Invigilator</span>
                  <span className="font-mono text-accent text-xs font-bold">
                    {solverSettings.students_per_invigilator} : 1
                  </span>
                </label>
                <Input
                  type="number"
                  min={10}
                  max={60}
                  step={1}
                  value={solverSettings.students_per_invigilator}
                  onChange={(e) =>
                    setSolverSettings({
                      ...solverSettings,
                      students_per_invigilator: parseInt(e.target.value) || 30,
                    })
                  }
                  className="text-xs h-9 font-medium"
                />
                <p className="text-[11px] text-text-muted">
                  Hall capacity calculation rule: 1 invigilator for every 30 students (minimum 1 per hall).
                </p>
              </div>

              {/* Default Max duties */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text flex items-center justify-between">
                  <span>Default Maximum Duties Ceiling</span>
                  <span className="font-mono text-accent text-xs font-bold">
                    {solverSettings.max_duties_default} duties max
                  </span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={solverSettings.max_duties_default}
                  onChange={(e) =>
                    setSolverSettings({
                      ...solverSettings,
                      max_duties_default: parseInt(e.target.value) || 4,
                    })
                  }
                  className="text-xs h-9 font-medium"
                />
                <p className="text-[11px] text-text-muted">
                  Default hard constraint ceiling applied to newly created faculty members.
                </p>
              </div>

              {/* Fairness Weight */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text flex items-center justify-between">
                  <span>Fairness Balance Objective Weight</span>
                  <span className="font-mono text-accent text-xs font-bold">
                    {solverSettings.fairness_weight}
                  </span>
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={solverSettings.fairness_weight}
                  onChange={(e) =>
                    setSolverSettings({
                      ...solverSettings,
                      fairness_weight: parseFloat(e.target.value) || 0.5,
                    })
                  }
                  className="w-full accent-accent h-1.5 bg-surface-sunken rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>Low (Focus purely on slot filling)</span>
                  <span>High (Aggressively minimize workload variance)</span>
                </div>
              </div>

              {/* Checkbox: Avoid own department */}
              <div className="p-3 rounded-lg bg-surface-sunken/40 border border-border/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="avoid_dept"
                  checked={solverSettings.avoid_own_department}
                  onChange={(e) =>
                    setSolverSettings({
                      ...solverSettings,
                      avoid_own_department: e.target.checked,
                    })
                  }
                  className="h-4 w-4 mt-0.5 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="avoid_dept" className="text-xs cursor-pointer select-none">
                  <div className="font-semibold text-text">Avoid Own Department Exams</div>
                  <div className="text-[11px] text-text-muted">
                    Hard constraint: Prevent faculty from invigilating exams belonging to their own academic department.
                  </div>
                </label>
              </div>

              {/* Checkbox: Avoid back-to-back */}
              <div className="p-3 rounded-lg bg-surface-sunken/40 border border-border/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="avoid_b2b"
                  checked={solverSettings.avoid_back_to_back}
                  onChange={(e) =>
                    setSolverSettings({
                      ...solverSettings,
                      avoid_back_to_back: e.target.checked,
                    })
                  }
                  className="h-4 w-4 mt-0.5 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="avoid_b2b" className="text-xs cursor-pointer select-none">
                  <div className="font-semibold text-text">Avoid Consecutive Sessions (Back-to-Back)</div>
                  <div className="text-[11px] text-text-muted">
                    Soft constraint: Penalize assigning both FN (Forenoon) and AN (Afternoon) sessions on the same date to the same faculty.
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingSolver}
                  leftIcon={
                    savingSolver ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {savingSolver ? "Saving..." : "Save Solver Settings"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Faculty Invigilation Handbook & Instructions */}
        <Card className="border-border bg-surface shadow-xs">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" />
                <CardTitle className="text-base font-semibold text-text">
                  Faculty Invigilation Handbook
                </CardTitle>
              </div>
              <Badge variant="neutral" className="text-[10px]">
                Faculty Portal
              </Badge>
            </div>
            <p className="text-xs text-text-muted">
              Live guidelines presented inside the Faculty Portal Instructions Accordion and duty order letters.
            </p>
          </CardHeader>

          <CardContent className="p-5 pt-2">
            <form onSubmit={handleSaveInstructions} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text">Reporting Protocol (Before Exam)</label>
                <textarea
                  rows={2}
                  value={instructions.before_exam}
                  onChange={(e) => setInstructions({ ...instructions, before_exam: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text">Hall Conduct (During Exam)</label>
                <textarea
                  rows={2}
                  value={instructions.during_exam}
                  onChange={(e) => setInstructions({ ...instructions, during_exam: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text">Malpractice Enforcement Procedure</label>
                <textarea
                  rows={2}
                  value={instructions.malpractice}
                  onChange={(e) => setInstructions({ ...instructions, malpractice: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text">Answer Script Handover (After Exam)</label>
                <textarea
                  rows={2}
                  value={instructions.after_exam}
                  onChange={(e) => setInstructions({ ...instructions, after_exam: e.target.value })}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text">Exam Cell Emergency Contacts</label>
                <Input
                  value={instructions.emergency_contacts}
                  onChange={(e) => setInstructions({ ...instructions, emergency_contacts: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingInstructions}
                  leftIcon={
                    savingInstructions ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {savingInstructions ? "Publishing..." : "Update Faculty Handbook"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal for Reset Demo Data */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                <RotateCcw className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text">Reset to Demo State?</h3>
                <p className="text-xs text-text-muted">This will reinitialize all database tables.</p>
              </div>
            </div>

            <div className="rounded-xl bg-surface-sunken p-3.5 text-xs text-text-muted space-y-2 border border-border/60">
              <p>The reset process will:</p>
              <ul className="list-disc pl-4 space-y-1 text-text">
                <li>Restore 40 faculty members across CSE, ECE, EEE, MECH, CIVIL, S&H</li>
                <li>Restore 12 examination halls and 25 scheduled exams</li>
                <li>Run CP-SAT solver to generate fresh <strong>unpublished draft allocations</strong></li>
                <li>Clear all pending leaves, swap requests, and agent audit logs</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleResetDemoData}
                disabled={isResetting}
                leftIcon={
                  isResetting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )
                }
                className="bg-accent hover:bg-accent/90 text-white"
              >
                {isResetting ? "Resetting..." : "Yes, Reset Demo Data"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
