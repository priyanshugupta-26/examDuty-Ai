"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  Info,
  Check,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, SwapItem } from "@/lib/api";
import { toast } from "sonner";

export default function AdminSwapsPage() {
  const [swaps, setSwaps] = useState<SwapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Reject feedback modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingSwapId, setRejectingSwapId] = useState<number | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const loadSwaps = async () => {
    try {
      setLoading(true);
      const list = await api.listSwaps();
      setSwaps(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load swap requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSwaps();
  }, []);

  const handleApprove = async (swap: SwapItem) => {
    if (!swap.is_valid) {
      const proceed = window.confirm(
        `Warning: This swap breaks solver constraints: "${swap.validation_message}". Are you sure you want to approve it anyway?`
      );
      if (!proceed) return;
    }

    setProcessingId(swap.id);
    try {
      const res = await api.approveSwap(swap.id);
      toast.success(res.message || "Swap approved! Allocation reassigned and faculty notified.");
      loadSwaps();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to approve swap");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (swapId: number) => {
    setRejectingSwapId(swapId);
    setRejectFeedback("Unable to approve swap due to operational constraints or schedule requirements.");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSwapId) return;

    setProcessingId(rejectingSwapId);
    try {
      const res = await api.rejectSwap(rejectingSwapId, rejectFeedback);
      toast.success(res.message || "Swap request rejected. Faculty notified.");
      setRejectModalOpen(false);
      loadSwaps();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to reject swap");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSwaps = useMemo(() => {
    return swaps.filter((s) => {
      if (filterTab !== "all" && s.status !== filterTab) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.from_faculty.name.toLowerCase().includes(q) ||
        s.from_faculty.department.toLowerCase().includes(q) ||
        (s.to_faculty && s.to_faculty.name.toLowerCase().includes(q)) ||
        s.exam.subject_name.toLowerCase().includes(q) ||
        s.exam.subject_code.toLowerCase().includes(q) ||
        s.reason.toLowerCase().includes(q)
      );
    });
  }, [swaps, filterTab, searchQuery]);

  const pendingCount = swaps.filter((s) => s.status === "pending").length;
  const approvedCount = swaps.filter((s) => s.status === "approved").length;
  const rejectedCount = swaps.filter((s) => s.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Exam Cell Administration
            </span>
            <Badge variant="primary">Automated Hard Constraint Check</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text mt-1">
            Swap Requests & Rule Verification
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review faculty duty exchange requests. The CP-SAT engine validates all 7 hard constraints in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSwaps}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh List
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Pending Requests
            </span>
            <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Approved
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {approvedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Rejected
            </span>
            <p className="text-2xl font-bold text-danger mt-1">{rejectedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Total Swaps
            </span>
            <p className="text-2xl font-bold text-text mt-1">{swaps.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Swaps Table Card */}
      <Card>
        <CardHeader className="p-5 pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-text">
                Duty Swap Management
              </CardTitle>
              <p className="text-xs text-text-muted mt-0.5">
                Approve or reject requests. Approved swaps reassign duties and notify faculty automatically.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex p-0.5 rounded-lg bg-surface-muted border border-border">
                <button
                  onClick={() => setFilterTab("pending")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterTab === "pending"
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterTab === "all"
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  All ({swaps.length})
                </button>
                <button
                  onClick={() => setFilterTab("approved")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterTab === "approved"
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  onClick={() => setFilterTab("rejected")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    filterTab === "rejected"
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Rejected ({rejectedCount})
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-subtle" />
                <input
                  type="text"
                  placeholder="Filter swaps..."
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
            <div className="p-12 text-center text-xs text-text-muted">Loading swap requests...</div>
          ) : filteredSwaps.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="h-10 w-10 text-text-subtle/50 mx-auto mb-2" />
              <p className="text-sm font-semibold text-text">No swap requests under this filter</p>
              <p className="text-xs text-text-muted mt-1">
                {filterTab === "pending"
                  ? "Great! All swap requests have been reviewed."
                  : "No requests found matching your criteria."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="p-3 pl-5">Requesting Faculty</th>
                  <th className="p-3">Exam Duty Details</th>
                  <th className="p-3">Target Colleague</th>
                  <th className="p-3">Stated Reason</th>
                  <th className="p-3">Rule Verification</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs text-text">
                {filteredSwaps.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="p-3 pl-5">
                      <p className="font-semibold text-text">{s.from_faculty.name}</p>
                      <p className="text-[11px] text-text-muted">
                        {s.from_faculty.department} • [{s.from_faculty.code}]
                      </p>
                    </td>

                    <td className="p-3">
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
                        <Badge variant="neutral" withDot={false}>
                          Open Pool
                        </Badge>
                      )}
                    </td>

                    <td className="p-3 max-w-[200px]">
                      <p className="text-text-muted line-clamp-2 leading-relaxed">{s.reason}</p>
                    </td>

                    <td className="p-3 max-w-[260px]">
                      {s.is_valid ? (
                        <div className="flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Valid ✓</span>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {s.validation_message}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 text-xs text-danger font-medium">
                          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Broken Rule ✕</span>
                            <p className="text-[11px] text-danger/90 mt-0.5">
                              {s.validation_message}
                            </p>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      {s.status === "approved" && (
                        <Badge variant="success">Approved</Badge>
                      )}
                      {s.status === "rejected" && (
                        <Badge variant="danger">Rejected</Badge>
                      )}
                      {s.status === "pending" && (
                        <Badge variant="warning">Pending Review</Badge>
                      )}
                    </td>

                    <td className="p-3 pr-5 text-right">
                      {s.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(s)}
                            isLoading={processingId === s.id}
                            leftIcon={<Check className="h-3 w-3" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReject(s.id)}
                            disabled={processingId === s.id}
                            className="text-danger hover:bg-danger-soft hover:text-danger"
                            leftIcon={<X className="h-3 w-3" />}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-subtle italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-danger" />
                <h3 className="text-base font-bold text-text">Reject Swap Request</h3>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">
                  Rejection Reason / Feedback for Faculty
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectFeedback}
                  onChange={(e) => setRejectFeedback(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-danger leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  isLoading={processingId !== null}
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
