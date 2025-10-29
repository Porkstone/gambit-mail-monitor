"use client";

import {
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
//
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignUpButton } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { useState } from "react";
import MessageCard from "./_components/messageCard";

export default function Home() {
  return (
    <>
      <main className="p-8 flex flex-col gap-8">
        {/* If user is signed out, show the sign in form */}
        <SignedOut>

          <h1 className="text-4xl font-bold text-center">
            Welcome and thanks for trying out Gambit mail monitor!
          </h1>
          <h2 className="text-2xl font-bold text-center">
            Please sign in to continue.
          </h2>
          <SignInForm />
        </SignedOut>

        {/* If user is signed in, show the home page */}
        <SignedIn>
          <h1 className="text-4xl font-bold text-center">
            Gambit
          </h1>
          
          <Content />
        </SignedIn>

      </main>
    </>
  );
}

function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <SignInButton mode="modal">
        <button className="bg-foreground text-background px-4 py-2 rounded-md">
          Sign in
        </button>
      </SignInButton>
      <div className="text-center">OR</div>
      <SignUpButton mode="modal" forceRedirectUrl="/welcome">
        <button className="bg-foreground text-background px-4 py-2 rounded-md">
          Sign up
        </button>
      </SignUpButton>
    </div>
  );
}

function Content() {
  const { viewer, numbers } =
    useQuery(api.myFunctions.listNumbers, {
      count: 10,
    }) ?? {};
  const addNumber = useMutation(api.myFunctions.addNumber);
  const gmailStatus = useQuery(api.users.getGmailConnectionStatus);
  const bookingMessages = useQuery(api.users.listBookingMessages);
  const checkEmails = useAction(api.gmail.checkBookingEmails);
  const analyzeEmail = useAction(api.gemini.analyzeEmailWithGemini);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);

  if (viewer === undefined || numbers === undefined || gmailStatus === undefined) {
    return (
      <div className="mx-auto">
        <p>loading... (consider a loading skeleton)</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      <div className="mx-auto bg-slate-200 dark:bg-slate-800 px-4 py-3 rounded-md">
      <p>Welcome {viewer ?? "Anonymous"}!</p>
      </div>
      
      <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Gmail Connection</h2>
        {gmailStatus.connected ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Gmail connected{gmailStatus.email ? ` (${gmailStatus.email})` : ""}
            </p>
            <button
              className="bg-foreground text-background px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                setCheckResult(null);
                try {
                  const result = await checkEmails({});
                  if (result.success)
                    setCheckResult(`Found ${result.newMessages} new message(s)`);
                  else
                    setCheckResult(`Error: ${result.error || "Unknown error"}`);
                } catch (err) {
                  setCheckResult(`Error: ${String(err)}`);
                } finally {
                  setChecking(false);
                }
              }}
            >
              {checking ? "Checking..." : "Check Now"}
            </button>
            {checkResult && (
              <p className="text-xs mt-1">{checkResult}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">Connect your Gmail account to monitor your emails.</p>
            <a
              href="/api/auth/gmail"
              className="bg-foreground text-background px-4 py-2 rounded-md text-center text-sm hover:opacity-90"
            >
              Connect Gmail
            </a>
          </div>
        )}
      </div>

      {gmailStatus.connected && bookingMessages && bookingMessages.length > 0 && (
        <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Booking.com Emails</h2>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              disabled={analyzingAll}
              onClick={async () => {
                setAnalyzingAll(true);
                try {
                  const toAnalyze = bookingMessages
                    .filter((m) => !m.isProcessed || m.analysisError);
                  for (const m of toAnalyze) {
                    await analyzeEmail({ messageId: m._id });
                  }
                } finally {
                  setAnalyzingAll(false);
                }
              }}
            >
              {analyzingAll ? "Analysing all..." : "Analyse all"}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {bookingMessages
              .filter((msg) => !msg.isProcessed || msg.isHotelBooking !== false || msg.isCancellationConfirmation === true)
              .map((msg) => (
                <MessageCard key={msg._id} message={msg} />
              ))}
          </div>
        </div>
      )}
    
      
      
     
      
    </div>
  );
}

function ResourceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-slate-200 dark:bg-slate-800 p-4 rounded-md h-28 overflow-auto">
      <a href={href} className="text-sm underline hover:no-underline">
        {title}
      </a>
      <p className="text-xs">{description}</p>
    </div>
  );
}
