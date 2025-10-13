"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeminiAnalysisResult {
  isHotelBooking?: boolean;
  isCancelable?: boolean;
  cancelableUntil?: string;
  customerName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalCost?: string;
  hotelName?: string;
  hotelAddress?: string;
  pinNumber?: string;
  confirmationReference?: string;
  modifyBookingLink?: string;
}

export const analyzeEmailWithGemini = action({
  args: {
    messageId: v.id("bookingEmails"),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error("Not authenticated");

    const message = await ctx.runMutation(internal.gmailHelpers.getMessage, {
      messageId: args.messageId,
    });

    if (!message) {
      await ctx.runMutation(internal.gmailHelpers.storeAnalysisError, {
        messageId: args.messageId,
        error: "Message not found",
      });
      return { success: false, error: "Message not found" };
    }

    const html = message.bodyHtml ?? "";
    const text = message.body ?? "";
    const contentToAnalyze = html.trim().length > 0 ? html : text;
    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
      await ctx.runMutation(internal.gmailHelpers.storeAnalysisError, {
        messageId: args.messageId,
        error: "No email content to analyze",
      });
      return { success: false, error: "No email content to analyze" };
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.gmailHelpers.storeAnalysisError, {
        messageId: args.messageId,
        error: "GOOGLE_GENERATIVE_AI_API_KEY not configured",
      });
      return { success: false, error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" };
    }

    const prompt = `Please analyze the following HTML email content and answer these questions. Return your response as a JSON object with the exact field names specified:

1. Is this email a confirmation of a hotel booking reservation? (boolean field: "isHotelBooking")
2. Is this booking cancelable? (boolean field: "isCancelable") 
3. Up till which date is booking cancelable? (string field: "cancelableUntil")
4. What is the customer name who made the booking? (string field: "customerName")
5. What is the check-in date? (string field: "checkInDate")
6. What is the check-out date? (string field: "checkOutDate")
7. What is the total cost? (string field: "totalCost")
8. What is the hotel name? (string field: "hotelName")
9. What is the hotel address? (string field: "hotelAddress")
10. What is the pin number? (string field: "pinNumber")
11. What is the confirmation reference? (string field: "confirmationReference")
12. What is the link to modify or cancel the booking? (string field: "modifyBookingLink")

Return ONLY a valid JSON object with these exact field names. If information is not available, use null for that field. For dates, use ISO format (YYYY-MM-DD) when possible.

Email content:
${contentToAnalyze}`;

    try {
      console.log("[Gemini] Calling Gemini API (client) for message:", args.messageId);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textContent = response.text();
      if (!textContent) {
        await ctx.runMutation(internal.gmailHelpers.storeAnalysisError, {
          messageId: args.messageId,
          error: "No content in Gemini response",
        });
        return { success: false, error: "No content in Gemini response" };
      }

      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        await ctx.runMutation(internal.gmailHelpers.storeAnalysisError, {
          messageId: args.messageId,
          error: "Could not extract JSON from response",
        });
        return { success: false, error: "Could not extract JSON from response" };
      }

      const raw: GeminiAnalysisResult = JSON.parse(jsonMatch[0]);
      const analysisResult: GeminiAnalysisResult = {
        isHotelBooking: raw.isHotelBooking ?? undefined,
        isCancelable: raw.isCancelable ?? undefined,
        cancelableUntil: raw.cancelableUntil ?? undefined,
        customerName: raw.customerName ?? undefined,
        checkInDate: raw.checkInDate ?? undefined,
        checkOutDate: raw.checkOutDate ?? undefined,
        totalCost: raw.totalCost ?? undefined,
        hotelName: raw.hotelName ?? undefined,
        hotelAddress: raw.hotelAddress ?? undefined,
        pinNumber: raw.pinNumber ?? undefined,
        confirmationReference: raw.confirmationReference ?? undefined,
        modifyBookingLink: raw.modifyBookingLink ?? undefined,
      };
      console.log("[Gemini] Analysis result:", analysisResult);

      await ctx.runMutation(internal.gmailHelpers.storeAnalysisResult, {
        messageId: args.messageId,
        analysisResult,
      });

      return { success: true };
    } catch (err) {
      console.error("[Gemini] Error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.gmailHelpers.storeAnalysisError, {
        messageId: args.messageId,
        error: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  },
});

