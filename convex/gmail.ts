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

    const user: { _id: any; gmailAccessToken?: string; gmailRefreshToken?: string; gmailTokenExpiry?: number; } | null = await ctx.runMutation(internal.gmailHelpers.getUserWithTokens, { clerkUserId });
    if (!user)
      throw new Error("User not found");

    if (!user.gmailAccessToken)
      throw new Error("Gmail not connected");

    const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const afterDate = new Date(twelveMonthsAgo).toISOString().split('T')[0].replace(/-/g, '/');

    const query = `from:booking.com after:${afterDate}`;
    console.log("[Gmail] Searching with query:", query);

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    const FIVE_MIN = 5 * 60 * 1000;

    const refreshTokenIfNeeded = async (): Promise<string> => {
      if (!user.gmailAccessToken)
        throw new Error("Gmail not connected");

      const expiresAt = user.gmailTokenExpiry ?? 0;
      const willExpireSoon = Date.now() > (expiresAt - FIVE_MIN);

      if (!willExpireSoon)
        return user.gmailAccessToken;

      if (!user.gmailRefreshToken)
        throw new Error("Gmail session expired (no refresh token). Please reconnect Gmail.");

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)
        throw new Error("Server misconfigured: missing Google client credentials.");

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: user.gmailRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gmail refresh failed (${res.status}): ${errText || "Unknown error"}`);
      }

      const data = await res.json();
      const accessToken = data.access_token as string | undefined;
      const expiresIn = (data.expires_in as number | undefined) ?? 3600;

      if (!accessToken)
        throw new Error("Gmail refresh did not return an access token.");

      await ctx.runMutation(internal.gmailHelpers.updateAccessToken, {
        userId: user._id,
        accessToken,
        expiresIn,
      });

      user.gmailAccessToken = accessToken;
      user.gmailTokenExpiry = Date.now() + expiresIn * 1000;

      return accessToken;
    };

    const gmailFetch = async (url: string) => {
      let token = await refreshTokenIfNeeded();
      let resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (resp.status !== 401)
        return resp;

      // Try one forced refresh on 401
      if (!user.gmailRefreshToken)
        return resp;
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)
        return resp;

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: user.gmailRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok)
        return resp;

      const data = await res.json();
      const accessToken = data.access_token as string | undefined;
      const expiresIn = (data.expires_in as number | undefined) ?? 3600;

      if (!accessToken)
        return resp;

      await ctx.runMutation(internal.gmailHelpers.updateAccessToken, {
        userId: user._id,
        accessToken,
        expiresIn,
      });

      user.gmailAccessToken = accessToken;
      user.gmailTokenExpiry = Date.now() + expiresIn * 1000;

      token = accessToken;
      return await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    };

    try {
      const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;
      const searchResponse: Response = await gmailFetch(searchUrl);

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
        const messageResponse = await gmailFetch(messageUrl);

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
        let bodyHtml = "";
        const payload = messageData.payload;

        const decodeGmailBase64 = (data: string): string => {
          const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
          const pad = normalized.length % 4;
          const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
          return Buffer.from(padded, "base64").toString("utf-8");
        };

        const extractBodies = (p: any) => {
          if (!p)
            return;
          // If has data directly
          if (p.body?.data && p.mimeType) {
            const decoded = decodeGmailBase64(p.body.data);
            if (p.mimeType === "text/html" || p.mimeType.includes("html"))
              bodyHtml ||= decoded;
            if (p.mimeType === "text/plain")
              body ||= decoded;
          }
          // Recurse into parts (multipart/alternative etc.)
          if (Array.isArray(p.parts)) {
            for (const child of p.parts)
              extractBodies(child);
          }
        };

        extractBodies(payload);

        const stored = await ctx.runMutation(internal.gmailHelpers.storeMessage, {
          userId: user._id,
          gmailMessageId: messageData.id,
          subject: (subject ?? "").toString(),
          body: (body ?? "").substring(0, 10000),
          bodyHtml: (bodyHtml ?? "").substring(0, 10000),
          receivedAt: date ?? Date.now(),
          sender: (from ?? "").toString(),
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


