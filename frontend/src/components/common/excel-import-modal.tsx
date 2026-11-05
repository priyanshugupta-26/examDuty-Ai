"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, ImportPreviewResponse } from "@/lib/api";
import { toast } from "sonner";

interface ExcelImportModalProps {
  entity: "faculty" | "halls" | "exams" | "leave";
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExcelImportModal({
  entity,
  title,
  isOpen,
  onClose,
  onSuccess,
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoadingPreview(true);
    setPreviewData(null);

    try {
      const data = await api.previewImport(entity, selectedFile);
      setPreviewData(data);
      if (!data.success && data.error) {
        toast.error(data.error);
      } else {
        toast.info(`Parsed ${data.total_rows} rows: ${data.valid_rows_count} valid, ${data.invalid_rows_count} with errors.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to parse Excel file.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.valid_rows_count === 0) return;
    setCommitting(true);

    const validRows = previewData.rows.filter((r) => r.is_valid).map((r) => r.data);

    try {
      const res = await api.commitImport(entity, validRows);
      toast.success(res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to commit import.");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">{title}</h3>
              <p className="text-xs text-text-muted">
                Import and validate bulk data from an Excel spreadsheet (.xlsx).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={api.getTemplateUrl(entity)}
              download
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>
                Download Template
              </Button>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-subtle hover:text-text hover:bg-surface-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-surface-muted/20">
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="excel-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-text">
                {file ? file.name : "Click to select an Excel spreadsheet"}
              </p>
              <p className="text-xs text-text-subtle">
                Only standard Excel (.xlsx, .xls) files supported
              </p>
            </label>
          </div>

          {/* Loading Indicator */}
          {loadingPreview && (
            <div className="flex items-center justify-center py-12 gap-3 text-sm text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Validating rows against university constraints...</span>
            </div>
          )}

          {/* Preview Results */}
          {previewData && !loadingPreview && (
            <div className="space-y-4">
              {/* Summary Badges */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-text uppercase tracking-wider">
                    Validation Summary:
                  </span>
                  <Badge variant="primary" withDot={false}>
                    {previewData.total_rows} Total Rows
                  </Badge>
                  <Badge variant="success">
                    {previewData.valid_rows_count} Valid
                  </Badge>
                  {previewData.invalid_rows_count > 0 && (
                    <Badge variant="danger">
                      {previewData.invalid_rows_count} Invalid
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-text-subtle">
                  Only rows marked <span className="font-semibold text-success">Valid</span> will be committed.
                </p>
              </div>

              {/* Rows Table */}
              <div className="border border-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-muted border-b border-border text-text-muted uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3 w-16">Row #</th>
                      <th className="p-3">Data Preview</th>
                      <th className="p-3 w-28">Status</th>
                      <th className="p-3">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-surface">
                    {previewData.rows.map((r) => (
                      <tr
                        key={r.row_number}
                        className={r.is_valid ? "hover:bg-surface-muted/30" : "bg-danger-soft/30"}
                      >
                        <td className="p-3 font-mono font-bold text-text-muted">
                          #{r.row_number}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-text truncate max-w-xs">
                          {Object.entries(r.data)
                            .slice(0, 4)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" | ")}
                        </td>
                        <td className="p-3">
                          <Badge variant={r.is_valid ? "success" : "danger"}>
                            {r.is_valid ? "Valid" : "Invalid"}
                          </Badge>
                        </td>
                        <td className="p-3 text-[11px]">
                          {r.is_valid ? (
                            <span className="text-success flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> All rules passed
                            </span>
                          ) : (
                            <span className="text-danger flex items-center gap-1 font-medium">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {r.errors.join("; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border/60 bg-surface-muted/20">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={committing}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleCommit}
            disabled={!previewData || previewData.valid_rows_count === 0 || committing}
            isLoading={committing}
            leftIcon={<ArrowRight className="h-4 w-4" />}
          >
            Commit {previewData?.valid_rows_count || 0} Valid Rows
          </Button>
        </div>
      </div>
    </div>
  );
}

