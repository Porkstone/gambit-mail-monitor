import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`;

  console.log("[Gmail OAuth] GOOGLE_CLIENT_ID:", clientId ? `${clientId.substring(0, 20)}...` : "undefined");
  console.log("[Gmail OAuth] Redirect URI:", redirectUri);

  if (!clientId)
    return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", userId);

  return NextResponse.redirect(authUrl.toString());
}

