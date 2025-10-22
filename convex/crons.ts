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

export const runDailyAnalysis = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Fetch a batch of unprocessed messages, analyze them
    const ids = await ctx.runQuery(internal.gmailHelpers.listUnprocessedOrErrored, { limit: 50 });
    for (const id of ids)
      await ctx.runAction(internal.gemini.analyzeEmailInternal, { messageId: id }).catch(() => {});
    return null;
  },
});

// Every day at 4:00 AM UTC
crons.cron("daily analysis", "0 4 * * *", internal.crons.runDailyAnalysis, {});

export default crons;


