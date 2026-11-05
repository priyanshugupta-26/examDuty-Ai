"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Clock,
  ShieldAlert,
  CheckCircle2,
  PhoneCall,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Printer,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface InstructionSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge: string;
  badgeVariant: "primary" | "warning" | "danger" | "success" | "neutral";
  content: string;
  bulletPoints: string[];
  alert?: {
    type: "warning" | "danger" | "info";
    text: string;
  };
}

export default function FacultyInstructionsPage() {
  const [instructionsData, setInstructionsData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    before: true,
    during: true,
    malpractice: false,
    after: false,
    contacts: true,
  });

  useEffect(() => {
    api.getInstructions()
      .then((res) => {
        setInstructionsData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setOpenSections({
      before: true,
      during: true,
      malpractice: true,
      after: true,
      contacts: true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      before: false,
      during: false,
      malpractice: false,
      after: false,
      contacts: false,
    });
  };

  const sections: InstructionSection[] = [
    {
      id: "before",
      title: "1. Before the Examination",
      subtitle: "Arrival protocol, collection of exam bundles, and hall inspection",
      icon: <Clock className="h-5 w-5 text-primary" />,
      badge: "30 Min Prior",
      badgeVariant: "primary",
      content:
        instructionsData.before_exam ||
        "Report to the Exam Cell Control Room 30 minutes prior to session start. Collect answer booklets, question papers, and student attendance sheets in person.",
      bulletPoints: [
        "Report to the Central Exam Cell Control Room strictly 30 minutes before commencement (09:00 AM for FN / 01:30 PM for AN).",
        "Sign the Invigilator Attendance Register and collect the sealed packet of Question Papers, Main Answer Books, and Attendance Sheets.",
        "Verify that the question paper subject code, course title, and branch on the sealed envelope match your assigned exam room.",
        "Ensure the examination hall is properly ventilated and seating arrangement numbers are clearly visible on each desk.",
        "Admit candidates into the examination hall 15 minutes before exam commencement after checking their physical Hall Ticket & University ID Card.",
      ],
      alert: {
        type: "info",
        text: "Under no circumstances should the question paper packet be opened before 10 minutes prior to session commencement.",
      },
    },
    {
      id: "during",
      title: "2. During the Examination",
      subtitle: "Candidate verification, attendance signing, and hall vigilance",
      icon: <BookOpen className="h-5 w-5 text-sky-500" />,
      badge: "Session Vigilance",
      badgeVariant: "primary",
      content:
        instructionsData.during_exam ||
        "Verify student ID cards, hall tickets, and ensure no unauthorized electronic devices, smart watches, or chits are present in the examination hall.",
      bulletPoints: [
        "Distribute question papers precisely at the scheduled start bell (09:30 AM / 02:00 PM).",
        "Ensure all students write their Registration Number and Book Barcode correctly on the cover page of the main answer booklet.",
        "Sign in the designated space on the cover page of each candidate's answer book after personally verifying their identity and hall ticket.",
        "Mark absentees on the Attendance Sheet in RED INK after 30 minutes from the start of the examination.",
        "No candidate shall be permitted to enter the examination hall after 30 minutes from commencement.",
        "No student is allowed to leave the examination hall during the first 60 minutes or last 10 minutes of the exam.",
        "Permit only one student at a time for washroom breaks; record their departure and return times.",
      ],
      alert: {
        type: "warning",
        text: "Strict Zero-Tolerance: Mobile phones, smartwatches, programmable calculators, and Bluetooth gadgets are strictly banned inside halls.",
      },
    },
    {
      id: "malpractice",
      title: "3. Malpractice Handling & Protocol",
      subtitle: "Standard operating procedure for suspected cheating or contraband",
      icon: <ShieldAlert className="h-5 w-5 text-danger" />,
      badge: "Mandatory SOP",
      badgeVariant: "danger",
      content:
        instructionsData.malpractice ||
        "Immediately seize unauthorized material, mark the answer script in red ink, record student details on the Malpractice Form and alert the Chief Superintendent.",
      bulletPoints: [
        "Confiscate any unauthorized material, chits, mobile devices, or written inscriptions immediately without disrupting the rest of the hall.",
        "Endorse the seized material with the student's Register Number, hall number, and your invigilator signature with date and time.",
        "Encircle in red ink the portion of the answer book where malpractice is suspected and write 'Suspected Malpractice Case' across the page.",
        "Issue a fresh/second answer book to the candidate with 'Second Book' endorsed on it; do not deny them the right to write the remainder of the exam.",
        "Immediately summon the Squad / Chief Superintendent to the hall. Complete Form MP-01 with candidate statement.",
      ],
      alert: {
        type: "danger",
        text: "Do NOT enter into verbal altercations. Retain all physical evidence and alert the Chief Superintendent immediately.",
      },
    },
    {
      id: "after",
      title: "4. After the Examination",
      subtitle: "Collection, sequential verification, sealing, and handover",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      badge: "Handover Protocol",
      badgeVariant: "success",
      content:
        instructionsData.after_exam ||
        "Count all answer booklets, verify sequential arrangement against the attendance sheet, bundle and seal in tamper-evident envelopes, and submit to the Control Room.",
      bulletPoints: [
        "Instruct candidates to remain seated at the final warning bell (5 minutes prior) and final bell.",
        "Collect answer booklets row by row from each seated candidate before allowing any candidate to vacate the room.",
        "Arrange answer books in strict ascending order of student registration numbers as per the attendance sheet.",
        "Physically count the answer books and ensure the total matches (Total Present Candidates).",
        "Place scripts in the tamper-evident green bundle cloth/envelope, paste the room summary slip, and sign across the seal flap.",
        "Submit the sealed bundle, unused answer books, surplus question papers, and attendance sheets directly to the Chief Superintendent.",
      ],
    },
    {
      id: "contacts",
      title: "5. Emergency Contacts & Control Room",
      subtitle: "Rapid assistance hotline, squad, chief superintendent, and medical room",
      icon: <PhoneCall className="h-5 w-5 text-amber-500" />,
      badge: "Helpline",
      badgeVariant: "warning",
      content:
        instructionsData.emergency_contacts ||
        "Exam Cell Helpline: +91 863 2344700 | Chief Controller: Ext 101 | Chief Superintendent: Ext 102",
      bulletPoints: [
        "Chief Superintendent (Prof. Dr. A. Sharma): Ext 102 / +91 98480 11022",
        "Exam Cell Control Room (Ground Floor, Admin Block): Ext 101 / +91 863 2344700",
        "Flying Squad In-charge: Ext 105 / +91 98480 22055",
        "Campus Health Clinic & First Aid (Block C): Ext 199 / +91 863 2344199",
        "Security Control Desk: Ext 100 / +91 863 2344100",
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
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
                Official Examination Guidelines
              </span>
              <Badge variant="primary">Academic Year 2026-27</Badge>
            </div>
            <h2 className="text-2xl font-bold text-text mt-1">
              Invigilator Rules & Standard Operating Procedures
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Approved by Controller of Examinations, Vignan&apos;s Foundation for Science, Technology & Research
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-4">
        {sections.map((sec) => {
          const isOpen = !!openSections[sec.id];
          return (
            <Card
              key={sec.id}
              className={`overflow-hidden transition-all duration-200 border-border ${
                isOpen ? "ring-1 ring-primary/20 shadow-sm" : "hover:border-border/80"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSection(sec.id)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-surface-muted/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-surface-muted border border-border/60">
                    {sec.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-text">{sec.title}</h3>
                      <Badge variant={sec.badgeVariant} withDot={false} className="text-[10px]">
                        {sec.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{sec.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg text-text-subtle transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </button>

              {isOpen && (
                <CardContent className="p-5 pt-1 border-t border-border/60 bg-surface/50 space-y-4 animate-in fade-in duration-150">
                  <p className="text-xs text-text-muted font-medium leading-relaxed bg-surface-muted/40 p-3 rounded-xl border border-border/40">
                    {sec.content}
                  </p>

                  {sec.alert && (
                    <div
                      className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed ${
                        sec.alert.type === "danger"
                          ? "bg-danger-soft border border-danger/20 text-danger"
                          : sec.alert.type === "warning"
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300"
                          : "bg-primary-soft border border-primary/20 text-primary"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Important Note:</strong> {sec.alert.text}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-text uppercase tracking-wider">
                      Specific Checklist & Protocols:
                    </p>
                    <ul className="space-y-2">
                      {sec.bulletPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2.5 text-xs text-text leading-relaxed">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer Support Notice */}
      <div className="p-4 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
          <span>
            Need clarification regarding an invigilation policy or special accommodations?
          </span>
        </div>
        <Link
          href="/faculty/swaps"
          className="text-primary font-semibold hover:underline shrink-0"
        >
          Check Duty Swaps →
        </Link>
      </div>
    </div>
  );
}
