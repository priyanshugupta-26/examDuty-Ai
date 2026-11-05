"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StagePlaceholderProps {
  title: string;
  stage: string;
  description: string;
  backHref?: string;
  icon?: React.ReactNode;
  specs?: string[];
}

export function StagePlaceholder({
  title,
  stage,
  description,
  backHref = "/admin",
  icon,
  specs,
}: StagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">
              Module View
            </span>
            <Badge variant="primary">{stage}</Badge>
          </div>
          <h2 className="text-2xl font-bold text-text">{title}</h2>
        </div>

        <Link href={backHref}>
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shadow-sm">
            {icon || <Sparkles className="h-8 w-8" />}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-text">{title} Ready for Scaffold</h3>
            <p className="text-sm text-text-muted leading-relaxed">{description}</p>
          </div>

          {specs && specs.length > 0 && (
            <div className="w-full text-left bg-surface-muted/50 rounded-xl p-4 border border-border/60 text-xs space-y-2 mt-2">
              <span className="font-semibold text-text uppercase tracking-wider block text-[10px]">
                Upcoming Features in {stage}:
              </span>
              <ul className="space-y-1 text-text-muted list-disc list-inside">
                {specs.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2">
            <Link href={backHref}>
              <Button variant="primary" size="md">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

