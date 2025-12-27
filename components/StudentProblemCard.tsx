"use client";

import Link from "next/link";
import { Hash, ChevronRight } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface StudentProblemCardProps {
  crnId: Id<"crns">;
  assignmentId: Id<"assignments">;
  problemNumber: number;
  title: string;
  description?: string | null;
}

export function StudentProblemCard({
  crnId,
  assignmentId,
  problemNumber,
  title,
  description,
}: StudentProblemCardProps) {
  return (
    <Link
      href={`/${crnId}/${assignmentId}/${problemNumber}`}
      className="block group"
    >
      <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-4 py-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <div className="flex items-center gap-0.5 text-primary font-semibold">
              <Hash className="h-4 w-4" />
              <span className="text-sm">{problemNumber}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="group-hover:text-primary transition-colors truncate">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="line-clamp-1">
                {description}
              </CardDescription>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </CardHeader>
      </Card>
    </Link>
  );
}

