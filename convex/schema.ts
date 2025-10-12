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
});
