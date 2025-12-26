"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { StudentProblemCard } from "@/components/StudentProblemCard";
import { ArrowLeft, FileText } from "lucide-react";

export default function StudentAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const crnId = params?.crnId as Id<"crns">;
  const assignmentId = params?.assignmentId as Id<"assignments">;

  const data = useQuery(api.classes.getStudentAssignment, {
    crnId,
    assignmentId,
  });

  if (data === undefined) {
    return (
      <main className="p-8">
        <p>Loading...</p>
      </main>
    );
  }

  const { assignment, problems } = data;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => router.push(`/${crnId}`)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class
        </button>
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            {assignment.title}
          </h1>
        </div>
        {assignment.description && (
          <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-3xl">
            {assignment.description}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">
          Problems
        </h2>
        {problems.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No problems have been added to this set yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl">
            {problems.map((problem) => (
              <StudentProblemCard
                key={problem._id}
                crnId={crnId}
                assignmentId={assignmentId}
                problemNumber={problem.problemNumber}
                title={problem.title}
                description={problem.description}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

