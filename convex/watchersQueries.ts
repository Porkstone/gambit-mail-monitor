import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getWatcherIdByConfirmationRefQ = internalQuery({
  args: { confirmationReference: v.string() },
  returns: v.union(v.object({ watcherId: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const cursor = ctx.db
      .query("bookingEmails")
      .withIndex("by_confirmation_reference", (q) => q.eq("confirmationReference", args.confirmationReference));
    for await (const row of cursor)
      if (row.watcherId)
        return { watcherId: row.watcherId };
    return null;
  },
});


