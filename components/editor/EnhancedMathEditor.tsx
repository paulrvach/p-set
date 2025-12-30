"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";
import { CornerDownLeft, X, Type, Clock, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useBlockHighlight } from "./CommentGutter";
import { EditorComments } from "./EditorComments";
import { useThreadContextOptional } from "./thread-context";

// ============================================
// PROPS
// ============================================

interface EnhancedMathEditorProps {
  content: any;
  onChange?: (json: any) => void;
  onSave?: () => void;
  editable?: boolean;
  className?: string;
  lastSaved?: number | null;
  isSaving?: boolean;
  footerActions?: ReactNode;
}

// ============================================
// ENHANCED MATH EDITOR
// ============================================

export function EnhancedMathEditor({
  content,
  onChange,
  onSave,
  editable = true,
  className = "",
  lastSaved,
  isSaving = false,
  footerActions,
}: EnhancedMathEditorProps) {
  // Math editing state (editor-specific)
  const [editingMath, setEditingMath] = useState<{
    latex: string;
    pos: number;
    type: "inline" | "block";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
    side: "top" | "bottom";
  } | null>(null);
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Get thread context (optional, if wrapped)
  const threadContext = useThreadContextOptional();
  const selectedBlockId = threadContext?.selectedBlockId ?? null;
  const canShowComments = threadContext?.canShowComments ?? false;

  // Apply block highlight
  useBlockHighlight(editorRef.current, selectedBlockId);

  const updatePopoverPosition = () => {
    if (!editingMath || !editorRef.current) return;

    const editor = editorRef.current;
    const { pos } = editingMath;

    try {
      const dom = editor.view.nodeDOM(pos) as HTMLElement;
      if (!dom) return;

      const rect = dom.getBoundingClientRect();
      const popoverHeight = 60;
      const margin = 12;
      const headerHeight = 60;

      let top = rect.top - popoverHeight - margin;
      let side: "top" | "bottom" = "top";

      if (top < headerHeight + margin) {
        top = rect.bottom + margin;
        side = "bottom";
      }

      setPopoverPosition({
        top,
        left: rect.left + rect.width / 2,
        side,
      });
    } catch (e) {
      console.error("Failed to calculate math popover position", e);
    }
  };

  useEffect(() => {
    if (editingMath) {
      updatePopoverPosition();
      const handleScroll = () => updatePopoverPosition();
      const handleResize = () => updatePopoverPosition();
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", handleScroll);
      }
      window.addEventListener("resize", handleResize);
      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener("scroll", handleScroll);
        }
        window.removeEventListener("resize", handleResize);
      };
    } else {
      setPopoverPosition(null);
    }
  }, [editingMath]);

  const handleUpdate = (json: any) => {
    if (onChange) onChange(json);
    if (editorRef.current) {
      setWordCount(editorRef.current.storage.starterKit?.words || 0);
    }
  };

  useEffect(() => {
    if (editingMath && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMath]);

  const handleMathEdit = (data: { latex: string; pos: number; type: "inline" | "block" }) => {
    setEditingMath(data);
    setEditValue(data.latex);
  };

  const handleFinishEdit = () => {
    if (editorRef.current && editingMath) {
      const editor = editorRef.current;
      if (editingMath.type === "inline") {
        editor.commands.updateInlineMath({ latex: editValue, pos: editingMath.pos });
      } else {
        editor.commands.updateBlockMath({ latex: editValue, pos: editingMath.pos });
      }
      setEditingMath(null);
      editor.commands.focus();
    }
  };

  const handleCancelEdit = () => {
    setEditingMath(null);
    if (editorRef.current) editorRef.current.commands.focus();
  };

  const formatLastSaved = () => {
    if (!lastSaved) return "Never saved";
    const now = Date.now();
    const diff = now - lastSaved;
    if (diff < 60000) return "Saved just now";
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
    return `Saved ${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      {/* Math edit popover */}
      {editingMath && popoverPosition && (
        <div
          className={cn(
            "fixed z-[100] -translate-x-1/2 w-full max-w-[400px] animate-in fade-in zoom-in duration-200",
            popoverPosition.side === "top" ? "slide-in-from-bottom-2" : "slide-in-from-top-2"
          )}
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
          <div className="bg-popover border border-border rounded-lg shadow-xl p-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1 border border-border/50">
              <span className="text-muted-foreground font-mono text-[10px] select-none opacity-50">
                {editingMath.type === "inline" ? "$" : "$$"}
              </span>
              <Input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFinishEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="h-6 bg-transparent border-none focus-visible:ring-0 text-foreground font-mono text-sm flex-1 min-w-0 px-0"
                placeholder="LaTeX..."
              />
              <span className="text-muted-foreground font-mono text-[10px] select-none opacity-50">
                {editingMath.type === "inline" ? "$" : "$$"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={handleFinishEdit} size="icon-sm" className="h-7 w-7">
                <CornerDownLeft className="w-3.5 h-3.5" />
              </Button>
              <Button onClick={handleCancelEdit} variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Editor with optional comments */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {threadContext && (
          <EditorComments
            editor={editorRef.current}
            scrollContainer={scrollContainerRef.current}
          />
        )}

        {/* Editor */}
        <div className={cn("h-full", canShowComments && "pl-8")}>
          <SimpleEditor
            content={content}
            onChange={handleUpdate}
            onSave={onSave}
            editable={editable}
            className={cn("", className)}
            onMathEdit={handleMathEdit}
            onEditorReady={(editor) => {
              editorRef.current = editor;
            }}
            onScrollContainerReady={(el) => {
              scrollContainerRef.current = el;
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            <span className="font-medium">{wordCount} words</span>
          </div>
          {lastSaved !== undefined && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : formatLastSaved()}</span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {footerActions}

          {onSave && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSave}
              disabled={isSaving}
              className="h-7 gap-1.5 px-2 text-xs hover:bg-accent/50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
