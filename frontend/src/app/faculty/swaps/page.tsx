"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  CalendarDays,
  User,
  ShieldCheck,
  ShieldAlert,
  X,
  Check,
  Sparkles,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  SwapItem,
  FacultyDutyItem,
  FacultyPortalDutiesResponse,
  FacultyItem,
} from "@/lib/api";
import { toast } from "sonner";

export default function FacultySwapsPage() {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState<SwapItem[]>([]);
  const [myDuties, setMyDuties] = useState<FacultyDutyItem[]>([]);
  const [allFaculty, setAllFaculty] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Swap Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>("");
  const [targetFacultyId, setTargetFacultyId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [swapsList, dutiesRes, facultyList] = await Promise.all([
        api.listSwaps(),
        api.getFacultyPortalDuties().catch(() => null),
        api.listFaculty().catch(() => []),
      ]);
      setSwaps(swapsList);
      if (dutiesRes) {
        setMyDuties(dutiesRes.duties);
      }
      setAllFaculty(facultyList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load swap requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = () => {
    if (myDuties.length > 0) {
      setSelectedAllocationId(String(myDuties[0].id));
    }
    setTargetFacultyId("");
    setReason("");
    setModalOpen(true);
  };

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocationId) {
      toast.error("Please choose a duty to swap.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the swap.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createSwap({
        allocation_id: parseInt(selectedAllocationId, 10),
        to_faculty_id: targetFacultyId ? parseInt(targetFacultyId, 10) : null,
        reason: reason.trim(),
      });

      if (res.is_valid) {
        toast.success("Swap Request Created! Engine verification: Valid ✓");
      } else {
        toast.warning(`Swap Request Created with warning: ${res.validation_message}`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to submit swap request");
    } finally {
      setSubmitting(false);
    }
  };

  // Render status badge
  const renderStatus = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger-soft text-danger border border-danger/20">
            <X className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            Pending Admin Review
          </span>
        );
    }
  };

  // Render rule validation result
  const renderValidation = (isValid: boolean, message: string) => {
    if (isValid) {
      return (
        <div className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Valid ✓</span>
            <p className="text-[11px] text-text-muted mt-0.5">{message}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-1.5 text-xs text-danger font-medium">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Rule Broken ✕</span>
          <p className="text-[11px] text-danger/90 mt-0.5">{message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/faculty"
            className="p-2 rounded-xl text-text-muted hover:bg-surface-muted hover:text-text border border-border/60 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Invigilation Duty Swaps
              </span>
              <Badge variant="primary">CP-SAT Engine Verified</Badge>
            </div>
            <h2 className="text-2xl font-bold text-text mt-1">
              Swap Requests & Transfers
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Submit duty exchange requests with automated conflict and workload verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Swap Request
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Total Requests
            </span>
            <p className="text-2xl font-bold text-text mt-1">{swaps.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Approved
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {swaps.filter((s) => s.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Pending Review
            </span>
            <p className="text-2xl font-bold text-amber-500 mt-1">
              {swaps.filter((s) => s.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Auto-Verified Valid
            </span>
            <p className="text-2xl font-bold text-primary mt-1">
              {swaps.filter((s) => s.is_valid).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Swaps Table */}
      <Card>
        <CardHeader className="p-5 pb-3 border-b border-border">
          <CardTitle className="text-base font-bold text-text">
            Submitted Swap Requests
          </CardTitle>
          <p className="text-xs text-text-muted mt-0.5">
            Every swap is automatically evaluated against all 7 hard constraints before admin approval.
          </p>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-text-muted">Loading swap requests...</div>
          ) : swaps.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="h-10 w-10 text-text-subtle/50 mx-auto mb-2" />
              <p className="text-sm font-semibold text-text">No swap requests submitted yet</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Need to exchange an exam invigilation slot? Click &quot;New Swap Request&quot; above.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="p-3 pl-5">Duty to Swap</th>
                  <th className="p-3">Requested Exchange</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Engine Rule Verification</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs text-text">
                {swaps.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="p-3 pl-5">
                      <p className="font-semibold text-text">{s.exam?.subject_name}</p>
                      <p className="text-[11px] text-text-muted font-mono">{s.exam?.subject_code}</p>
                      <div className="text-[11px] text-text-subtle flex items-center gap-1.5 mt-0.5">
                        <Badge variant="primary" withDot={false} className="px-1 text-[10px]">
                          {s.exam?.session}
                        </Badge>
                        <span>{s.exam?.date}</span>
                        <span>•</span>
                        <span>{s.exam?.hall_name}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      {s.to_faculty ? (
                        <div>
                          <p className="font-semibold text-text">{s.to_faculty.name}</p>
                          <p className="text-[11px] text-text-muted">
                            {s.to_faculty.department} • [{s.to_faculty.code}]
                          </p>
                        </div>
                      ) : (
                        <span className="text-text-subtle italic">Open to any eligible faculty</span>
                      )}
                    </td>

                    <td className="p-3 max-w-[220px]">
                      <p className="text-text-muted line-clamp-2 leading-relaxed">{s.reason}</p>
                    </td>

                    <td className="p-3 max-w-[260px]">
                      {renderValidation(s.is_valid, s.validation_message)}
                    </td>

                    <td className="p-3">{renderStatus(s.status)}</td>

                    <td className="p-3 pr-5 text-right text-[11px] text-text-subtle">
                      {new Date(s.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* New Swap Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-text">Create Duty Swap Request</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSwap} className="space-y-4">
              {/* Duty to Swap */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">
                  Select Assigned Duty <span className="text-danger">*</span>
                </label>
                {myDuties.length === 0 ? (
                  <p className="text-xs text-text-muted p-3 rounded-lg bg-surface-muted">
                    You have no active duties to swap.
                  </p>
                ) : (
                  <select
                    value={selectedAllocationId}
                    onChange={(e) => setSelectedAllocationId(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {myDuties.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.subject_name} ({d.subject_code}) – {d.date} [{d.session}] @ {d.hall_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target Faculty */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">
                  Exchange Colleague (Optional)
                </label>
                <select
                  value={targetFacultyId}
                  onChange={(e) => setTargetFacultyId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Open to Any Available Faculty / Exam Cell Pool --</option>
                  {allFaculty
                    .filter((f) => f.id !== user?.faculty_id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department}) - {f.designation} [{f.faculty_code}]
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-text-subtle">
                  Selecting a colleague will immediately check their availability and department
                  ownership for conflicts.
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">
                  Reason for Request <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide legitimate academic, medical, or administrative reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              {/* AI Verification Note */}
              <div className="p-3.5 rounded-xl bg-primary-soft/50 border border-primary/20 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-muted leading-relaxed">
                  <strong className="text-text font-semibold">Instant Constraint Verification:</strong>{" "}
                  The backend solver rules engine will test the swap against all 7 hard constraints
                  and flag either <strong>&quot;Valid ✓&quot;</strong> or the exact broken rule for the Chief
                  Superintendent to inspect.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  disabled={myDuties.length === 0}
                  leftIcon={<Check className="h-4 w-4" />}
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
