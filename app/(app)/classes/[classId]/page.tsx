"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AssignmentsDataTable } from "@/components/assignments/AssignmentsDataTable";
import { Settings, FileText, Upload, Plus, ArrowLeft, MoreHorizontal, Edit2, Rocket } from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="py-4">
            <p className="text-destructive font-medium">Invalid class ID</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (profile === undefined || classes === undefined) {
    return (
      <main className="p-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-primary/80 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <p className="ml-2 text-sm text-muted-foreground font-medium">Loading Class Template...</p>
        </div>
      </main>
    );
  }

  if (!currentClass) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <div className="space-y-6 text-center py-20">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Template Not Found
            </h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              You don't have access to this course template, or it doesn't exist.
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </div>
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
    <main className="p-8 max-w-7xl min-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <Button
          onClick={() => router.push("/dashboard")}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            {!isEditingClassName ? (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {currentClass.name}
                </h1>
                <Button
                  onClick={startEditingClassName}
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit class name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                {/* Always show edit button for clarity, but styled subtly */}
                <Button
                  onClick={startEditingClassName}
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground/40 hover:text-foreground"
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
                  className="h-10 text-xl font-bold"
                />
                <Button type="submit" size="sm">Save</Button>
                <Button onClick={() => setIsEditingClassName(false)} variant="ghost" size="sm">Cancel</Button>
              </form>
            )}
            <div className="flex items-center gap-3 pt-1">
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 px-2 uppercase tracking-wider font-bold">
                Template Editor
              </Badge>
              <Separator orientation="vertical" className="h-3" />
              <span className="text-[10px] font-mono text-muted-foreground/60">{classId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {[
            { id: "assignments", icon: FileText, label: "Course Assignments" },
            { id: "upload", icon: Upload, label: "Upload Studio" },
            { id: "settings", icon: Settings, label: "Class Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2",
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "settings" && (
          <div className="max-w-2xl">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Class Configuration</CardTitle>
                <CardDescription>Update general settings for this course template.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Field>
                  <FieldLabel>Template Name</FieldLabel>
                  <div className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                    <span className="text-sm font-medium">{currentClass.name}</span>
                    <Button variant="ghost" size="sm" onClick={startEditingClassName}>Change</Button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Unique Identifier</FieldLabel>
                  <code className="text-[11px] bg-muted p-2 rounded block font-mono">
                    {classId}
                  </code>
                </Field>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Assignment Bank</h2>
                <p className="text-sm text-muted-foreground">The master list of problems and solutions for this course.</p>
              </div>
              
              <Dialog open={showCreateAssignmentDialog} onOpenChange={showCreateAssignmentDialog ? setShowCreateAssignmentDialog : undefined}>
                <Button onClick={() => setShowCreateAssignmentDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Problem Set
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Assignment</DialogTitle>
                    <DialogDescription>
                      Add a new master problem set to this course template.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAssignment} className="space-y-4 py-2">
                    <Field>
                      <FieldLabel>Assignment Title</FieldLabel>
                      <Input
                        value={newAssignmentTitle}
                        onChange={(e) => setNewAssignmentTitle(e.target.value)}
                        placeholder="e.g., HW 4C - Laplace Transforms"
                        required
                        className="h-9"
                        autoFocus
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Description (Optional)</FieldLabel>
                      <Textarea
                        value={newAssignmentDescription}
                        onChange={(e) => setNewAssignmentDescription(e.target.value)}
                        placeholder="Briefly describe the topics covered..."
                        className="min-h-[100px]"
                      />
                    </Field>
                    <DialogFooter className="mt-6">
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
              <div className="flex items-center gap-2 py-12 justify-center">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            ) : assignments.length === 0 ? (
              <Card className="border-dashed bg-muted/20 py-20">
                <CardContent className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center shadow-sm">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">No assignments found</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                      Start building your course content by creating your first problem set.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCreateAssignmentDialog(true)}
                    variant="outline"
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Assignment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AssignmentsDataTable data={assignments as any} classId={classId} />
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="max-w-3xl">
            <Card className="border-border/60">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <CardTitle>AI Upload Studio</CardTitle>
                </div>
                <CardDescription>
                  Automatically parse PDF problem sets into structured assignments and problems.
                </CardDescription>
              </CardHeader>
              <CardContent className="py-10">
                <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-muted/10 space-y-4">
                  <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Rocket className="w-8 h-8 text-primary/40" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground italic">Feature Coming Soon</p>
                    <p className="text-muted-foreground text-xs max-w-sm mx-auto">
                      We're building an advanced OCR engine to help you import your existing course materials instantly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
