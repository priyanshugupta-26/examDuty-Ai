"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Bot,
  Cpu,
  ArrowRightLeft,
  Settings2,
  FileText,
  AlertCircle,
  Database,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, AuditLogItem } from "@/lib/api";
import { toast } from "sonner";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Expandable row state for details JSON
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAuditLogs({
        action_type: category,
        search: debouncedSearch.trim() || undefined,
        limit: 100,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Failed to load audit logs.");
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [category, debouncedSearch]);

  const toggleExpand = (id: number) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionBadge = (action: string) => {
    if (action.startsWith("AI_")) {
      return (
        <Badge
          variant="outline"
          className="border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10 flex items-center gap-1 text-[11px]"
        >
          <Bot className="h-3 w-3" />
          {action.replace("AI_TOOL_", "").replace("AI_", "")}
        </Badge>
      );
    }
    if (action.includes("SOLVER") || action.includes("ALLOCATION")) {
      return (
        <Badge
          variant="outline"
          className="border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10 flex items-center gap-1 text-[11px]"
        >
          <Cpu className="h-3 w-3" />
          {action}
        </Badge>
      );
    }
    if (action.includes("SWAP")) {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 flex items-center gap-1 text-[11px]"
        >
          <ArrowRightLeft className="h-3 w-3" />
          {action}
        </Badge>
      );
    }
    if (action.includes("RESET") || action.includes("SYSTEM") || action.includes("SEED")) {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 flex items-center gap-1 text-[11px]"
        >
          <Database className="h-3 w-3" />
          {action}
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" className="text-[11px]">
        {action}
      </Badge>
    );
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const categories = [
    { id: "all", label: "All Activities" },
    { id: "ai", label: "AI Assistant", icon: Bot },
    { id: "allocation", label: "Solver & Allocations", icon: Cpu },
    { id: "swap", label: "Duty Swaps", icon: ArrowRightLeft },
    { id: "system", label: "System & Reset", icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-surface via-surface to-accent/5 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <History className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-text">Audit Trail & Activity Log</h1>
            </div>
            <p className="text-sm text-text-muted max-w-2xl">
              Cryptographically timestamped, append-only records of AI assistant tool invocations, CP-SAT solver runs, duty reassignments, and administrative operations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Refresh Logs
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border bg-surface shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-accent text-white shadow-xs"
                        : "bg-surface-sunken hover:bg-surface-raised text-text-muted hover:text-text border border-border/60"
                    }`}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <Input
                placeholder="Search action or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table / Feed */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface border border-border" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-danger/30 bg-danger-soft/20 my-8">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-danger mx-auto" />
            <div>
              <h3 className="text-base font-bold text-text">Audit Log Error</h3>
              <p className="text-xs text-text-muted mt-1">{error}</p>
            </div>
            <Button variant="primary" size="sm" onClick={loadLogs} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-surface-sunken flex items-center justify-center mx-auto text-text-muted">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-text">No Audit Logs Found</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              No entries match your current search or category filter. Try clearing the filter or performing an action in the system.
            </p>
            {(search || category !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCategory("all");
                  setSearch("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-surface shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-border bg-surface-sunken/40 flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium text-text">
              Showing {logs.length} of {total} audit records
            </span>
            <span className="font-mono text-[11px]">Target: SQLite immutable log</span>
          </div>

          <div className="divide-y divide-border/60">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              let parsedJson: unknown = null;
              if (log.details_json) {
                try {
                  parsedJson = JSON.parse(log.details_json);
                } catch {
                  parsedJson = log.details_json;
                }
              }

              return (
                <div key={log.id} className="transition-colors hover:bg-surface-sunken/30">
                  <div
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.action)}
                        <span className="text-xs font-semibold text-text truncate">
                          {log.summary || log.action}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-text-muted" />
                          <span className="font-medium text-text">{log.actor_name}</span>
                          <span className="text-[10px] text-text-muted">({log.actor_email})</span>
                        </span>

                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="h-3 w-3 text-text-muted" />
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {log.details_json && (
                        <span className="text-[11px] text-accent flex items-center gap-1 font-medium">
                          {isExpanded ? "Hide JSON" : "Inspect Payload"}
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable JSON details */}
                  {isExpanded && log.details_json && (
                    <div className="px-4 pb-4 pt-1 bg-surface-sunken/50 border-t border-border/40">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <span className="font-semibold text-text flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-accent" />
                            Event Payload Details
                          </span>
                          <span className="font-mono text-[10px]">Log Record #{log.id}</span>
                        </div>
                        <pre className="p-3 rounded-lg bg-surface-raised border border-border font-mono text-[11px] text-text overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
                          {typeof parsedJson === "object" ? JSON.stringify(parsedJson, null, 2) : String(parsedJson)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
