"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { StudentAssignmentCard } from "@/components/StudentAssignmentCard";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentCRNDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const crnId = params?.crnId as Id<"crns">;

  const data = useQuery(api.classes.getStudentCRNDashboard, { crnId });

  if (data === undefined) {
    return (
      <main className="p-8">
        <p>Loading...</p>
      </main>
    );
  }

  if (data === null) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Not Authorized
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          You don't have access to this class, or it doesn't exist.
        </p>
      </main>
    );
  }

  const { crn, class: classInfo, assignments } = data;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Button
          onClick={() => router.push("/dashboard")}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            {classInfo.name}
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          {crn.semester} {crn.year} • Welcome to your class dashboard.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          Problem Sets
        </h2>
        {assignments.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No problem sets have been posted yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <StudentAssignmentCard
                key={assignment._id}
                crnId={crn._id}
                assignmentId={assignment._id}
                title={assignment.title}
                description={assignment.description}
                creationTime={assignment.createdAt || assignment._creationTime}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

