import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

type Semester = string;

function normalizeSemester(semester: string): Semester {
  return semester.trim();
}

function generateInviteCode(): string {
  // Human-friendly code: 8 chars (no I/O/1/0) in two chunks.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

async function getOrCreateViewerProfileId(
  ctx: any,
): Promise<Id<"userProfiles"> | null> {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) return null;

  const existing = await ctx.db
    .query("userProfiles")
    .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
    .first();
  if (existing) return existing._id;

  const authUser = await ctx.db.get("users", authUserId);
  if (!authUser) return null;

  const profileId: Id<"userProfiles"> = await ctx.db.insert("userProfiles", {
    authUserId,
    name: authUser.name ?? authUser.email ?? "User",
    email: authUser.email ?? "",
    role: "user",
  });
  return profileId;
}

async function requireAdminProfile(ctx: any): Promise<Id<"userProfiles">> {
  const profileId = await getOrCreateViewerProfileId(ctx);
  if (profileId === null) {
    throw new Error("Not authenticated");
  }
  const profile = await ctx.db.get("userProfiles", profileId);
  if (!profile) {
    throw new Error("Profile not found");
  }
  if (profile.role !== "admin") {
    throw new Error("Admin access required");
  }
  return profileId;
}

export const getViewerProfile = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("userProfiles"),
      name: v.string(),
      email: v.string(),
      role: v.union(v.literal("admin"), v.literal("user")),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();
    if (!profile) return null;
    return {
      _id: profile._id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
    };
  },
});

export const createClass = mutation({
  args: {
    name: v.string(),
  },
  returns: v.object({ classId: v.id("classes") }),
  handler: async (ctx, args) => {
    const adminProfileId = await requireAdminProfile(ctx);

    const classId: Id<"classes"> = await ctx.db.insert("classes", {
      name: args.name.trim(),
      professorId: adminProfileId,
    });

    return { classId };
  },
});

export const publishCRN = mutation({
  args: {
    classId: v.id("classes"),
    year: v.number(),
    semester: v.string(),
  },
  returns: v.object({ crnId: v.id("crns") }),
  handler: async (ctx, args) => {
    const adminProfileId = await requireAdminProfile(ctx);
    const semester = normalizeSemester(args.semester);

    const klass = await ctx.db.get("classes", args.classId);
    if (!klass) throw new Error("Class not found");
    if (klass.professorId !== adminProfileId) {
      throw new Error("Only the class owner can publish CRNs");
    }

    const existing = await ctx.db
      .query("crns")
      .withIndex("by_classId_and_year_and_semester", (q) =>
        q.eq("classId", args.classId).eq("year", args.year).eq("semester", semester),
      )
      .first();
    if (existing) {
      throw new Error("CRN already exists for that year/semester");
    }

    let inviteCode = "";
    for (let i = 0; i < 10; i++) {
      const candidate = generateInviteCode();
      const collision = await ctx.db
        .query("crns")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", candidate))
        .first();
      if (!collision) {
        inviteCode = candidate;
        break;
      }
    }
    if (!inviteCode) throw new Error("Failed to generate invite code");

    const crnId: Id<"crns"> = await ctx.db.insert(
      "crns",
      {
        classId: args.classId,
        year: args.year,
        semester,
        status: "published",
        inviteCode,
        publishedAt: Date.now(),
      },
    );

    // Create the professor membership for this CRN.
    await ctx.db.insert("classMembers", {
      crnId,
      userId: adminProfileId,
      role: "professor",
      status: "active",
      permissions: [
        "view_assignments",
        "edit_solution",
        "resolve_dispute",
        "manage_roster",
        "revert_edits",
      ],
    });

    return { crnId };
  },
});

export const listMyCRNs = query({
  args: {},
  returns: v.array(
    v.object({
      crnId: v.id("crns"),
      classId: v.id("classes"),
      className: v.string(),
      year: v.number(),
      semester: v.string(),
      status: v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived"),
      ),
      inviteCode: v.string(),
      role: v.union(
        v.literal("professor"),
        v.literal("ta"),
        v.literal("student"),
      ),
    }),
  ),
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();
    if (!profile) return [];

    const memberships = await ctx.db
      .query("classMembers")
      .withIndex("by_userId", (q) => q.eq("userId", profile._id))
      .collect();

    const active = memberships.filter((m: any) => m.status === "active");

    const results = await Promise.all(
      active.map(async (m: any) => {
        const crn = await ctx.db.get("crns", m.crnId);
        if (!crn) return null;
        const klass = await ctx.db.get("classes", crn.classId);
        if (!klass) return null;
        return {
          crnId: crn._id,
          classId: klass._id,
          className: klass.name,
          year: crn.year,
          semester: crn.semester,
          status: crn.status,
          inviteCode: crn.inviteCode,
          role: m.role,
        };
      }),
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const listMyClasses = query({
  args: {},
  returns: v.array(
    v.object({
      classId: v.id("classes"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();
    if (!profile) return [];

    if (profile.role !== "admin") return [];

    const classes = await ctx.db
      .query("classes")
      .withIndex("by_professorId", (q) => q.eq("professorId", profile._id))
      .collect();

    return classes.map((c: any) => ({ classId: c._id, name: c.name }));
  },
});

export const getCRNForViewer = query({
  args: {
    crnId: v.id("crns"),
  },
  returns: v.union(
    v.object({
      crn: v.object({
        _id: v.id("crns"),
        year: v.number(),
        semester: v.string(),
        status: v.union(
          v.literal("draft"),
          v.literal("published"),
          v.literal("archived"),
        ),
        inviteCode: v.string(),
        publishedAt: v.union(v.number(), v.null()),
      }),
      class: v.object({
        _id: v.id("classes"),
        name: v.string(),
        professorId: v.id("userProfiles"),
      }),
      membership: v.object({
        role: v.union(
          v.literal("professor"),
          v.literal("ta"),
          v.literal("student"),
        ),
        permissions: v.array(v.string()),
        status: v.union(v.literal("active"), v.literal("revoked")),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();
    if (!profile) return null;

    const membership = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId_and_userId", (q) =>
        q.eq("crnId", args.crnId).eq("userId", profile._id),
      )
      .first();
    if (!membership || membership.status !== "active") return null;

    const crn = await ctx.db.get("crns", args.crnId);
    if (!crn) return null;

    const klass = await ctx.db.get("classes", crn.classId);
    if (!klass) return null;

    return {
      crn: {
        _id: crn._id,
        year: crn.year,
        semester: crn.semester,
        status: crn.status,
        inviteCode: crn.inviteCode,
        publishedAt: crn.publishedAt ?? null,
      },
      class: {
        _id: klass._id,
        name: klass.name,
        professorId: klass.professorId,
      },
      membership: {
        role: membership.role,
        permissions: membership.permissions,
        status: membership.status,
      },
    };
  },
});

export const getClassRoleForViewer = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.object({
    isProfessor: v.boolean(),
    role: v.union(
      v.literal("professor"),
      v.literal("ta"),
      v.literal("student"),
      v.literal("none"),
    ),
  }),
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) {
      return { isProfessor: false, role: "none" as const };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();
    if (!profile) {
      return { isProfessor: false, role: "none" as const };
    }

    const klass = await ctx.db.get("classes", args.classId);
    if (!klass) {
      return { isProfessor: false, role: "none" as const };
    }

    // Check if viewer is the professor
    if (klass.professorId === profile._id) {
      return { isProfessor: true, role: "professor" as const };
    }

    // Check if viewer is a member via any CRN
    const crns = await ctx.db
      .query("crns")
      .withIndex("by_classId", (q) => q.eq("classId", args.classId))
      .collect();

    for (const crn of crns) {
      const membership = await ctx.db
        .query("classMembers")
        .withIndex("by_crnId_and_userId", (q) =>
          q.eq("crnId", crn._id).eq("userId", profile._id)
        )
        .first();

      if (membership && membership.status === "active") {
        return {
          isProfessor: false,
          role: membership.role as "ta" | "student",
        };
      }
    }

    return { isProfessor: false, role: "none" as const };
  },
});

// ============================================
// CRN MEMBERS MANAGEMENT
// ============================================

export const listCRNMembers = query({
  args: {
    crnId: v.id("crns"),
  },
  returns: v.array(
    v.object({
      _id: v.id("classMembers"),
      userId: v.id("userProfiles"),
      name: v.string(),
      email: v.string(),
      role: v.union(
        v.literal("professor"),
        v.literal("ta"),
        v.literal("student"),
      ),
      status: v.union(v.literal("active"), v.literal("revoked")),
      permissions: v.array(v.string()),
      joinedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();
    if (!profile) return [];

    // Check if viewer has access to this CRN
    const viewerMembership = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId_and_userId", (q) =>
        q.eq("crnId", args.crnId).eq("userId", profile._id),
      )
      .first();

    // Only professors and TAs can view the members list
    if (
      !viewerMembership ||
      viewerMembership.status !== "active" ||
      (viewerMembership.role !== "professor" && viewerMembership.role !== "ta")
    ) {
      return [];
    }

    const members = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId", (q) => q.eq("crnId", args.crnId))
      .collect();

    const results = await Promise.all(
      members.map(async (member) => {
        const userProfile = await ctx.db.get("userProfiles", member.userId);
        if (!userProfile) return null;
        return {
          _id: member._id,
          userId: member.userId,
          name: userProfile.name,
          email: userProfile.email,
          role: member.role,
          status: member.status,
          permissions: member.permissions,
          joinedAt: member._creationTime,
        };
      }),
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

export const getCRNMemberStats = query({
  args: {
    crnId: v.id("crns"),
  },
  returns: v.object({
    activeMembers: v.number(),
    teachingAssistants: v.number(),
    pendingInvites: v.number(),
  }),
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) {
      return { activeMembers: 0, teachingAssistants: 0, pendingInvites: 0 };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();
    if (!profile) {
      return { activeMembers: 0, teachingAssistants: 0, pendingInvites: 0 };
    }

    // Check if viewer has access to this CRN
    const viewerMembership = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId_and_userId", (q) =>
        q.eq("crnId", args.crnId).eq("userId", profile._id),
      )
      .first();

    // Only professors and TAs can view stats
    if (
      !viewerMembership ||
      viewerMembership.status !== "active" ||
      (viewerMembership.role !== "professor" && viewerMembership.role !== "ta")
    ) {
      return { activeMembers: 0, teachingAssistants: 0, pendingInvites: 0 };
    }

    const members = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId", (q) => q.eq("crnId", args.crnId))
      .collect();

    const activeMembers = members.filter((m) => m.status === "active").length;
    const teachingAssistants = members.filter(
      (m) => m.role === "ta" && m.status === "active",
    ).length;
    // For now, pending invites are members with revoked status
    // This could be changed if we add a separate pending status
    const pendingInvites = members.filter((m) => m.status === "revoked").length;

    return {
      activeMembers,
      teachingAssistants,
      pendingInvites,
    };
  },
});

export const joinCRN = mutation({
  args: {
    inviteCode: v.string(),
  },
  returns: v.union(
    v.object({
      membershipId: v.id("classMembers"),
      crnId: v.id("crns"),
      className: v.string(),
      year: v.number(),
      semester: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const profileId = await getOrCreateViewerProfileId(ctx);
    if (profileId === null) {
      throw new Error("Not authenticated");
    }

    // Find CRN by invite code
    const crn = await ctx.db
      .query("crns")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!crn) {
      throw new Error("Invalid invite code");
    }

    if (crn.status !== "published") {
      throw new Error("CRN is not published");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId_and_userId", (q) =>
        q.eq("crnId", crn._id).eq("userId", profileId),
      )
      .first();

    if (existingMembership) {
      // Return existing membership
      const klass = await ctx.db.get("classes", crn.classId);
      if (!klass) throw new Error("Class not found");
      return {
        membershipId: existingMembership._id,
        crnId: crn._id,
        className: klass.name,
        year: crn.year,
        semester: crn.semester,
      };
    }

    // Create new membership
    const membershipId: Id<"classMembers"> = await ctx.db.insert(
      "classMembers",
      {
        crnId: crn._id,
        userId: profileId,
        role: "student",
        status: "active",
        permissions: ["view_assignments"],
      },
    );

    const klass = await ctx.db.get("classes", crn.classId);
    if (!klass) throw new Error("Class not found");

    return {
      membershipId,
      crnId: crn._id,
      className: klass.name,
      year: crn.year,
      semester: crn.semester,
    };
  },
});

export const updateMemberPermissions = mutation({
  args: {
    memberId: v.id("classMembers"),
    permissions: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profileId = await getOrCreateViewerProfileId(ctx);
    if (profileId === null) {
      throw new Error("Not authenticated");
    }

    const member = await ctx.db.get("classMembers", args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Get the CRN to check class ownership
    const crn = await ctx.db.get("crns", member.crnId);
    if (!crn) {
      throw new Error("CRN not found");
    }

    const klass = await ctx.db.get("classes", crn.classId);
    if (!klass) {
      throw new Error("Class not found");
    }

    // Check if viewer is professor or TA with manage_roster permission
    const viewerMembership = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId_and_userId", (q) =>
        q.eq("crnId", member.crnId).eq("userId", profileId),
      )
      .first();

    if (!viewerMembership || viewerMembership.status !== "active") {
      throw new Error("Not authorized");
    }

    const isProfessor = viewerMembership.role === "professor";
    const hasManageRoster =
      viewerMembership.role === "ta" &&
      viewerMembership.permissions.includes("manage_roster");

    if (!isProfessor && !hasManageRoster) {
      throw new Error("Only professors and TAs with manage_roster permission can update permissions");
    }

    // Update permissions
    await ctx.db.patch(args.memberId, {
      permissions: args.permissions,
    });

    return null;
  },
});

// ============================================
// CLASS MANAGEMENT
// ============================================

async function requireClassOwner(
  ctx: any,
  classId: Id<"classes">,
): Promise<Id<"userProfiles">> {
  const adminProfileId = await requireAdminProfile(ctx);
  const klass = await ctx.db.get("classId" in (typeof classId === 'string' ? {classId} : classId) ? classId : classId); // Just safety
  const actualKlass = await ctx.db.get(classId);
  if (!actualKlass) throw new Error("Class not found");
  if (actualKlass.professorId !== adminProfileId) {
    throw new Error("Only the class owner can perform this action");
  }
  return adminProfileId;
}

async function requireViewAccessToClass(
  ctx: any,
  classId: Id<"classes">,
) {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
    .first();
  if (!profile) throw new Error("Profile not found");

  const klass = await ctx.db.get(classId);
  if (!klass) throw new Error("Class not found");

  // Professor check
  if (klass.professorId === profile._id) {
    return { profile, klass, role: "professor" };
  }

  // Student/TA check via CRN membership
  const crns = await ctx.db
    .query("crns")
    .withIndex("by_classId", (q: any) => q.eq("classId", classId))
    .collect();

  for (const crn of crns) {
    const membership = await ctx.db
      .query("classMembers")
      .withIndex("by_crnId_and_userId", (q: any) =>
        q.eq("crnId", crn._id).eq("userId", profile._id),
      )
      .first();

    if (membership && membership.status === "active") {
      return { profile, klass, role: membership.role };
    }
  }

  throw new Error("No access to this class");
}

export const updateClassName = mutation({
  args: {
    classId: v.id("classes"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireClassOwner(ctx, args.classId);
    await ctx.db.patch(args.classId, { name: args.name.trim() });
    return null;
  },
});

// ============================================
// ASSIGNMENT MANAGEMENT
// ============================================

export const listAssignments = query({
  args: {
    classId: v.id("classes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("assignments"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.union(v.string(), v.null()),
      order: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireViewAccessToClass(ctx, args.classId);

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_classId", (q) => q.eq("classId", args.classId))
      .collect();

    return assignments.map((a) => ({
      _id: a._id,
      _creationTime: a._creationTime,
      title: a.title,
      description: a.description ?? null,
      order: a.order,
    }));
  },
});

export const getAssignment = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.union(
    v.object({
      _id: v.id("assignments"),
      _creationTime: v.number(),
      classId: v.id("classes"),
      title: v.string(),
      description: v.union(v.string(), v.null()),
      order: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) return null;

    await requireViewAccessToClass(ctx, assignment.classId);

    return {
      _id: assignment._id,
      _creationTime: assignment._creationTime,
      classId: assignment.classId,
      title: assignment.title,
      description: assignment.description ?? null,
      order: assignment.order,
    };
  },
});

export const createAssignment = mutation({
  args: {
    classId: v.id("classes"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({ assignmentId: v.id("assignments") }),
  handler: async (ctx, args) => {
    await requireClassOwner(ctx, args.classId);

    const existingAssignments = await ctx.db
      .query("assignments")
      .withIndex("by_classId", (q) => q.eq("classId", args.classId))
      .collect();

    const maxOrder =
      existingAssignments.length > 0
        ? Math.max(...existingAssignments.map((a) => a.order))
        : 0;

    const assignmentId: Id<"assignments"> = await ctx.db.insert("assignments", {
      classId: args.classId,
      title: args.title.trim(),
      description: args.description,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return { assignmentId };
  },
});

export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await requireClassOwner(ctx, assignment.classId);

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.assignmentId, updates);
    return null;
  },
});

export const deleteAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await requireClassOwner(ctx, assignment.classId);

    // Delete all problems and their solution lines
    const problems = await ctx.db
      .query("problems")
      .withIndex("by_assignmentId", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    for (const problem of problems) {
      const solutionLines = await ctx.db
        .query("solutions")
        .withIndex("by_problemId", (q) => q.eq("problemId", problem._id as Id<"problems">))
        .collect();

      for (const line of solutionLines) {
        await ctx.db.delete(line._id);
      }

      await ctx.db.delete(problem._id);
    }

    await ctx.db.delete(args.assignmentId);
    return null;
  },
});

// ============================================
// PROBLEM MANAGEMENT
// ============================================

export const listProblems = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  returns: v.array(
    v.object({
      _id: v.id("problems"),
      title: v.string(),
      description: v.union(v.string(), v.null()),
      problemNumber: v.number(),
      order: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await requireViewAccessToClass(ctx, assignment.classId);

    const problems = await ctx.db
      .query("problems")
      .withIndex("by_assignmentId", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    return problems.map((p) => ({
      _id: p._id,
      title: p.title,
      description: p.description ?? null,
      problemNumber: p.problemNumber,
      order: p.order,
    }));
  },
});

export const getProblem = query({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.union(
    v.object({
      _id: v.id("problems"),
      assignmentId: v.id("assignments"),
      title: v.string(),
      description: v.union(v.string(), v.null()),
      problemNumber: v.number(),
      order: v.number(),
      metadata: v.any(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) return null;

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) return null;

    await requireViewAccessToClass(ctx, assignment.classId);

    return {
      _id: problem._id,
      assignmentId: problem.assignmentId,
      title: problem.title,
      description: problem.description ?? null,
      problemNumber: problem.problemNumber,
      order: problem.order,
      metadata: problem.metadata ?? null,
    };
  },
});

export const createProblem = mutation({
  args: {
    assignmentId: v.id("assignments"),
    title: v.string(),
    description: v.optional(v.string()),
    problemNumber: v.number(),
  },
  returns: v.object({ problemId: v.id("problems") }),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await requireClassOwner(ctx, assignment.classId);

    const existingProblems = await ctx.db
      .query("problems")
      .withIndex("by_assignmentId", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const maxOrder =
      existingProblems.length > 0
        ? Math.max(...existingProblems.map((p) => p.order))
        : 0;

    const problemId: Id<"problems"> = await ctx.db.insert("problems", {
      assignmentId: args.assignmentId,
      title: args.title.trim(),
      description: args.description,
      problemNumber: args.problemNumber,
      order: maxOrder + 1,
      metadata: {},
    });

    return { problemId };
  },
});

export const updateProblem = mutation({
  args: {
    problemId: v.id("problems"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    problemNumber: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("Problem not found");

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await requireClassOwner(ctx, assignment.classId);

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.description !== undefined) updates.description = args.description;
    if (args.problemNumber !== undefined)
      updates.problemNumber = args.problemNumber;

    await ctx.db.patch(args.problemId, updates);
    return null;
  },
});

export const deleteProblem = mutation({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("Problem not found");

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    await requireClassOwner(ctx, assignment.classId);

    // Delete all solution lines
    const solutionLines = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .collect();

    for (const line of solutionLines) {
      await ctx.db.delete(line._id);
    }

    await ctx.db.delete(args.problemId);
    return null;
  },
});

// ============================================
// SOLUTION MANAGEMENT (New unified solutions table)
// ============================================

export const getSolution = query({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.union(
    v.object({
      _id: v.id("solutions"),
      problemId: v.id("problems"),
      contentJson: v.any(),
      lastEditedBy: v.union(v.id("userProfiles"), v.null()),
      lastEditedAt: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const solution = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .first();

    if (!solution) return null;

    const problem = await ctx.db.get(args.problemId);
    if (!problem) return null;

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) return null;

    await requireViewAccessToClass(ctx, assignment.classId);

    return {
      _id: solution._id,
      problemId: solution.problemId,
      contentJson: solution.contentJson,
      lastEditedBy: solution.lastEditedBy ?? null,
      lastEditedAt: solution.lastEditedAt ?? null,
    };
  },
});

export const updateSolution = mutation({
  args: {
    problemId: v.id("problems"),
    contentJson: v.any(),
  },
  returns: v.object({ solutionId: v.id("solutions") }),
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("Problem not found");

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const editorId = await requireClassOwner(ctx, assignment.classId);

    // Get or create solution
    let solution = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .first();

    if (solution) {
      // Create audit log entry
      await ctx.db.insert("auditLogs", {
        classId: assignment.classId,
        problemId: args.problemId,
        editorId,
        oldContentJson: solution.contentJson,
        newContentJson: args.contentJson,
        timestamp: Date.now(),
      });

      // Update existing solution
      await ctx.db.patch(solution._id, {
        contentJson: args.contentJson,
        lastEditedBy: editorId,
        lastEditedAt: Date.now(),
      });
      return { solutionId: solution._id };
    } else {
      // Create new solution
      const solutionId: Id<"solutions"> = await ctx.db.insert("solutions", {
        problemId: args.problemId,
        contentJson: args.contentJson,
        lastEditedBy: editorId,
        lastEditedAt: Date.now(),
      });
      return { solutionId };
    }
  },
});

// ============================================
// UNIFIED EDITOR (OVERLEAF-STYLE) - Aliases for backward compatibility
// ============================================

export const getUnifiedSolution = query({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.union(
    v.object({
      _id: v.id("solutions"),
      problemId: v.id("problems"),
      contentJson: v.any(),
      lastEditedBy: v.union(v.id("userProfiles"), v.null()),
      lastEditedAt: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const solution = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .first();

    if (!solution) return null;

    const problem = await ctx.db.get(args.problemId);
    if (!problem) return null;

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) return null;

    await requireViewAccessToClass(ctx, assignment.classId);

    return {
      _id: solution._id,
      problemId: solution.problemId,
      contentJson: solution.contentJson,
      lastEditedBy: solution.lastEditedBy ?? null,
      lastEditedAt: solution.lastEditedAt ?? null,
    };
  },
});

export const updateUnifiedSolution = mutation({
  args: {
    problemId: v.id("problems"),
    contentJson: v.any(),
  },
  returns: v.object({ solutionId: v.id("solutions") }),
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("Problem not found");

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const editorId = await requireClassOwner(ctx, assignment.classId);

    // Get or create solution
    let solution = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .first();

    if (solution) {
      // Create audit log entry
      await ctx.db.insert("auditLogs", {
        classId: assignment.classId,
        problemId: args.problemId,
        editorId,
        oldContentJson: solution.contentJson,
        newContentJson: args.contentJson,
        timestamp: Date.now(),
      });

      // Update existing solution
      await ctx.db.patch(solution._id, {
        contentJson: args.contentJson,
        lastEditedBy: editorId,
        lastEditedAt: Date.now(),
      });
      return { solutionId: solution._id };
    } else {
      // Create new solution
      const solutionId: Id<"solutions"> = await ctx.db.insert("solutions", {
        problemId: args.problemId,
        contentJson: args.contentJson,
        lastEditedBy: editorId,
        lastEditedAt: Date.now(),
      });
      return { solutionId };
    }
  },
});

export const createCheckpoint = mutation({
  args: {
    problemId: v.id("problems"),
    versionTag: v.string(),
  },
  returns: v.object({ checkpointId: v.id("editorCheckpoints") }),
  handler: async (ctx, args) => {
    const problem = await ctx.db.get(args.problemId);
    if (!problem) throw new Error("Problem not found");

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const editorId = await requireClassOwner(ctx, assignment.classId);

    // Get current solution
    const solution = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", args.problemId))
      .first();

    if (!solution) throw new Error("No solution to checkpoint");

    // Create checkpoint
    const checkpointId: Id<"editorCheckpoints"> = await ctx.db.insert(
      "editorCheckpoints",
      {
        problemId: args.problemId,
        versionTag: args.versionTag,
        contentJson: solution.contentJson,
        createdBy: editorId,
        createdAt: Date.now(),
      },
    );

    return { checkpointId };
  },
});

export const listCheckpoints = query({
  args: {
    problemId: v.id("problems"),
  },
  returns: v.array(
    v.object({
      _id: v.id("editorCheckpoints"),
      versionTag: v.string(),
      createdBy: v.id("userProfiles"),
      createdAt: v.number(),
      creatorName: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const checkpoints = await ctx.db
      .query("editorCheckpoints")
      .withIndex("by_problemId_and_createdAt", (q) =>
        q.eq("problemId", args.problemId),
      )
      .order("desc")
      .collect();

    const results = await Promise.all(
      checkpoints.map(async (checkpoint) => {
        const creator = await ctx.db.get(checkpoint.createdBy);
        return {
          _id: checkpoint._id,
          versionTag: checkpoint.versionTag,
          createdBy: checkpoint.createdBy,
          createdAt: checkpoint.createdAt,
          creatorName: creator?.name ?? "Unknown",
        };
      }),
    );

    return results;
  },
});

export const revertToCheckpoint = mutation({
  args: {
    checkpointId: v.id("editorCheckpoints"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const checkpoint = await ctx.db.get(args.checkpointId);
    if (!checkpoint) throw new Error("Checkpoint not found");

    const problem = await ctx.db.get(checkpoint.problemId);
    if (!problem) throw new Error("Problem not found");

    const assignment = await ctx.db.get(problem.assignmentId);
    if (!assignment) throw new Error("Assignment not found");

    const editorId = await requireClassOwner(ctx, assignment.classId);

    // Get current solution
    const solution = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", checkpoint.problemId))
      .first();

    if (solution) {
      // Create audit log entry
      await ctx.db.insert("auditLogs", {
        classId: assignment.classId,
        problemId: checkpoint.problemId,
        editorId,
        oldContentJson: solution.contentJson,
        newContentJson: checkpoint.contentJson,
        timestamp: Date.now(),
      });

      // Update existing solution with checkpoint content
      await ctx.db.patch(solution._id, {
        contentJson: checkpoint.contentJson,
        lastEditedBy: editorId,
        lastEditedAt: Date.now(),
      });
    } else {
      // Create new solution from checkpoint
      await ctx.db.insert("solutions", {
        problemId: checkpoint.problemId,
        contentJson: checkpoint.contentJson,
        lastEditedBy: editorId,
        lastEditedAt: Date.now(),
      });
    }

    return null;
  },
});

// ============================================
// STUDENT ACCESS QUERIES
// ============================================

async function requireActiveMembershipForCRN(
  ctx: any,
  crnId: Id<"crns">,
) {
  const authUserId = await getAuthUserId(ctx);
  if (authUserId === null) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_authUserId", (q: any) => q.eq("authUserId", authUserId))
    .first();
  if (!profile) throw new Error("Profile not found");

  const membership = await ctx.db
    .query("classMembers")
    .withIndex("by_crnId_and_userId", (q: any) =>
      q.eq("crnId", crnId).eq("userId", profile._id),
    )
    .first();

  if (!membership || membership.status !== "active") {
    throw new Error("Not a member of this class");
  }

  const crn = await ctx.db.get(crnId);
  if (!crn) throw new Error("CRN not found");

  const klass = await ctx.db.get(crn.classId);
  if (!klass) throw new Error("Class not found");

  return { profile, membership, crn, klass };
}

export const getStudentCRNDashboard = query({
  args: { crnId: v.id("crns") },
  returns: v.object({
    crn: v.any(),
    class: v.any(),
    membership: v.any(),
    assignments: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    const { crn, klass, membership } = await requireActiveMembershipForCRN(ctx, args.crnId);

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_classId", (q) => q.eq("classId", crn.classId))
      .collect();

    return {
      crn,
      class: klass,
      membership,
      assignments: assignments.sort((a, b) => a.order - b.order),
    };
  },
});

export const getStudentAssignment = query({
  args: {
    crnId: v.id("crns"),
    assignmentId: v.id("assignments"),
  },
  returns: v.object({
    assignment: v.any(),
    problems: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    const { crn } = await requireActiveMembershipForCRN(ctx, args.crnId);

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.classId !== crn.classId) {
      throw new Error("Assignment not found in this class");
    }

    const problems = await ctx.db
      .query("problems")
      .withIndex("by_assignmentId", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    return {
      assignment,
      problems: problems.sort((a, b) => a.order - b.order),
    };
  },
});

export const getStudentProblemByNumber = query({
  args: {
    crnId: v.id("crns"),
    assignmentId: v.id("assignments"),
    problemNumber: v.number(),
  },
  returns: v.object({
    problem: v.any(),
    solution: v.union(v.any(), v.null()),
    assignment: v.any(),
  }),
  handler: async (ctx, args) => {
    const { crn } = await requireActiveMembershipForCRN(ctx, args.crnId);

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.classId !== crn.classId) {
      throw new Error("Assignment not found in this class");
    }

    const problem = await ctx.db
      .query("problems")
      .withIndex("by_assignmentId", (q) => q.eq("assignmentId", args.assignmentId))
      .filter((q) => q.eq(q.field("problemNumber"), args.problemNumber))
      .first();

    if (!problem) throw new Error("Problem not found");

    const solution = await ctx.db
      .query("solutions")
      .withIndex("by_problemId", (q) => q.eq("problemId", problem._id))
      .first();

    return {
      problem,
      solution: solution ?? null,
      assignment,
    };
  },
});
