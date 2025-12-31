"use client";

import { useState, useCallback } from "react";
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
// FEED COMMENT COMPONENT
// ============================================

function FeedCommentItem({
  comment,
  onAddReaction,
  onRemoveReaction,
  onHoverBlock,
  onJumpToBlock,
}: {
  comment: FeedComment;
  onAddReaction: (commentId: Id<"comments">, emoji: string) => void;
  onRemoveReaction: (commentId: Id<"comments">, emoji: string) => void;
  onHoverBlock: (blockId: string | null) => void;
  onJumpToBlock: (blockId: string) => void;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleMouseEnter = () => {
    setShowActions(true);
    if (comment.blockId) {
      onHoverBlock(comment.blockId);
    }
  };

  const handleMouseLeave = () => {
    setShowActions(false);
    setShowEmojiPicker(false);
    onHoverBlock(null);
  };

  if (comment.isDeleted) {
    return (
      <div className="py-3 px-4 border-b border-border/50">
        <p className="text-sm text-muted-foreground italic">
          This message was deleted.
        </p>
      </div>
    );
  }

  // Extract text from contentJson
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

  const isDispute = comment.threadType === "dispute";

  return (
    <div
      className={cn(
        "py-3 px-4 border-b border-border/50 transition-colors",
        showActions && "bg-muted/30"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Block Reference Badge */}
      <div className="flex items-center justify-between mb-2">
        <BlockReferenceBadge
          blockId={comment.blockId}
          isDispute={isDispute}
          onJumpToBlock={
            comment.blockId ? () => onJumpToBlock(comment.blockId!) : undefined
          }
        />
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>

      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          className={cn(
            "h-8 w-8 bg-gradient-to-br flex-shrink-0",
            getAvatarColor(comment.authorName)
          )}
        >
          <AvatarFallback className="text-white text-xs font-medium bg-transparent">
            {getInitials(comment.authorName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {comment.authorName}
            </span>
            {comment.isProfessor && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 gap-0.5 bg-amber-500/15 text-amber-600 border-amber-500/30"
              >
                <GraduationCap className="h-3 w-3" />
                Professor
              </Badge>
            )}
            {comment.threadStatus === "resolved" && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 bg-green-500/15 text-green-600"
              >
                Resolved
              </Badge>
            )}
            {comment.editedAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-foreground mt-1 leading-relaxed">
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
            "flex items-start gap-1 transition-opacity flex-shrink-0",
            showActions ? "opacity-100" : "opacity-0"
          )}
        >
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
        </div>
      </div>
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
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
          <Filter className="h-3.5 w-3.5" />
          {labels[value]}
        </Button>
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

  if (!sidebarOpen || !problemId || !classId) return null;

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

  const activeCommentCount = allComments?.filter(
    (c) => !c.isThreadArchived && !c.isDeleted
  ).length ?? 0;

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
        {filteredComments.length === 0 ? (
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
            {filteredComments.map((comment) => (
              <FeedCommentItem
                key={comment._id}
                comment={comment}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
                onHoverBlock={setHoveredBlockId}
                onJumpToBlock={handleJumpToBlock}
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
          placeholder="Add a general comment..."
          isSubmitting={isSubmittingGeneral || isCreatingThread}
        />
      </div>
    </div>
  );
}
