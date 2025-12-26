"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Clock, Save, RotateCcw, X, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface VersionControlPanelProps {
  problemId: Id<"problems">;
  onRevert?: () => void;
}

export function VersionControlPanel({
  problemId,
  onRevert,
}: VersionControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [versionTag, setVersionTag] = useState("");
  const [selectedCheckpoint, setSelectedCheckpoint] =
    useState<Id<"editorCheckpoints"> | null>(null);

  const checkpoints = useQuery(api.classes.listCheckpoints, { problemId });
  const createCheckpoint = useMutation(api.classes.createCheckpoint);
  const revertToCheckpoint = useMutation(api.classes.revertToCheckpoint);

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTag.trim()) return;

    try {
      await createCheckpoint({
        problemId,
        versionTag: versionTag.trim(),
      });
      setVersionTag("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create checkpoint:", error);
      alert("Failed to create checkpoint. Please try again.");
    }
  };

  const handleRevert = async (checkpointId: Id<"editorCheckpoints">) => {
    if (
      !confirm(
        "Are you sure you want to revert to this checkpoint? This will replace the current content.",
      )
    ) {
      return;
    }

    try {
      await revertToCheckpoint({ checkpointId });
      setSelectedCheckpoint(null);
      setIsOpen(false);
      onRevert?.();
    } catch (error) {
      console.error("Failed to revert:", error);
      alert("Failed to revert to checkpoint. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
        title="Version control"
      >
        <Clock className="w-4 h-4" />
        Checkpoints
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Version Control</SheetTitle>
          <SheetDescription>
            Create checkpoints and revert to previous versions
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Create Checkpoint */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Create Checkpoint
            </button>
          ) : (
            <form onSubmit={handleCreateCheckpoint} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Checkpoint Label
                </label>
                <input
                  type="text"
                  value={versionTag}
                  onChange={(e) => setVersionTag(e.target.value)}
                  placeholder="e.g., Before dispute fix, Initial version"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save Checkpoint
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setVersionTag("");
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Checkpoint List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Checkpoint History
            </h3>

            {checkpoints === undefined ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Loading checkpoints...
              </p>
            ) : checkpoints.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No checkpoints yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Create a checkpoint to save the current version
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint._id}
                    className={`border rounded-lg p-3 transition-all ${
                      selectedCheckpoint === checkpoint._id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                          {checkpoint.versionTag}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {checkpoint.creatorName} •{" "}
                          {formatDate(checkpoint.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevert(checkpoint._id)}
                        className="flex-shrink-0 p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Revert to this checkpoint"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-900 dark:text-amber-200">
              <strong>💡 Tip:</strong> Create checkpoints before making major
              changes. You can always revert to a previous version if needed.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
