import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const listNumbers = query({
  // Validators for arguments.
  args: {
    count: v.number(),
  },
  returns: v.object({
    viewer: v.union(v.string(), v.null()),
    numbers: v.array(v.number()),
  }),

  // Query implementation.
  handler: async (ctx, args) => {
    //// Read the database as many times as you need here.
    //// See https://docs.convex.dev/database/reading-data.
    // Note: This is a demo function. The numbers table has been removed.
    // Returning empty data for demo purposes.
    const userId = await getAuthUserId(ctx);
    const user = userId === null ? null : await ctx.db.get("users", userId);
    return {
      viewer: user?.email ?? null,
      numbers: [],
    };
  },
});

// You can write data to the database via a mutation:
export const addNumber = mutation({
  // Validators for arguments.
  args: {
    value: v.number(),
  },
  returns: v.null(),

  // Mutation implementation.
  handler: async (ctx, args) => {
    //// Insert or modify documents in the database here.
    //// Mutations can also read from the database like queries.
    //// See https://docs.convex.dev/database/writing-data.

    // Note: This is a demo function. The numbers table has been removed.
    // This mutation now does nothing for demo purposes.
    console.log("Demo: Would add number:", args.value);
    // Optionally, return a value from your mutation.
    return null;
  },
});

// You can fetch data from and send data to third-party APIs via an action:
export const myAction = action({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },
  returns: v.null(),

  // Action implementation.
  handler: async (ctx, args) => {
    //// Use the browser-like `fetch` API to send HTTP requests.
    //// See https://docs.convex.dev/functions/actions#calling-third-party-apis-and-using-npm-packages.
    // const response = await ctx.fetch("https://api.thirdpartyservice.com");
    // const data = await response.json();

    //// Query data by running Convex queries.
    const data = await ctx.runQuery(api.myFunctions.listNumbers, {
      count: 10,
    });
    console.log(data);

    //// Write data by running Convex mutations.
    await ctx.runMutation(api.myFunctions.addNumber, {
      value: args.first,
    });
    return null;
  },
});

/**
 * Ensures a userProfile exists for the current authenticated user.
 * Creates one with "user" role if it doesn't exist.
 * This is idempotent - safe to call multiple times.
 */
export const ensureUserProfile = mutation({
  args: {},
  returns: v.union(v.id("userProfiles"), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", userId))
      .first();

    if (existingProfile) {
      return existingProfile._id;
    }

    // Get user info from auth table
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }

    // Create new profile with "user" role
    const profileId = await ctx.db.insert("userProfiles", {
      authUserId: userId,
      name: user.name ?? user.email ?? "User",
      email: user.email ?? "",
      role: "user",
    });

    return profileId;
  },
});

/**
 * Internal mutation to create userProfile (can be called from other functions).
 * Used for automatic profile creation.
 */
export const createUserProfile = internalMutation({
  args: {
    authUserId: v.id("users"),
  },
  returns: v.union(v.id("userProfiles"), v.null()),
  handler: async (ctx, args) => {
    console.log("createUserProfile called with userId:", args.authUserId);
    
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (existingProfile) {
      console.log("Profile already exists:", existingProfile._id);
      return existingProfile._id;
    }

    // Get user info from auth table
    const user = await ctx.db.get("users", args.authUserId);
    console.log("User from auth table:", user);
    
    if (!user) {
      console.error("User not found in auth table!");
      return null;
    }

    // Create new profile with "user" role
    const profileId = await ctx.db.insert("userProfiles", {
      authUserId: args.authUserId,
      name: user.name ?? user.email ?? "User",
      email: user.email ?? "",
      role: "user",
    });

    console.log("UserProfile created with ID:", profileId);
    return profileId;
  },
});
