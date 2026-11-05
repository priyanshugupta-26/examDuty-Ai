"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ArrowLeftRight,
  Clock,
  Check,
  Calendar,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { api, SystemStats, NotificationItem } from "@/lib/api";
import { toast } from "sonner";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load stats and unread notification count
  useEffect(() => {
    api.getSystemStats().then(setStats).catch(() => {});
    loadNotificationCount();
  }, [pathname]);

  const loadNotificationCount = () => {
    api.getUnreadNotificationCount()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
  };

  const handleToggleNotifications = async () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState) {
      setIsLoadingNotifs(true);
      try {
        const notifs = await api.getNotifications();
        setRecentNotifications(notifs.slice(0, 5));
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setIsLoadingNotifs(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // silent
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "assigned":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "swapped":
        return <ArrowLeftRight className="h-4 w-4 text-sky-500 shrink-0" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
      default:
        return <Bell className="h-4 w-4 text-primary shrink-0" />;
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format page title from pathname
  const getPageTitle = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "Dashboard";
    const last = parts[parts.length - 1];
    if (last === "admin") return "Admin Overview";
    if (last === "faculty") return "Faculty Portal";
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
  };

  const notificationsUrl = user?.role === "admin" ? "/admin/notifications" : "/faculty/notifications";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-surface/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-lg text-text-muted hover:bg-surface-muted lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-subtle font-medium hidden sm:inline">
              VFSTR / {user?.role === "admin" ? "Admin" : "Faculty"}
            </span>
          </div>
          <h1 className="text-lg font-bold text-text tracking-tight leading-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Middle/Center: Sample Data Banner (Section 9) */}
      {stats?.is_sample_data && user?.role === "admin" && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>SAMPLE DATA LOADED (Demo Mode)</span>
        </div>
      )}

      {/* Right side: Global Search, Notifications, Theme, User */}
      <div ref={dropdownRef} className="flex items-center gap-2 sm:gap-3">
        {/* Global Search hint bar */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-text-subtle" />
          <input
            type="text"
            placeholder="Search faculty, exams, halls..."
            className="h-9 w-56 rounded-lg border border-border bg-surface-muted/60 pl-9 pr-10 text-xs text-text placeholder:text-text-subtle focus:w-72 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
          />
          <kbd className="absolute right-2.5 rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-subtle border border-border pointer-events-none">
            /
          </kbd>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className="relative p-2 rounded-lg text-text-muted hover:bg-surface-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white shadow-sm animate-in zoom-in-75 duration-150">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Quick Notification Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl border border-border bg-surface shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text uppercase tracking-wider">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <Badge variant="primary" withDot={false}>
                      {unreadCount} unread
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {isLoadingNotifs ? (
                <div className="py-8 text-center text-xs text-text-subtle">Loading notifications...</div>
              ) : recentNotifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-text-subtle/50 mx-auto mb-2" />
                  <p className="text-xs font-medium text-text-muted">No notifications yet</p>
                  <p className="text-[11px] text-text-subtle mt-0.5">
                    Updates on your exam duties and swaps will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 divide-y divide-border/40">
                  {recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkOneRead(n.id)}
                      className={`pt-2 first:pt-0 p-2.5 rounded-xl transition-colors cursor-pointer ${
                        n.is_read
                          ? "bg-transparent hover:bg-surface-muted/60"
                          : "bg-primary-soft/60 hover:bg-primary-soft border border-primary/20"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-text truncate">{n.title}</p>
                            {!n.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                          <span className="text-[10px] text-text-subtle mt-1 block">
                            {new Date(n.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border/60 text-center">
                <Link
                  href={notificationsUrl}
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  View all notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-text-muted hover:bg-surface-muted transition-colors"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5 text-amber-400" />
          )}
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-lg border border-border/60 hover:bg-surface-muted transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-xs font-semibold text-text hidden sm:inline truncate max-w-[120px]">
              {user?.faculty?.name || user?.email?.split("@")[0] || "Account"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-text-subtle hidden sm:inline" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="text-xs font-bold text-text truncate">
                  {user?.faculty?.name || user?.email}
                </p>
                <p className="text-[11px] text-text-subtle truncate">{user?.email}</p>
                <div className="mt-1.5">
                  <Badge variant={user?.role === "admin" ? "primary" : "info"} withDot={false}>
                    {user?.role === "admin" ? "Admin / Exam Cell" : "Faculty"}
                  </Badge>
                </div>
              </div>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-danger hover:bg-danger-soft rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

