"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  BotMessageSquare,
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ArrowLeftRight,
  Clock,
  User,
  Building2,
  Layers,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  api,
  ChatResponse,
  ChatActionItem,
  ChatDiffItem,
} from "@/lib/api";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  actions_taken?: ChatActionItem[];
  diff?: ChatDiffItem[];
  needs_confirmation?: boolean;
  pending_action_id?: string | null;
  can_undo?: boolean;
  is_confirmed?: boolean;
}

export default function AdminAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      sender: "assistant",
      text: "Hello! I am the **Exam Cell AI Assistant** for VFSTR. I can resolve faculty leaves, find optimal replacements using our CP-SAT solver, audit schedule conflicts, and balance workload equity.\n\nHow can I assist you with the End-Semester Examination timetable today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      actions_taken: [],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [canUndoGlobal, setCanUndoGlobal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    "Dr. K. Rao is on leave on 12 Nov, replace him",
    "Who has the fewest duties?",
    "Show conflicts on 12 Nov",
    "What is the fairness index?",
    "What duties does Dr. K. Rao have?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response: ChatResponse = await api.assistantChat(prompt);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions_taken: response.actions_taken || [],
        diff: response.diff || [],
        needs_confirmation: response.needs_confirmation,
        pending_action_id: response.pending_action_id,
        can_undo: response.can_undo,
      };

      setCanUndoGlobal(response.can_undo);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to get response from AI Assistant.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: "I encountered an error processing your request. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, pendingId: string) => {
    try {
      const res = await api.assistantConfirm(pendingId);
      toast.success(res.message);
      setCanUndoGlobal(res.can_undo);

      // Mark the message as confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, needs_confirmation: false, is_confirmed: true }
            : m
        )
      );

      // Add a success confirmation note from assistant
      setMessages((prev) => [
        ...prev,
        {
          id: `confirmed-${Date.now()}`,
          sender: "assistant",
          text: `✓ **Applied ${res.applied_count} change(s)** to the official schedule. Notifications have been dispatched strictly to the affected faculty members.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          can_undo: true,
        },
      ]);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to confirm changes.");
    }
  };

  const handleCancelAction = async (msgId: string, pendingId: string) => {
    try {
      await api.assistantCancel(pendingId);
      toast.info("Proposed changes discarded.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, needs_confirmation: false } : m
        )
      );
    } catch {
      // silent
    }
  };

  const handleUndo = async () => {
    try {
      const res = await api.assistantUndo();
      toast.success(res.message);
      setCanUndoGlobal(res.can_undo);

      setMessages((prev) => [
        ...prev,
        {
          id: `undo-${Date.now()}`,
          sender: "assistant",
          text: `↺ **Undo Successful:** ${res.message} Previous faculty assignments and notifications have been restored.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          can_undo: res.can_undo,
        },
      ]);
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      toast.error(errObj.message || "Failed to undo action.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 px-6 rounded-2xl bg-surface border border-border shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <BotMessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text">Exam Cell AI Agent</h2>
              <Badge variant="primary" withDot={false} className="text-[10px]">
                CP-SAT + Gemini Function Calling
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Natural language assistant for leave reallocation, conflict resolution, and workload equity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUndoGlobal && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Undo Last Action
            </Button>
          )}
          <Link href="/admin/allocation">
            <Button variant="ghost" size="sm" className="text-xs text-text-muted hover:text-text">
              View Allocations →
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <Card className="flex-1 overflow-hidden flex flex-col shadow-sm">
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-text-subtle">
                <span className="font-semibold">
                  {msg.sender === "user" ? "Administrator" : "ExamDuty AI Agent"}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-primary text-white rounded-tr-none shadow-xs"
                    : "bg-surface-muted/60 border border-border text-text rounded-tl-none shadow-xs"
                }`}
              >
                <div className="whitespace-pre-wrap space-y-1.5 font-normal leading-relaxed">
                  {msg.text.split("\n\n").map((para, i) => (
                    <p key={i}>
                      {para.split("**").map((part, j) =>
                        j % 2 === 1 ? (
                          <strong key={j} className="font-bold">
                            {part}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  ))}
                </div>

                {/* Actions Taken Card (SPEC.md Section 4.6b) */}
                {msg.actions_taken && msg.actions_taken.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-border/60 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-subtle flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Actions Taken & Tools Executed:
                    </p>
                    <div className="space-y-1">
                      {msg.actions_taken.map((act, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-lg bg-surface/80 border border-border/50 text-[11px]"
                        >
                          <span className="font-mono font-semibold text-primary shrink-0">
                            [{act.tool}]
                          </span>
                          <span className="text-text-muted">{act.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View Changes Diff (SPEC.md Section 4.6b) */}
                {msg.diff && msg.diff.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle flex items-center gap-1">
                        <ArrowLeftRight className="h-3 w-3 text-sky-500" />
                        Proposed Changes Diff ({msg.diff.length} slot):
                      </span>
                      {msg.is_confirmed && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Applied to Schedule
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {msg.diff.map((item, dIdx) => (
                        <div
                          key={dIdx}
                          className="p-3 rounded-xl bg-surface border border-border/70 space-y-2 text-[11px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text">
                              {item.subject_name} ({item.subject_code})
                            </span>
                            <Badge variant="primary" withDot={false} className="text-[10px] px-1.5">
                              {item.date} [{item.session}]
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-text-muted">
                            <span>Hall: {item.hall_name}</span>
                            <span className="italic">{item.reason}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs font-semibold">
                            <div className="flex items-center gap-1.5 text-danger">
                              <span className="line-through">{item.old_faculty_name}</span>
                            </div>
                            <span className="text-text-subtle">→</span>
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <span>{item.new_faculty_name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmation Box (SPEC.md Section 4.6b) */}
                {msg.needs_confirmation && msg.pending_action_id && (
                  <div className="mt-4 p-3.5 rounded-xl bg-primary-soft/60 border border-primary/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-bold text-xs text-text">
                        Confirm Bulk Schedule Update?
                      </p>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Applying will commit the reassignment to the database and notify only the affected faculty.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          handleConfirmAction(msg.id, msg.pending_action_id!)
                        }
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                      >
                        Confirm & Apply Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleCancelAction(msg.id, msg.pending_action_id!)
                        }
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-text-subtle">
                <span className="font-semibold">ExamDuty AI Agent</span>
                <span>•</span>
                <span>Thinking...</span>
              </div>
              <div className="rounded-2xl rounded-tl-none p-3.5 bg-surface-muted/60 border border-border flex items-center gap-2 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[11px] text-text-subtle ml-1">
                  Executing CP-SAT tools & validating constraints...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-border/60 bg-surface-muted/30 overflow-x-auto flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle shrink-0">
            Suggestions:
          </span>
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              disabled={isLoading}
              className="text-xs px-2.5 py-1 rounded-full bg-surface hover:bg-surface-muted border border-border/70 text-text font-medium whitespace-nowrap transition-colors shadow-2xs hover:border-primary/40 cursor-pointer disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Form Bar */}
        <div className="p-3.5 border-t border-border bg-surface">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything: e.g. 'Dr. K. Rao is on leave on 12 Nov, replace him'..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 h-10 px-4 rounded-xl border border-border bg-surface text-xs text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!inputText.trim() || isLoading}
              isLoading={isLoading}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
