"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { EnhancedMathEditor } from "@/components/editor/EnhancedMathEditor";
import { ArrowLeft, Hash } from "lucide-react";

export default function StudentProblemPage() {
  const params = useParams();
  const router = useRouter();
  const crnId = params?.crnId as Id<"crns">;
  const assignmentId = params?.assignmentId as Id<"assignments">;
  const problemNumber = parseInt(params?.problemNumber as string, 10);

  const data = useQuery(api.classes.getStudentProblemByNumber, {
    crnId,
    assignmentId,
    problemNumber,
  });

  if (data === undefined) {
    return (
      <main className="p-8">
        <p>Loading...</p>
      </main>
    );
  }

  const { problem, solution, assignment } = data;

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/${crnId}/${assignmentId}`)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Set</span>
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  {assignment.title}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                {problemNumber}: {problem.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto py-8 px-6">
          {problem.description && (
            <div className="mb-8 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Problem Statement
              </h2>
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {problem.description}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-6 py-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Official Solution
              </h2>
            </div>
            <EnhancedMathEditor
              content={solution?.contentJson}
              editable={false}
              className="p-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

