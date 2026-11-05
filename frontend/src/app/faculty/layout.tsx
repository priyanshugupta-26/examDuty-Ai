"use client";

import React from "react";
import { RoleGuard } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["faculty", "admin"]}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}

