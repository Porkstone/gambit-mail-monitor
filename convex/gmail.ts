"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const checkBookingEmails = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    newMessages: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx): Promise<{ success: boolean; newMessages: number; error?: string; }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error("Not authenticated");

    const clerkUserId = identity.subject;
    if (!clerkUserId)
      throw new Error("Missing Clerk subject");

    const user: { _id: any; gmailAccessToken?: string; gmailRefreshToken?: string; } | null = await ctx.runMutation(internal.gmailHelpers.getUserWithTokens, { clerkUserId });
    if (!user)
      throw new Error("User not found");

    if (!user.gmailAccessToken)
      throw new Error("Gmail not connected");

    const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const afterDate = new Date(twelveMonthsAgo).toISOString().split('T')[0].replace(/-/g, '/');

    const query = `from:booking.com after:${afterDate}`;
    console.log("[Gmail] Searching with query:", query);

    try {
      const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;
      const searchResponse: Response = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${user.gmailAccessToken}`,
        },
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("[Gmail] Search failed:", searchResponse.status, errorText);
        return { success: false, newMessages: 0, error: `Search failed: ${searchResponse.status}` };
      }

      const searchData = await searchResponse.json();
      const messages = searchData.messages || [];
      console.log("[Gmail] Found", messages.length, "messages");

      let newCount = 0;
      for (const msg of messages) {
        const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
        const messageResponse = await fetch(messageUrl, {
          headers: {
            Authorization: `Bearer ${user.gmailAccessToken}`,
          },
        });

        if (!messageResponse.ok) {
          console.error("[Gmail] Failed to fetch message:", msg.id);
          continue;
        }

        const messageData = await messageResponse.json();
        const headers = messageData.payload?.headers || [];
        
        const getHeader = (name: string) => {
          const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
          return header?.value;
        };

        const subject = getHeader("Subject");
        const from = getHeader("From");
        const dateStr = getHeader("Date");
        const date = dateStr ? new Date(dateStr).getTime() : undefined;

        let body = "";
        if (messageData.payload?.body?.data) {
          body = Buffer.from(messageData.payload.body.data, "base64").toString("utf-8");
        } else if (messageData.payload?.parts) {
          for (const part of messageData.payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
              body = Buffer.from(part.body.data, "base64").toString("utf-8");
              break;
            }
          }
        }

        const stored = await ctx.runMutation(internal.gmailHelpers.storeMessage, {
          userId: user._id,
          gmailMessageId: messageData.id,
          threadId: messageData.threadId,
          subject,
          from,
          date,
          snippet: messageData.snippet,
          body: body.substring(0, 10000),
        });

        if (stored)
          newCount++;
      }

      console.log("[Gmail] Stored", newCount, "new messages");
      return { success: true, newMessages: newCount };
    } catch (err) {
      console.error("[Gmail] Error:", err);
      return { success: false, newMessages: 0, error: String(err) };
    }
  },
});


