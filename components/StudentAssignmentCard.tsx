"use client";

import Link from "next/link";
import { FileText, Calendar, ChevronRight } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface StudentAssignmentCardProps {
  crnId: Id<"crns">;
  assignmentId: Id<"assignments">;
  title: string;
  description?: string | null;
  creationTime: number;
}

export function StudentAssignmentCard({
  crnId,
  assignmentId,
  title,
  description,
  creationTime,
}: StudentAssignmentCardProps) {
  const formattedDate = new Date(creationTime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/${crnId}/${assignmentId}`}
      className="block group"
    >
      <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
        <CardHeader className="flex flex-row items-center gap-4 py-5">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="group-hover:text-primary transition-colors truncate">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="line-clamp-1 mt-1">
                {description}
              </CardDescription>
            )}
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              <Calendar className="w-3 h-3" />
              <span>Assigned {formattedDate}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </CardHeader>
      </Card>
    </Link>
  );
}

