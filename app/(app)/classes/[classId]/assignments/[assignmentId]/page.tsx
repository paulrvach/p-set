"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ProblemCard } from "@/components/ProblemCard";
import { Plus, ArrowLeft } from "lucide-react";

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isCreatingProblem, setIsCreatingProblem] = useState(false);
  const [newProblemTitle, setNewProblemTitle] = useState("");
  const [newProblemDescription, setNewProblemDescription] = useState("");
  const [newProblemNumber, setNewProblemNumber] = useState(1);

  const classIdParam = params?.classId;
  const assignmentIdParam = params?.assignmentId;

  const classId: Id<"classes"> | null =
    typeof classIdParam === "string" && classIdParam.length > 0
      ? (classIdParam as Id<"classes">)
      : null;

  const assignmentId: Id<"assignments"> | null =
    typeof assignmentIdParam === "string" && assignmentIdParam.length > 0
      ? (assignmentIdParam as Id<"assignments">)
      : null;

  const assignment = useQuery(
    api.classes.getAssignment,
    assignmentId ? { assignmentId } : "skip"
  );

  const problems = useQuery(
    api.classes.listProblems,
    assignmentId ? { assignmentId } : "skip"
  );

  const createProblem = useMutation(api.classes.createProblem);

  if (!classId || !assignmentId) {
    return (
      <main className="p-8">
        <p className="text-red-600">Invalid URL parameters</p>
      </main>
    );
  }

  if (assignment === undefined || problems === undefined) {
    return (
      <main className="p-8">
        <p>Loading...</p>
      </main>
    );
  }

  if (assignment === null) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Assignment Not Found
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          This assignment doesn't exist or you don't have access to it.
        </p>
        <button
          onClick={() => router.push(`/classes/${classId}`)}
          className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Class
        </button>
      </main>
    );
  }

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProblemTitle.trim()) return;

    try {
      await createProblem({
        assignmentId,
        title: newProblemTitle,
        description: newProblemDescription || undefined,
        problemNumber: newProblemNumber,
      });
      setNewProblemTitle("");
      setNewProblemDescription("");
      setNewProblemNumber((problems?.length || 0) + 2);
      setIsCreatingProblem(false);
    } catch (error) {
      console.error("Failed to create problem:", error);
      alert("Failed to create problem. Please try again.");
    }
  };

  const suggestedProblemNumber = (problems?.length || 0) + 1;

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/classes/${classId}`)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class
        </button>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          {assignment.title}
        </h1>
        {assignment.description && (
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {assignment.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          Problems
        </h2>
        {!isCreatingProblem && (
          <button
            onClick={() => {
              setNewProblemNumber(suggestedProblemNumber);
              setIsCreatingProblem(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            New Problem
          </button>
        )}
      </div>

      {isCreatingProblem && (
        <form
          onSubmit={handleCreateProblem}
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Create New Problem
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Problem # *
                </label>
                <input
                  type="number"
                  value={newProblemNumber}
                  onChange={(e) => setNewProblemNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  min="1"
                  required
                />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newProblemTitle}
                  onChange={(e) => setNewProblemTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  placeholder="e.g., Solve differential equation"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={newProblemDescription}
                onChange={(e) => setNewProblemDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                rows={3}
                placeholder="Optional problem statement or context..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Create Problem
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingProblem(false);
                  setNewProblemTitle("");
                  setNewProblemDescription("");
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {problems.length === 0 ? (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🧮</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">No problems yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
            Click "New Problem" to add your first problem to this assignment.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {problems
            .sort((a, b) => a.order - b.order)
            .map((problem) => (
              <ProblemCard
                key={problem._id}
                problemId={problem._id}
                classId={classId}
                assignmentId={assignmentId}
                title={problem.title}
                description={problem.description}
                problemNumber={problem.problemNumber}
              />
            ))}
        </div>
      )}
    </main>
  );
}

