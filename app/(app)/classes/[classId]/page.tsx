"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AssignmentCard } from "@/components/AssignmentCard";
import { Settings, FileText, Upload, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

type Tab = "settings" | "assignments" | "upload";

export default function ClassEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("assignments");
  const [showCreateAssignmentDialog, setShowCreateAssignmentDialog] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDescription, setNewAssignmentDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [editedClassName, setEditedClassName] = useState("");

  const classIdParam = params?.classId;
  const classId: Id<"classes"> | null =
    typeof classIdParam === "string" && classIdParam.length > 0
      ? (classIdParam as Id<"classes">)
      : null;

  const profile = useQuery(api.classes.getViewerProfile);
  const classes = useQuery(api.classes.listMyClasses) ?? [];
  const assignments = useQuery(
    api.classes.listAssignments,
    classId ? { classId } : "skip"
  );

  const currentClass = classes.find((c) => c.classId === classId);

  const createAssignment = useMutation(api.classes.createAssignment);
  const updateClassName = useMutation(api.classes.updateClassName);

  if (!classId) {
    return (
      <main className="p-8">
        <p className="text-red-600">Invalid class ID</p>
      </main>
    );
  }

  if (profile === undefined || classes === undefined) {
    return (
      <main className="p-8">
        <p>Loading...</p>
      </main>
    );
  }

  if (!currentClass) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Class Not Found
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          You don't have access to this class, or it doesn't exist.
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          className="mt-4"
        >
          ← Back to Dashboard
        </Button>
      </main>
    );
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignmentTitle.trim()) return;

    setIsCreating(true);
    try {
      await createAssignment({
        classId,
        title: newAssignmentTitle,
        description: newAssignmentDescription || undefined,
      });
      setNewAssignmentTitle("");
      setNewAssignmentDescription("");
      setShowCreateAssignmentDialog(false);
    } catch (error) {
      console.error("Failed to create assignment:", error);
      alert("Failed to create assignment. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateClassName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedClassName.trim()) return;

    try {
      await updateClassName({
        classId,
        name: editedClassName,
      });
      setIsEditingClassName(false);
    } catch (error) {
      console.error("Failed to update class name:", error);
      alert("Failed to update class name. Please try again.");
    }
  };

  const startEditingClassName = () => {
    setEditedClassName(currentClass.name);
    setIsEditingClassName(true);
  };

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Button
          onClick={() => router.push("/dashboard")}
          variant="outline"
          size="sm"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {!isEditingClassName ? (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                  {currentClass.name}
                </h1>
                <Button
                  onClick={startEditingClassName}
                  variant="ghost"
                  size="icon-sm"
                  title="Edit class name"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleUpdateClassName} className="flex items-center gap-2 max-w-md">
                <Input
                  type="text"
                  value={editedClassName}
                  onChange={(e) => setEditedClassName(e.target.value)}
                  autoFocus
                  className="h-9 text-lg font-semibold"
                />
                <Button
                  type="submit"
                  size="sm"
                >
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditingClassName(false)}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </form>
            )}
            <p className="text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider">
                Class Editor
              </span>
              <span className="text-xs font-mono opacity-50">{classId}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-8">
        <nav className="flex gap-4">
          <Button
            onClick={() => setActiveTab("assignments")}
            variant="ghost"
            className={`px-4 py-2 h-auto rounded-none border-b-2 transition-all ${
              activeTab === "assignments"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Assignments
          </Button>
          <Button
            onClick={() => setActiveTab("upload")}
            variant="ghost"
            className={`px-4 py-2 h-auto rounded-none border-b-2 transition-all ${
              activeTab === "upload"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button
            onClick={() => setActiveTab("settings")}
            variant="ghost"
            className={`px-4 py-2 h-auto rounded-none border-b-2 transition-all ${
              activeTab === "settings"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "settings" && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Class Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Class Name
              </label>
              <p className="text-slate-900 dark:text-slate-100">{currentClass.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Class ID
              </label>
              <Badge variant="outline">
                {classId}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                Course Assignments
              </h2>
              <p className="text-sm text-slate-500">Manage and create assignments for this course template.</p>
            </div>
            
            <Dialog open={showCreateAssignmentDialog} onOpenChange={setShowCreateAssignmentDialog}>
              <Button onClick={() => setShowCreateAssignmentDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Assignment
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Assignment</DialogTitle>
                  <DialogDescription>
                    Add a new problem set to this class template.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAssignment} className="space-y-4 py-4">
                  <Field>
                    <FieldLabel>Title</FieldLabel>
                    <Input
                      type="text"
                      value={newAssignmentTitle}
                      onChange={(e) => setNewAssignmentTitle(e.target.value)}
                      placeholder="e.g., HW 4C - Laplace Transforms"
                      required
                      className="h-9"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Description (Optional)</FieldLabel>
                    <Textarea
                      value={newAssignmentDescription}
                      onChange={(e) => setNewAssignmentDescription(e.target.value)}
                      placeholder="Enter a brief description of the assignment..."
                      className="min-h-[100px]"
                    />
                  </Field>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowCreateAssignmentDialog(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Assignment"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {assignments === undefined ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-16 text-center">
              <div className="bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No assignments yet</h3>
              <p className="text-slate-500 mt-1 max-w-xs mx-auto">
                Get started by creating your first assignment for this class.
              </p>
              <Button
                onClick={() => setShowCreateAssignmentDialog(true)}
                variant="outline"
                className="mt-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Assignment
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assignments.map((assignment: any) => (
                <AssignmentCard
                  key={assignment._id}
                  assignmentId={assignment._id}
                  classId={classId}
                  title={assignment.title}
                  description={assignment.description}
                  creationTime={assignment._creationTime}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "upload" && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Upload Studio
          </h2>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center">
            <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              PDF upload and parsing coming soon
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              This feature will allow you to upload PDFs and automatically parse
              them into assignments and problems.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

