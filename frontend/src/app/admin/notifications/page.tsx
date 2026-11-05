"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ArrowLeftRight,
  Clock,
  Check,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, NotificationItem } from "@/lib/api";
import { toast } from "sonner";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "swaps" | "allocations">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // silent
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "assigned":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "swapped":
        return <ArrowLeftRight className="h-5 w-5 text-sky-500" />;
      case "reminder":
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterTab === "unread" && n.is_read) return false;
      if (filterTab === "allocations" && n.type !== "assigned") return false;
      if (filterTab === "swaps" && n.type !== "swapped") return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    });
  }, [notifications, filterTab, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Exam Cell Communications
            </span>
            {unreadCount > 0 && (
              <Badge variant="primary" withDot={false}>
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <h2 className="text-2xl font-bold text-text mt-1">
            System Notifications & Alerts
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Audit history of dispatched allocation notices, faculty swap submissions, and system events
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Mark all read
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={loadNotifications}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border">
        <div className="flex p-0.5 rounded-lg bg-surface-muted border border-border">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterTab === "all"
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilterTab("unread")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterTab === "unread"
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilterTab("allocations")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterTab === "allocations"
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Allocations
          </button>
          <button
            onClick={() => setFilterTab("swaps")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              filterTab === "swaps"
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Swaps
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-subtle" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-surface text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-text-muted">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-10 w-10 text-text-subtle/50 mx-auto mb-2" />
              <p className="text-base font-bold text-text">No notifications found</p>
              <p className="text-xs text-text-muted mt-1">
                {filterTab === "unread"
                  ? "All notifications have been reviewed."
                  : "No notifications match the filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notif) => (
            <Card
              key={notif.id}
              className={`overflow-hidden transition-all duration-150 border-border ${
                notif.is_read
                  ? "bg-surface"
                  : "bg-primary-soft/30 border-primary/30 ring-1 ring-primary/20 shadow-xs"
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-surface-muted border border-border/60 shrink-0 mt-0.5">
                  {getNotifIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text">{notif.title}</h4>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-text-subtle whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">{notif.body}</p>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-xs">
                      {notif.type === "swapped" ? (
                        <Link
                          href="/admin/swaps"
                          className="text-primary font-semibold hover:underline flex items-center gap-1"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          <span>Review in Swap Requests</span>
                        </Link>
                      ) : (
                        <Link
                          href="/admin/allocation"
                          className="text-primary font-semibold hover:underline flex items-center gap-1"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>View in Allocations</span>
                        </Link>
                      )}
                    </div>

                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkOneRead(notif.id)}
                        className="text-xs text-text-subtle hover:text-text font-medium cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
