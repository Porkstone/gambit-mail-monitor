"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Welcome() {
  return (
    <main className="p-8 flex flex-col gap-8 max-w-xl mx-auto text-center">
      
      <h1 className="text-4xl font-bold">Welcome!</h1>
      <p>
        Your account is ready. You can head to the home page to start using the
        app.
      </p>
      <div className="flex justify-center">
        <Link
          href="/"
          className="bg-foreground text-background px-4 py-2 rounded-md"
        >
          Go to Home
        </Link>
      </div>
    </main>
  );
}


