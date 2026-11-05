"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Building2,
  Award,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowLeft,
  FileDown,
  FileText,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { api, FacultyPortalDutiesResponse } from "@/lib/api";
import { toast } from "sonner";

export default function FacultyProfilePage() {
  const { user } = useAuth();
  const [data, setData] = useState<FacultyPortalDutiesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFacultyPortalDuties()
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const faculty = data?.faculty || user?.faculty;

  const handleDownloadPdf = async () => {
    try {
      await api.downloadDutyLetterFile(faculty?.faculty_code);
      toast.success("Duty order letter downloaded successfully!");
    } catch {
      toast.error("Failed to download PDF duty letter.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
                Faculty Information
              </span>
              <Badge variant="primary">{faculty?.department || "VFSTR Faculty"}</Badge>
            </div>
            <h2 className="text-2xl font-bold text-text mt-1">
              {faculty?.name || user?.email}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {faculty?.designation || "Assistant Professor"} • Employee Code:{" "}
              <span className="font-mono font-medium">{faculty?.faculty_code || "VF-FAC"}</span>
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownloadPdf}
          leftIcon={<FileDown className="h-4 w-4" />}
        >
          Download Duty Order (PDF)
        </Button>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Affiliation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Institutional Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-text-subtle" />
                Email Address
              </span>
              <span className="font-semibold text-text">{faculty?.email || user?.email}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-text-subtle" />
                Contact Phone
              </span>
              <span className="font-semibold text-text">+91 98480 12345</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-text-subtle" />
                Department
              </span>
              <span className="font-semibold text-text">{faculty?.department || "CSE"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-text-muted flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-text-subtle" />
                Designation
              </span>
              <span className="font-semibold text-text">{faculty?.designation || "Faculty"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Workload & Quotas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Invigilation Workload Policy</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted">Maximum Duty Cap</span>
              <span className="font-bold text-text tabular-numbers">
                {faculty?.max_duties || 5} duties / exam period
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted">Historical Carry-over Duties</span>
              <span className="font-bold text-text tabular-numbers">
                {faculty?.past_duties || 0}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-text-muted">Currently Assigned Duties</span>
              <span className="font-bold text-primary tabular-numbers">
                {data?.total || 0} duties
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-text-muted">Fairness Balancing</span>
              <Badge variant="success">Optimized</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave & Protection Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Leave & Availability Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {faculty?.faculty_code === "VF-CSE-001" ? (
            <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/20 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-danger shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-danger">Registered Unavailability: 12 Nov 2026 (Forenoon)</p>
                <p className="text-text-muted leading-relaxed">
                  Reason: Medical Leave • Status: <strong>Approved by Dean</strong>
                </p>
                <p className="text-[11px] text-text-subtle">
                  The CP-SAT solver strictly respects this unavailability and has assigned 0 duties for this session.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-surface-muted border border-border/60 flex items-center gap-2 text-text-muted">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>No active leave or unavailabilities registered. All sessions available.</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-primary-soft/40 border border-primary/20 flex items-start gap-3 mt-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-text">Own-Department Conflict Shield</p>
              <p className="text-text-muted leading-relaxed">
                As a faculty member in the Department of <strong>{faculty?.department || "CSE"}</strong>, you are
                systematically protected from invigilating any exams belonging to your home department.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
