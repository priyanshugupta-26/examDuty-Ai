"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  FileSpreadsheet,
  Download,
  Grid,
  List,
  CheckCircle2,
  XCircle,
  X,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, HallItem } from "@/lib/api";
import { ExcelImportModal } from "@/components/common/excel-import-modal";
import { toast } from "sonner";

export default function HallsPage() {
  const [halls, setHalls] = useState<HallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("ALL");

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [block, setBlock] = useState("A-Block");
  const [floor, setFloor] = useState(1);
  const [capacity, setCapacity] = useState(40);

  const loadHalls = async () => {
    try {
      const data = await api.listHalls();
      setHalls(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load halls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHalls();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createHall({ name, block, floor, capacity });
      toast.success(res.message);
      setCreateOpen(false);
      setName("");
      await loadHalls();
    } catch (err: any) {
      toast.error(err.message || "Failed to create hall.");
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await api.toggleHallActive(id);
      setHalls((prev) =>
        prev.map((h) => (h.id === id ? { ...h, is_active: res.is_active } : h))
      );
      toast.info(res.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status.");
    }
  };

  const filteredHalls = halls.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase());
    const matchesBlock = blockFilter === "ALL" || h.block === blockFilter;
    return matchesSearch && matchesBlock;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Campus Infrastructure
            </span>
            <Badge variant="primary">{halls.length} Examination Halls</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text">Examination Halls & Blocks</h2>
          <p className="text-xs text-text-muted">
            Manage hall seating capacity, building blocks, and active availability for exam sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a href={api.getTemplateUrl("halls")} download target="_blank" rel="noreferrer">
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
            Add Hall
          </Button>
        </div>
      </div>

      {/* Filters & View Mode */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-subtle" />
            <Input
              placeholder="Search hall name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-surface text-xs font-semibold text-text"
          >
            <option value="ALL">All Blocks</option>
            <option value="A-Block">A-Block</option>
            <option value="B-Block">B-Block</option>
            <option value="C-Block">C-Block</option>
          </select>
        </div>

        <div className="flex items-center p-0.5 rounded-lg border border-border bg-surface">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "cards" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text"
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "table" ? "bg-primary text-white shadow-xs" : "text-text-muted hover:text-text"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* CARDS VIEW */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredHalls.map((h) => (
            <Card key={h.id} className="relative overflow-hidden group">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center font-bold text-sm">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-text">{h.name}</h3>
                      <p className="text-[11px] text-text-subtle">
                        {h.block} • Floor {h.floor}
                      </p>
                    </div>
                  </div>

                  <Badge variant={h.is_active ? "success" : "neutral"} withDot={false}>
                    {h.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-baseline justify-between pt-2 border-t border-border/50 text-xs">
                  <span className="text-text-muted">Seating Capacity:</span>
                  <span className="font-bold text-text tabular-numbers text-sm">
                    {h.capacity} students
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-text-subtle">
                    ~{Math.ceil(h.capacity / 30)} invigilators required
                  </span>
                  <button
                    onClick={() => handleToggleActive(h.id)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {h.is_active ? "Disable" : "Enable"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-border text-text-muted uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Hall Name</th>
                  <th className="p-3">Block / Building</th>
                  <th className="p-3 text-center">Floor</th>
                  <th className="p-3 text-center">Seating Capacity</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Toggle Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredHalls.map((h) => (
                  <tr key={h.id} className="hover:bg-surface-muted/20 transition-colors">
                    <td className="p-3 font-bold text-text">{h.name}</td>
                    <td className="p-3 text-text-muted">{h.block}</td>
                    <td className="p-3 text-center">{h.floor}</td>
                    <td className="p-3 text-center font-bold text-text tabular-numbers">{h.capacity}</td>
                    <td className="p-3 text-center">
                      <Badge variant={h.is_active ? "success" : "neutral"}>
                        {h.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant={h.is_active ? "outline" : "primary"}
                        size="sm"
                        onClick={() => handleToggleActive(h.id)}
                      >
                        {h.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-text">Add New Examination Hall</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded-lg text-text-subtle hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                label="Hall Name"
                placeholder="e.g. A-302"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-text uppercase tracking-wider block mb-1">
                    Block
                  </label>
                  <select
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="w-full h-10 px-2 rounded-lg border border-border bg-surface text-xs text-text"
                  >
                    <option value="A-Block">A-Block</option>
                    <option value="B-Block">B-Block</option>
                    <option value="C-Block">C-Block</option>
                  </select>
                </div>
                <Input
                  label="Floor"
                  type="number"
                  min={0}
                  max={6}
                  value={floor}
                  onChange={(e) => setFloor(Number(e.target.value))}
                />
              </div>

              <Input
                label="Seating Capacity (Students)"
                type="number"
                min={10}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Create Hall
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelImportModal
        entity="halls"
        title="Import Examination Halls via Excel"
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={loadHalls}
      />
    </div>
  );
}
