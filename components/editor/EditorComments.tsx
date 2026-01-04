"use client";

import { useThreadContext } from "./thread-context";
import { CommentGutter } from "./CommentGutter";
import { NewThreadInput } from "./CommentInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/tiptap-ui-primitive/popover";

interface EditorCommentsProps {
  editor: any;
  scrollContainer: HTMLDivElement | null;
}

export function EditorComments({ editor, scrollContainer }: EditorCommentsProps) {
  const {
    canShowComments,
    newThreadBlockId,
    newThreadPosition,
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
        <Popover 
          open={!!newThreadBlockId} 
          onOpenChange={(open) => {
            if (!open) cancelNewThread();
          }}
        >
          <PopoverTrigger asChild>
            <div 
              style={{ 
                position: 'fixed', 
                left: newThreadPosition?.x ?? 0, 
                top: newThreadPosition?.y ?? 0,
                width: 1,
                height: 1,
                visibility: 'hidden'
              }} 
            />
          </PopoverTrigger>
          <PopoverContent side="right" align="start" sideOffset={10} className="w-80 p-0 border-none shadow-none">
            <NewThreadInput
              classId={classId}
              problemId={problemId}
              blockId={newThreadBlockId}
              onSubmit={handleCreateThread}
              onCancel={cancelNewThread}
              isSubmitting={isCreatingThread}
            />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

