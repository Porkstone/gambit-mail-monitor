import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserWithTokens = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      gmailAccessToken: v.optional(v.string()),
      gmailRefreshToken: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!user)
      return null;

    return {
      _id: user._id,
      gmailAccessToken: user.gmailAccessToken,
      gmailRefreshToken: user.gmailRefreshToken,
    };
  },
});

export const storeMessage = internalMutation({
  args: {
    userId: v.id("users"),
    gmailMessageId: v.string(),
    threadId: v.string(),
    subject: v.optional(v.string()),
    from: v.optional(v.string()),
    date: v.optional(v.number()),
    snippet: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_gmailMessageId", (q) => q.eq("gmailMessageId", args.gmailMessageId))
      .unique();

    if (existing) {
      console.log("[Gmail] Message already exists:", args.gmailMessageId);
      return false;
    }

    await ctx.db.insert("messages", {
      userId: args.userId,
      gmailMessageId: args.gmailMessageId,
      threadId: args.threadId,
      subject: args.subject,
      from: args.from,
      date: args.date,
      snippet: args.snippet,
      body: args.body,
    });

    return true;
  },
});

export const getMessage = internalMutation({
  args: { messageId: v.id("messages") },
  returns: v.union(
    v.object({
      _id: v.id("messages"),
      body: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message)
      return null;

    return {
      _id: message._id,
      body: message.body,
    };
  },
});

export const storeAnalysisResult = internalMutation({
  args: {
    messageId: v.id("messages"),
    analysisResult: v.object({
      isHotelBooking: v.optional(v.boolean()),
      isCancelable: v.optional(v.boolean()),
      cancelableUntil: v.optional(v.string()),
      customerName: v.optional(v.string()),
      checkInDate: v.optional(v.string()),
      checkOutDate: v.optional(v.string()),
      totalCost: v.optional(v.string()),
      hotelName: v.optional(v.string()),
      hotelAddress: v.optional(v.string()),
      pinNumber: v.optional(v.string()),
      confirmationReference: v.optional(v.string()),
      modifyBookingLink: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      analysisResult: args.analysisResult,
      analysisError: undefined,
    });
    console.log("[Gmail] Stored analysis result for message:", args.messageId);
    return null;
  },
});

export const storeAnalysisError = internalMutation({
  args: {
    messageId: v.id("messages"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      analysisError: args.error,
    });
    console.log("[Gmail] Stored analysis error for message:", args.messageId, args.error);
    return null;
  },
});

