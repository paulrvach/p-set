"use client";

import { useThreadContext } from "./thread-context";
import { CommentGutter } from "./CommentGutter";
import { NewThreadInput } from "./CommentInput";

interface EditorCommentsProps {
  editor: any;
  scrollContainer: HTMLDivElement | null;
}

export function EditorComments({ editor, scrollContainer }: EditorCommentsProps) {
  const {
    canShowComments,
    newThreadBlockId,
    classId,
    problemId,
    isCreatingThread,
    createThread,
    cancelNewThread,
  } = useThreadContext();

  if (!canShowComments || !editor) return null;

  const handleCreateThread = async (
    type: "comment" | "dispute",
    contentJson: any,
    mentions: any[]
  ) => {
    await createThread(type, contentJson, mentions);
  };

  return (
    <>
      {/* Comment gutter */}
      <CommentGutter
        editor={editor}
        scrollContainer={scrollContainer}
      />

      {/* New thread input popover */}
      {newThreadBlockId && classId && problemId && (
        <div className="absolute right-4 top-4 z-50 w-80">
          <NewThreadInput
            classId={classId}
            problemId={problemId}
            blockId={newThreadBlockId}
            onSubmit={handleCreateThread}
            onCancel={cancelNewThread}
            isSubmitting={isCreatingThread}
          />
        </div>
      )}
    </>
  );
}

