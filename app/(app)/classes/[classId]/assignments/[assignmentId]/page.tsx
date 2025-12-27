"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Plus, ArrowLeft, Loader2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ProblemsDataTable } from "@/components/assignments/ProblemsDataTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assignment === null) {
    return (
      <main className="p-8 min-w-4xl mx-auto space-y-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle>Assignment Not Found</CardTitle>
            <CardDescription>
              This assignment doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="ghost"
              onClick={() => router.push(`/classes/${classId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Class
            </Button>
          </CardFooter>
        </Card>
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
    <main className="p-8 min-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/classes/${classId}`)}
          className="w-fit -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Class
        </Button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {assignment.title}
            </h1>
            {assignment.description && (
              <p className="text-muted-foreground text-sm max-w-2xl">
                {assignment.description}
              </p>
            )}
          </div>

          <Dialog
            open={isCreatingProblem}
            onOpenChange={(open) => {
              if (!open) {
                setNewProblemTitle("");
                setNewProblemDescription("");
              }
              setIsCreatingProblem(open);
            }}
          >
            <Button
              onClick={() => {
                setNewProblemNumber(suggestedProblemNumber);
                setIsCreatingProblem(true);
              }}
              className="md:w-auto"
            >
              <Plus className="h-4 w-4" />
              New Problem
            </Button>
            <DialogContent className="sm:max-w-[525px]">
              <form onSubmit={handleCreateProblem}>
                <DialogHeader>
                  <DialogTitle>Create New Problem</DialogTitle>
                  <DialogDescription>
                    Add a new problem to this assignment. Solutions can be added after creation.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="problemNumber" className="text-right">
                      Problem #
                    </Label>
                    <Input
                      id="problemNumber"
                      type="number"
                      value={newProblemNumber}
                      onChange={(e) =>
                        setNewProblemNumber(parseInt(e.target.value) || 1)
                      }
                      min="1"
                      required
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Title
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      value={newProblemTitle}
                      onChange={(e) => setNewProblemTitle(e.target.value)}
                      placeholder="e.g., Solve differential equation"
                      required
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="description" className="text-right pt-2">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newProblemDescription}
                      onChange={(e) => setNewProblemDescription(e.target.value)}
                      placeholder="Optional problem statement..."
                      className="col-span-3 min-h-[100px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreatingProblem(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Problem</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Problems</h2>
          <Badge variant="secondary" className="ml-1">
            {problems.length}
          </Badge>
        </div>

        {problems.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">🧮</span>
            </div>
            <CardTitle className="mb-1">No problems yet</CardTitle>
            <CardDescription className="mb-6">
              Click "New Problem" to add your first problem to this assignment.
            </CardDescription>
            <Button
              variant="outline"
              onClick={() => {
                setNewProblemNumber(suggestedProblemNumber);
                setIsCreatingProblem(true);
              }}
            >
            <Plus className="mr-2 h-4 w-4" />
            Add Problem
          </Button>
        </Card>
      ) : (
        <ProblemsDataTable
          data={problems}
          classId={classId}
          assignmentId={assignmentId}
        />
      )}
    </div>
  </main>
);
}

