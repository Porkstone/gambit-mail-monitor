"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function parsePrice(amountText: string | undefined): { amount?: number; currency?: string } {
  if (!amountText)
    return {};
  const known: Record<string, string> = { "€": "EUR", "$": "USD", "£": "GBP" };
  let currency: string | undefined;
  for (const sym of Object.keys(known))
    if (amountText.includes(sym)) {
      currency = known[sym];
      break;
    }
  if (!currency) {
    const upper = amountText.toUpperCase();
    if (upper.includes("EUR")) currency = "EUR";
    else if (upper.includes("USD")) currency = "USD";
    else if (upper.includes("GBP")) currency = "GBP";
  }

  // Extract numeric value with support for commas/dots
  const cleaned = amountText.replace(/[^0-9.,]/g, "");
  let amount: number | undefined;
  if (cleaned.includes(",") && !cleaned.includes("."))
    amount = Number.parseFloat(cleaned.replace(/,/g, "."));
  else
    amount = Number.parseFloat(cleaned.replace(/,/g, ""));

  if (!Number.isFinite(amount))
    amount = undefined;

  return { amount, currency };
}

function monthNameToNumber(m: string): number | undefined {
  const lower = m.toLowerCase();
  const map: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  return map[lower];
}

function normalizeToYMD(input: string | undefined): string | undefined {
  if (!input)
    return undefined;
  // Strip bracketed timezone or annotations like [CET]
  const s = input.replace(/\[[^\]]*\]/g, "").trim();
  // Already YYYY-MM-DD
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso)
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // YYYY/MM/DD
  const ymdSlash = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (ymdSlash) {
    const y = ymdSlash[1];
    const m = ymdSlash[2].padStart(2, "0");
    const d = ymdSlash[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Month DD, YYYY (optionally with time suffix, which we ignore)
  const monthDayYear = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthDayYear) {
    const monthNum = monthNameToNumber(monthDayYear[1]);
    const d = monthDayYear[2].padStart(2, "0");
    const y = monthDayYear[3];
    if (monthNum)
      return `${y}-${String(monthNum).padStart(2, "0")}-${d}`;
  }
  // DD Month YYYY
  const dayMonthYear = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dayMonthYear) {
    const d = dayMonthYear[1].padStart(2, "0");
    const monthNum = monthNameToNumber(dayMonthYear[2]);
    const y = dayMonthYear[3];
    if (monthNum)
      return `${y}-${String(monthNum).padStart(2, "0")}-${d}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY (assume day-first)
  const dmy = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }
  // Fallback: Date.parse
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return undefined;
}

export const createWatcher = action({
  args: {
    messageId: v.id("bookingEmails"),
  },
  returns: v.object({ success: v.boolean(), watcherId: v.optional(v.string()), error: v.optional(v.string()) }),
  handler: async (ctx, args): Promise<{ success: boolean; watcherId?: string; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return { success: false as const, error: "Not authenticated" };

    const details: ({
      _id: Id<"bookingEmails">;
      userId: Id<"users">;
      isHotelBooking?: boolean;
      hotelName?: string;
      checkInDate?: string;
      checkOutDate?: string;
      totalCost?: string;
      isCancelable?: boolean;
      cancelableUntil?: string;
      modifyBookingLink?: string;
      pinNumber?: string;
      watcherId?: string;
    }) | null = await ctx.runMutation(internal.gmailHelpers.getMessageForWatcher, { messageId: args.messageId });
    if (!details)
      return { success: false as const, error: "Message not found" };
    if (details.watcherId)
      return { success: true as const, watcherId: details.watcherId };
    if (details.isHotelBooking !== true)
      return { success: false as const, error: "Not a hotel booking" };

    const { amount, currency } = parsePrice(details.totalCost);

    if (!details.hotelName || !details.checkInDate || !details.checkOutDate || amount === undefined || !currency)
      return { success: false as const, error: "Missing required booking fields" };

    const normalizedCancelBy = normalizeToYMD(details.cancelableUntil);
    if (!normalizedCancelBy)
      return { success: false as const, error: "Missing cancel-by date" };

    const body: Record<string, unknown> = {
      email: identity.email ?? undefined,
      hotelName: details.hotelName,
      checkInDate: details.checkInDate,
      checkOutDate: details.checkOutDate,
      userPriceAmount: amount,
      userPriceCurrencyCode: currency,
      cancellationExpiryDate: normalizedCancelBy,
      modifyBookingLink: details.modifyBookingLink,
      pinNumber: details.pinNumber,
    };

    const res = await fetch("https://successful-elephant-302.convex.site/api/watchers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    let data: { success?: boolean; watcherId?: string } = {};
    if (res.ok)
      data = await res.json().catch(() => ({}));
    if (!res.ok || data.success !== true) {
      const errText = await res.text().catch(() => "");
      return { success: false as const, error: `Watcher create failed (${res.status}) ${errText}` };
    }

    const watcherId = data.watcherId;
    if (watcherId)
      await ctx.runMutation(internal.gmailHelpers.setWatcherId, { messageId: args.messageId, watcherId });

    return { success: true as const, watcherId };
  },
});


export const createWatcherInternal = internalAction({
  args: {
    messageId: v.id("bookingEmails"),
  },
  returns: v.object({ success: v.boolean(), watcherId: v.optional(v.string()), error: v.optional(v.string()) }),
  handler: async (ctx, args): Promise<{ success: boolean; watcherId?: string; error?: string }> => {
    const details: ({
      _id: Id<"bookingEmails">;
      userId: Id<"users">;
      userEmail?: string;
      isHotelBooking?: boolean;
      hotelName?: string;
      checkInDate?: string;
      checkOutDate?: string;
      totalCost?: string;
      isCancelable?: boolean;
      cancelableUntil?: string;
      modifyBookingLink?: string;
      pinNumber?: string;
      watcherId?: string;
    }) | null = await ctx.runMutation(internal.gmailHelpers.getMessageForWatcher, { messageId: args.messageId });
    if (!details)
      return { success: false as const, error: "Message not found" };
    if (details.watcherId)
      return { success: true as const, watcherId: details.watcherId };
    if (details.isHotelBooking !== true)
      return { success: false as const, error: "Not a hotel booking" };

    const { amount, currency } = parsePrice(details.totalCost);

    if (!details.hotelName || !details.checkInDate || !details.checkOutDate || amount === undefined || !currency)
      return { success: false as const, error: "Missing required booking fields" };

    const normalizedCancelBy = normalizeToYMD(details.cancelableUntil);
    if (!normalizedCancelBy)
      return { success: false as const, error: "Missing cancel-by date" };

    const body: Record<string, unknown> = {
      email: details.userEmail ?? undefined,
      hotelName: details.hotelName,
      checkInDate: details.checkInDate,
      checkOutDate: details.checkOutDate,
      userPriceAmount: amount,
      userPriceCurrencyCode: currency,
      cancellationExpiryDate: normalizedCancelBy,
      modifyBookingLink: details.modifyBookingLink,
      pinNumber: details.pinNumber,
    };

    const res = await fetch("https://successful-elephant-302.convex.site/api/watchers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    let data: { success?: boolean; watcherId?: string } = {};
    if (res.ok)
      data = await res.json().catch(() => ({}));
    if (!res.ok || data.success !== true) {
      const errText = await res.text().catch(() => "");
      return { success: false as const, error: `Watcher create failed (${res.status}) ${errText}` };
    }

    const watcherId = data.watcherId;
    if (watcherId)
      await ctx.runMutation(internal.gmailHelpers.setWatcherId, { messageId: args.messageId, watcherId });

    return { success: true as const, watcherId };
  },
});


export const getWatcherIdByConfirmationRef = action({
  args: { confirmationReference: v.string() },
  returns: v.union(v.object({ watcherId: v.string() }), v.null()),
  handler: async (ctx, args): Promise<{ watcherId: string } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;
    const res: { watcherId: string } | null = await ctx.runQuery(
      internal.watchersQueries.getWatcherIdByConfirmationRefQ,
      { confirmationReference: args.confirmationReference }
    );
    return res;
  },
});

