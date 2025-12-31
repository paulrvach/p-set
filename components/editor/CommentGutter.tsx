"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { MessageCircle, AlertTriangle, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useThreadContext, type GutterThread } from "./thread-context";

// ============================================
// TYPES
// ============================================

interface BlockPosition {
  blockId: string;
  top: number;
  height: number;
  left: number;
  right: number;
}

interface CommentGutterProps {
  editor: Editor | null;
  scrollContainer: HTMLElement | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getBlockPositions(editor: Editor): BlockPosition[] {
  const positions: BlockPosition[] = [];
  const { doc } = editor.state;

  doc.descendants((node, pos) => {
    // Check if this node has a data-block-id attribute
    const blockId = node.attrs?.["data-block-id"];
    if (!blockId) return true; // Continue traversing

    try {
      const dom = editor.view.nodeDOM(pos) as HTMLElement;
      if (dom && dom.getBoundingClientRect) {
        const rect = dom.getBoundingClientRect();
        positions.push({
          blockId,
          top: rect.top,
          height: rect.height,
          right: rect.right,
          left: rect.left,
        });
      }
    } catch (e) {
      // Node might not be rendered yet
    }

    return true; // Continue traversing
  });

  return positions;
}

// ============================================
// GUTTER MARKER COMPONENT
// ============================================

function GutterMarker({
  blockId,
  top,
  left,
  thread,
  isSelected,
  isHovered,
  onSelect,
  onAddComment,
  onMouseEnter,
  onMouseLeave,
}: {
  blockId: string;
  top: number;
  left: number;
  thread: GutterThread | undefined;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onAddComment: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const hasThread = !!thread;
  const isDispute = thread?.type === "dispute";
  const isResolved = thread?.status === "resolved";

  // Show add button on hover if no thread exists
  if (!hasThread) {
    return (
      <div
        className={cn(
          "absolute w-6 flex items-center justify-center transition-opacity duration-150 pointer-events-auto",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{ top, left }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Tooltip>
          <TooltipTrigger
            onClick={onAddComment}
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded",
              "bg-primary/10 text-primary hover:bg-primary/20",
              "transition-colors"
            )}
          >
            <Plus className="w-3 h-3" />
          </TooltipTrigger>
          <TooltipContent side="right">Add comment</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Show thread indicator
  return (
    <div
      className="absolute w-6 flex items-center justify-center pointer-events-auto"
      style={{ top, left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Tooltip>
        <TooltipTrigger
          onClick={onSelect}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded transition-all",
            isDispute && !isResolved
              ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
              : isResolved
              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
              : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
            isSelected && "ring-2 ring-primary/50"
          )}
        >
          {isDispute ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <MessageCircle className="w-3 h-3" />
          )}
        </TooltipTrigger>
        <TooltipContent side="right">
          {isDispute ? "View dispute" : `${thread.commentCount} comment${thread.commentCount !== 1 ? "s" : ""}`}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CommentGutter({
  editor,
  scrollContainer,
}: CommentGutterProps) {
  // Get thread-related values from context
  const {
    gutterThreads,
    selectedBlockId,
    hoveredBlockId,
    setHoveredBlockId,
    selectBlock,
    openNewThread,
  } = useThreadContext();

  const [blockPositions, setBlockPositions] = useState<BlockPosition[]>([]);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Create a map of blockId -> thread for quick lookup
  const threadMap = new Map<string, GutterThread>();
  gutterThreads.forEach((t) => threadMap.set(t.blockId, t));

  // Update block positions
  const updatePositions = useCallback(() => {
    if (!editor || !scrollContainer || !gutterRef.current) return;

    const positions = getBlockPositions(editor);
    const gutterRect = gutterRef.current.getBoundingClientRect();

    // Adjust positions relative to gutter
    const adjustedPositions = positions.map((p) => ({
      ...p,
      top: p.top - gutterRect.top,
      left: p.right - gutterRect.left + 8, // Position 8px to the right of the block's actual edge
    }));

    setBlockPositions(adjustedPositions);
  }, [editor, scrollContainer]);

  // Update positions on editor changes and scroll
  useEffect(() => {
    if (!editor) return;

    // Initial update
    updatePositions();

    // Update on editor transactions
    const updateHandler = () => {
      requestAnimationFrame(updatePositions);
    };

    editor.on("transaction", updateHandler);

    // Update on scroll
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", updatePositions);
      window.addEventListener("resize", updatePositions);
    }

    return () => {
      editor.off("transaction", updateHandler);
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", updatePositions);
        window.removeEventListener("resize", updatePositions);
      }
    };
  }, [editor, scrollContainer, updatePositions]);

  // Handle mouse move on editor to track hovered blocks
  useEffect(() => {
    if (!editor || !scrollContainer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientY } = e;
      
      // Find which block the mouse is over
      let foundBlockId: string | null = null;
      for (const pos of blockPositions) {
        const absoluteTop = pos.top + (gutterRef.current?.getBoundingClientRect().top ?? 0);
        if (clientY >= absoluteTop && clientY <= absoluteTop + pos.height) {
          foundBlockId = pos.blockId;
          break;
        }
      }

      if (foundBlockId !== hoveredBlockId) {
        setHoveredBlockId(foundBlockId);
      }
    };

    const handleMouseLeave = () => {
      setHoveredBlockId(null);
    };

    scrollContainer.addEventListener("mousemove", handleMouseMove);
    scrollContainer.addEventListener("mouseleave", handleMouseLeave);

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const blockElement = target.closest("[data-data-block-id]") as HTMLElement;
      
      if (blockElement) {
        const blockId = blockElement.getAttribute("data-data-block-id");
        if (blockId) {
          // If there's an existing thread, select it. If not, open new thread input.
          const hasThread = threadMap.has(blockId);
          if (hasThread) {
            selectBlock(blockId);
          } else {
            openNewThread(blockId);
          }
        }
      }
    };

    scrollContainer.addEventListener("click", handleClick);

    return () => {
      scrollContainer.removeEventListener("mousemove", handleMouseMove);
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave);
      scrollContainer.removeEventListener("click", handleClick);
    };
  }, [editor, scrollContainer, blockPositions, hoveredBlockId, setHoveredBlockId, selectBlock, openNewThread, threadMap]);

  if (!editor) return null;

  return (
    <div
      ref={gutterRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {blockPositions.map((pos) => (
        <GutterMarker
          key={pos.blockId}
          blockId={pos.blockId}
          top={pos.top}
          left={pos.left}
          thread={threadMap.get(pos.blockId)}
          isSelected={selectedBlockId === pos.blockId}
          isHovered={hoveredBlockId === pos.blockId}
          onSelect={() => selectBlock(pos.blockId)}
          onAddComment={() => openNewThread(pos.blockId)}
          onMouseEnter={() => setHoveredBlockId(pos.blockId)}
          onMouseLeave={() => setHoveredBlockId(null)}
        />
      ))}
    </div>
  );
}

// ============================================
// HIGHLIGHT EXTENSION FOR HOVERED BLOCK
// ============================================

export function useBlockHighlight(
  editor: any | null,
  selectedBlockId: string | null,
  hoveredBlockId: string | null,
) {
  const { gutterThreads } = useThreadContext();

  useEffect(() => {
    if (!editor) return;

    // Helper to get color tone based on thread info
    const getHighlightClasses = (blockId: string, isSelected: boolean) => {
      const thread = gutterThreads.find((t) => t.blockId === blockId);
      
      if (!thread) {
        return isSelected ? ["bg-accent/20", "border-accent/30", "border"] : ["border-transparent", "border"];
      }

      const isDispute = thread.type === "dispute" && thread.status !== "resolved";
      const isResolved = thread.status === "resolved";

      if (isSelected) {
        if (isDispute) return ["bg-red-500/15", "border-red-500/40", "rounded-sm", 'text-red-500'];
        if (isResolved) return ["bg-green-500/15", "border-green-500/40", "rounded-sm", 'text-green-500'];
        return ["bg-blue-500/15", "border-blue-500/40", "rounded-sm", 'text-blue-500'];
      } else {
        // Hover state
        if (isDispute) return ["bg-red-500/5", "border-red-500/20", "rounded-sm"];
        if (isResolved) return ["bg-green-500/5", "border-green-500/20", "rounded-sm"];
        return ["bg-blue-500/5", "border-blue-500/20", "rounded-sm"];
      }
    };

    // Remove all previous highlights
    const allHighlighted = document.querySelectorAll(
      "[data-block-highlighted]",
    );
    allHighlighted.forEach((el) => {
      const element = el as HTMLElement;
      element.removeAttribute("data-block-highlighted");
      element.classList.remove(
        "bg-red-500/5",
        "text-red-500",
        "text-green-500",
        "text-blue-500",
        "bg-red-500/15",
        "bg-green-500/5",
        "bg-green-500/15",
        "bg-blue-500/5",
        "bg-blue-500/15",
        "border-red-500/20",
        "border-red-500/40",
        "border-green-500/20",
        "border-green-500/40",
        "border-blue-500/20",
        "border-blue-500/40",
        "bg-accent/20",
        "border-accent/30",
        "border-transparent",
        "border",
        "shadow-sm",
        "rounded-sm"
      );
    });

    // Apply hover highlight (only if not selected)
    if (hoveredBlockId && hoveredBlockId !== selectedBlockId) {
      const element = document.querySelector(
        `[data-data-block-id="${hoveredBlockId}"]`,
      ) as HTMLElement;
      if (element) {
        element.setAttribute("data-block-highlighted", "hover");
        element.classList.add(...getHighlightClasses(hoveredBlockId, false));
      }
    }

    // Apply selection highlight (higher priority)
    if (selectedBlockId) {
      const element = document.querySelector(
        `[data-data-block-id="${selectedBlockId}"]`,
      ) as HTMLElement;
      if (element) {
        element.setAttribute("data-block-highlighted", "selected");
        element.classList.add(...getHighlightClasses(selectedBlockId, true));
      }
    }
  }, [editor, selectedBlockId, hoveredBlockId, gutterThreads]);
}



// ============================================
// UTILITY: Extract all block IDs from editor content
// ============================================

export function getBlockIdsFromEditor(editor: Editor): string[] {
  const blockIds: string[] = [];
  const { doc } = editor.state;

  doc.descendants((node) => {
    const blockId = node.attrs?.["data-block-id"];
    if (blockId) {
      blockIds.push(blockId);
    }
    return true;
  });

  return blockIds;
}
