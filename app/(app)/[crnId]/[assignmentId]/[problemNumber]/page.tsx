"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { EnhancedMathEditor } from "@/components/editor/EnhancedMathEditor";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHeader } from "@/components/header-context";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { useEffect } from "react";
import { ThreadProvider } from "@/components/editor/thread-context";
import { ThreadSidebar } from "@/components/editor/ThreadSidebar";
import { ThreadStatusToggle } from "@/components/editor/ThreadStatusToggle";

export default function StudentProblemPage() {
  const params = useParams();
  const { setHeaderContent } = useHeader();
  const crnId = params?.crnId as Id<"crns">;
  const assignmentId = params?.assignmentId as Id<"assignments">;
  const problemNumber = parseInt(params?.problemNumber as string, 10);

  const data = useQuery(api.classes.getStudentProblemByNumber, {
    crnId,
    assignmentId,
    problemNumber,
  });

  // Set breadcrumb navigation in header
  useEffect(() => {
    if (data) {
      const { assignment } = data;
      setHeaderContent(
        <BreadcrumbNav
          items={[
            {
              label: assignment.title,
              href: `/${crnId}/${assignmentId}`,
            },
            {
              label: `Problem ${problemNumber}: ${data.problem.title}`,
            },
          ]}
        />,
      );
    }

    return () => setHeaderContent(null);
  }, [data, crnId, assignmentId, problemNumber, setHeaderContent]);

  if (data === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { problem, solution, assignment } = data;

  return (
    <ThreadProvider
      problemId={problem._id}
      classId={assignment.classId}
      showComments={true}
    >
      <div className="h-full flex  bg-background overflow-hidden">
        <div className="h-full w-full overflow-auto">
          <div className="max-w-5xl mx-auto py-8 px-6 space-y-8">
            {problem.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Problem Statement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {problem.description}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden min-h-[600px] flex flex-col">
              <CardHeader className="border-b bg-muted/30 px-6 py-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Official Solution
                </CardTitle>
              </CardHeader>
              <EnhancedMathEditor
                content={solution?.contentJson}
                editable={false}
                className=""
                footerActions={<ThreadStatusToggle />}
              />
            </Card>
          </div>
        </div>

        <ThreadSidebar />
      </div>
    </ThreadProvider>
  );
}
