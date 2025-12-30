"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  AlertTriangle,
  Check,
  MoreHorizontal,
  Smile,
  X,
  ChevronLeft,
  Archive,
} from "lucide-react";
import { CommentInput } from "./CommentInput";
import { useThreadContext } from "./thread-context";

// ============================================
// TYPES
// ============================================

interface ThreadListItemProps {
  thread: {
    _id: Id<"threads">;
    blockId: string;
    type: "comment" | "dispute";
    status: "open" | "resolved";
    creatorName: string;
    commentCount: number;
    createdAt: number;
  };
  isSelected: boolean;
  onClick: () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  // Generate a consistent gradient based on name
  const colors = [
    "from-cyan-400 to-blue-500",
    "from-violet-400 to-purple-500",
    "from-pink-400 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-green-500",
    "from-sky-400 to-indigo-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// ============================================
// EMOJI PICKER (Simple inline version)
// ============================================

const QUICK_EMOJIS = ["👀", "✅", "🔥", "👍", "❤️", "🎉"];

function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-popover border rounded-lg shadow-lg">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded text-sm transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ============================================
// REACTION BADGE
// ============================================

function ReactionBadge({
  emoji,
  count,
  hasReacted,
  onClick,
}: {
  emoji: string;
  count: number;
  hasReacted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
        hasReacted
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-muted hover:bg-muted/80 border border-transparent"
      )}
    >
      <span>{emoji}</span>
      <span className="font-medium">{count}</span>
    </button>
  );
}

// ============================================
// COMMENT COMPONENT
// ============================================

function Comment({
  comment,
  onAddReaction,
  onRemoveReaction,
  canModerate,
  onDelete,
}: {
  comment: {
    _id: Id<"comments">;
    authorId: Id<"userProfiles">;
    authorName: string;
    contentJson: any;
    isDeleted: boolean;
    createdAt: number;
    editedAt: number | null;
    reactions: Array<{ emoji: string; count: number; hasReacted: boolean }>;
  };
  onAddReaction: (commentId: Id<"comments">, emoji: string) => void;
  onRemoveReaction: (commentId: Id<"comments">, emoji: string) => void;
  canModerate: boolean;
  onDelete: (commentId: Id<"comments">) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);

  if (comment.isDeleted) {
    return (
      <div className="py-3 px-1">
        <p className="text-sm text-muted-foreground italic">
          This message was deleted.
        </p>
      </div>
    );
  }

  // Extract text from contentJson (simplified - assumes basic structure)
  const getTextContent = (json: any): string => {
    if (!json) return "";
    if (typeof json === "string") return json;
    if (json.text) return json.text;
    if (json.content) {
      return json.content.map((node: any) => getTextContent(node)).join("");
    }
    return "";
  };

  // Render content with @mentions highlighted
  const renderContent = (json: any) => {
    const text = getTextContent(json);
    // Simple @mention detection
    const parts = text.split(/(@\w+\s\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-violet-500 font-medium bg-violet-500/10 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className="group py-3"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className={cn("h-8 w-8 bg-gradient-to-br", getAvatarColor(comment.authorName))}>
          <AvatarFallback className="text-white text-xs font-medium bg-transparent">
            {getInitials(comment.authorName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">
              {comment.authorName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.editedAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-foreground mt-0.5 leading-relaxed">
            {renderContent(comment.contentJson)}
          </p>

          {/* Reactions */}
          {comment.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {comment.reactions.map((reaction) => (
                <ReactionBadge
                  key={reaction.emoji}
                  emoji={reaction.emoji}
                  count={reaction.count}
                  hasReacted={reaction.hasReacted}
                  onClick={() =>
                    reaction.hasReacted
                      ? onRemoveReaction(comment._id, reaction.emoji)
                      : onAddReaction(comment._id, reaction.emoji)
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div
          className={cn(
            "flex items-start gap-1 transition-opacity",
            showActions ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Resolve button (checkmark) */}
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="h-6 w-6 text-muted-foreground" />}>
              <Check className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>Mark as resolved</TooltipContent>
          </Tooltip>

          {/* Emoji picker */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  />
                }
              >
                <Smile className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>Add reaction</TooltipContent>
            </Tooltip>

            {showEmojiPicker && (
              <div className="absolute right-0 top-8 z-50">
                <EmojiPicker
                  onSelect={(emoji) => onAddReaction(comment._id, emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* More actions */}
          {canModerate && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => onDelete(comment._id)}
                  />
                }
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>More actions</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// THREAD LIST ITEM
// ============================================

function ThreadListItem({ thread, isSelected, onClick }: ThreadListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-colors",
        isSelected
          ? "bg-accent"
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "mt-0.5 p-1.5 rounded",
            thread.type === "dispute"
              ? "bg-red-500/10 text-red-500"
              : "bg-blue-500/10 text-blue-500"
          )}
        >
          {thread.type === "dispute" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <MessageCircle className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {thread.creatorName}
            </span>
            {thread.status === "resolved" && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                Resolved
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {thread.commentCount} {thread.commentCount === 1 ? "comment" : "comments"}
          </p>
        </div>

        {/* Time */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(thread.createdAt)}
        </span>
      </div>
    </button>
  );
}

// ============================================
// THREAD DETAIL VIEW
// ============================================

function ThreadDetail({
  threadId,
  classId,
  onBack,
}: {
  threadId: Id<"threads">;
  classId: Id<"classes">;
  onBack: () => void;
}) {
  const threadData = useQuery(api.threads.getThread, { threadId });
  const addReaction = useMutation(api.threads.addReaction);
  const removeReaction = useMutation(api.threads.removeReaction);
  const createComment = useMutation(api.threads.createComment);
  const deleteComment = useMutation(api.threads.deleteAnyComment);
  const resolveThread = useMutation(api.threads.resolveThread);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!threadData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const { thread, comments } = threadData;

  const handleAddReaction = async (commentId: Id<"comments">, emoji: string) => {
    await addReaction({
      targetType: "comment",
      targetId: commentId as string,
      emoji,
    });
  };

  const handleRemoveReaction = async (commentId: Id<"comments">, emoji: string) => {
    await removeReaction({
      targetType: "comment",
      targetId: commentId as string,
      emoji,
    });
  };

  const handleSubmitComment = async (contentJson: any, mentions: Id<"userProfiles">[]) => {
    setIsSubmitting(true);
    try {
      await createComment({
        threadId,
        contentJson,
        mentions,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: Id<"comments">) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      await deleteComment({ commentId });
    }
  };

  const handleResolve = async () => {
    await resolveThread({ threadId });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <div
            className={cn(
              "p-1.5 rounded",
              thread.type === "dispute"
                ? "bg-red-500/10 text-red-500"
                : "bg-blue-500/10 text-blue-500"
            )}
          >
            {thread.type === "dispute" ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <MessageCircle className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="font-medium text-sm">
            {thread.type === "dispute" ? "Dispute" : "Discussion"}
          </span>
          {thread.status === "resolved" && (
            <Badge variant="secondary" className="text-xs">Resolved</Badge>
          )}
        </div>
        {thread.status === "open" && thread.type === "dispute" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolve}
            className="text-green-600 hover:text-green-700"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Resolve
          </Button>
        )}
      </div>

      {/* Comments */}
      <ScrollArea className="flex-1">
        <div className="px-4 divide-y">
          {comments.map((comment) => (
            <Comment
              key={comment._id}
              comment={comment}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
              canModerate={true} // TODO: Check actual permissions
              onDelete={handleDelete}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Reply input */}
      {thread.status === "open" && (
        <div className="p-4 border-t bg-background">
          <CommentInput
            classId={classId}
            onSubmit={handleSubmitComment}
            placeholder="Reply to thread..."
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN SIDEBAR COMPONENT
// ============================================

export function ThreadSidebar() {
  const {
    problemId,
    classId,
    sidebarOpen,
    selectedBlockId,
    selectBlock,
    closeSidebar,
    threads,
  } = useThreadContext();

  const [selectedThreadId, setSelectedThreadId] = useState<Id<"threads"> | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const ghostThreads = useQuery(
    api.threads.listGhostThreads,
    problemId ? { problemId } : "skip"
  );

  if (!sidebarOpen || !problemId || !classId) return null;

  const activeThreads = threads?.filter((t) => !t.isArchived) ?? [];
  const filteredThreads = selectedBlockId
    ? activeThreads.filter((t) => t.blockId === selectedBlockId)
    : activeThreads;

  // If a thread is selected, show the detail view
  if (selectedThreadId) {
    return (
      <div className="w-[40%] border-l bg-background flex flex-col h-full">
        <ThreadDetail
          threadId={selectedThreadId}
          classId={classId}
          onBack={() => setSelectedThreadId(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-[40%] border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Comments</h3>
          {activeThreads.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {activeThreads.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(ghostThreads?.length ?? 0) > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant={showArchived ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => setShowArchived(!showArchived)}
                  />
                }
              >
                <Archive className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                {showArchived ? "Hide archived" : `Show ${ghostThreads?.length} archived`}
              </TooltipContent>
            </Tooltip>
          )}
          <Button variant="ghost" size="icon-sm" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter indicator */}
      {selectedBlockId && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Filtered to selected block
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => selectBlock(null)}
            className="text-xs h-5"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Thread list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredThreads.length === 0 && !showArchived ? (
            <div className="text-center py-8 px-4">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-2">
                {selectedBlockId
                  ? "No comments on this block"
                  : "No comments yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click on a block to add a comment
              </p>
            </div>
          ) : (
            <>
              {filteredThreads.map((thread) => (
                <ThreadListItem
                  key={thread._id}
                  thread={thread}
                  isSelected={false}
                  onClick={() => setSelectedThreadId(thread._id)}
                />
              ))}

              {/* Archived threads */}
              {showArchived && (ghostThreads?.length ?? 0) > 0 && (
                <>
                  <div className="px-2 py-2 mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Archive className="h-3 w-3" />
                      <span>Archived ({ghostThreads?.length})</span>
                    </div>
                  </div>
                  {ghostThreads?.map((thread) => (
                    <ThreadListItem
                      key={thread._id}
                      thread={{
                        ...thread,
                        status: "open",
                        isArchived: true,
                      } as any}
                      isSelected={false}
                      onClick={() => setSelectedThreadId(thread._id)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
