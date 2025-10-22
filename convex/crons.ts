import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Bridge internal action to call the public action (crons must call internal functions)
export const runDailyGmailCheck = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(internal.gmail.checkBookingEmailsForAllUsers, {});
    return null;
  },
});

const crons = cronJobs();

// Every day at 2:00 AM UTC
crons.cron("daily gmail check", "0 2 * * *", internal.crons.runDailyGmailCheck, {});

export default crons;


