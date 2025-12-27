"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Hash, Trash2, ChevronRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProblemCardProps {
  problemId: Id<"problems">;
  classId: Id<"classes">;
  assignmentId: Id<"assignments">;
  title: string;
  description?: string | null;
  problemNumber: number;
  onDeleted?: () => void;
}

export function ProblemCard({
  problemId,
  classId,
  assignmentId,
  title,
  description,
  problemNumber,
  onDeleted,
}: ProblemCardProps) {
  const deleteProblem = useMutation(api.classes.deleteProblem);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      confirm(
        `Are you sure you want to delete "${title}"? This will also delete all solution lines.`
      )
    ) {
      try {
        await deleteProblem({ problemId });
        onDeleted?.();
      } catch (error) {
        console.error("Failed to delete problem:", error);
        alert("Failed to delete problem. Please try again.");
      }
    }
  };

  return (
    <Link
      href={`/classes/${classId}/assignments/${assignmentId}/problems/${problemId}`}
      className="block group"
    >
      <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-4 py-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <div className="flex items-center gap-0.5 text-primary font-semibold">
              <Hash className="h-4 w-4" />
              <span className="text-sm">{problemNumber}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="group-hover:text-primary transition-colors truncate">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="line-clamp-1">
                {description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete problem</span>
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

