"use client";

import { useState, useCallback, useMemo } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle,
  AlertTriangle,
  Smile,
  X,
  Archive,
  Filter,
  GraduationCap,
  Hash,
  Globe,
  ArrowRight,
  Send,
  CornerDownLeft,
  Reply,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { CommentInput } from "./CommentInput";
import { useThreadContext } from "./thread-context";

// ============================================
// TYPES
// ============================================

type FilterMode = "all" | "disputes" | "general" | "block-specific";

interface FeedComment {
  _id: Id<"comments">;
  threadId: Id<"threads">;
  blockId: string | null;
  threadType: "comment" | "dispute";
  threadStatus: "open" | "resolved";
  isThreadArchived: boolean;
  authorId: Id<"userProfiles">;
  authorName: string;
  authorEmail: string;
  isProfessor: boolean;
  contentJson: any;
  mentions: Id<"userProfiles">[];
  isDeleted: boolean;
  createdAt: number;
  editedAt: number | null;
  parentId?: Id<"comments">;
  reactions: Array<{ emoji: string; count: number; hasReacted: boolean }>;
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
// BLOCK REFERENCE BADGE
// ============================================

function BlockReferenceBadge({
  blockId,
  isDispute,
  onJumpToBlock,
}: {
  blockId: string | null;
  isDispute: boolean;
  onJumpToBlock?: () => void;
}) {
  if (!blockId) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-5 px-1.5 gap-1 bg-muted/50 text-muted-foreground"
      >
        <Globe className="h-3 w-3" />
        General
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] h-5 px-1.5 gap-1 cursor-pointer hover:bg-muted/80 transition-colors",
        isDispute
          ? "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
          : "bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20"
      )}
      onClick={onJumpToBlock}
    >
      {isDispute ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Hash className="h-3 w-3" />
      )}
      Block
      <ArrowRight className="h-3 w-3 ml-0.5" />
    </Badge>
  );
}

// ============================================
// THREAD COMPONENTS
// ============================================

// Helper to extract text from contentJson
function getTextContent(json: any): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  if (json.text) return json.text;
  if (json.content) {
    return json.content.map((node: any) => getTextContent(node)).join("");
  }
  return "";
}

function ParentCommentPreview({
  parentComment,
}: {
  parentComment: FeedComment;
}) {
  const text = getTextContent(parentComment.contentJson);
  const truncated = text.length > 100 ? text.slice(0, 100) + "..." : text;

  return (
    <div className="mb-2 px-2.5 py-1.5 bg-muted/10  rounded-r opacity-70">
      <div className="flex items-center gap-2">
        <Reply className="h-4 w-4 opacity-70 scale-x-[-1]" />
        <Avatar
          className={cn(
            "h-4 w-4 bg-gradient-to-br flex-shrink-0",
            getAvatarColor(parentComment.authorName)
          )}
        >
          <AvatarFallback className="text-white text-[9px] font-medium bg-transparent">
            {getInitials(parentComment.authorName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-foreground/70">
          {parentComment.authorName}
        </span>
        <span className="text-xs text-muted-foreground/70">{truncated}</span>
      </div>
    </div>
  );
}

function ThreadCommentItem({
  comment,
  parentComment,
  canReply,
  onAddReaction,
  onRemoveReaction,
  onReply,
}: {
  comment: FeedComment;
  parentComment?: FeedComment;
  canReply: boolean;
  onAddReaction: (commentId: Id<"comments">, emoji: string) => void;
  onRemoveReaction: (commentId: Id<"comments">, emoji: string) => void;
  onReply: () => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);

  if (comment.isDeleted) {
    return (
      <div className="py-2 px-4">
        <p className="text-xs text-muted-foreground italic">
          Message deleted
        </p>
      </div>
    );
  }

  // Render content with @mentions highlighted
  const renderContent = (json: any) => {
    const text = getTextContent(json);
    const parts = text.split(/(@\w+\s\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="text-violet-500 font-medium bg-violet-500/10 px-1 rounded"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="py-2 px-4 hover:bg-muted/30 transition-colors group relative">
      {/* Show parent comment preview if this is a reply */}
      {parentComment && <ParentCommentPreview parentComment={parentComment} />}

      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          className={cn(
            "h-6 w-6 bg-gradient-to-br flex-shrink-0 mt-0.5",
            getAvatarColor(comment.authorName)
          )}
        >
          <AvatarFallback className="text-white text-[10px] font-medium bg-transparent">
            {getInitials(comment.authorName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-xs text-foreground">
              {comment.authorName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(comment.createdAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            {comment.isProfessor && (
              <Badge
                variant="secondary"
                className="text-[10px] h-3.5 px-1 gap-0.5 bg-amber-500/15 text-amber-600 border-amber-500/30"
              >
                <GraduationCap className="h-2.5 w-2.5" />
                Prof
              </Badge>
            )}
            {comment.editedAt && (
              <span className="text-[10px] text-muted-foreground">(edited)</span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-foreground leading-relaxed">
            {renderContent(comment.contentJson)}
          </p>

          {/* Reactions */}
          {comment.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
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
            "flex items-start gap-1 transition-opacity flex-shrink-0 pt-0.5",
            showActions ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Reply */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={onReply}
                  disabled={!canReply}
                />
              }
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              {canReply ? "Reply" : "Resolved — only the professor can reply"}
            </TooltipContent>
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
              <TooltipContent>React</TooltipContent>
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
        </div>
      </div>
    </div>
  );
}

function FeedThread({
  comments,
  classId,
  isProfessor,
  onAddReaction,
  onRemoveReaction,
  onHoverBlock,
  onJumpToBlock,
  onCreateComment,
  onResolveThread,
  onReopenThread,
}: {
  comments: FeedComment[];
  classId: Id<"classes">;
  isProfessor: boolean;
  onAddReaction: (commentId: Id<"comments">, emoji: string) => void;
  onRemoveReaction: (commentId: Id<"comments">, emoji: string) => void;
  onHoverBlock: (blockId: string | null) => void;
  onJumpToBlock: (blockId: string) => void;
  onCreateComment: (
    threadId: Id<"threads">,
    contentJson: any,
    mentions: Id<"userProfiles">[],
    parentId?: Id<"comments">
  ) => Promise<void>;
  onResolveThread: (threadId: Id<"threads">) => Promise<void>;
  onReopenThread: (threadId: Id<"threads">) => Promise<void>;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyParentId, setReplyParentId] = useState<Id<"comments"> | undefined>(
    undefined
  );
  const [replyAuthorName, setReplyAuthorName] = useState<string>("");

  if (comments.length === 0) return null;

  const firstComment = comments[0];
  const isDispute = firstComment.threadType === "dispute";
  const isResolved = firstComment.threadStatus === "resolved";
  const canReply = !isResolved || (isResolved && isProfessor);

  // Create a map of comments by ID for quick lookup
  const commentMap = new Map<Id<"comments">, FeedComment>();
  comments.forEach((comment) => {
    commentMap.set(comment._id, comment);
  });

  // Flatten comments in chronological order
  const sortedComments = [...comments].sort((a, b) => a.createdAt - b.createdAt);

  const handleReply = (commentId: Id<"comments">, authorName: string) => {
    setIsReplying(true);
    setReplyParentId(commentId);
    setReplyAuthorName(authorName);
  };

  const handleReplyToThread = () => {
    setIsReplying(true);
    setReplyParentId(undefined);
    setReplyAuthorName("");
  };

  const handleSubmit = async (
    contentJson: any,
    mentions: Id<"userProfiles">[]
  ) => {
    setIsSubmitting(true);
    try {
      await onCreateComment(
        firstComment.threadId,
        contentJson,
        mentions,
        replyParentId
      );
      setIsReplying(false);
      setReplyParentId(undefined);
      setReplyAuthorName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMouseEnter = () => {
    if (firstComment.blockId) {
      onHoverBlock(firstComment.blockId);
    }
  };

  const handleMouseLeave = () => {
    onHoverBlock(null);
  };

  return (
    <div 
      className="border-b border-border/50 pb-2 mb-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thread Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20">
        <div className="flex items-center gap-2">
          <BlockReferenceBadge
            blockId={firstComment.blockId}
            isDispute={isDispute}
            onJumpToBlock={
              firstComment.blockId
                ? () => onJumpToBlock(firstComment.blockId!)
                : undefined
            }
          />
          {isResolved && (
            <Badge
              variant="secondary"
              className="text-[10px] h-4 px-1.5 bg-green-500/15 text-green-600"
            >
              Resolved
            </Badge>
          )}
        </div>
        {/* Resolve/Reopen actions for disputes (professor only) */}
        {isDispute && isProfessor && (
          <div className="flex items-center gap-1">
            {isResolved ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 px-2 text-xs"
                      onClick={() => onReopenThread(firstComment.threadId)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reopen
                    </Button>
                  }
                />
                <TooltipContent>Reopen this dispute</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 px-2 text-xs text-green-600 hover:text-green-700"
                      onClick={() => onResolveThread(firstComment.threadId)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  }
                />
                <TooltipContent>Mark this dispute as resolved</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Comments - Flat list with parent previews */}
      <div className="flex flex-col">
        {sortedComments.map((comment) => {
          const parentComment = comment.parentId
            ? commentMap.get(comment.parentId)
            : undefined;

          return (
            <ThreadCommentItem
              key={comment._id}
              comment={comment}
              parentComment={parentComment}
              canReply={canReply}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
              onReply={() => handleReply(comment._id, comment.authorName)}
            />
          );
        })}
      </div>

      {/* Reply Input */}
      {canReply ? (
        isReplying ? (
          <div className="px-4 pb-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
            <CommentInput
              classId={classId}
              onSubmit={handleSubmit}
              placeholder={
                replyParentId
                  ? `Reply to ${replyAuthorName}...`
                  : "Reply to thread..."
              }
              isSubmitting={isSubmitting}
              autoFocus
            />
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setIsReplying(false);
                setReplyParentId(undefined);
                setReplyAuthorName("");
              }}
              className="mt-1 h-6 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="px-4 py-1 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground w-full justify-start hover:text-foreground"
              onClick={handleReplyToThread}
            >
              <CornerDownLeft className="h-3 w-3 mr-2" />
              Reply to thread...
            </Button>
          </div>
        )
      ) : (
        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground italic">
            Resolved — only the professor can reply
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// FILTER DROPDOWN
// ============================================

function FilterDropdown({
  value,
  onChange,
}: {
  value: FilterMode;
  onChange: (value: FilterMode) => void;
}) {
  const labels: Record<FilterMode, string> = {
    all: "All comments",
    disputes: "Disputes only",
    general: "General discussion",
    "block-specific": "Block-specific",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" />}>
        <Filter className="h-3.5 w-3.5" />
        {labels[value]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange("all")}>
          <MessageCircle className="h-4 w-4 mr-2" />
          All comments
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("disputes")}>
          <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
          Disputes only
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("general")}>
          <Globe className="h-4 w-4 mr-2" />
          General discussion
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("block-specific")}>
          <Hash className="h-4 w-4 mr-2" />
          Block-specific
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
    setHoveredBlockId,
    closeSidebar,
    createGeneralThread,
    isCreatingThread,
    isProfessor,
  } = useThreadContext();

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isSubmittingGeneral, setIsSubmittingGeneral] = useState(false);

  // Fetch flat feed of all comments
  const allComments = useQuery(
    api.threads.listAllCommentsForProblem,
    problemId ? { problemId } : "skip"
  );

  const ghostThreads = useQuery(
    api.threads.listGhostThreads,
    problemId ? { problemId } : "skip"
  );

  const addReaction = useMutation(api.threads.addReaction);
  const removeReaction = useMutation(api.threads.removeReaction);
  const createComment = useMutation(api.threads.createComment);
  const resolveThread = useMutation(api.threads.resolveThread);
  const reopenThread = useMutation(api.threads.reopenThread);

  const handleAddReaction = useCallback(
    async (commentId: Id<"comments">, emoji: string) => {
      await addReaction({
        targetType: "comment",
        targetId: commentId as string,
        emoji,
      });
    },
    [addReaction]
  );

  const handleRemoveReaction = useCallback(
    async (commentId: Id<"comments">, emoji: string) => {
      await removeReaction({
        targetType: "comment",
        targetId: commentId as string,
        emoji,
      });
    },
    [removeReaction]
  );

  const handleCreateComment = useCallback(
    async (
      threadId: Id<"threads">,
      contentJson: any,
      mentions: Id<"userProfiles">[],
      parentId?: Id<"comments">
    ) => {
      await createComment({
        threadId,
        contentJson,
        mentions,
        parentId,
      });
    },
    [createComment]
  );

  const handleResolveThread = useCallback(
    async (threadId: Id<"threads">) => {
      await resolveThread({ threadId });
    },
    [resolveThread]
  );

  const handleReopenThread = useCallback(
    async (threadId: Id<"threads">) => {
      await reopenThread({ threadId });
    },
    [reopenThread]
  );

  const handleJumpToBlock = useCallback(
    (blockId: string) => {
      selectBlock(blockId);
      // Scroll to the block in the editor
      const element = document.querySelector(
        `[data-data-block-id="${blockId}"]`
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [selectBlock]
  );

  const handleSubmitGeneralComment = useCallback(
    async (contentJson: any, mentions: Id<"userProfiles">[]) => {
      setIsSubmittingGeneral(true);
      try {
        await createGeneralThread(contentJson, mentions);
      } finally {
        setIsSubmittingGeneral(false);
      }
    },
    [createGeneralThread]
  );

  // Filter comments based on mode
  let filteredComments = allComments ?? [];

  // Don't show archived threads in feed by default
  if (!showArchived) {
    filteredComments = filteredComments.filter((c) => !c.isThreadArchived);
  }

  // Apply filter mode
  switch (filterMode) {
    case "disputes":
      filteredComments = filteredComments.filter(
        (c) => c.threadType === "dispute"
      );
      break;
    case "general":
      filteredComments = filteredComments.filter((c) => c.blockId === null);
      break;
    case "block-specific":
      filteredComments = filteredComments.filter((c) => c.blockId !== null);
      break;
  }

  // If a block is selected, filter to that block
  if (selectedBlockId) {
    filteredComments = filteredComments.filter(
      (c) => c.blockId === selectedBlockId
    );
  }

  const groupedThreads = useMemo(() => {
    if (!filteredComments) return [];

    const threads = new Map<string, FeedComment[]>();
    filteredComments.forEach((c) => {
      const t = threads.get(c.threadId) || [];
      t.push(c);
      threads.set(c.threadId, t);
    });

    const result = Array.from(threads.values());

    // Sort comments within threads (oldest first)
    result.forEach((t) => t.sort((a, b) => a.createdAt - b.createdAt));

    // Sort threads by most recent activity (latest comment)
    result.sort((a, b) => {
      const lastA = a[a.length - 1].createdAt;
      const lastB = b[b.length - 1].createdAt;
      return lastB - lastA; // Newest first
    });

    return result;
  }, [filteredComments]);

  const activeCommentCount = allComments?.filter(
    (c) => !c.isThreadArchived && !c.isDeleted
  ).length ?? 0;

  if (!sidebarOpen || !problemId || !classId) return null;

  return (
    <div className="w-[40%] border-l bg-background flex flex-col h-[93vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Comments</h3>
          {activeCommentCount > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {activeCommentCount}
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
                {showArchived
                  ? "Hide archived"
                  : `Show ${ghostThreads?.length} archived`}
              </TooltipContent>
            </Tooltip>
          )}
          <Button variant="ghost" size="icon-sm" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between flex-shrink-0">
        <FilterDropdown value={filterMode} onChange={setFilterMode} />
        {selectedBlockId && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => selectBlock(null)}
            className="text-xs h-5"
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Comment feed - Scrollable area */}
      <ScrollArea className="flex-1 overflow-hidden">
        {groupedThreads.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mt-3">
              {selectedBlockId
                ? "No comments on this block yet"
                : "No comments yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click on a block or use the input below to start a discussion
            </p>
          </div>
        ) : (
          <div>
            {groupedThreads.map((comments) => (
              <FeedThread
                key={comments[0].threadId}
                comments={comments}
                classId={classId}
                isProfessor={isProfessor}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
                onHoverBlock={setHoveredBlockId}
                onJumpToBlock={handleJumpToBlock}
                onCreateComment={handleCreateComment}
                onResolveThread={handleResolveThread}
                onReopenThread={handleReopenThread}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* General comment input */}
      <div className="p-4 border-t bg-muted/20 flex-shrink-0">
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Globe className="h-3 w-3" />
          <span>General discussion</span>
        </div>
        <CommentInput
          classId={classId}
          onSubmit={handleSubmitGeneralComment}
          placeholder="Start a new discussion..."
          isSubmitting={isSubmittingGeneral || isCreatingThread}
        />
      </div>
    </div>
  );
}
