"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CornerDownLeft, AtSign } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface CommentInputProps {
  classId: Id<"classes">;
  onSubmit: (contentJson: any, mentions: Id<"userProfiles">[]) => Promise<void>;
  placeholder?: string;
  isSubmitting?: boolean;
  autoFocus?: boolean;
}

interface MentionUser {
  _id: Id<"userProfiles">;
  name: string;
  email: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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
// MENTION DROPDOWN
// ============================================

function MentionDropdown({
  users,
  selectedIndex,
  onSelect,
  position,
}: {
  users: MentionUser[];
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
  position: { top: number; left: number };
}) {
  if (users.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[200px] max-w-[280px]"
      style={{
        bottom: `calc(100% + 4px)`,
        left: Math.max(0, position.left - 8),
      }}
    >
      <ScrollArea className="max-h-[200px]">
        {users.map((user, index) => (
          <button
            key={user._id}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
              index === selectedIndex ? "bg-accent" : "hover:bg-muted"
            )}
            onClick={() => onSelect(user)}
          >
            <Avatar className={cn("h-6 w-6 bg-gradient-to-br", getAvatarColor(user.name))}>
              <AvatarFallback className="text-white text-[10px] font-medium bg-transparent">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CommentInput({
  classId,
  onSubmit,
  placeholder = "Reply to thread...",
  isSubmitting = false,
  autoFocus = false,
}: CommentInputProps) {
  const [value, setValue] = useState("");
  const [mentions, setMentions] = useState<Id<"userProfiles">[]>([]);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionStartPos = useRef<number | null>(null);

  // Query users for mention search
  const searchResults = useQuery(
    api.threads.searchUsersForMention,
    mentionSearch !== null && mentionSearch.length >= 1
      ? { classId, searchTerm: mentionSearch }
      : "skip"
  );

  const users = searchResults ?? [];

  // Reset selection when results change
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionSearch]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setValue(newValue);

    // Check if we're in a mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space or newline after @ (means mention is complete)
      if (!/\s/.test(textAfterAt.slice(0, textAfterAt.length))) {
        // We're in a mention
        setMentionSearch(textAfterAt);
        mentionStartPos.current = lastAtIndex;

        // Calculate position for dropdown
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          // Approximate character width
          const charWidth = 8;
          setMentionPosition({
            top: rect.top,
            left: Math.min(lastAtIndex * charWidth, rect.width - 200),
          });
        }
        return;
      }
    }

    // Not in a mention
    setMentionSearch(null);
    mentionStartPos.current = null;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (mentionSearch !== null && users.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.min(prev + 1, users.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(users[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionSearch(null);
        mentionStartPos.current = null;
        return;
      }
    }

    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey && mentionSearch === null) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Select a mention
  const selectMention = useCallback((user: MentionUser) => {
    if (mentionStartPos.current === null) return;

    const beforeMention = value.slice(0, mentionStartPos.current);
    const afterCursor = value.slice(
      mentionStartPos.current + (mentionSearch?.length ?? 0) + 1
    );

    // Insert the mention
    const newValue = `${beforeMention}@${user.name} ${afterCursor}`;
    setValue(newValue);

    // Add to mentions list
    if (!mentions.includes(user._id)) {
      setMentions([...mentions, user._id]);
    }

    // Clear mention state
    setMentionSearch(null);
    mentionStartPos.current = null;

    // Focus and set cursor position
    if (inputRef.current) {
      const newCursorPos = beforeMention.length + user.name.length + 2;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      });
    }
  }, [value, mentionSearch, mentions]);

  // Handle submit
  const handleSubmit = async () => {
    if (!value.trim() || isSubmitting) return;

    // Create a simple JSON structure for the content
    const contentJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: value.trim() }],
        },
      ],
    };

    try {
      await onSubmit(contentJson, mentions);
      setValue("");
      setMentions([]);
    } catch (error) {
      console.error("Failed to submit comment:", error);
    }
  };

  // Trigger mention manually
  const triggerMention = () => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart;
    const newValue = value.slice(0, cursorPos) + "@" + value.slice(cursorPos);
    setValue(newValue);

    // Set cursor after @
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPos + 1, cursorPos + 1);
    });

    // Start mention search
    setMentionSearch("");
    mentionStartPos.current = cursorPos;
  };

  return (
    <div className="relative">
      {/* Mention dropdown */}
      {mentionSearch !== null && users.length > 0 && (
        <MentionDropdown
          users={users}
          selectedIndex={selectedMentionIndex}
          onSelect={selectMention}
          position={mentionPosition}
        />
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 bg-muted/50 rounded-lg border p-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            autoFocus={autoFocus}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground",
              "min-h-[24px] max-h-[120px] py-1 px-1"
            )}
          />
        </div>

        <div className="flex items-center gap-1 pb-0.5">
          {/* Mention button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={triggerMention}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground"
          >
            <AtSign className="h-4 w-4" />
          </Button>

          {/* Submit button */}
          <Button
            type="button"
            size="icon-sm"
            onClick={handleSubmit}
            disabled={!value.trim() || isSubmitting}
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-[10px] text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">@</kbd> to mention
        </span>
        <span className="text-[10px] text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to send
        </span>
      </div>
    </div>
  );
}

// ============================================
// NEW THREAD INPUT (includes dispute toggle)
// ============================================

interface NewThreadInputProps {
  classId: Id<"classes">;
  problemId: Id<"problems">;
  blockId: string;
  onSubmit: (
    type: "comment" | "dispute",
    contentJson: any,
    mentions: Id<"userProfiles">[]
  ) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function NewThreadInput({
  classId,
  problemId,
  blockId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: NewThreadInputProps) {
  const [isDispute, setIsDispute] = useState(false);

  const handleSubmit = async (contentJson: any, mentions: Id<"userProfiles">[]) => {
    await onSubmit(isDispute ? "dispute" : "comment", contentJson, mentions);
  };

  return (
    <div className="p-4 bg-background border rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">New Comment</span>
        <Button variant="ghost" size="icon-sm" onClick={onCancel}>
          <span className="sr-only">Close</span>
          ×
        </Button>
      </div>

      {/* Dispute toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setIsDispute(!isDispute)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            isDispute
              ? "bg-red-500/10 text-red-500 border border-red-500/30"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              isDispute ? "bg-red-500" : "bg-muted-foreground"
            )}
          />
          Report an error
        </button>
      </div>

      {/* Input */}
      <CommentInput
        classId={classId}
        onSubmit={handleSubmit}
        placeholder={isDispute ? "Describe the error..." : "Add a comment..."}
        isSubmitting={isSubmitting}
        autoFocus
      />
    </div>
  );
}

