import { NextResponse } from "next/server";
import { paystack } from "@/lib/paystack";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Reference is required" }, { status: 400 });
    }

    const verification = await paystack.verifyTransaction(reference);

    return NextResponse.json(verification);
  } catch (error) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
