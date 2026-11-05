"use client";

import React from "react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Users2,
  Split,
  BotMessageSquare,
  ArrowLeftRight,
  Bell,
  BarChart3,
  Settings,
  History,
  Calendar,
  BookOpen,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  const adminNavItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Exam Schedule", href: "/admin/exams", icon: CalendarDays },
    { label: "Halls", href: "/admin/halls", icon: Building2 },
    { label: "Faculty", href: "/admin/faculty", icon: Users2 },
    { label: "Allocation", href: "/admin/allocation", icon: Split },
    { label: "AI Assistant", href: "/admin/assistant", icon: BotMessageSquare },
    { label: "Swap Requests", href: "/admin/swaps", icon: ArrowLeftRight },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "Audit Log", href: "/admin/audit", icon: History },
  ];

  const facultyNavItems = [
    { label: "My Duties", href: "/faculty", icon: LayoutDashboard },
    { label: "Calendar", href: "/faculty/calendar", icon: Calendar },
    { label: "Swap Requests", href: "/faculty/swaps", icon: ArrowLeftRight },
    { label: "Instructions", href: "/faculty/instructions", icon: BookOpen },
    { label: "Notifications", href: "/faculty/notifications", icon: Bell },
    { label: "Profile", href: "/faculty/profile", icon: UserCheck },
  ];

  const navItems = isAdmin ? adminNavItems : facultyNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out",
          // Desktop width
          collapsed ? "lg:w-[72px]" : "lg:w-[240px]",
          // Mobile slide-over
          mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col overflow-hidden transition-opacity duration-200">
                <span className="text-sm font-bold tracking-tight text-text truncate">
                  ExamDuty <span className="text-primary font-black">AI</span>
                </span>
                <span className="text-[10px] font-semibold text-text-subtle tracking-wider uppercase truncate">
                  VFSTR Exam Cell
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-text-muted hover:bg-surface-muted lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && item.href !== "/faculty" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => mobileOpen && onCloseMobile()}
                title={collapsed && !mobileOpen ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 select-none",
                  isActive
                    ? "bg-primary-soft text-primary font-semibold"
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
                  collapsed && !mobileOpen && "justify-center px-2"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-text-subtle group-hover:text-text"
                  )}
                />
                {(!collapsed || mobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Footer info & collapse toggle */}
        <div className="border-t border-border/60 p-3 space-y-2">
          {/* User brief */}
          <div
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-lg bg-surface-muted/60",
              collapsed && !mobileOpen && "justify-center p-1.5"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text truncate">
                  {user?.faculty?.name || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[10px] text-text-subtle uppercase tracking-wider font-semibold">
                  {user?.role === "admin" ? "Admin / Exam Cell" : "Faculty"}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-1.5 text-xs font-medium text-text-subtle hover:text-text hover:bg-surface-muted rounded-lg transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

