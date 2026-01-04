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
  blockId: string | null;
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
  hoveredBlockId: string | null;
  setHoveredBlockId: (id: string | null) => void;
  newThreadBlockId: string | null;
  newThreadPosition: { x: number; y: number } | null;
  isCreatingThread: boolean;
  isCommentsVisible: boolean;
  toggleCommentsVisibility: () => void;

  // Data
  threads: ThreadData[] | undefined;
  gutterThreads: GutterThread[];
  activeThreadCount: number;
  disputeCount: number;
  canShowComments: boolean;

  // Actions
  selectBlock: (blockId: string | null) => void;
  openNewThread: (blockId: string, position: { x: number; y: number }) => void;
  createThread: (
    type: "comment" | "dispute",
    contentJson: any,
    mentions: Id<"userProfiles">[]
  ) => Promise<void>;
  createGeneralThread: (
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
  const [hoveredBlockId, setHoveredBlockIdState] = useState<string | null>(null);
  const [newThreadBlockId, setNewThreadBlockId] = useState<string | null>(null);
  const [newThreadPosition, setNewThreadPosition] = useState<{ x: number; y: number } | null>(null);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(true);

  // Wrappers with logging
  const setSidebarOpenWithLog = useCallback((open: boolean) => {
    console.log("[ThreadContext] setSidebarOpen:", open);
    setSidebarOpen(open);
  }, []);

  const setHoveredBlockId = useCallback((id: string | null) => {
    if (id !== hoveredBlockId) {
      console.log("[ThreadContext] setHoveredBlockId:", id);
      setHoveredBlockIdState(id);
    }
  }, [hoveredBlockId]);

  const toggleCommentsVisibility = useCallback(() => {
    console.log("[ThreadContext] toggleCommentsVisibility:", !isCommentsVisible);
    setIsCommentsVisible((prev) => !prev);
  }, [isCommentsVisible]);

  // Query threads if we have a problemId
  const threads = useQuery(
    api.threads.listThreadsForProblem,
    problemId ? { problemId } : "skip"
  ) as ThreadData[] | undefined;

  // Create thread mutation
  const createThreadMutation = useMutation(api.threads.createThread);

  // Derived values
  const canShowComments = isCommentsVisible && showComments && !!problemId && !!classId;

  const gutterThreads = useMemo<GutterThread[]>(() => {
    if (!threads) return [];
    // Only include threads with a blockId (not general comments)
    return threads
      .filter((t) => t.blockId !== null)
      .map((t) => ({
        blockId: t.blockId as string,
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
    return threads.filter((t) => t.type === "dispute" && t.status === "open")
      .length;
  }, [threads]);

  // Actions
  const selectBlock = useCallback((blockId: string | null) => {
    console.log("[ThreadContext] selectBlock:", blockId);
    setSelectedBlockId(blockId);
    if (blockId) {
      setSidebarOpen(true);
    }
  }, []);

  const openNewThread = useCallback((blockId: string, position: { x: number; y: number }) => {
    console.log("[ThreadContext] openNewThread:", blockId, position);
    setNewThreadBlockId(blockId);
    setNewThreadPosition(position);
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

      console.log("[ThreadContext] createThread:", { type, blockId: newThreadBlockId });
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
        setNewThreadPosition(null);
      } catch (error) {
        console.error("[ThreadContext] Failed to create thread:", error);
        throw error;
      } finally {
        setIsCreatingThread(false);
      }
    },
    [problemId, newThreadBlockId, createThreadMutation]
  );

  const createGeneralThread = useCallback(
    async (contentJson: any, mentions: Id<"userProfiles">[]) => {
      if (!problemId) return;

      console.log("[ThreadContext] createGeneralThread (no blockId)");
      setIsCreatingThread(true);
      try {
        await createThreadMutation({
          problemId,
          // blockId is omitted for general comments
          type: "comment",
          initialComment: {
            contentJson,
            mentions,
          },
        });
      } catch (error) {
        console.error("[ThreadContext] Failed to create general thread:", error);
        throw error;
      } finally {
        setIsCreatingThread(false);
      }
    },
    [problemId, createThreadMutation]
  );

  const cancelNewThread = useCallback(() => {
    console.log("[ThreadContext] cancelNewThread");
    setNewThreadBlockId(null);
    setNewThreadPosition(null);
  }, []);

  const closeSidebar = useCallback(() => {
    console.log("[ThreadContext] closeSidebar");
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
      setSidebarOpen: setSidebarOpenWithLog,
      selectedBlockId,
      hoveredBlockId,
      setHoveredBlockId,
      newThreadBlockId,
      newThreadPosition,
      isCreatingThread,
      isCommentsVisible,
      toggleCommentsVisibility,
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
      createGeneralThread,
      cancelNewThread,
      closeSidebar,
    }),
    [
      problemId,
      classId,
      sidebarOpen,
      setSidebarOpenWithLog,
      selectedBlockId,
      hoveredBlockId,
      setHoveredBlockId,
      newThreadBlockId,
      newThreadPosition,
      isCreatingThread,
      isCommentsVisible,
      toggleCommentsVisibility,
      threads,
      gutterThreads,
      activeThreadCount,
      disputeCount,
      canShowComments,
      selectBlock,
      openNewThread,
      createThread,
      createGeneralThread,
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
