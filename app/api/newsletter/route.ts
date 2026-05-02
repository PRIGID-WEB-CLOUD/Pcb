import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const existingSubscriber = await prisma.newsletter.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      return NextResponse.json({ error: "Email is already subscribed" }, { status: 400 });
    }

    await prisma.newsletter.create({
      data: { email },
    });

    return NextResponse.json({ message: "Successfully subscribed to the newsletter!" });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
