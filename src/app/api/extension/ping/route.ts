import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer "))
    return new NextResponse(JSON.stringify({ error: "Missing bearer token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Clerk middleware already ran; use auth() to verify user
  const { userId } = await auth();

  if (!userId)
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  return new NextResponse(JSON.stringify({ ok: true, userId }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}




