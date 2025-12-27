"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { StudentAssignmentCard } from "@/components/StudentAssignmentCard";
import { ArrowLeft, BookOpen, Loader2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentCRNDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const crnId = params?.crnId as Id<"crns">;

  const data = useQuery(api.classes.getStudentCRNDashboard, { crnId });

  if (data === undefined) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data === null) {
    return (
      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle>Not Authorized</CardTitle>
            <CardDescription>
              You don't have access to this class, or it doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-start">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  const { crn, class: classInfo, assignments } = data;

  return (
    <main className="p-8 max-w-7xl min-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="w-fit -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {classInfo.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {crn.semester} {crn.year} • Welcome to your class dashboard.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Problem Sets</h2>
          <Badge variant="secondary" className="ml-1">
            {assignments.length}
          </Badge>
        </div>

        {assignments.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <CardTitle className="mb-1">No problem sets yet</CardTitle>
            <CardDescription>
              No problem sets have been posted for this class yet.
            </CardDescription>
          </Card>
        ) : (
          <div className="">
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

