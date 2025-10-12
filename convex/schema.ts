import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  users: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    gmailAccessToken: v.optional(v.string()),
    gmailRefreshToken: v.optional(v.string()),
    gmailTokenExpiry: v.optional(v.number()),
  })
    .index("by_clerkUserId", ["clerkUserId"]) 
    .index("by_email", ["email"]),
  messages: defineTable({
    userId: v.id("users"),
    gmailMessageId: v.string(),
    threadId: v.string(),
    subject: v.optional(v.string()),
    from: v.optional(v.string()),
    date: v.optional(v.number()),
    snippet: v.optional(v.string()),
    body: v.optional(v.string()),
    analysisResult: v.optional(v.object({
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
    })),
    analysisError: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_gmailMessageId", ["gmailMessageId"])
    .index("by_userId_and_date", ["userId", "date"]),
});
