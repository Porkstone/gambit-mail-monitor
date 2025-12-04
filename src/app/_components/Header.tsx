"use client";

import Link from "next/link";
import { GambitLogo } from "./GambitLogo";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="relative z-20 w-full bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-4 flex items-center justify-between gap-8">
        <div className="flex items-center gap-12 flex-1">
          <Link href="/" aria-label="Go to home">
            <GambitLogo className="text-gray-900" />
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-8 shrink-0">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-gray-200 text-gray-500 group-hover:text-gray-700 flex items-center justify-center transition-colors">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                Log in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

