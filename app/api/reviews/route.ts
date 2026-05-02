import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId, rating, comment } = await req.json();

    if (!productId || !rating || !comment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        productId,
        userId: (session.user as any).id
      },
      include: {
        user: { select: { name: true } }
      }
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Failed to create review", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
