"use client";

import { ReactNode, useEffect, useRef } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <EnsureUserWithinProvider />
      {children}
    </ConvexProviderWithClerk>
  );
}

function EnsureUserWithinProvider() {
  const ensureUser = useMutation(api.users.ensureUser);
  const ensuredUserIdRef = useRef<string | null>(null);
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  useEffect(() => {
    if (!isLoaded)
      return;
    if (!isSignedIn || !userId)
      return;
    if (ensuredUserIdRef.current === userId)
      return;
    ensuredUserIdRef.current = userId;
    void (async () => {
      const jwt = await getToken({ template: "convex" }).catch(() => null);
      if (!jwt) {
        if (process.env.NODE_ENV !== "production")
          console.log("[EnsureUser] No JWT available for template 'convex'");
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        try {
          const base64Url = jwt.split(".")[1] ?? "";
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(atob(base64));
          console.log("[EnsureUser] JWT payload:", payload);
        } catch {
          console.log("[EnsureUser] Failed to decode JWT payload");
        }
      }
      await ensureUser({}).catch((err) => {
        if (process.env.NODE_ENV !== "production")
          console.log("[EnsureUser] ensureUser failed:", err);
        return undefined;
      });
    })();
  }, [isLoaded, isSignedIn, userId, ensureUser, getToken]);
  return null;
}
