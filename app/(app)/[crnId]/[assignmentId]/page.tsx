"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { StudentProblemCard } from "@/components/StudentProblemCard";
import { ArrowLeft, FileText, Loader2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { assignment, problems } = data;

  return (
    <main className="p-8 max-w-7xl min-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${crnId}`)}
          className="w-fit -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Class
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
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
            <CardDescription>
              No problems have been added to this set yet.
            </CardDescription>
          </Card>
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

