import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    const body = await req.json().catch(() => null);
    const watcherId = (body?.watcherId as string | undefined)?.trim();

    if (!watcherId)
      return NextResponse.json({ error: "Invalid watcherId" }, { status: 400 });

    // Prefer incoming Bearer token if present; otherwise mint a convex template token
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearer = authHeader?.toString().match(/^Bearer\s+(.+)$/i)?.[1];
    const token = bearer || (await getToken({ template: "convex" }));

    if (!userId && !token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!token)
      return NextResponse.json({ error: "No token" }, { status: 500 });

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl)
      return NextResponse.json({ error: "Server misconfigured: NEXT_PUBLIC_CONVEX_URL missing" }, { status: 500 });

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(token);

    const result = await convex.mutation(api.cancellations.cancelHotelBooking, { watcherId });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[bookings/cancel] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


