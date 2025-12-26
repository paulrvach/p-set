import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      console.log("afterUserCreatedOrUpdated callback fired", {
        userId: args.userId,
        existingUserId: args.existingUserId,
      });
      
      // Always try to create profile - the function is idempotent and will skip if exists
      console.log("Ensuring userProfile exists for user:", args.userId);
      try {
        await ctx.runMutation(internal.myFunctions.createUserProfile, {
          authUserId: args.userId,
        });
        console.log("UserProfile ensured successfully");
      } catch (error) {
        console.error("Failed to ensure userProfile:", error);
      }
    },
  },
});
