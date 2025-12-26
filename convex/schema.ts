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

  solutionLines: defineTable({
    problemId: v.id("problems"),
    contentJson: v.any(), // Tiptap JSON fragment (entire problem for unified editor)
    order: v.number(), // Always 1 for unified solutions
    isCorrected: v.boolean(),
    lastEditedBy: v.optional(v.id("userProfiles")),
    lastEditedAt: v.optional(v.number()),
  })
    .index("by_problemId", ["problemId"])
    .index("by_problemId_and_order", ["problemId", "order"]),

  editorCheckpoints: defineTable({
    problemId: v.id("problems"),
    versionTag: v.string(), // e.g., "Before dispute fix", "Initial version"
    contentJson: v.any(), // Snapshot of Tiptap JSON
    createdBy: v.id("userProfiles"),
    createdAt: v.number(),
  })
    .index("by_problemId", ["problemId"])
    .index("by_problemId_and_createdAt", ["problemId", "createdAt"]),

  disputes: defineTable({
    lineId: v.id("solutionLines"),
    status: v.union(
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    creatorId: v.id("userProfiles"),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolverId: v.optional(v.id("userProfiles")),
  })
    .index("by_lineId", ["lineId"])
    .index("by_creatorId", ["creatorId"])
    .index("by_status", ["status"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  auditLogs: defineTable({
    classId: v.id("classes"),
    lineId: v.id("solutionLines"),
    editorId: v.id("userProfiles"),
    oldContentJson: v.any(), // Previous Tiptap JSON
    newContentJson: v.any(), // New Tiptap JSON
    timestamp: v.number(),
  })
    .index("by_classId", ["classId"])
    .index("by_lineId", ["lineId"])
    .index("by_editorId", ["editorId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_lineId_and_timestamp", ["lineId", "timestamp"]),
});
