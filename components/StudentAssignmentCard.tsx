"use client";

import Link from "next/link";
import { FileText, Calendar, ChevronRight } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface StudentAssignmentCardProps {
  crnId: Id<"crns">;
  assignmentId: Id<"assignments">;
  title: string;
  description?: string | null;
  creationTime: number;
}

export function StudentAssignmentCard({
  crnId,
  assignmentId,
  title,
  description,
  creationTime,
}: StudentAssignmentCardProps) {
  const formattedDate = new Date(creationTime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/${crnId}/${assignmentId}`}
      className="block group"
    >
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                {description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>Assigned {formattedDate}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

