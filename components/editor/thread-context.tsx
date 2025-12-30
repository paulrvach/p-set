"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ============================================
// TYPES
// ============================================

export interface GutterThread {
  blockId: string;
  type: "comment" | "dispute";
  status: "open" | "resolved";
  commentCount: number;
}

export interface ThreadData {
  _id: Id<"threads">;
  blockId: string;
  type: "comment" | "dispute";
  status: "open" | "resolved";
  creatorName: string;
  commentCount: number;
  createdAt: number;
  isArchived: boolean;
}

interface ThreadContextValue {
  // Config (from provider)
  problemId: Id<"problems"> | undefined;
  classId: Id<"classes"> | undefined;
  
  // State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedBlockId: string | null;
  newThreadBlockId: string | null;
  isCreatingThread: boolean;
  
  // Data
  threads: ThreadData[] | undefined;
  gutterThreads: GutterThread[];
  activeThreadCount: number;
  disputeCount: number;
  canShowComments: boolean;
  
  // Actions
  selectBlock: (blockId: string | null) => void;
  openNewThread: (blockId: string) => void;
  createThread: (
    type: "comment" | "dispute",
    contentJson: any,
    mentions: Id<"userProfiles">[]
  ) => Promise<void>;
  cancelNewThread: () => void;
  closeSidebar: () => void;
}

// ============================================
// CONTEXT
// ============================================

const ThreadContext = createContext<ThreadContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface ThreadProviderProps {
  children: ReactNode;
  problemId?: Id<"problems">;
  classId?: Id<"classes">;
  showComments?: boolean;
}

export function ThreadProvider({
  children,
  problemId,
  classId,
  showComments = true,
}: ThreadProviderProps) {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newThreadBlockId, setNewThreadBlockId] = useState<string | null>(null);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  // Query threads if we have a problemId
  const threads = useQuery(
    api.threads.listThreadsForProblem,
    problemId ? { problemId } : "skip"
  ) as ThreadData[] | undefined;

  // Create thread mutation
  const createThreadMutation = useMutation(api.threads.createThread);

  // Derived values
  const canShowComments = showComments && !!problemId && !!classId;

  const gutterThreads = useMemo<GutterThread[]>(() => {
    if (!threads) return [];
    return threads.map((t) => ({
      blockId: t.blockId,
      type: t.type,
      status: t.status,
      commentCount: t.commentCount,
    }));
  }, [threads]);

  const activeThreadCount = useMemo(() => {
    if (!threads) return 0;
    return threads.filter((t) => t.status === "open" && !t.isArchived).length;
  }, [threads]);

  const disputeCount = useMemo(() => {
    if (!threads) return 0;
    return threads.filter((t) => t.type === "dispute" && t.status === "open").length;
  }, [threads]);

  // Actions
  const selectBlock = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId);
    if (blockId) {
      setSidebarOpen(true);
    }
  }, []);

  const openNewThread = useCallback((blockId: string) => {
    setNewThreadBlockId(blockId);
    setSelectedBlockId(blockId);
    setSidebarOpen(true);
  }, []);

  const createThread = useCallback(
    async (
      type: "comment" | "dispute",
      contentJson: any,
      mentions: Id<"userProfiles">[]
    ) => {
      if (!problemId || !newThreadBlockId) return;

      setIsCreatingThread(true);
      try {
        await createThreadMutation({
          problemId,
          blockId: newThreadBlockId,
          type,
          initialComment: {
            contentJson,
            mentions,
          },
        });
        setNewThreadBlockId(null);
      } catch (error) {
        console.error("Failed to create thread:", error);
        throw error;
      } finally {
        setIsCreatingThread(false);
      }
    },
    [problemId, newThreadBlockId, createThreadMutation]
  );

  const cancelNewThread = useCallback(() => {
    setNewThreadBlockId(null);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Context value
  const value = useMemo<ThreadContextValue>(
    () => ({
      // Config
      problemId,
      classId,
      // State
      sidebarOpen,
      setSidebarOpen,
      selectedBlockId,
      newThreadBlockId,
      isCreatingThread,
      // Data
      threads,
      gutterThreads,
      activeThreadCount,
      disputeCount,
      canShowComments,
      // Actions
      selectBlock,
      openNewThread,
      createThread,
      cancelNewThread,
      closeSidebar,
    }),
    [
      problemId,
      classId,
      sidebarOpen,
      selectedBlockId,
      newThreadBlockId,
      isCreatingThread,
      threads,
      gutterThreads,
      activeThreadCount,
      disputeCount,
      canShowComments,
      selectBlock,
      openNewThread,
      createThread,
      cancelNewThread,
      closeSidebar,
    ]
  );

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useThreadContext(): ThreadContextValue {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error("useThreadContext must be used within a ThreadProvider");
  }
  return context;
}

// Optional hook that doesn't throw - useful for components that may be used outside provider
export function useThreadContextOptional(): ThreadContextValue | null {
  return useContext(ThreadContext);
}

