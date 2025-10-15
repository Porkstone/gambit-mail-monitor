import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "WWW-Authenticate",
};

const WWW_AUTHENTICATE =
  'Bearer realm="api", error="invalid_token", error_description="Invalid or missing access token"';

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer "))
    return new NextResponse(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json", "WWW-Authenticate": WWW_AUTHENTICATE } });

  try {
    // Extract token after "Bearer" and sanitize quotes/whitespace
    let token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token.startsWith('"') && token.endsWith('"'))
      token = token.slice(1, -1);
    if (!token)
      return new NextResponse(JSON.stringify({ error: "Invalid or missing access token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json", "WWW-Authenticate": WWW_AUTHENTICATE },
      });
    // Basic JWT shape validation (three base64url parts)
    const parts = token.split(".");
    if (parts.length !== 3)
      return new NextResponse(JSON.stringify({ error: "Invalid or missing access token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json", "WWW-Authenticate": WWW_AUTHENTICATE },
      });

      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url)
      return new NextResponse(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
    const client = new ConvexHttpClient(url);
    client.setAuth(token);
    const result = await client.query(api.users.countReservations, {});
    return new NextResponse(JSON.stringify({ count: result.count }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("/api/extension/reservations/count error:", err);
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    const unauthorized =
      message.includes("unauthorized") ||
      message.includes("not authenticated") ||
      message.includes("invalid token") ||
      message.includes("jwt");
    const status = unauthorized ? 401 : 500;
    const headers = unauthorized
      ? { ...corsHeaders, "Content-Type": "application/json", "WWW-Authenticate": WWW_AUTHENTICATE }
      : { ...corsHeaders, "Content-Type": "application/json" };
    return new NextResponse(
      JSON.stringify({ error: unauthorized ? "Unauthorized" : "Internal Server Error" }),
      { status, headers }
    );
  }
}


