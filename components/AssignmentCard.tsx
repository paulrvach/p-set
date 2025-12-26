"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FileText, Trash2, Calendar } from "lucide-react";

interface AssignmentCardProps {
  assignmentId: Id<"assignments">;
  classId: Id<"classes">;
  title: string;
  description?: string | null;
  creationTime: number;
  onDeleted?: () => void;
}

export function AssignmentCard({
  assignmentId,
  classId,
  title,
  description,
  creationTime,
  onDeleted,
}: AssignmentCardProps) {
  const deleteAssignment = useMutation(api.classes.deleteAssignment);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      confirm(
        `Are you sure you want to delete "${title}"? This will also delete all problems and solution lines.`
      )
    ) {
      try {
        await deleteAssignment({ assignmentId });
        onDeleted?.();
      } catch (error) {
        console.error("Failed to delete assignment:", error);
        alert("Failed to delete assignment. Please try again.");
      }
    }
  };

  const formattedDate = new Date(creationTime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/classes/${classId}/assignments/${assignmentId}`}
      className="block group"
    >
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>Created {formattedDate}</span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="flex-shrink-0 p-2 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
            title="Delete assignment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

