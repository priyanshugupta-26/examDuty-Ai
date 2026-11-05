"use client";

import React, { useState, useEffect } from "react";
import {
  Users2,
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Calendar,
  History,
  Shield,
  Trash2,
  Edit2,
  X,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, FacultyItem } from "@/lib/api";
import { ExcelImportModal } from "@/components/common/excel-import-modal";
import { toast } from "sonner";

export default function FacultyPage() {
  const [facultyList, setFacultyList] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedFacultyDrawer, setSelectedFacultyDrawer] = useState<FacultyItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<"profile" | "leave" | "history">("profile");

  // Create form state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("CSE");
  const [newDesig, setNewDesig] = useState("Assistant Professor");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newMaxDuties, setNewMaxDuties] = useState(5);
  const [newPastDuties, setNewPastDuties] = useState(0);

  // Leave form state
  const [leaveDate, setLeaveDate] = useState("2026-11-12");
  const [leaveSession, setLeaveSession] = useState("FN");
  const [leaveReason, setLeaveReason] = useState("");
  const [dutyHistory, setDutyHistory] = useState<any[]>([]);

  const loadFaculty = async () => {
    try {
      const data = await api.listFaculty();
      setFacultyList(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load faculty directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
  }, []);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createFaculty({
        faculty_code: newCode,
        name: newName,
        department: newDept,
        designation: newDesig,
        email: newEmail,
        phone: newPhone,
        max_duties: newMaxDuties,
        past_duties: newPastDuties,
      });
      toast.success(res.message);
      setCreateOpen(false);
      resetCreateForm();
      await loadFaculty();
    } catch (err: any) {
      toast.error(err.message || "Failed to create faculty.");
    }
  };

  const resetCreateForm = () => {
    setNewCode("");
    setNewName("");
    setNewDept("CSE");
    setNewDesig("Assistant Professor");
    setNewEmail("");
    setNewPhone("");
    setNewMaxDuties(5);
    setNewPastDuties(0);
  };

  const handleOpenDrawer = async (fac: FacultyItem) => {
    setSelectedFacultyDrawer(fac);
    setDrawerTab("profile");
    try {
      const duties = await api.getFacultyDuties(fac.id);
      setDutyHistory(duties);
    } catch {
      setDutyHistory([]);
    }
  };

  const handleAddLeave = async () => {
    if (!selectedFacultyDrawer) return;
    try {
      const res = await api.addUnavailability(selectedFacultyDrawer.id, {
        date: leaveDate,
        session: leaveSession,
        reason: leaveReason || "Personal Leave",
      });
      toast.success(res.message);
      setLeaveReason("");
      await loadFaculty();
      // Update drawer item
      const updated = await api.listFaculty();
      const current = updated.find((f) => f.id === selectedFacultyDrawer.id);
      if (current) setSelectedFacultyDrawer(current);
    } catch (err: any) {
      toast.error(err.message || "Failed to add leave.");
    }
  };

  const handleDeleteLeave = async (unavailId: number) => {
    try {
      const res = await api.deleteUnavailability(unavailId);
      toast.success(res.message);
      await loadFaculty();
      if (selectedFacultyDrawer) {
        const updated = await api.listFaculty();
        const current = updated.find((f) => f.id === selectedFacultyDrawer.id);
        if (current) setSelectedFacultyDrawer(current);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to remove leave.");
    }
  };

  const filteredFaculty = facultyList.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.faculty_code.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "ALL" || f.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              VFSTR Faculty Registry
            </span>
            <Badge variant="primary">{facultyList.length} Faculty Members</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text">Faculty Roster & Availability</h2>
          <p className="text-xs text-text-muted">
            Manage university departments, maximum duties, leaves, and invigilation history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a href={api.getTemplateUrl("faculty")} download target="_blank" rel="noreferrer">
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
            onClick={() => setCreateOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Faculty
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-subtle" />
          <Input
            placeholder="Search faculty by name, code (e.g. VF-CSE-001), or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-text focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Departments</option>
          <option value="CSE">CSE</option>
          <option value="ECE">ECE</option>
          <option value="MECH">MECH</option>
          <option value="CIVIL">CIVIL</option>
          <option value="S&H">S&H</option>
        </select>
      </div>

      {/* Faculty Table (Section 4.5) */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-border text-text-muted uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3 w-28">Faculty ID</th>
                <th className="p-3">Name & Designation</th>
                <th className="p-3">Department</th>
                <th className="p-3">Contact</th>
                <th className="p-3 text-center">Max / Past</th>
                <th className="p-3 text-center">Assigned</th>
                <th className="p-3 text-center">Leave</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {filteredFaculty.map((f) => (
                <tr key={f.id} className="hover:bg-surface-muted/20 transition-colors">
                  <td className="p-3 font-mono font-bold text-primary">{f.faculty_code}</td>
                  <td className="p-3">
                    <span className="font-bold text-text block">{f.name}</span>
                    <span className="text-[11px] text-text-subtle">{f.designation}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant="primary" withDot={false} className="font-semibold text-[11px]">
                      {f.department}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-text block">{f.email}</span>
                    <span className="text-[10px] text-text-subtle">{f.phone || "—"}</span>
                  </td>
                  <td className="p-3 text-center tabular-numbers">
                    <span className="font-semibold text-text">{f.max_duties} max</span>
                    <span className="text-[10px] text-text-subtle block">
                      +{f.past_duties} past
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full font-bold text-xs bg-primary-soft text-primary tabular-numbers">
                      {f.assigned_duties}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {f.unavailabilities.length > 0 ? (
                      <Badge variant="danger" withDot={false}>
                        {f.unavailabilities.length} Leave
                      </Badge>
                    ) : (
                      <span className="text-text-subtle text-[11px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDrawer(f)}
                    >
                      View / Leave
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ROW DRAWER (Profile, Availability/Leave, Duty History) */}
      {selectedFacultyDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-surface border-l border-border h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                    {selectedFacultyDrawer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text">{selectedFacultyDrawer.name}</h3>
                    <p className="text-xs text-text-muted font-mono">
                      {selectedFacultyDrawer.faculty_code} • {selectedFacultyDrawer.department}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFacultyDrawer(null)}
                  className="p-1 rounded-lg text-text-subtle hover:text-text"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border text-xs font-semibold">
                <button
                  onClick={() => setDrawerTab("profile")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors ${
                    drawerTab === "profile"
                      ? "border-primary text-primary"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setDrawerTab("leave")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                    drawerTab === "leave"
                      ? "border-primary text-primary"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  <span>Availability / Leave</span>
                  {selectedFacultyDrawer.unavailabilities.length > 0 && (
                    <span className="h-4 w-4 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
                      {selectedFacultyDrawer.unavailabilities.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setDrawerTab("history")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors ${
                    drawerTab === "history"
                      ? "border-primary text-primary"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  Duty History ({dutyHistory.length})
                </button>
              </div>

              {/* TAB 1: PROFILE */}
              {drawerTab === "profile" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface-muted/50 border border-border space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Designation:</span>
                      <span className="font-bold text-text">{selectedFacultyDrawer.designation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Email:</span>
                      <span className="font-mono text-text">{selectedFacultyDrawer.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Phone:</span>
                      <span className="text-text">{selectedFacultyDrawer.phone || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Max Duties:</span>
                      <span className="font-bold text-text">{selectedFacultyDrawer.max_duties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Past Carry-over:</span>
                      <span className="font-bold text-text">{selectedFacultyDrawer.past_duties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Currently Assigned:</span>
                      <span className="font-bold text-primary">{selectedFacultyDrawer.assigned_duties}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LEAVE & UNAVAILABILITY */}
              {drawerTab === "leave" && (
                <div className="space-y-5">
                  {/* Add Leave Form */}
                  <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                    <span className="text-xs font-bold text-text uppercase tracking-wider block">
                      Mark Unavailability (Leave)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-text-muted block mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={leaveDate}
                          onChange={(e) => setLeaveDate(e.target.value)}
                          className="w-full h-9 px-2 text-xs rounded-lg border border-border bg-surface text-text"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-text-muted block mb-1">
                          Session
                        </label>
                        <select
                          value={leaveSession}
                          onChange={(e) => setLeaveSession(e.target.value)}
                          className="w-full h-9 px-2 text-xs rounded-lg border border-border bg-surface text-text"
                        >
                          <option value="FN">Forenoon (FN)</option>
                          <option value="AN">Afternoon (AN)</option>
                          <option value="BOTH">Full Day (BOTH)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-text-muted block mb-1">
                        Reason
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Medical emergency, Conference"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-surface text-text"
                      />
                    </div>
                    <Button variant="primary" size="sm" className="w-full" onClick={handleAddLeave}>
                      Record Leave
                    </Button>
                  </div>

                  {/* List of Marked Leaves */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-text uppercase tracking-wider block">
                      Existing Leave Records
                    </span>
                    {selectedFacultyDrawer.unavailabilities.length === 0 ? (
                      <p className="text-xs text-text-subtle py-2">No leaves marked. Fully available.</p>
                    ) : (
                      selectedFacultyDrawer.unavailabilities.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-muted/40 text-xs"
                        >
                          <div>
                            <span className="font-bold text-text">{u.date}</span>
                            <span className="ml-2 font-semibold text-primary">[{u.session}]</span>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {u.reason || "Personal leave"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteLeave(u.id)}
                            className="p-1.5 rounded-md text-text-subtle hover:text-danger hover:bg-danger-soft transition-colors"
                            title="Remove leave"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DUTY HISTORY */}
              {drawerTab === "history" && (
                <div className="space-y-2">
                  {dutyHistory.length === 0 ? (
                    <p className="text-xs text-text-subtle py-4 text-center">
                      No invigilation duties currently assigned. Run auto-allocation to assign.
                    </p>
                  ) : (
                    dutyHistory.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-xl border border-border bg-surface-muted/30 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text">{d.subject_name}</span>
                          <Badge variant="primary" withDot={false}>
                            {d.hall_name}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono text-primary">{d.subject_code}</p>
                        <div className="flex items-center gap-3 text-[11px] text-text-muted pt-1">
                          <span>
                            {d.date} ({d.session})
                          </span>
                          <span>•</span>
                          <span>{d.hall_block}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedFacultyDrawer(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE FACULTY MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text">Add New Faculty Member</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded-lg text-text-subtle hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFaculty} className="space-y-3">
              <Input
                label="Faculty Code"
                placeholder="e.g. VF-CSE-099"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                required
              />
              <Input
                label="Full Name"
                placeholder="e.g. Dr. Ramesh Kumar"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-text uppercase tracking-wider block mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-border bg-surface text-xs text-text"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="S&H">S&H</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text uppercase tracking-wider block mb-1">
                    Designation
                  </label>
                  <select
                    value={newDesig}
                    onChange={(e) => setNewDesig(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-border bg-surface text-xs text-text"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Professor & HoD">Professor & HoD</option>
                  </select>
                </div>
              </div>

              <Input
                label="Official Email"
                type="email"
                placeholder="e.g. ramesh@vfstr.ac.in"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />

              <Input
                label="Phone (Optional)"
                placeholder="+91 98480 00000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Max Duties"
                  type="number"
                  min={1}
                  max={12}
                  value={newMaxDuties}
                  onChange={(e) => setNewMaxDuties(Number(e.target.value))}
                />
                <Input
                  label="Past Carry-over"
                  type="number"
                  min={0}
                  max={10}
                  value={newPastDuties}
                  onChange={(e) => setNewPastDuties(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Create Faculty
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelImportModal
        entity="faculty"
        title="Import Faculty Directory via Excel"
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={loadFaculty}
      />
    </div>
  );
}
