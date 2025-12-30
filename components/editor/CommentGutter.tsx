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
          "absolute left-0 w-6 flex items-center justify-center transition-opacity duration-150",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{ top }}
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
      className="absolute left-0 w-6 flex items-center justify-center"
      style={{ top }}
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
    selectBlock,
    openNewThread,
  } = useThreadContext();

  const [blockPositions, setBlockPositions] = useState<BlockPosition[]>([]);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [containerOffset, setContainerOffset] = useState(0);
  const gutterRef = useRef<HTMLDivElement>(null);

  // Create a map of blockId -> thread for quick lookup
  const threadMap = new Map<string, GutterThread>();
  gutterThreads.forEach((t) => threadMap.set(t.blockId, t));

  // Update block positions
  const updatePositions = useCallback(() => {
    if (!editor || !scrollContainer || !gutterRef.current) return;

    const positions = getBlockPositions(editor);
    const containerRect = scrollContainer.getBoundingClientRect();
    const gutterRect = gutterRef.current.getBoundingClientRect();

    // Adjust positions relative to gutter
    const adjustedPositions = positions.map((p) => ({
      ...p,
      top: p.top - gutterRect.top,
    }));

    setBlockPositions(adjustedPositions);
    setContainerOffset(containerRect.top);
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

    return () => {
      scrollContainer.removeEventListener("mousemove", handleMouseMove);
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [editor, scrollContainer, blockPositions, hoveredBlockId]);

  if (!editor) return null;

  return (
    <div
      ref={gutterRef}
      className="absolute left-0 top-0 bottom-0 w-8 pointer-events-auto"
      style={{ zIndex: 10 }}
    >
      {blockPositions.map((pos) => (
        <GutterMarker
          key={pos.blockId}
          blockId={pos.blockId}
          top={pos.top}
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
// HIGHLIGHT EXTENSION FOR SELECTED BLOCK
// ============================================

export function useBlockHighlight(
  editor: Editor | null,
  selectedBlockId: string | null
) {
  useEffect(() => {
    if (!editor) return;

    // Remove previous highlights
    const prevHighlighted = document.querySelectorAll("[data-block-highlighted]");
    prevHighlighted.forEach((el) => {
      el.removeAttribute("data-block-highlighted");
      (el as HTMLElement).style.backgroundColor = "";
    });

    // Add highlight to selected block
    if (selectedBlockId) {
      const element = document.querySelector(`[data-block-id="${selectedBlockId}"]`);
      if (element) {
        element.setAttribute("data-block-highlighted", "true");
        (element as HTMLElement).style.backgroundColor = "hsl(var(--accent) / 0.3)";
      }
    }
  }, [editor, selectedBlockId]);
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
