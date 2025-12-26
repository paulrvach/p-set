"use client";

import { useState, useRef, useEffect } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Button } from "@/components/ui/button";
import { CornerDownLeft, X, Type, Clock, Save } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface EnhancedMathEditorProps {
  content: any;
  onChange?: (json: any) => void;
  onSave?: () => void;
  editable?: boolean;
  className?: string;
  lastSaved?: number | null;
  isSaving?: boolean;
}

export function EnhancedMathEditor({
  content,
  onChange,
  onSave,
  editable = true,
  className = "",
  lastSaved,
  isSaving = false,
}: EnhancedMathEditorProps) {
  const [editingMath, setEditingMath] = useState<{
    latex: string;
    pos: number;
    type: "inline" | "block";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  const handleUpdate = (json: any) => {
    if (onChange) onChange(json);
    if (editorRef.current) {
      setWordCount(editorRef.current.storage.starterKit?.words || 0);
    }
  };

  // Focus input when editing starts
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
        editor.commands.updateInlineMath({
          latex: editValue,
          pos: editingMath.pos,
        });
      } else {
        editor.commands.updateBlockMath({
          latex: editValue,
          pos: editingMath.pos,
        });
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
    <div className="flex flex-col h-full relative">
      {editingMath && (
        <div className="relative top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg animate-in fade-in zoom-in duration-200">
          <div className="bg-popover border border-border rounded-xl shadow-2xl p-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 border border-border">
              <span className="text-muted-foreground font-mono text-xs select-none">
                {editingMath.type === "inline" ? "$" : "$$"}
              </span>
              <input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFinishEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="bg-transparent border-none outline-none text-foreground font-mono text-sm flex-1 min-w-0"
                placeholder="Enter LaTeX..."
              />
              <span className="text-muted-foreground font-mono text-xs select-none">
                {editingMath.type === "inline" ? "$" : "$$"}
              </span>
            </div>
            <Button
              onClick={handleFinishEdit}
              size="sm"
              className="bg-primary hover:bg-primary/90 rounded-lg px-3 flex items-center gap-2 h-9"
            >
              Done
              <CornerDownLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={handleCancelEdit}
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
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
        />
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 border-t border-border bg-muted px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            <span>{wordCount} words</span>
          </div>
          {lastSaved !== undefined && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : formatLastSaved()}</span>
            </div>
          )}
        </div>
        {onSave && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1 bg-primary hover:bg-primary/90 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        )}
      </div>
    </div>
  );
}
