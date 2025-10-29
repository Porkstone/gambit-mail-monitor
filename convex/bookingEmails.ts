import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const deleteBookingEmail = mutation({
  args: { messageId: v.id("bookingEmails") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
    return null;
  },
});


