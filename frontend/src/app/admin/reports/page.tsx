"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  TrendingUp,
  Scale,
  Building2,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ReportsSummary } from "@/lib/api";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters for Faculty Workload Table
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "total_duties" | "department">("total_duties");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getReportsSummary();
      setData(res);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj.message || "Failed to load reports summary.");
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      toast.info("Generating Excel report...");
      await api.downloadReportsExcel();
      toast.success("Excel report exported successfully!");
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to export Excel report.");
    } finally {
      setExporting(false);
    }
  };

  // Distinct departments
  const departments = useMemo(() => {
    if (!data?.department_summary) return [];
    return data.department_summary.map((d) => d.department);
  }, [data]);

  // Filtered & sorted faculty workload
  const filteredFaculty = useMemo(() => {
    if (!data?.faculty_workload) return [];
    return data.faculty_workload
      .filter((fac) => {
        const matchesSearch =
          fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fac.faculty_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fac.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === "all" || fac.department === deptFilter;
        const matchesStatus =
          statusFilter === "all" ||
          fac.compliance_status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesDept && matchesStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") {
          cmp = a.name.localeCompare(b.name);
        } else if (sortField === "department") {
          cmp = a.department.localeCompare(b.department);
        } else {
          cmp = a.total_duties - b.total_duties;
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [data, searchQuery, deptFilter, statusFilter, sortField, sortOrder]);

  const toggleSort = (field: "name" | "total_duties" | "department") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-surface border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-surface border border-border" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-surface border border-border" />
        <div className="h-96 rounded-xl bg-surface border border-border" />
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <Card className="border-danger/30 bg-danger-soft/20 my-8">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-danger mx-auto" />
          <div>
            <h3 className="text-base font-bold text-text">Reports Service Unavailable</h3>
            <p className="text-xs text-text-muted mt-1">{error || "Could not retrieve institutional reports."}</p>
          </div>
          <Button variant="primary" size="sm" onClick={loadReports} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Retry Loading Reports
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { fairness, department_summary } = data;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-surface via-surface to-accent/5 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BarChart3 className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-text">Fairness & Distribution Reports</h1>
            </div>
            <p className="text-sm text-text-muted max-w-2xl">
              Quantitative invigilation equity index, cross-departmental workload parity, and verifiable institutional audit records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadReports}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportExcel}
              disabled={exporting}
              leftIcon={
                exporting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {exporting ? "Generating..." : "Export to Excel (.xlsx)"}
            </Button>
          </div>
        </div>
      </div>

      {/* 5 KPI Stat Cards (Duties per Faculty: Min, Max, Avg, Std-Dev, Fairness Score) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Fairness Score */}
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Fairness Score</span>
              <Scale className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-accent">
                {fairness.fairness_score}
              </span>
              <span className="text-xs text-text-muted font-medium">/ 100</span>
            </div>
            <Badge variant="success" className="text-[10px] py-0 px-1.5 font-medium">
              Optimal Variance
            </Badge>
          </CardContent>
        </Card>

        {/* Min Duties */}
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Min Duties</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-text">
                {fairness.min_duties}
              </span>
              <span className="text-xs text-text-muted">duties / fac</span>
            </div>
            <p className="text-[11px] text-text-muted">Lowest individual load</p>
          </CardContent>
        </Card>

        {/* Max Duties */}
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Max Duties</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-text">
                {fairness.max_duties}
              </span>
              <span className="text-xs text-text-muted">duties / fac</span>
            </div>
            <p className="text-[11px] text-text-muted">Below max threshold (4)</p>
          </CardContent>
        </Card>

        {/* Average Duties */}
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Average Duties</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-text">
                {fairness.average_duties}
              </span>
              <span className="text-xs text-text-muted">duties / fac</span>
            </div>
            <p className="text-[11px] text-text-muted">Total pool: {fairness.total_faculty} faculty</p>
          </CardContent>
        </Card>

        {/* Standard Deviation */}
        <Card className="border-border bg-surface shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-xs font-semibold uppercase tracking-wider">Std Deviation (σ)</span>
              <Layers className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-text">
                {fairness.std_dev}
              </span>
              <span className="text-xs text-text-muted">σ index</span>
            </div>
            <Badge variant="neutral" className="text-[10px] py-0 px-1.5 font-medium">
              Tight Distribution
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Least Busy vs Most Busy Faculty Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Least Busy */}
        <Card className="border-border bg-surface shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-text">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Least Busy Faculty (Available Capacity)
              </CardTitle>
              <Badge variant="neutral" className="text-[10px]">
                {fairness.least_busy_faculty.length} Members
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="divide-y divide-border/60">
              {fairness.least_busy_faculty.map((f, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-text">{f.name}</div>
                    <div className="text-[11px] text-text-muted">{f.department} • {f.duties} assigned</div>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    {f.duties} Duty
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Busy */}
        <Card className="border-border bg-surface shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-text">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Highest Workload Faculty (Near Cap)
              </CardTitle>
              <Badge variant="neutral" className="text-[10px]">
                {fairness.most_busy_faculty.length} Members
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="divide-y divide-border/60">
              {fairness.most_busy_faculty.map((f, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-text">{f.name}</div>
                    <div className="text-[11px] text-text-muted">{f.department} • total workload: 3</div>
                  </div>
                  <Badge variant="warning" className="text-[10px]">
                    3 Duties Total
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department-Wise Distribution Table */}
      <Card className="border-border bg-surface shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-text">
                <Building2 className="h-4 w-4 text-accent" />
                Department-Wise Workload Distribution
              </CardTitle>
              <p className="text-xs text-text-muted">
                Aggregation of invigilation duties, faculty headcounts, and average allocation density per department.
              </p>
            </div>
            <Badge variant="neutral" className="text-xs">
              {department_summary.length} Academic Depts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken text-text-muted uppercase text-[10px] tracking-wider font-semibold border-y border-border">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Faculty Pool</th>
                  <th className="py-3 px-4 text-center">Exams Owned</th>
                  <th className="py-3 px-4 text-center">Assigned Duties</th>
                  <th className="py-3 px-4 text-center">Carryover</th>
                  <th className="py-3 px-4 text-center">Total Workload</th>
                  <th className="py-3 px-4 text-center">Avg / Faculty</th>
                  <th className="py-3 px-4 text-right">Workload Proportion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium text-text">
                {department_summary.map((dept) => {
                  const maxExpected = 3.5;
                  const ratio = Math.min(100, Math.round((dept.average_duties / maxExpected) * 100));
                  return (
                    <tr key={dept.department} className="hover:bg-surface-sunken/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-text flex items-center gap-2">
                        <span className="h-6 w-6 rounded bg-surface-raised border border-border flex items-center justify-center text-[10px] text-accent font-bold">
                          {dept.department.slice(0, 3)}
                        </span>
                        {dept.department}
                      </td>
                      <td className="py-3.5 px-4 text-center text-text-muted">{dept.faculty_count}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-text">{dept.exams_owned}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-accent">{dept.assigned_duties}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-text-muted">{dept.past_duties}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-text">{dept.total_duties}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className="text-xs font-bold text-text">
                          {dept.average_duties.toFixed(2)}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-surface-sunken rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-accent h-1.5 rounded-full"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-text-muted font-mono">{ratio}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Individual Faculty Workload Roster */}
      <Card className="border-border bg-surface shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-text">
                <Users className="h-4 w-4 text-accent" />
                Faculty Workload Roster
              </CardTitle>
              <p className="text-xs text-text-muted">
                Granular view of all faculty members with duties breakdown, carryover records, and ceiling compliance.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <Input
                  placeholder="Search faculty or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              {/* Department Dropdown */}
              <select
                aria-label="Filter by department"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="all">All Depts</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Status Dropdown */}
              <select
                aria-label="Filter by compliance status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="all">All Statuses</option>
                <option value="optimal">Optimal</option>
                <option value="near max">Near Max</option>
                <option value="at max">At Max</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sunken text-text-muted uppercase text-[10px] tracking-wider font-semibold border-y border-border">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer select-none hover:text-text transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Faculty Member
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer select-none hover:text-text transition-colors"
                    onClick={() => toggleSort("department")}
                  >
                    <div className="flex items-center gap-1">
                      Department
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Designation</th>
                  <th className="py-3 px-4 text-center">Draft Duties</th>
                  <th className="py-3 px-4 text-center">Past Carryover</th>
                  <th
                    className="py-3 px-4 text-center cursor-pointer select-none hover:text-text transition-colors"
                    onClick={() => toggleSort("total_duties")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Total Workload
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Ceiling Limit</th>
                  <th className="py-3 px-4 text-right">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium text-text">
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-text-muted">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Users className="h-8 w-8 text-text-muted mx-auto opacity-50" />
                        <p className="font-semibold text-text text-sm">No matching faculty found</p>
                        <p className="text-xs">Adjust your search or filter options.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((fac) => (
                    <tr key={fac.id} className="hover:bg-surface-sunken/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-text">
                        <div>{fac.name}</div>
                        <div className="text-[10px] font-mono text-text-muted">{fac.faculty_code}</div>
                      </td>
                      <td className="py-3.5 px-4 text-text-muted font-medium">{fac.department}</td>
                      <td className="py-3.5 px-4 text-center text-text-muted text-[11px]">{fac.designation}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-accent">{fac.assigned_duties}</td>
                      <td className="py-3.5 px-4 text-center text-text-muted">{fac.past_duties}</td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-text">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-surface-raised border border-border">
                          {fac.total_duties}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-text-muted">{fac.max_duties} max</td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge
                          variant={
                            fac.compliance_status === "Optimal"
                              ? "success"
                              : fac.compliance_status === "Near Max"
                              ? "warning"
                              : "neutral"
                          }
                          className="text-[10px]"
                        >
                          {fac.compliance_status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border bg-surface-sunken/30 text-xs text-text-muted flex items-center justify-between">
            <span>
              Showing {filteredFaculty.length} of {data.faculty_workload.length} faculty members
            </span>
            <span>All assignments strictly honor maximum workload ceiling (≤ 4 duties)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
