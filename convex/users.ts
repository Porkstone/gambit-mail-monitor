import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const ensureUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("[users.ensureUser] identity:", identity);
    if (!identity)
      throw new Error("Not authenticated");

    const clerkUserId = identity.subject;
    const email = identity.email ?? undefined;
    const firstName = (identity as any).givenName ?? identity.name?.split(" ")[0] ?? undefined;
    const lastName = ((identity as any).familyName ?? identity.name?.split(" ").slice(1).join(" ")) || undefined;
    console.log("[users.ensureUser] derived:", { clerkUserId, email, firstName, lastName });
    if (!clerkUserId)
      throw new Error("Missing Clerk subject");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (existing)
      return existing._id;

    const userId = await ctx.db.insert("users", {
      clerkUserId,
      email,
      firstName,
      lastName,
    });
    console.log("[users.ensureUser] inserted userId:", userId);
    return userId;
  },
});


