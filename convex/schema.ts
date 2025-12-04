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
    lastGmailCheckAt: v.optional(v.number()),
  })
    .index("by_clerkUserId", ["clerkUserId"]) 
    .index("by_email", ["email"]),
  bookingEmails: defineTable({
    userId: v.id("users"),
    gmailMessageId: v.string(),
    subject: v.string(),
    body: v.string(),
    bodyHtml: v.optional(v.string()),
    receivedAt: v.number(),
    sender: v.string(),
    // AI analysis results
    isProcessed: v.optional(v.boolean()),
    processedAt: v.optional(v.number()),
    isHotelBooking: v.optional(v.boolean()),
    isCancellationConfirmation: v.optional(v.boolean()),
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
    analysisError: v.optional(v.string()),
    watcherId: v.optional(v.string()),
    cancellationStatus: v.optional(v.string()),
  })
   .index("by_user", ["userId"]) 
   .index("by_user_and_receivedAt", ["userId", "receivedAt"]) 
   .index("by_gmail_id", ["gmailMessageId"]) 
   .index("by_processed", ["isProcessed"]) 
   .index("by_watcher_id", ["watcherId"]) 
   .index("by_confirmation_reference", ["confirmationReference"]),

    // Store price check results (without email notification fields)
  priceChecks: defineTable({
    userId: v.id("users"),
    bookingEmailId: v.id("bookingEmails"),
    hotelName: v.string(),
    checkInDate: v.string(),
    checkOutDate: v.string(),
    originalPrice: v.string(),
    currentPrice: v.optional(v.string()),
    lastCheckedAt: v.number(),
    priceDropDetected: v.optional(v.boolean()),
    isActive: v.boolean(),
  }).index("by_user", ["userId"])
   .index("by_booking_email", ["bookingEmailId"])
   .index("by_active", ["isActive"]),
});