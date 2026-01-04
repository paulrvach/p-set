import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  userProfiles: defineTable({
    authUserId: v.id("users"), // Reference to Convex Auth users table
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  })
    .index("by_authUserId", ["authUserId"]),

  classes: defineTable({
    name: v.string(),
    professorId: v.id("userProfiles"),
  })
    .index("by_professorId", ["professorId"])
    ,

  crns: defineTable({
    classId: v.id("classes"),
    year: v.number(),
    semester: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    inviteCode: v.string(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_classId", ["classId"])
    .index("by_inviteCode", ["inviteCode"])
    .index("by_year_and_semester", ["year", "semester"])
    .index("by_classId_and_year_and_semester", ["classId", "year", "semester"]),

  classMembers: defineTable({
    crnId: v.id("crns"), // Members belong to a specific CRN
    userId: v.id("userProfiles"),
    role: v.union(v.literal("professor"), v.literal("ta"), v.literal("student")),
    permissions: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("revoked")),
  })
    .index("by_crnId", ["crnId"])
    .index("by_userId", ["userId"])
    .index("by_crnId_and_userId", ["crnId", "userId"]),

  assignments: defineTable({
    classId: v.id("classes"),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_classId", ["classId"]),

  problems: defineTable({
    assignmentId: v.id("assignments"),
    title: v.string(),
    description: v.optional(v.string()),
    problemNumber: v.number(),
    order: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_assignmentId", ["assignmentId"]),

  // ============================================
  // SOLUTIONS (replaces solutionLines - stores full Tiptap doc)
  // ============================================
  solutions: defineTable({
    problemId: v.id("problems"),
    contentJson: v.any(), // Full Tiptap JSON with UniqueIDs on blocks
    lastEditedBy: v.optional(v.id("userProfiles")),
    lastEditedAt: v.optional(v.number()),
  })
    .index("by_problemId", ["problemId"]),

  // ============================================
  // THREADS (Liveblocks-style comment threads)
  // ============================================
  threads: defineTable({
    problemId: v.id("problems"),
    blockId: v.optional(v.string()), // Tiptap UniqueID - anchors thread to specific block (null for general comments)
    type: v.union(v.literal("comment"), v.literal("dispute")),
    status: v.union(v.literal("open"), v.literal("resolved")),
    isArchived: v.boolean(), // True when blockId no longer exists in document
    createdBy: v.id("userProfiles"),
    createdAt: v.number(),
    resolvedBy: v.optional(v.id("userProfiles")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_problemId", ["problemId"])
    .index("by_problemId_and_blockId", ["problemId", "blockId"])
    .index("by_status", ["status"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  // ============================================
  // COMMENTS (within threads)
  // ============================================
  comments: defineTable({
    threadId: v.id("threads"),
    parentId: v.optional(v.id("comments")), // Reply to specific comment
    authorId: v.id("userProfiles"),
    contentJson: v.any(), // Rich text content (bold, italic, code, mentions)
    mentions: v.array(v.id("userProfiles")), // Extracted @mentions
    isDeleted: v.boolean(), // Soft delete - shows "This message was deleted"
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
  })
    .index("by_threadId", ["threadId"])
    .index("by_authorId", ["authorId"]),

  // ============================================
  // REACTIONS (emoji reactions on comments/threads)
  // ============================================
  reactions: defineTable({
    targetType: v.union(v.literal("comment"), v.literal("thread")),
    targetId: v.string(), // comment._id or thread._id as string
    userId: v.id("userProfiles"),
    emoji: v.string(), // e.g., "👀", "✅", "🔥"
  })
    .index("by_targetType_and_targetId", ["targetType", "targetId"])
    .index("by_userId", ["userId"])
    .index("by_targetType_and_targetId_and_userId", ["targetType", "targetId", "userId"]),

  // ============================================
  // ACTIVITIES (Class Pulse feed)
  // ============================================
  activities: defineTable({
    classId: v.id("classes"),
    type: v.union(
      v.literal("comment_added"),
      v.literal("dispute_opened"),
      v.literal("dispute_resolved"),
      v.literal("solution_edited"),
      v.literal("mention"),
    ),
    actorId: v.id("userProfiles"),
    problemId: v.id("problems"),
    blockId: v.optional(v.string()),
    threadId: v.optional(v.id("threads")),
    commentId: v.optional(v.id("comments")),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_classId_and_createdAt", ["classId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_actorId", ["actorId"]),

  // ============================================
  // NOTIFICATIONS (The Bell)
  // ============================================
  notifications: defineTable({
    userId: v.id("userProfiles"),
    type: v.union(
      v.literal("mention"),
      v.literal("dispute_resolved"),
      v.literal("reply"),
      v.literal("reaction"),
    ),
    threadId: v.optional(v.id("threads")),
    commentId: v.optional(v.id("comments")),
    actorId: v.id("userProfiles"),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId_and_isRead", ["userId", "isRead"])
    .index("by_userId_and_createdAt", ["userId", "createdAt"]),

  // ============================================
  // EDITOR CHECKPOINTS (version control)
  // ============================================
  editorCheckpoints: defineTable({
    problemId: v.id("problems"),
    versionTag: v.string(), // e.g., "Before dispute fix", "Initial version"
    contentJson: v.any(), // Snapshot of Tiptap JSON
    createdBy: v.id("userProfiles"),
    createdAt: v.number(),
  })
    .index("by_problemId", ["problemId"])
    .index("by_problemId_and_createdAt", ["problemId", "createdAt"]),

  // ============================================
  // AUDIT LOGS (edit history)
  // ============================================
  auditLogs: defineTable({
    classId: v.id("classes"),
    problemId: v.id("problems"),
    editorId: v.id("userProfiles"),
    oldContentJson: v.any(), // Previous Tiptap JSON
    newContentJson: v.any(), // New Tiptap JSON
    timestamp: v.number(),
  })
    .index("by_classId", ["classId"])
    .index("by_problemId", ["problemId"])
    .index("by_editorId", ["editorId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_problemId_and_timestamp", ["problemId", "timestamp"]),
});
