"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CornerDownLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RefObject } from "react";

interface MathEditPopoverProps {
  editingMath: {
    latex: string;
    pos: number;
    type: "inline" | "block";
  };
  popoverPosition: {
    top: number;
    left: number;
    side: "top" | "bottom";
  };
  editValue: string;
  onEditValueChange: (value: string) => void;
  onFinishEdit: () => void;
  onCancelEdit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function MathEditPopover({
  editingMath,
  popoverPosition,
  editValue,
  onEditValueChange,
  onFinishEdit,
  onCancelEdit,
  inputRef,
}: MathEditPopoverProps) {
  return (
    <div
      className={cn(
        "fixed z-[100] -translate-x-1/2 w-full max-w-[400px] animate-in fade-in zoom-in duration-200",
        popoverPosition.side === "top"
          ? "slide-in-from-bottom-2"
          : "slide-in-from-top-2",
      )}
      style={{ top: popoverPosition.top, left: popoverPosition.left }}
    >
      <div className="bg-popover border border-border rounded-lg shadow-xl p-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1 border border-border/50">
          <span className="text-muted-foreground font-mono text-[10px] select-none opacity-50">
            {editingMath.type === "inline" ? "$" : "$$"}
          </span>
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onFinishEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="h-6 bg-transparent border-none focus-visible:ring-0 text-foreground font-mono text-sm flex-1 min-w-0 px-0"
            placeholder="LaTeX..."
          />
          <span className="text-muted-foreground font-mono text-[10px] select-none opacity-50">
            {editingMath.type === "inline" ? "$" : "$$"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={onFinishEdit} size="icon-sm" className="h-7 w-7">
            <CornerDownLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={onCancelEdit}
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

