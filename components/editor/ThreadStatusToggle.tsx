"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useThreadContext } from "./thread-context";

export function ThreadStatusToggle() {
  const {
    canShowComments,
    sidebarOpen,
    setSidebarOpen,
    activeThreadCount,
    disputeCount,
  } = useThreadContext();

  if (!canShowComments) return null;

  return (
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
      <MessageCircle className="w-3.5 h-3.5" />
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
  );
}

