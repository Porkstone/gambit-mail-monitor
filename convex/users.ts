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

export const listBookingMessages = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("bookingEmails"),
      _creationTime: v.number(),
      subject: v.string(),
      sender: v.string(),
      receivedAt: v.number(),
      bodyHtml: v.optional(v.string()),
      isProcessed: v.optional(v.boolean()),
      processedAt: v.optional(v.number()),
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
      watcherId: v.optional(v.string()),
      analysisError: v.optional(v.string()),
      cancellationStatus: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return [];

    const clerkUserId = identity.subject;
    if (!clerkUserId)
      return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user)
      return [];

    const messages = await ctx.db
      .query("bookingEmails")
      .withIndex("by_user_and_receivedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return messages.map((m) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      subject: m.subject,
      sender: m.sender,
      receivedAt: m.receivedAt,
      bodyHtml: m.bodyHtml,
      isProcessed: m.isProcessed,
      processedAt: m.processedAt,
      isHotelBooking: m.isHotelBooking,
      isCancelable: m.isCancelable,
      cancelableUntil: m.cancelableUntil,
      customerName: m.customerName,
      checkInDate: m.checkInDate,
      checkOutDate: m.checkOutDate,
      totalCost: m.totalCost,
      hotelName: m.hotelName,
      hotelAddress: m.hotelAddress,
      pinNumber: m.pinNumber,
      confirmationReference: m.confirmationReference,
      modifyBookingLink: m.modifyBookingLink,
      watcherId: m.watcherId,
      analysisError: m.analysisError,
      cancellationStatus: m.cancellationStatus,
    }));
  },
});


export const countReservations = query({
  args: {},
  returns: v.object({ count: v.number() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return { count: 0 };

    const clerkUserId = identity.subject;
    if (!clerkUserId)
      return { count: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user)
      return { count: 0 };

    // Count booking emails identified as hotel bookings for this user
    let count = 0;
    const cursor = ctx.db
      .query("bookingEmails")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    for await (const row of cursor)
      if (row.isHotelBooking === true)
        count++;

    return { count };
  },
});


