"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CRNMemberStats } from "@/components/crns/CRNMemberStats";
import { MembersDataTable } from "@/components/crns/MembersDataTable";

export default function CRNPage() {
  const params = useParams();
  const crnIdParam = params?.crnId;
  const crnId: Id<"crns"> | null =
    typeof crnIdParam === "string" && crnIdParam.length > 0
      ? (crnIdParam as Id<"crns">)
      : null;

  const data = crnId
    ? useQuery(api.classes.getCRNForViewer, {
        crnId: crnId,
      })
    : undefined;

  const members = crnId
    ? useQuery(api.classes.listCRNMembers, {
        crnId: crnId,
      })
    : undefined;

  const stats = crnId
    ? useQuery(api.classes.getCRNMemberStats, {
        crnId: crnId,
      })
    : undefined;

  if (!crnId) {
    return (
      <main className="p-8">
        <p className="text-red-600">Invalid CRN ID</p>
      </main>
    );
  }

  if (data === undefined || members === undefined || stats === undefined) {
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
          You don't have access to this CRN, or it doesn't exist.
        </p>
      </main>
    );
  }

  const { crn, class: classInfo, membership } = data;

  // Only show members table if user is professor or TA
  const canViewMembers =
    membership.role === "professor" || membership.role === "ta";

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          {classInfo.name} - Roster
        </h1>
        <p className="text-muted-foreground">
          Manage class members, assign Teaching Assistant roles, and configure
          granular permissions for the semester.
        </p>
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="default" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Members
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {canViewMembers && stats && (
        <CRNMemberStats
          activeMembers={stats.activeMembers}
          teachingAssistants={stats.teachingAssistants}
          pendingInvites={stats.pendingInvites}
        />
      )}

      {/* Members Data Table */}
      {canViewMembers && members && (
        <MembersDataTable data={members} />
      )}

      {/* Fallback for non-staff members */}
      {!canViewMembers && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Invite Code
              </h2>
              <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                {crn.inviteCode}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Status
              </h2>
              <span
                className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                  crn.status === "published"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : crn.status === "draft"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {crn.status}
              </span>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Your Role
              </h2>
              <p className="text-lg text-slate-800 dark:text-slate-200 mt-1 capitalize">
                {membership.role}
              </p>
            </div>

            {membership.permissions.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Your Permissions
                </h2>
                <div className="flex flex-wrap gap-2">
                  {membership.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {crn.publishedAt && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Published on {new Date(crn.publishedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

