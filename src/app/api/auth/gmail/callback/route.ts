import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error)
    return NextResponse.redirect(new URL(`/?error=${error}`, req.url));

  if (!userId || state !== userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!code)
    return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;

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
      console.error("[Gmail OAuth] Token exchange failed:", errorData);
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token)
      return NextResponse.redirect(new URL("/?error=no_access_token", req.url));

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(await (await import("@clerk/nextjs/server")).auth().getToken({ template: "convex" }) ?? "");

    await convex.mutation(api.users.storeGmailTokens, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in ?? 3600,
    });

    return NextResponse.redirect(new URL("/?gmail=connected", req.url));
  } catch (err) {
    console.error("[Gmail OAuth] Error:", err);
    return NextResponse.redirect(new URL("/?error=oauth_failed", req.url));
  }
}

