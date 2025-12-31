"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, MessageSquareOff, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useThreadContext } from "./thread-context";

export function ThreadStatusToggle() {
  const {
    canShowComments,
    sidebarOpen,
    setSidebarOpen,
    activeThreadCount,
    disputeCount,
    isCommentsVisible,
    toggleCommentsVisibility,
    problemId,
    classId
  } = useThreadContext();

  // If threading isn't configured for this editor, don't show anything
  if (!problemId || !classId) return null;

  return (
    <div className="flex items-center gap-1">
      {/* Global visibility toggle */}
      <Button
        size="sm"
        variant={isCommentsVisible ? "ghost" : "secondary"}
        onClick={toggleCommentsVisibility}
        className="h-7 w-7 p-0"
        title={isCommentsVisible ? "Hide comments" : "Show comments"}
      >
        {isCommentsVisible ? (
          <MessageCircle className="h-3.5 w-3.5" />
        ) : (
          <MessageSquareOff className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Sidebar toggle */}
      {isCommentsVisible && (
        <Button
          size="sm"
          variant={sidebarOpen ? "secondary" : "ghost"}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          {sidebarOpen ? (
            <PanelRightClose className="w-3.5 h-3.5" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5" />
          )}
          {activeThreadCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {activeThreadCount}
            </Badge>
          )}
          {disputeCount > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {disputeCount}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}

