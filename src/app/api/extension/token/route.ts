import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, getToken } = await auth();

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getToken({ template: "convex" });

  if (!token)
    return NextResponse.json({ error: "No token" }, { status: 500 });

  return NextResponse.json({ token });
}




