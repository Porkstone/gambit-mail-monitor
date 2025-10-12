import { mutation, query } from "./_generated/server";
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

export const storeGmailTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresIn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error("Not authenticated");

    const clerkUserId = identity.subject;
    if (!clerkUserId)
      throw new Error("Missing Clerk subject");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user)
      throw new Error("User not found");

    const expiry = Date.now() + args.expiresIn * 1000;
    await ctx.db.patch(user._id, {
      gmailAccessToken: args.accessToken,
      gmailRefreshToken: args.refreshToken,
      gmailTokenExpiry: expiry,
    });

    console.log("[users.storeGmailTokens] stored tokens for user:", user._id);
    return null;
  },
});

export const getGmailConnectionStatus = query({
  args: {},
  returns: v.union(
    v.object({ connected: v.literal(true), email: v.optional(v.string()) }),
    v.object({ connected: v.literal(false) })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return { connected: false as const };

    const clerkUserId = identity.subject;
    if (!clerkUserId)
      return { connected: false as const };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user || !user.gmailAccessToken)
      return { connected: false as const };

    return { connected: true as const, email: user.email };
  },
});


