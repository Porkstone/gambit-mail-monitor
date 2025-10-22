import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const getUserWithTokens = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      gmailAccessToken: v.optional(v.string()),
      gmailRefreshToken: v.optional(v.string()),
      gmailTokenExpiry: v.optional(v.number()),
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
      email: user.email,
      gmailAccessToken: user.gmailAccessToken,
      gmailRefreshToken: user.gmailRefreshToken,
      gmailTokenExpiry: user.gmailTokenExpiry,
    };
  },
});

export const updateAccessToken = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    expiresIn: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { gmailAccessToken: args.accessToken };
    if (args.expiresIn !== undefined)
      patch.gmailTokenExpiry = Date.now() + args.expiresIn * 1000;
    await ctx.db.patch(args.userId, patch);
    return null;
  },
});

export const storeMessage = internalMutation({
  args: {
    userId: v.id("users"),
    gmailMessageId: v.string(),
    subject: v.string(),
    body: v.string(),
    bodyHtml: v.optional(v.string()),
    receivedAt: v.number(),
    sender: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookingEmails")
      .withIndex("by_gmail_id", (q) => q.eq("gmailMessageId", args.gmailMessageId))
      .unique();

    if (existing) {
      console.log("[Gmail] Message already exists:", args.gmailMessageId);
      return false;
    }

    await ctx.db.insert("bookingEmails", {
      userId: args.userId,
      gmailMessageId: args.gmailMessageId,
      subject: args.subject,
      body: args.body,
      bodyHtml: args.bodyHtml,
      receivedAt: args.receivedAt,
      sender: args.sender,
    });

    return true;
  },
});

export const getMessage = internalMutation({
  args: { messageId: v.id("bookingEmails") },
  returns: v.union(
    v.object({
      _id: v.id("bookingEmails"),
      body: v.optional(v.string()),
      bodyHtml: v.optional(v.string()),
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
      bodyHtml: message.bodyHtml,
    };
  },
});

export const storeAnalysisResult = internalMutation({
  args: {
    messageId: v.id("bookingEmails"),
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
      isProcessed: true,
      processedAt: Date.now(),
      isHotelBooking: args.analysisResult.isHotelBooking,
      isCancelable: args.analysisResult.isCancelable,
      cancelableUntil: args.analysisResult.cancelableUntil,
      customerName: args.analysisResult.customerName,
      checkInDate: args.analysisResult.checkInDate,
      checkOutDate: args.analysisResult.checkOutDate,
      totalCost: args.analysisResult.totalCost,
      hotelName: args.analysisResult.hotelName,
      hotelAddress: args.analysisResult.hotelAddress,
      pinNumber: args.analysisResult.pinNumber,
      confirmationReference: args.analysisResult.confirmationReference,
      modifyBookingLink: args.analysisResult.modifyBookingLink,
      analysisError: undefined,
    });
    console.log("[Gmail] Stored analysis result for message:", args.messageId);
    return null;
  },
});

export const storeAnalysisError = internalMutation({
  args: {
    messageId: v.id("bookingEmails"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      isProcessed: false,
      processedAt: Date.now(),
      analysisError: args.error,
    });
    console.log("[Gmail] Stored analysis error for message:", args.messageId, args.error);
    return null;
  },
});

export const getMessageForWatcher = internalMutation({
  args: { messageId: v.id("bookingEmails") },
  returns: v.union(
    v.object({
      _id: v.id("bookingEmails"),
      userId: v.id("users"),
      userEmail: v.optional(v.string()),
      isHotelBooking: v.optional(v.boolean()),
      hotelName: v.optional(v.string()),
      checkInDate: v.optional(v.string()),
      checkOutDate: v.optional(v.string()),
      totalCost: v.optional(v.string()),
      isCancelable: v.optional(v.boolean()),
      cancelableUntil: v.optional(v.string()),
      modifyBookingLink: v.optional(v.string()),
      pinNumber: v.optional(v.string()),
      watcherId: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.messageId);
    if (!m)
      return null;
    const user = await ctx.db.get(m.userId);
    return {
      _id: m._id,
      userId: m.userId,
      userEmail: user?.email,
      isHotelBooking: m.isHotelBooking,
      hotelName: m.hotelName,
      checkInDate: m.checkInDate,
      checkOutDate: m.checkOutDate,
      totalCost: m.totalCost,
      isCancelable: m.isCancelable,
      cancelableUntil: m.cancelableUntil,
      modifyBookingLink: m.modifyBookingLink,
      pinNumber: m.pinNumber,
      watcherId: m.watcherId,
    };
  },
});

export const setWatcherId = internalMutation({
  args: { messageId: v.id("bookingEmails"), watcherId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { watcherId: args.watcherId });
    return null;
  },
});

export const listUsersWithGmail = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      clerkUserId: v.string(),
      gmailAccessToken: v.optional(v.string()),
      gmailRefreshToken: v.optional(v.string()),
      gmailTokenExpiry: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const out: Array<{ _id: any; clerkUserId: string; gmailAccessToken?: string; gmailRefreshToken?: string; gmailTokenExpiry?: number; }> = [];
    for await (const u of ctx.db.query("users"))
      if (u.gmailAccessToken)
        out.push({ _id: u._id, clerkUserId: u.clerkUserId, gmailAccessToken: u.gmailAccessToken, gmailRefreshToken: u.gmailRefreshToken, gmailTokenExpiry: u.gmailTokenExpiry });
    return out;
  },
});

export const listUnprocessedOrErrored = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.id("bookingEmails")),
  handler: async (ctx, args) => {
    const ids: Array<Id<"bookingEmails">> = [];
    for await (const m of ctx.db.query("bookingEmails")) {
      if ((m.isProcessed !== true) || (m.analysisError && m.analysisError.length > 0)) {
        ids.push(m._id);
        if (ids.length >= args.limit)
          break;
      }
    }
    return ids;
  },
});

export const listEligibleForWatcher = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.id("bookingEmails")),
  handler: async (ctx, args) => {
    const ids: Array<Id<"bookingEmails">> = [];
    for await (const m of ctx.db.query("bookingEmails")) {
      if (!m.watcherId && m.isHotelBooking === true && m.isCancelable === true && m.hotelName && m.checkInDate && m.checkOutDate && m.totalCost && m.pinNumber && m.modifyBookingLink && m.cancelableUntil) {
        ids.push(m._id);
        if (ids.length >= args.limit)
          break;
      }
    }
    return ids;
  },
});

