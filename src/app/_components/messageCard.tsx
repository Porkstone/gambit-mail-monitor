"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

type MessageProps = {
  message: {
    _id: Id<"bookingEmails">;
    _creationTime: number;
    subject: string;
    sender: string;
    receivedAt: number;
    bodyHtml?: string;
    isProcessed?: boolean;
    processedAt?: number;
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
    analysisError?: string;
  };
};

export default function MessageCard({ message }: MessageProps) {
  const analyzeEmail = useAction(api.gemini.analyzeEmailWithGemini);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-300 dark:border-slate-700">
      <p className="font-semibold text-sm">{message.subject || "(No subject)"}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
        From: {message.sender || "Unknown"}
      </p>
      {message.receivedAt ? (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Date: {new Date(message.receivedAt).toLocaleString()}
        </p>
      ) : null}

      {message.subject ? (
        <p className="text-xs mt-2 text-slate-700 dark:text-slate-300">{message.subject}</p>
      ) : null}

      <button
        className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        disabled={isAnalyzing}
        onClick={async () => {
          setIsAnalyzing(true);
          try {
            await analyzeEmail({ messageId: message._id });
          } finally {
            setIsAnalyzing(false);
          }
        }}
      >
        {isAnalyzing ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
            Analysing...
          </span>
        ) : (
          "Analyse now"
        )}
      </button>

      {message.bodyHtml ? (
        <button
          className="mt-2 ml-2 bg-slate-600 text-white px-3 py-1 rounded text-xs hover:bg-slate-700"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? "Hide Preview" : "Preview"}
        </button>
      ) : null}

      {message.analysisError ? (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-xs text-red-800 dark:text-red-200">
          Error: {message.analysisError}
        </div>
      ) : null}

      {message.isProcessed ? (
        message.isHotelBooking ? (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900 rounded text-xs">
            <p className="font-semibold mb-1 text-green-800 dark:text-green-200">Analysis Results:</p>
            <div className="space-y-1 text-green-700 dark:text-green-300">
              <p>
                <strong>Hotel Booking:</strong> Yes
              </p>
              {message.hotelName ? <p><strong>Hotel:</strong> {message.hotelName}</p> : null}
              {message.customerName ? <p><strong>Guest:</strong> {message.customerName}</p> : null}
              {message.checkInDate ? <p><strong>Check-in:</strong> {message.checkInDate}</p> : null}
              {message.checkOutDate ? <p><strong>Check-out:</strong> {message.checkOutDate}</p> : null}
              {message.totalCost ? <p><strong>Total Cost:</strong> {message.totalCost}</p> : null}
              {message.isCancelable !== undefined ? (
                <p>
                  <strong>Cancelable:</strong> {message.isCancelable ? "Yes" : "No"}
                </p>
              ) : null}
              {message.cancelableUntil ? (
                <p><strong>Cancel by:</strong> {message.cancelableUntil}</p>
              ) : null}
              {message.confirmationReference ? (
                <p><strong>Confirmation:</strong> {message.confirmationReference}</p>
              ) : null}
              {message.pinNumber ? <p><strong>PIN:</strong> {message.pinNumber}</p> : null}
              {message.hotelAddress ? <p><strong>Address:</strong> {message.hotelAddress}</p> : null}
              {message.modifyBookingLink ? (
                <p>
                  <strong>Modify:</strong> <a href={message.modifyBookingLink} target="_blank" rel="noopener noreferrer" className="underline">Link</a>
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs">
            <p className="font-semibold mb-1 text-slate-800 dark:text-slate-200">Analysis Results:</p>
            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <p>
                <strong>Hotel Booking:</strong> No
              </p>
            </div>
          </div>
        )
      ) : null}

      {showPreview && message.bodyHtml ? (
        <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded">
          <iframe
            className="w-full h-64 bg-white"
            srcDoc={message.bodyHtml}
            sandbox="allow-same-origin"
            title={`preview-${message._id}`}
          />
        </div>
      ) : null}
    </div>
  );
}


