"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Hash, Trash2 } from "lucide-react";

interface ProblemCardProps {
  problemId: Id<"problems">;
  classId: Id<"classes">;
  assignmentId: Id<"assignments">;
  title: string;
  description?: string | null;
  problemNumber: number;
  onDeleted?: () => void;
}

export function ProblemCard({
  problemId,
  classId,
  assignmentId,
  title,
  description,
  problemNumber,
  onDeleted,
}: ProblemCardProps) {
  const deleteProblem = useMutation(api.classes.deleteProblem);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      confirm(
        `Are you sure you want to delete "${title}"? This will also delete all solution lines.`
      )
    ) {
      try {
        await deleteProblem({ problemId });
        onDeleted?.();
      } catch (error) {
        console.error("Failed to delete problem:", error);
        alert("Failed to delete problem. Please try again.");
      }
    }
  };

  return (
    <Link
      href={`/classes/${classId}/assignments/${assignmentId}/problems/${problemId}`}
      className="block group"
    >
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
        <div className="flex items-start gap-3">
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
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={handleDelete}
            className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
            title="Delete problem"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

