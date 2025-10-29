import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const crons = cronJobs();

// Every day at 2:00 AM UTC
crons.cron("daily gmail check", "0 2 * * *", internal.crons.runDailyGmailCheck, {});
// Every day at 2:00 AM UTC
crons.cron("daily analysis", "0 4 * * *", internal.crons.runDailyAnalysis, {});
// Every day at 5:00 AM UTC
crons.cron("daily watcher creation", "0 5 * * *", internal.crons.runDailyWatcherCreation, {});

export default crons;





// Bridge internal action to call the public action (crons must call internal functions)
export const runDailyGmailCheck = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(internal.gmail.checkBookingEmailsForAllUsers, {});
    return null;
  },
});



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


export const runDailyAnalysisTest = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(internal.gmail.checkBookingEmailsForAllUsers, {});
    return null;
  },
});


export const runDailyWatcherCreation = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.gmailHelpers.listEligibleForWatcher, { limit: 50 });
    for (const id of ids)
      await ctx.runAction(internal.watchers.createWatcherInternal, { messageId: id }).catch(() => {});
    return null;
  },
});



