import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id, Doc } from "./_generated/dataModel";

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getViewerProfile(ctx: any): Promise<Doc<"userProfiles"> | null> {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) return null;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
    .first();

  return profile ?? null;
}

async function requireViewerProfile(ctx: any): Promise<Doc<"userProfiles">> {
  const profile = await getViewerProfile(ctx);
  if (!profile) throw new Error("Not authenticated");
  return profile;
}

async function requireProblemAccess(
  ctx: any,
  problemId: Id<"problems">
): Promise<{ problem: Doc<"problems">; assignment: Doc<"assignments">; klass: Doc<"classes"> }> {
  const problem = await ctx.db.get(problemId);
  if (!problem) throw new Error("Problem not found");

  const assignment = await ctx.db.get(problem.assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  const klass = await ctx.db.get(assignment.classId);
  if (!klass) throw new Error("Class not found");

  return { problem, assignment, klass };
}

async function canModerateThread(
  ctx: any,
  profile: Doc<"userProfiles">,
  classId: Id<"classes">
): Promise<boolean> {
  const klass = await ctx.db.get(classId);
  if (!klass) return false;

  // Professor can always moderate
  if (klass.professorId === profile._id) return true;

  // Check if user is a TA with resolve_dispute permission
  const crns = await ctx.db
    .query("crns")
    .withIndex("by_classId", (q: any) => q.eq("classId", classId))
    .collect();

  for (const crn of crns) {
    const membership = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId_and_userId", (q: any) =>
        q.eq("crnId", crn._id).eq("userId", profile._id)
      )
      .first();

    if (
      membership &&
      membership.status === "active" &&
      (membership.role === "ta" || membership.role === "professor") &&
      membership.permissions.includes("resolve_dispute")
    ) {
      return true;
    }
  }

  return false;
}

// ============================================
// THREAD QUERIES
// ============================================

export const listThreadsForProblem = query({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.array(
    v.object({
      _id: v.id("threads"),
      problemId: v.id("problems"),
      blockId: v.union(v.string(), v.null()),
      type: v.union(v.literal("comment"), v.literal("dispute")),
      status: v.union(v.literal("open"), v.literal("resolved")),
      isArchived: v.boolean(),
      createdBy: v.id("userProfiles"),
      createdAt: v.number(),
      resolvedBy: v.union(v.id("userProfiles"), v.null()),
      resolvedAt: v.union(v.number(), v.null()),
      creatorName: v.string(),
      commentCount: v.number(),
      latestCommentAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .collect();

    const results = await Promise.all(
      threads.map(async (thread) => {
        const creator = await ctx.db.get(thread.createdBy);
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
          .collect();

        const latestComment = comments.length > 0
          ? comments.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
          : null;

        return {
          _id: thread._id,
          problemId: thread.problemId,
          blockId: thread.blockId ?? null,
          type: thread.type,
          status: thread.status,
          isArchived: thread.isArchived,
          createdBy: thread.createdBy,
          createdAt: thread.createdAt,
          resolvedBy: thread.resolvedBy ?? null,
          resolvedAt: thread.resolvedAt ?? null,
          creatorName: creator?.name ?? "Unknown",
          commentCount: comments.filter((c) => !c.isDeleted).length,
          latestCommentAt: latestComment?.createdAt ?? null,
        };
      })
    );

    return results;
  },
});

export const getThread = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(
    v.object({
      thread: v.object({
        _id: v.id("threads"),
        problemId: v.id("problems"),
        blockId: v.union(v.string(), v.null()),
        type: v.union(v.literal("comment"), v.literal("dispute")),
        status: v.union(v.literal("open"), v.literal("resolved")),
        isArchived: v.boolean(),
        createdBy: v.id("userProfiles"),
        createdAt: v.number(),
        resolvedBy: v.union(v.id("userProfiles"), v.null()),
        resolvedAt: v.union(v.number(), v.null()),
        creatorName: v.string(),
      }),
      comments: v.array(
        v.object({
          _id: v.id("comments"),
          authorId: v.id("userProfiles"),
          authorName: v.string(),
          contentJson: v.any(),
          mentions: v.array(v.id("userProfiles")),
          isDeleted: v.boolean(),
          createdAt: v.number(),
          editedAt: v.union(v.number(), v.null()),
          reactions: v.array(
            v.object({
              emoji: v.string(),
              count: v.number(),
              hasReacted: v.boolean(),
            })
          ),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const creator = await ctx.db.get(thread.createdBy);
    const viewerProfile = await getViewerProfile(ctx);

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .collect();

    const commentsWithDetails = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        
        // Get reactions for this comment
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_targetType_and_targetId", (q) =>
            q.eq("targetType", "comment").eq("targetId", comment._id as string)
          )
          .collect();

        // Group reactions by emoji
        const reactionMap = new Map<string, { count: number; hasReacted: boolean }>();
        for (const reaction of reactions) {
          const existing = reactionMap.get(reaction.emoji) || {
            count: 0,
            hasReacted: false,
          };
          existing.count++;
          if (viewerProfile && reaction.userId === viewerProfile._id) {
            existing.hasReacted = true;
          }
          reactionMap.set(reaction.emoji, existing);
        }

        const reactionArray: Array<{ emoji: string; count: number; hasReacted: boolean }> = [];
        reactionMap.forEach((value, emoji) => {
          reactionArray.push({ emoji, ...value });
        });

        return {
          _id: comment._id,
          authorId: comment.authorId,
          authorName: author?.name ?? "Unknown",
          contentJson: comment.contentJson,
          mentions: comment.mentions,
          isDeleted: comment.isDeleted,
          createdAt: comment.createdAt,
          editedAt: comment.editedAt ?? null,
          reactions: reactionArray,
        };
      })
    );

    return {
      thread: {
        _id: thread._id,
        problemId: thread.problemId,
        blockId: thread.blockId ?? null,
        type: thread.type,
        status: thread.status,
        isArchived: thread.isArchived,
        createdBy: thread.createdBy,
        createdAt: thread.createdAt,
        resolvedBy: thread.resolvedBy ?? null,
        resolvedAt: thread.resolvedAt ?? null,
        creatorName: creator?.name ?? "Unknown",
      },
      comments: commentsWithDetails.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

export const listGhostThreads = query({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.array(
    v.object({
      _id: v.id("threads"),
      blockId: v.union(v.string(), v.null()),
      type: v.union(v.literal("comment"), v.literal("dispute")),
      creatorName: v.string(),
      commentCount: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .collect();

    const ghostThreads = threads.filter((t) => t.isArchived);

    const results = await Promise.all(
      ghostThreads.map(async (thread) => {
        const creator = await ctx.db.get(thread.createdBy);
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
          .collect();

        return {
          _id: thread._id,
          blockId: thread.blockId ?? null,
          type: thread.type,
          creatorName: creator?.name ?? "Unknown",
          commentCount: comments.filter((c) => !c.isDeleted).length,
          createdAt: thread.createdAt,
        };
      })
    );

    return results;
  },
});

// ============================================
// FEED QUERY - Flat chronological list of all comments
// ============================================

export const listAllCommentsForProblem = query({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      threadId: v.id("threads"),
      blockId: v.union(v.string(), v.null()),
      threadType: v.union(v.literal("comment"), v.literal("dispute")),
      threadStatus: v.union(v.literal("open"), v.literal("resolved")),
      isThreadArchived: v.boolean(),
      authorId: v.id("userProfiles"),
      authorName: v.string(),
      authorEmail: v.string(),
      isProfessor: v.boolean(),
      contentJson: v.any(),
      mentions: v.array(v.id("userProfiles")),
      isDeleted: v.boolean(),
      createdAt: v.number(),
      editedAt: v.union(v.number(), v.null()),
      reactions: v.array(
        v.object({
          emoji: v.string(),
          count: v.number(),
          hasReacted: v.boolean(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const viewerProfile = await getViewerProfile(ctx);

    // Get all threads for this problem
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .collect();

    // Get the problem to find the class and professor
    const problem = await ctx.db.get(args.problemId);
    if (!problem) return [];

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) return [];

    const klass = await ctx.db.get(assignment.classId);
    const professorId = klass?.professorId;

    // Gather all comments from all threads
    const allComments: Array<{
      _id: Id<"comments">;
      threadId: Id<"threads">;
      blockId: string | null;
      threadType: "comment" | "dispute";
      threadStatus: "open" | "resolved";
      isThreadArchived: boolean;
      authorId: Id<"userProfiles">;
      authorName: string;
      authorEmail: string;
      isProfessor: boolean;
      contentJson: any;
      mentions: Array<Id<"userProfiles">>;
      isDeleted: boolean;
      createdAt: number;
      editedAt: number | null;
      reactions: Array<{ emoji: string; count: number; hasReacted: boolean }>;
    }> = [];

    for (const thread of threads) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .collect();

      for (const comment of comments) {
        const author = await ctx.db.get(comment.authorId);

        // Get reactions for this comment
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_targetType_and_targetId", (q) =>
            q.eq("targetType", "comment").eq("targetId", comment._id as string)
          )
          .collect();

        // Group reactions by emoji
        const reactionMap = new Map<string, { count: number; hasReacted: boolean }>();
        for (const reaction of reactions) {
          const existing = reactionMap.get(reaction.emoji) || {
            count: 0,
            hasReacted: false,
          };
          existing.count++;
          if (viewerProfile && reaction.userId === viewerProfile._id) {
            existing.hasReacted = true;
          }
          reactionMap.set(reaction.emoji, existing);
        }

        const reactionArray: Array<{ emoji: string; count: number; hasReacted: boolean }> = [];
        reactionMap.forEach((value, emoji) => {
          reactionArray.push({ emoji, ...value });
        });

        allComments.push({
          _id: comment._id,
          threadId: thread._id,
          blockId: thread.blockId ?? null,
          threadType: thread.type,
          threadStatus: thread.status,
          isThreadArchived: thread.isArchived,
          authorId: comment.authorId,
          authorName: author?.name ?? "Unknown",
          authorEmail: author?.email ?? "",
          isProfessor: professorId === comment.authorId,
          contentJson: comment.contentJson,
          mentions: comment.mentions,
          isDeleted: comment.isDeleted,
          createdAt: comment.createdAt,
          editedAt: comment.editedAt ?? null,
          reactions: reactionArray,
        });
      }
    }

    // Sort by createdAt in descending order (newest first)
    allComments.sort((a, b) => a.createdAt - b.createdAt);

    return allComments;
  },
});

// ============================================
// THREAD MUTATIONS
// ============================================

export const createThread = mutation({
  args: {
    problemId: v.id("problems"),
    blockId: v.optional(v.string()), // Optional - null for general comments
    type: v.union(v.literal("comment"), v.literal("dispute")),
    initialComment: v.object({
      contentJson: v.any(),
      mentions: v.array(v.id("userProfiles")),
    }),
  },
  returns: v.object({
    threadId: v.id("threads"),
    commentId: v.id("comments"),
  }),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);
    const { assignment } = await requireProblemAccess(ctx, args.problemId);

    let threadId: Id<"threads">;

    // Only check for existing thread if blockId is provided
    if (args.blockId) {
      const existingThread = await ctx.db
        .query("threads")
        .withIndex("by_problemId_and_blockId", (q) =>
          q.eq("problemId", args.problemId).eq("blockId", args.blockId)
        )
        .first();

      if (existingThread && !existingThread.isArchived) {
        // Add to existing thread
        threadId = existingThread._id;
        
        // If new thread is dispute and existing is comment, upgrade to dispute
        if (args.type === "dispute" && existingThread.type === "comment") {
          await ctx.db.patch(existingThread._id, { type: "dispute" });
        }
      } else {
        // Create new thread
        threadId = await ctx.db.insert("threads", {
          problemId: args.problemId,
          blockId: args.blockId,
          type: args.type,
          status: "open",
          isArchived: false,
          createdBy: profile._id,
          createdAt: Date.now(),
        });
      }
    } else {
      // General comment - always create new thread
      threadId = await ctx.db.insert("threads", {
        problemId: args.problemId,
        blockId: undefined, // General comment
        type: args.type,
        status: "open",
        isArchived: false,
        createdBy: profile._id,
        createdAt: Date.now(),
      });
    }

    // Create initial comment
    const commentId: Id<"comments"> = await ctx.db.insert("comments", {
      threadId,
      authorId: profile._id,
      contentJson: args.initialComment.contentJson,
      mentions: args.initialComment.mentions,
      isDeleted: false,
      createdAt: Date.now(),
    });

    // Create activity
    await ctx.db.insert("activities", {
      classId: assignment.classId,
      type: args.type === "dispute" ? "dispute_opened" : "comment_added",
      actorId: profile._id,
      problemId: args.problemId,
      blockId: args.blockId,
      threadId,
      commentId,
      createdAt: Date.now(),
    });

    // Create notifications for mentions
    for (const mentionedUserId of args.initialComment.mentions) {
      if (mentionedUserId !== profile._id) {
        await ctx.db.insert("notifications", {
          userId: mentionedUserId,
          type: "mention",
          threadId,
          commentId,
          actorId: profile._id,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return { threadId, commentId };
  },
});

export const createComment = mutation({
  args: {
    threadId: v.id("threads"),
    contentJson: v.any(),
    mentions: v.array(v.id("userProfiles")),
  },
  returns: v.object({ commentId: v.id("comments") }),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const { assignment } = await requireProblemAccess(ctx, thread.problemId);

    // Create comment
    const commentId: Id<"comments"> = await ctx.db.insert("comments", {
      threadId: args.threadId,
      authorId: profile._id,
      contentJson: args.contentJson,
      mentions: args.mentions,
      isDeleted: false,
      createdAt: Date.now(),
    });

    // Create activity
    await ctx.db.insert("activities", {
      classId: assignment.classId,
      type: "comment_added",
      actorId: profile._id,
      problemId: thread.problemId,
      blockId: thread.blockId,
      threadId: args.threadId,
      commentId,
      createdAt: Date.now(),
    });

    // Create notifications for mentions
    for (const mentionedUserId of args.mentions) {
      if (mentionedUserId !== profile._id) {
        await ctx.db.insert("notifications", {
          userId: mentionedUserId,
          type: "mention",
          threadId: args.threadId,
          commentId,
          actorId: profile._id,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    // Notify thread creator of reply (if not the same person and not already mentioned)
    if (
      thread.createdBy !== profile._id &&
      !args.mentions.includes(thread.createdBy)
    ) {
      await ctx.db.insert("notifications", {
        userId: thread.createdBy,
        type: "reply",
        threadId: args.threadId,
        commentId,
        actorId: profile._id,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { commentId };
  },
});

export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    contentJson: v.any(),
    mentions: v.array(v.id("userProfiles")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Only author can edit their own comment
    if (comment.authorId !== profile._id) {
      throw new Error("You can only edit your own comments");
    }

    await ctx.db.patch(args.commentId, {
      contentJson: args.contentJson,
      mentions: args.mentions,
      editedAt: Date.now(),
    });

    return null;
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Only author can delete their own comment
    if (comment.authorId !== profile._id) {
      throw new Error("You can only delete your own comments");
    }

    // Soft delete
    await ctx.db.patch(args.commentId, { isDeleted: true });

    return null;
  },
});

export const deleteAnyComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    const thread = await ctx.db.get(comment.threadId);
    if (!thread) throw new Error("Thread not found");

    const { assignment } = await requireProblemAccess(ctx, thread.problemId);

    // Check if user can moderate
    const canModerate = await canModerateThread(ctx, profile, assignment.classId);
    if (!canModerate) {
      throw new Error("Only professors and authorized TAs can delete other users' comments");
    }

    // Soft delete
    await ctx.db.patch(args.commentId, { isDeleted: true });

    return null;
  },
});

export const resolveThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const { assignment } = await requireProblemAccess(ctx, thread.problemId);

    // Check if user can moderate (for disputes) or is thread creator (for regular comments)
    const canModerate = await canModerateThread(ctx, profile, assignment.classId);
    const isCreator = thread.createdBy === profile._id;

    if (!canModerate && !isCreator) {
      throw new Error("You cannot resolve this thread");
    }

    // For disputes, only moderators can resolve
    if (thread.type === "dispute" && !canModerate) {
      throw new Error("Only professors and authorized TAs can resolve disputes");
    }

    await ctx.db.patch(args.threadId, {
      status: "resolved",
      resolvedBy: profile._id,
      resolvedAt: Date.now(),
    });

    // Create activity
    if (thread.type === "dispute") {
      await ctx.db.insert("activities", {
        classId: assignment.classId,
        type: "dispute_resolved",
        actorId: profile._id,
        problemId: thread.problemId,
        blockId: thread.blockId,
        threadId: args.threadId,
        createdAt: Date.now(),
      });

      // Notify thread creator
      if (thread.createdBy !== profile._id) {
        await ctx.db.insert("notifications", {
          userId: thread.createdBy,
          type: "dispute_resolved",
          threadId: args.threadId,
          actorId: profile._id,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return null;
  },
});

export const reopenThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const { assignment } = await requireProblemAccess(ctx, thread.problemId);

    const canModerate = await canModerateThread(ctx, profile, assignment.classId);
    if (!canModerate) {
      throw new Error("Only professors and authorized TAs can reopen threads");
    }

    await ctx.db.patch(args.threadId, {
      status: "open",
      resolvedBy: undefined,
      resolvedAt: undefined,
    });

    return null;
  },
});

// ============================================
// REACTIONS
// ============================================

export const addReaction = mutation({
  args: {
    targetType: v.union(v.literal("comment"), v.literal("thread")),
    targetId: v.string(),
    emoji: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    // Check if reaction already exists
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_targetType_and_targetId_and_userId", (q) =>
        q
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
          .eq("userId", profile._id)
      )
      .first();

    if (existing && existing.emoji === args.emoji) {
      // Already reacted with same emoji, do nothing
      return null;
    }

    if (existing) {
      // Update existing reaction
      await ctx.db.patch(existing._id, { emoji: args.emoji });
    } else {
      // Create new reaction
      await ctx.db.insert("reactions", {
        targetType: args.targetType,
        targetId: args.targetId,
        userId: profile._id,
        emoji: args.emoji,
      });
    }

    return null;
  },
});

export const removeReaction = mutation({
  args: {
    targetType: v.union(v.literal("comment"), v.literal("thread")),
    targetId: v.string(),
    emoji: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_targetType_and_targetId_and_userId", (q) =>
        q
          .eq("targetType", args.targetType)
          .eq("targetId", args.targetId)
          .eq("userId", profile._id)
      )
      .first();

    if (existing && existing.emoji === args.emoji) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

// ============================================
// GHOST THREAD MANAGEMENT
// ============================================

export const archiveOrphanedThreads = mutation({
  args: {
    problemId: v.id("problems"),
    activeBlockIds: v.array(v.string()),
  },
  returns: v.object({ archivedCount: v.number() }),
  handler: async (ctx, args) => {
    const profile = await requireViewerProfile(ctx);
    const { assignment } = await requireProblemAccess(ctx, args.problemId);

    const canModerate = await canModerateThread(ctx, profile, assignment.classId);
    if (!canModerate) {
      throw new Error("Only professors and authorized TAs can manage ghost threads");
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .collect();

    const activeBlockIdSet = new Set(args.activeBlockIds);
    let archivedCount = 0;

    for (const thread of threads) {
      if (!thread.isArchived && !activeBlockIdSet.has(thread.blockId ?? "")) {
        await ctx.db.patch(thread._id, { isArchived: true });
        archivedCount++;
      } else if (thread.isArchived && activeBlockIdSet.has(thread.blockId ?? "")) {
        // Restore if block reappears
        await ctx.db.patch(thread._id, { isArchived: false });
      }
    }

    return { archivedCount };
  },
});

// ============================================
// USER SEARCH FOR MENTIONS
// ============================================

export const searchUsersForMention = query({
  args: {
    classId: v.id("classes"),
    searchTerm: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("userProfiles"),
      name: v.string(),
      email: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    if (args.searchTerm.length < 1) return [];

    // Get all CRNs for this class
    const crns = await ctx.db
      .query("crns")
      .withIndex("by_classId", (q) => q.eq("classId", args.classId))
      .collect();

    const userIds = new Set<string>();
    const users: Array<{ _id: Id<"userProfiles">; name: string; email: string }> = [];

    // Get all members from all CRNs
    for (const crn of crns) {
      const members = await ctx.db
        .query("classMembers")
        .withIndex("by_crnId", (q) => q.eq("crnId", crn._id))
        .collect();

      for (const member of members) {
        if (member.status !== "active") continue;
        if (userIds.has(member.userId as string)) continue;

        const profile = await ctx.db.get(member.userId);
        if (!profile) continue;

        const searchLower = args.searchTerm.toLowerCase();
        if (
          profile.name.toLowerCase().includes(searchLower) ||
          profile.email.toLowerCase().includes(searchLower)
        ) {
          userIds.add(member.userId as string);
          users.push({
            _id: profile._id,
            name: profile.name,
            email: profile.email,
          });
        }
      }
    }

    // Also include the professor
    const klass = await ctx.db.get(args.classId);
    if (klass && !userIds.has(klass.professorId as string)) {
      const professor = await ctx.db.get(klass.professorId);
      if (professor) {
        const searchLower = args.searchTerm.toLowerCase();
        if (
          professor.name.toLowerCase().includes(searchLower) ||
          professor.email.toLowerCase().includes(searchLower)
        ) {
          users.push({
            _id: professor._id,
            name: professor.name,
            email: professor.email,
          });
        }
      }
    }

    return users.slice(0, 10); // Limit to 10 results
  },
});

