"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { MessageSquareText, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useThreadContext, type GutterThread } from "./thread-context";

// ============================================
// DESIGN SYSTEM: MARKER VARIANTS
// ============================================

const markerVariants = cva(
  "flex items-center justify-center transition-all duration-300 ease-out backdrop-blur-sm border cursor-pointer",
  {
    variants: {
      status: {
        empty: [
          "bg-card/80 border-border text-muted-foreground",
          "hover:text-primary hover:border-primary/50 hover:bg-accent",
        ],
        comment: [
          "bg-card/90 border-primary/30 text-primary shadow-sm",
          "hover:bg-accent hover:shadow-md hover:border-primary/50",
        ],
        dispute: [
          "bg-card/90 border-destructive/30 text-destructive shadow-sm",
          "hover:bg-destructive/10 hover:shadow-md hover:border-destructive/50",
        ],
        resolved: [
          "bg-card/90 border-muted-foreground/30 text-muted-foreground shadow-sm",
          "hover:bg-muted hover:shadow-md hover:border-muted-foreground/50",
        ],
      },
      size: {
        dot: "w-2 h-2  border-0 shadow-none",
        icon: "w-8 h-8  shadow-sm",
      },
      active: {
        true: "ring-2 ring-ring ring-offset-2 ring-offset-background scale-110 z-20",
        false: "scale-100",
      },
    },
    compoundVariants: [
      { status: "comment", active: true, className: "ring-primary/50" },
      { status: "dispute", active: true, className: "ring-destructive/50" },
      { status: "resolved", active: true, className: "ring-muted-foreground/50" },
      { status: "empty", active: true, className: "ring-primary/50" },
      { status: "empty", size: "dot", className: "bg-muted-foreground/30" },
    ],
    defaultVariants: {
      status: "empty",
      size: "icon",
      active: false,
    },
  }
);

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
  top,
  thread,
  isSelected,
  isHovered,
  isMarkerHovered,
  onSelect,
  onAddComment,
  setMarkerHover,
}: {
  top: number;
  thread: GutterThread | undefined;
  isSelected: boolean;
  isHovered: boolean;
  isMarkerHovered: boolean;
  onSelect: () => void;
  onAddComment: (position: { x: number; y: number }) => void;
  setMarkerHover: (hovering: boolean) => void;
}) {
  const hasThread = !!thread;
  const isDispute = thread?.type === "dispute";
  const isResolved = thread?.status === "resolved";

  // Determine styling variant
  let status: VariantProps<typeof markerVariants>["status"] = "empty";
  if (hasThread) {
    if (isResolved) status = "resolved";
    else if (isDispute) status = "dispute";
    else status = "comment";
  }

  // Visual Logic:
  // 1. If it has a thread, show the icon.
  // 2. If it's selected, show the icon.
  // 3. If the user hovers the TEXT block, show the icon.
  // 4. If the user hovers the GUTTER marker, show the icon.
  // 5. Otherwise, show a tiny "ghost dot" to indicate alignment.
  const showFullIcon = hasThread || isSelected || isHovered || isMarkerHovered;

  const handleClick = (e: React.MouseEvent) => {
    if (hasThread) {
      onSelect();
    } else {
      onAddComment({ x: e.clientX, y: e.clientY });
    }
  };

  // Tooltip content
  const tooltipContent = !hasThread
    ? "Add comment"
    : isDispute && !isResolved
      ? "View dispute"
      : `${thread.commentCount} comment${thread.commentCount !== 1 ? "s" : ""}`;

  // Icon to display
  const IconComponent = !hasThread
    ? Plus
    : isDispute && !isResolved
      ? AlertCircle
      : isResolved
        ? CheckCircle2
        : MessageSquareText;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 w-8 h-8 transition-all duration-300 pointer-events-auto flex items-center justify-center"
      style={{ top: top + 4 }} // Slight offset to align with text cap-height
      onMouseEnter={() => setMarkerHover(true)}
      onMouseLeave={() => setMarkerHover(false)}
    >
      <Tooltip>
        <TooltipTrigger
          onClick={handleClick}
          className={cn(
            markerVariants({
              status,
              size: showFullIcon ? "icon" : "dot",
              active: isSelected,
            })
          )}
        >
          {/* Icon - Only render if expanding */}
          {showFullIcon && (
            <span className="animate-in fade-in zoom-in duration-200">
              <IconComponent className="w-4 h-4" strokeWidth={isSelected ? 2.5 : 2} />
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="left" className="px-3 py-1.5 text-xs font-medium">
          {tooltipContent}
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
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
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
      const { clientY, clientX } = e;
      if (!scrollContainer || !gutterRef.current) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      
      // Horizontal range: from left of editor to right of gutter area
      // We allow some buffer to the right to keep the marker visible while hovering it
      const isWithinHorizontalRange = 
        clientX >= containerRect.left && 
        clientX <= containerRect.right + 80;

      if (!isWithinHorizontalRange) {
        if (hoveredBlockId !== null) {
          setHoveredBlockId(null);
        }
        return;
      }
      
      // Find which block the mouse is over
      let foundBlockId: string | null = null;
      const gutterTop = gutterRef.current.getBoundingClientRect().top;

      for (const pos of blockPositions) {
        const absoluteTop = pos.top + gutterTop;
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
      // With window tracking, we handle leave via horizontal bounds in mousemove
      // But we still want to clear if the mouse leaves the browser window entirely
    };

    window.addEventListener("mousemove", handleMouseMove);
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
            openNewThread(blockId, { x: e.clientX, y: e.clientY });
          }
        }
      }
    };

    scrollContainer.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave);
      scrollContainer.removeEventListener("click", handleClick);
    };
  }, [editor, scrollContainer, blockPositions, hoveredBlockId, setHoveredBlockId, selectBlock, openNewThread, threadMap]);

  if (!editor) return null;

  return (
    <div
      ref={gutterRef}
      className={cn(
        "absolute inset-y-0 right-0 w-16 z-10 select-none print:hidden",
        "bg-muted/50",
        "border-l border-border"
      )}
    >
      {blockPositions.map((pos) => (
        <GutterMarker
          key={pos.blockId}
          top={pos.top}
          thread={threadMap.get(pos.blockId)}
          isSelected={selectedBlockId === pos.blockId}
          isHovered={hoveredBlockId === pos.blockId}
          isMarkerHovered={hoveredMarkerId === pos.blockId}
          onSelect={() => selectBlock(pos.blockId)}
          onAddComment={(position) => openNewThread(pos.blockId, position)}
          setMarkerHover={(hovering) =>
            setHoveredMarkerId(hovering ? pos.blockId : null)
          }
        />
      ))}
    </div>
  );
}

// ============================================
// HIGHLIGHT VARIANTS (Left-accent style)
// ============================================

const blockHighlightVariants = cva(
  "transition-all duration-200 border-l-[3px]",
  {
    variants: {
      type: {
        none: "border-transparent bg-transparent",
        comment: "border-primary bg-primary/10",
        dispute: "border-destructive bg-destructive/10",
        resolved: "border-muted-foreground bg-muted",
      },
      state: {
        idle: "opacity-0",
        hover: "opacity-60",
        selected: "opacity-100",
      },
    },
    compoundVariants: [
      // When selected, add a subtle shadow for depth
      { state: "selected", className: "shadow-sm" },
    ],
    defaultVariants: {
      type: "none",
      state: "idle",
    },
  }
);

const ALL_HIGHLIGHT_CLASSES = [
  // Comment (primary)
  "border-primary",
  "bg-primary/10",
  // Dispute (destructive)
  "border-destructive",
  "bg-destructive/10",
  // Resolved (muted)
  "border-muted-foreground",
  "bg-muted",
  // Shared
  "border-transparent",
  "bg-transparent",
  "border-l-[3px]",
  "transition-all",
  "duration-200",
  "opacity-0",
  "opacity-60",
  "opacity-100",
  "shadow-sm",
];

export function useBlockHighlight(
  editor: any | null,
  selectedBlockId: string | null,
  hoveredBlockId: string | null,
) {
  const { gutterThreads } = useThreadContext();

  useEffect(() => {
    if (!editor) return;

    // Helper to determine block type
    const getBlockType = (
      blockId: string,
    ): "none" | "dispute" | "resolved" | "comment" => {
      const thread = gutterThreads.find((t) => t.blockId === blockId);

      if (!thread) return "none";

      const isDispute =
        thread.type === "dispute" && thread.status !== "resolved";
      const isResolved = thread.status === "resolved";

      if (isDispute) return "dispute";
      if (isResolved) return "resolved";
      return "comment";
    };

    // Remove all previous highlights
    const allHighlighted = document.querySelectorAll(
      "[data-block-highlighted]",
    );
    allHighlighted.forEach((el) => {
      const element = el as HTMLElement;
      element.removeAttribute("data-block-highlighted");
      element.classList.remove(...ALL_HIGHLIGHT_CLASSES);
    });

    const applyHighlight = (blockId: string, state: "hover" | "selected") => {
      const element = document.querySelector(
        `[data-data-block-id="${blockId}"]`,
      ) as HTMLElement;
      if (element) {
        const type = getBlockType(blockId);
        const classes = blockHighlightVariants({ type, state }).split(" ");
        element.setAttribute("data-block-highlighted", state);
        element.classList.add(...classes.filter(Boolean));
      }
    };

    // Apply hover highlight (only if not selected)
    if (hoveredBlockId && hoveredBlockId !== selectedBlockId) {
      applyHighlight(hoveredBlockId, "hover");
    }

    // Apply selection highlight (higher priority)
    if (selectedBlockId) {
      applyHighlight(selectedBlockId, "selected");
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
