"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
    messageId: v.id("messages"),
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

    if (!message)
      return { success: false, error: "Message not found" };

    if (!message.body)
      return { success: false, error: "No email content to analyze" };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return { success: false, error: "GEMINI_API_KEY not configured" };

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
${message.body}`;

    try {
      console.log("[Gemini] Calling Gemini API for message:", args.messageId);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 1,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Gemini] API error:", response.status, errorText);
        await ctx.runMutation(internal.gmailHelpers.storeAnalysisError, {
          messageId: args.messageId,
          error: `Gemini API error: ${response.status}`,
        });
        return { success: false, error: `Gemini API error: ${response.status}` };
      }

      const data = await response.json();
      console.log("[Gemini] Response received");

      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
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

      const analysisResult: GeminiAnalysisResult = JSON.parse(jsonMatch[0]);
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

