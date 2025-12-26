"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EnhancedMathEditor } from "@/components/editor/EnhancedMathEditor";
import { VersionControlPanel } from "@/components/editor/VersionControlPanel";
import { useHeader } from "@/components/header-context";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { debounce } from "@/lib/utils";
import Link from "next/link";

function ProblemEditorHeader({
  classId,
  assignmentId,
  assignment,
  problem,
  hasUnsavedChanges,
  problemId,
  onRevert,
}: {
  classId: Id<"classes"> | null;
  assignmentId: Id<"assignments"> | null;
  assignment: { title: string } | null | undefined;
  problem: { problemNumber: number; title: string } | null | undefined;
  hasUnsavedChanges: boolean;
  problemId: Id<"problems"> | null;
  onRevert: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/classes/${classId}/assignments/${assignmentId}`}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{assignment?.title ?? "Assignment"}</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">
          Problem #{problem?.problemNumber}: {problem?.title}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {hasUnsavedChanges && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Unsaved changes
          </span>
        )}
        <VersionControlPanel
          problemId={problemId ?? ("" as Id<"problems">)}
          onRevert={onRevert}
        />
      </div>
    </>
  );
}

export default function ProblemEditorPage() {
  const params = useParams();
  const { setHeaderContent } = useHeader();
  const [content, setContent] = useState<any>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedContentRef = useRef<string>("");

  const classIdParam = params?.classId;
  const assignmentIdParam = params?.assignmentId;
  const problemIdParam = params?.problemId;

  const classId: Id<"classes"> | null =
    typeof classIdParam === "string" && classIdParam.length > 0
      ? (classIdParam as Id<"classes">)
      : null;

  const assignmentId: Id<"assignments"> | null =
    typeof assignmentIdParam === "string" && assignmentIdParam.length > 0
      ? (assignmentIdParam as Id<"assignments">)
      : null;

  const problemId: Id<"problems"> | null =
    typeof problemIdParam === "string" && problemIdParam.length > 0
      ? (problemIdParam as Id<"problems">)
      : null;

  const assignment = useQuery(
    api.classes.getAssignment,
    assignmentId ? { assignmentId } : "skip"
  );

  const problem = useQuery(
    api.classes.getProblem,
    problemId ? { problemId } : "skip"
  );

  const solution = useQuery(
    api.classes.getUnifiedSolution,
    problemId ? { problemId } : "skip"
  );

  const updateSolution = useMutation(api.classes.updateUnifiedSolution);

  const handleRevert = useCallback(() => {
    window.location.reload();
  }, []);

  // Set header content
  useEffect(() => {
    setHeaderContent(
      <ProblemEditorHeader
        classId={classId}
        assignmentId={assignmentId}
        assignment={assignment}
        problem={problem}
        hasUnsavedChanges={hasUnsavedChanges}
        problemId={problemId}
        onRevert={handleRevert}
      />
    );

    return () => setHeaderContent(null);
  }, [
    setHeaderContent,
    classId,
    assignmentId,
    assignment,
    problem,
    hasUnsavedChanges,
    problemId,
    handleRevert,
  ]);

  // Load solution content when it changes
  useEffect(() => {
    if (solution) {
      setContent(solution.contentJson);
      setLastSaved(solution.lastEditedAt);
      setHasUnsavedChanges(false);
      lastSavedContentRef.current = JSON.stringify(solution.contentJson);
    } else if (solution === null && problemId) {
      const initialContent = {
        type: "doc",
        content: [{ type: "paragraph" }],
      };
      setContent(initialContent);
      lastSavedContentRef.current = JSON.stringify(initialContent);
    }
  }, [solution, problemId]);

  const saveContent = useCallback(
    async (contentToSave: any) => {
      if (!contentToSave || !problemId) return;

      const contentString = JSON.stringify(contentToSave);
      if (contentString === lastSavedContentRef.current) return;

      setIsSaving(true);
      try {
        await updateSolution({
          problemId,
          contentJson: contentToSave,
        });
        setLastSaved(Date.now());
        setHasUnsavedChanges(false);
        lastSavedContentRef.current = contentString;
      } catch (error) {
        console.error("Failed to save solution:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [problemId, updateSolution]
  );

  const debouncedSave = useCallback(
    debounce((contentToSave: any) => {
      saveContent(contentToSave);
    }, 2000),
    [saveContent]
  );

  const handleContentChange = (newContent: any) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    debouncedSave(newContent);
  };

  const handleSave = async () => {
    await saveContent(content);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        {content && (
          <EnhancedMathEditor
            content={content}
            onChange={handleContentChange}
            onSave={handleSave}
            lastSaved={lastSaved}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
