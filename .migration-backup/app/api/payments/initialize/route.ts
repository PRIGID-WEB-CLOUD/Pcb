import { NextResponse } from "next/server";
import { paystack } from "@/lib/paystack";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, callbackUrl } = body;

    const transaction = await paystack.initializeTransaction(
      session.user.email as string,
      amount,
      callbackUrl
    );

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
  }
}
