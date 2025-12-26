"use client";

import Link from "next/link";
import { Hash, ChevronRight } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

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
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <div className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-semibold">
              <Hash className="w-4 h-4" />
              <span className="text-sm">{problemNumber}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {title}
            </h4>
            {description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                {description}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

