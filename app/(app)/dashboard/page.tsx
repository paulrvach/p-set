"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const profile = useQuery(api.classes.getViewerProfile);
  const classes = useQuery(api.classes.listMyClasses) ?? [];
  const crns = useQuery(api.classes.listMyCRNs) ?? [];
  const createClass = useMutation(api.classes.createClass);
  const publishCRN = useMutation(api.classes.publishCRN);
  const joinClass = useMutation(api.classes.joinCRN);

  const [showCreateClassDialog, setShowCreateClassDialog] = useState(false);
  const [showPublishCRNDialog, setShowPublishCRNDialog] = useState(false);
  const [showJoinClassDialog, setShowJoinClassDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const isAdmin = profile?.role === "admin";

  const adminCRNs = crns.filter(
    (c) => c.role === "professor" || c.role === "ta",
  );
  const studentCRNs = crns.filter((c) => c.role === "student" || c.role === "ta");

  const handleCreateClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("className") as string;
    try {
      const result = await createClass({ name });
      setShowCreateClassDialog(false);
      (e.target as HTMLFormElement).reset();
      router.push(`/classes/${result.classId}`);
    } catch (err) {
      console.error("Failed to create class:", err);
      alert(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePublishCRN = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPublishing(true);
    const formData = new FormData(e.currentTarget);
    const classId = formData.get("classId") as Id<"classes">;
    const year = parseInt(formData.get("year") as string, 10);
    const semester = formData.get("semester") as string;
    try {
      const result = await publishCRN({ classId, year, semester });
      setShowPublishCRNDialog(false);
      (e.target as HTMLFormElement).reset();
      router.push(`/crns/${result.crnId}`);
    } catch (err) {
      console.error("Failed to publish CRN:", err);
      alert(err instanceof Error ? err.message : "Failed to publish CRN");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsJoining(true);
    const formData = new FormData(e.currentTarget);
    const inviteCode = formData.get("inviteCode") as string;
    try {
      const result = await joinClass({
        inviteCode: inviteCode.trim().toUpperCase(),
      });
      if (result) {
        setShowJoinClassDialog(false);
        (e.target as HTMLFormElement).reset();
        router.push(`/${result.crnId}`);
      }
    } catch (err) {
      console.error("Failed to join class:", err);
      alert(err instanceof Error ? err.message : "Failed to join class");
    } finally {
      setIsJoining(false);
    }
  };

  if (profile === undefined) {
    return (
      <main className="p-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <p className="ml-2 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          {isAdmin ? "Professor Dashboard" : "Student Dashboard"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Signed in as {profile?.email}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mb-8">
        {isAdmin && (
          <>
            <Button
              onClick={() => setShowCreateClassDialog(true)}
              className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Class
            </Button>
            <Button
              onClick={() => setShowPublishCRNDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Publish CRN
            </Button>
          </>
        )}
        {!isAdmin && (
          <Button
            onClick={() => setShowJoinClassDialog(true)}
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Join Class
          </Button>
        )}
      </div>

      {/* Admin specific sections */}
      {isAdmin && (
        <>
          {/* Classes grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Your Classes
            </h2>
            {classes.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400">
                No classes yet. Create one to get started.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {classes.map((klass) => (
                  <button
                    key={klass.classId}
                    onClick={() => router.push(`/classes/${klass.classId}`)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 text-left hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                      {klass.name}
                    </h3>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Admin CRNs table */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Active CRNs
            </h2>
            {adminCRNs.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400">
                No active CRNs found.
              </p>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Invite Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {adminCRNs.map((crn) => (
                      <tr
                        key={crn.crnId}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                          {crn.className}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          {crn.semester}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                          {crn.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-700 dark:text-slate-300">
                          {crn.inviteCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 capitalize">
                          {crn.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              crn.status === "published"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : crn.status === "draft"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {crn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => router.push(`/crns/${crn.crnId}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            Manage Roster
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Student specific sections */}
      {!isAdmin && (
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            My Enrolled Classes
          </h2>
          {studentCRNs.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              You haven't joined any classes yet.
            </p>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Semester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {studentCRNs.map((crn) => (
                    <tr
                      key={crn.crnId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                        {crn.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {crn.semester}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                        {crn.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 capitalize">
                        {crn.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/${crn.crnId}`)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          Enter Class
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Class Dialog */}
      {showCreateClassDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCreateClassDialog(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Create Class
            </h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  name="className"
                  required
                  placeholder="e.g. Differential Equations"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateClassDialog(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-lg disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish CRN Dialog */}
      {showPublishCRNDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowPublishCRNDialog(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Publish CRN
            </h2>
            <form onSubmit={handlePublishCRN} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Class
                </label>
                <select
                  name="classId"
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select a class</option>
                  {classes.map((klass) => (
                    <option key={klass.classId} value={klass.classId}>
                      {klass.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  name="year"
                  required
                  placeholder="2025"
                  min="2000"
                  max="2100"
                  defaultValue={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Semester
                </label>
                <select
                  name="semester"
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">Select semester</option>
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                  <option value="Fall">Fall</option>
                  <option value="Winter">Winter</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPublishCRNDialog(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing || classes.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Class Dialog */}
      {showJoinClassDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowJoinClassDialog(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Join Class
            </h2>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  name="inviteCode"
                  required
                  placeholder="e.g. ABCD-1234"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono uppercase"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Enter the 8-character invite code provided by your instructor.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowJoinClassDialog(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg disabled:opacity-50"
                >
                  {isJoining ? "Joining..." : "Join"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
