import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  console.log("[Gmail Callback] Starting callback processing");
  const { userId } = await auth();
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  console.log("[Gmail Callback] userId:", userId);
  console.log("[Gmail Callback] state:", state);
  console.log("[Gmail Callback] code:", code ? "present" : "missing");
  console.log("[Gmail Callback] error:", error);

  if (error) {
    console.log("[Gmail Callback] OAuth error from Google:", error);
    return NextResponse.redirect(new URL(`/?error=${error}`, req.url));
  }

  if (!userId || state !== userId) {
    console.log("[Gmail Callback] Unauthorized - userId mismatch");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!code) {
    console.log("[Gmail Callback] Missing authorization code");
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;

  console.log("[Gmail Callback] Client ID:", clientId ? "present" : "missing");
  console.log("[Gmail Callback] Client Secret:", clientSecret ? "present" : "missing");
  console.log("[Gmail Callback] Redirect URI:", redirectUri);

  if (!clientId || !clientSecret)
    return NextResponse.json({ error: "Missing Google credentials" }, { status: 500 });

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[Gmail Callback] Token exchange failed:", tokenResponse.status, errorData);
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
    }

    const tokens = await tokenResponse.json();
    console.log("[Gmail Callback] Token response:", {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in,
    });

    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token) {
      console.error("[Gmail Callback] No access token in response");
      return NextResponse.redirect(new URL("/?error=no_access_token", req.url));
    }

    console.log("[Gmail Callback] Getting Clerk JWT token...");
    const { getToken } = await auth();
    const clerkToken = await getToken({ template: "convex" });
    console.log("[Gmail Callback] Clerk JWT token:", clerkToken ? "present" : "missing");

    if (!clerkToken) {
      console.error("[Gmail Callback] Failed to get Clerk JWT token");
      return NextResponse.redirect(new URL("/?error=no_clerk_token", req.url));
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(clerkToken);

    console.log("[Gmail Callback] Calling Convex mutation to store tokens...");
    await convex.mutation(api.users.storeGmailTokens, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in ?? 3600,
    });

    console.log("[Gmail Callback] Tokens stored successfully!");
    return NextResponse.redirect(new URL("/?gmail=connected", req.url));
  } catch (err) {
    console.error("[Gmail Callback] Error:", err);
    console.error("[Gmail Callback] Error stack:", err instanceof Error ? err.stack : "no stack");
    return NextResponse.redirect(new URL("/?error=oauth_failed", req.url));
  }
}

