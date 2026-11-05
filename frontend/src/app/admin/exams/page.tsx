"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Trash2,
  Edit2,
  X,
  Building2,
  Users2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, ExamItem, HallItem } from "@/lib/api";
import { ExcelImportModal } from "@/components/common/excel-import-modal";
import { toast } from "sonner";

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [halls, setHalls] = useState<HallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("ALL");

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);

  // Form state
  const [date, setDate] = useState("2026-11-15");
  const [session, setSession] = useState("FN");
  const [startTime, setStartTime] = useState("09:30 AM");
  const [endTime, setEndTime] = useState("12:30 PM");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [branch, setBranch] = useState("CSE");
  const [year, setYear] = useState(2);
  const [semester, setSemester] = useState(3);
  const [departmentOwner, setDepartmentOwner] = useState("CSE");
  const [selectedHallId, setSelectedHallId] = useState<number>(0);
  const [studentCount, setStudentCount] = useState(45);

  const loadData = async () => {
    try {
      const [examData, hallData] = await Promise.all([
        api.listExams(),
        api.listHalls(),
      ]);
      setExams(examData);
      setHalls(hallData);
      if (hallData.length > 0 && selectedHallId === 0) {
        setSelectedHallId(hallData[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load examination timetable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSessionChange = (sess: string) => {
    setSession(sess);
    if (sess === "FN") {
      setStartTime("09:30 AM");
      setEndTime("12:30 PM");
    } else {
      setStartTime("02:00 PM");
      setEndTime("05:00 PM");
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !subjectCode) {
      toast.error("Subject name and code are required.");
      return;
    }

    try {
      if (editingExam) {
        const res = await api.updateExam(editingExam.id, {
          date,
          session,
          start_time: startTime,
          end_time: endTime,
          subject_name: subjectName,
          subject_code: subjectCode,
          branch,
          year,
          semester,
          department_owner: departmentOwner,
          hall_id: selectedHallId,
          student_count: studentCount,
        });
        toast.success(res.message);
      } else {
        const res = await api.createExam({
          date,
          session,
          start_time: startTime,
          end_time: endTime,
          subject_name: subjectName,
          subject_code: subjectCode,
          branch,
          year,
          semester,
          department_owner: departmentOwner,
          hall_id: selectedHallId || halls[0]?.id || 1,
          student_count: studentCount,
        });
        toast.success(res.message);
      }

      setCreateOpen(false);
      setEditingExam(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save examination session.");
    }
  };

  const resetForm = () => {
    setSubjectName("");
    setSubjectCode("");
    setDate("2026-11-15");
    setSession("FN");
    setStartTime("09:30 AM");
    setEndTime("12:30 PM");
    setStudentCount(45);
  };

  const handleStartEdit = (exam: ExamItem) => {
    setEditingExam(exam);
    setDate(exam.date);
    setSession(exam.session);
    setStartTime(exam.start_time);
    setEndTime(exam.end_time);
    setSubjectName(exam.subject_name);
    setSubjectCode(exam.subject_code);
    setBranch(exam.branch);
    setYear(exam.year);
    setSemester(exam.semester);
    setDepartmentOwner(exam.department_owner);
    if (exam.halls && exam.halls.length > 0) {
      setSelectedHallId(exam.halls[0].hall_id);
      setStudentCount(exam.halls[0].student_count);
    }
    setCreateOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this examination session?")) return;
    try {
      const res = await api.deleteExam(id);
      toast.success(res.message);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete exam.");
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.subject_name.toLowerCase().includes(search.toLowerCase()) ||
      e.subject_code.toLowerCase().includes(search.toLowerCase()) ||
      e.department_owner.toLowerCase().includes(search.toLowerCase());
    const matchesSession = sessionFilter === "ALL" || e.session === sessionFilter;
    return matchesSearch && matchesSession;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Examination Timetable
            </span>
            <Badge variant="primary">{exams.length} Examination Sessions</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text">Exam Schedule & Hall Demands</h2>
          <p className="text-xs text-text-muted">
            End-Semester examinations, course mappings, student quotas, and invigilator requirements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a href={api.getTemplateUrl("exams")} download target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>
              Template
            </Button>
          </a>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setImportOpen(true)}
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
          >
            Import Excel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingExam(null);
              resetForm();
              setCreateOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Exam
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-subtle" />
          <Input
            placeholder="Search subject name, code (e.g. 21CS301), or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-text"
        >
          <option value="ALL">All Sessions</option>
          <option value="FN">Forenoon (FN)</option>
          <option value="AN">Afternoon (AN)</option>
        </select>
      </div>

      {/* Table (Section 4.3) */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-border text-text-muted uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Date & Session</th>
                <th className="p-3">Subject Name</th>
                <th className="p-3">Code</th>
                <th className="p-3">Branch & Year</th>
                <th className="p-3">Hall(s) Assigned</th>
                <th className="p-3 text-center">Students</th>
                <th className="p-3 text-center">Invigilators</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filteredExams.map((e) => (
                <tr key={e.id} className="hover:bg-surface-muted/20 transition-colors">
                  <td className="p-3 font-semibold text-text">
                    <span className="block">{e.date}</span>
                    <Badge variant={e.session === "FN" ? "info" : "warning"} withDot={false} className="mt-0.5 text-[10px]">
                      {e.session} ({e.start_time})
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-text block">{e.subject_name}</span>
                    <span className="text-[11px] text-text-subtle">
                      Owner: <span className="font-semibold text-primary">{e.department_owner}</span>
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-primary">{e.subject_code}</td>
                  <td className="p-3 text-text-muted">
                    {e.branch} • Year {e.year}, Sem {e.semester}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {e.halls.map((h) => (
                        <span
                          key={h.exam_hall_id}
                          className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[11px] font-semibold text-text"
                        >
                          {h.hall_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold text-text tabular-numbers">
                    {e.total_students}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full font-bold text-xs bg-primary-soft text-primary tabular-numbers">
                      {e.invigilators_required} req
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={
                        e.status === "Published"
                          ? "success"
                          : e.status === "Draft"
                          ? "warning"
                          : "neutral"
                      }
                    >
                      {e.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleStartEdit(e)}
                        className="p-1.5 rounded-lg text-text-subtle hover:text-text hover:bg-surface-muted transition-colors"
                        title="Edit exam"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 rounded-lg text-text-subtle hover:text-danger hover:bg-danger-soft transition-colors"
                        title="Delete exam"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE / EDIT EXAM MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text">
                {editingExam ? "Edit Exam Session" : "Schedule New Examination"}
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded-lg text-text-subtle hover:text-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-text uppercase tracking-wider block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-border bg-surface text-xs text-text"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text uppercase tracking-wider block mb-1">
                    Session
                  </label>
                  <select
                    value={session}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-border bg-surface text-xs text-text"
                  >
                    <option value="FN">Forenoon (09:30 AM - 12:30 PM)</option>
                    <option value="AN">Afternoon (02:00 PM - 05:00 PM)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Subject Name"
                placeholder="e.g. Distributed Operating Systems"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Subject Code"
                  placeholder="e.g. 21CS402"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  required
                />
                <div>
                  <label className="text-xs font-semibold text-text uppercase tracking-wider block mb-1">
                    Department Owner
                  </label>
                  <select
                    value={departmentOwner}
                    onChange={(e) => setDepartmentOwner(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-border bg-surface text-xs text-text"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="S&H">S&H</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
                <Input
                  label="Year"
                  type="number"
                  min={1}
                  max={4}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
                <Input
                  label="Semester"
                  type="number"
                  min={1}
                  max={8}
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                <div>
                  <label className="text-xs font-semibold text-text uppercase tracking-wider block mb-1">
                    Hall Assigned
                  </label>
                  <select
                    value={selectedHallId}
                    onChange={(e) => setSelectedHallId(Number(e.target.value))}
                    className="w-full h-10 px-2 rounded-lg border border-border bg-surface text-xs text-text"
                  >
                    {halls.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.block}, cap {h.capacity})
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Student Count"
                  type="number"
                  min={1}
                  max={200}
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  helperText={`Requires ${Math.max(1, Math.ceil(studentCount / 30))} invigilator(s)`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  {editingExam ? "Save Changes" : "Commit Exam"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelImportModal
        entity="exams"
        title="Import Exam Timetable via Excel"
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
