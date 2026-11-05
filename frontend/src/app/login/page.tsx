"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  CalendarCheck,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { api, DemoUser } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const { login, user, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [showDemoAccess, setShowDemoAccess] = useState(true);

  // If already logged in, redirect
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") {
        router.replace(redirectUrl || "/admin");
      } else {
        router.replace(redirectUrl || "/faculty");
      }
    }
  }, [user, isLoading, router, redirectUrl]);

  // Fetch demo credentials for 1-click test
  useEffect(() => {
    api.getDemoUsers().then(setDemoUsers).catch(() => {
      // Fallback local list
      setDemoUsers([
        {
          role: "admin",
          name: "VFSTR Exam Cell Controller",
          email: "admin@vfstr.ac.in",
          password: "admin123",
          badge: "Admin / Exam Cell",
        },
        {
          role: "faculty",
          name: "Dr. K. Rao (CSE)",
          email: "k.rao@vfstr.ac.in",
          password: "faculty123",
          badge: "Faculty (Demo Sick Leave)",
        },
        {
          role: "faculty",
          name: "Dr. P. Sharma (ECE)",
          email: "p.sharma@vfstr.ac.in",
          password: "faculty123",
          badge: "Faculty",
        },
      ]);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const loggedUser = await login(email, password);
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (loggedUser.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/faculty");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (demoUser: DemoUser) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      {/* LEFT: Brand Hero Panel (Section 4.1 & 3.3b: primary → #5C7CFA subtle gradient) */}
      <div className="md:w-1/2 min-h-[340px] md:min-h-screen bg-gradient-to-br from-[#3B5BDB] to-[#5C7CFA] text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />

        {/* Top brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">
                ExamDuty <span className="text-white/80 font-black">AI</span>
              </span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider block">
                VFSTR Deemed to be University
              </span>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 py-10 md:py-0">
          <span className="inline-block px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-4 border border-white/20">
            Hackathon 2.0 • Track 1
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Fair, conflict-free exam duties in one click.
          </h1>
          <p className="text-white/85 text-sm md:text-base leading-relaxed max-w-lg mb-8">
            An intelligent examination management agent engineered for VFSTR. Automatically allocates invigilation duties using mathematical constraint optimization and handles dynamic changes with generative AI.
          </p>

          {/* 3 Bullet Benefits with Icons */}
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Mathematical CP-SAT Allocation</h4>
                <p className="text-xs text-white/75">Zero duty overlaps, strict department rules, and balanced workload distribution.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Gemini-Powered Leave Replacements</h4>
                <p className="text-xs text-white/75">Resolve last-minute faculty medical leaves in natural language with minimal disruption.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                <CalendarCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Transparent Role-Based Workflows</h4>
                <p className="text-xs text-white/75">Dedicated views for Admin Exam Cell and Faculty with instant notifications and swap requests.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-white/60 pt-4 border-t border-white/15">
          Examination Control Office • Vignan's Foundation for Science, Technology & Research
        </div>
      </div>

      {/* RIGHT: Login Form + Demo Credentials */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-text">Sign in to your account</h2>
            <p className="text-sm text-text-muted">
              Enter your official university email and password to continue.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-danger-soft border border-danger/20 text-danger text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="e.g. admin@vfstr.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-text transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          {/* DEMO ACCESS COLLAPSIBLE (Section 4.1) */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowDemoAccess(!showDemoAccess)}
              className="w-full flex items-center justify-between text-xs font-semibold text-text-muted hover:text-text py-2 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span>Demo Access Credentials (Click to auto-fill)</span>
              </div>
              {showDemoAccess ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDemoAccess && (
              <div className="mt-2 space-y-2">
                {demoUsers.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => fillCredentials(d)}
                    className="w-full text-left p-3 rounded-lg border border-border/80 bg-surface hover:bg-primary-soft/40 hover:border-primary/40 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text truncate">{d.name}</span>
                        <Badge
                          variant={d.role === "admin" ? "primary" : d.badge.includes("Leave") ? "warning" : "neutral"}
                          withDot={false}
                          className="text-[10px] py-0 px-2"
                        >
                          {d.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-text-muted font-mono mt-0.5">{d.email}</p>
                    </div>
                    <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-2">
                      Fill <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
