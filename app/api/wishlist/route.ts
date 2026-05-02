import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  // For MVP, return empty list. Customers can add logic for actual wishlist persistence
  return NextResponse.json([]);
}
