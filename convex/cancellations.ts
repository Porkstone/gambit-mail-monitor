import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const cancelHotelBooking = mutation({
  args: { watcherId: v.string() },
  returns: v.object({ found: v.boolean(), status: v.string() }),
  handler: async (ctx, args): Promise<{ found: boolean; status: string }> => {
    const record = await ctx.db
      .query("bookingEmails")
      .withIndex("by_watcher_id", (q) => q.eq("watcherId", args.watcherId))
      .unique();

    if (!record)
      return { found: false, status: "not_found" };

    await ctx.db.patch(record._id, { cancellationStatus: "Awaiting Cancellation" });
    return { found: true, status: "Awaiting Cancellation" };
  },
});


