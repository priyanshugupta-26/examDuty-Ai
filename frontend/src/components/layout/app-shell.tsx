"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("examduty_sidebar_collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("examduty_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-bg text-text flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Layout Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[240px]"
        )}
      >
        <Header onOpenMobileSidebar={() => setMobileOpen(true)} />

        <main className="flex-1 w-full max-w-[1280px] mx-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

