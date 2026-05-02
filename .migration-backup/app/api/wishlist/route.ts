import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: (session.user as any).id },
      include: {
        items: {
          include: { product: { include: { category: true } } }
        }
      }
    });

    return NextResponse.json(wishlist ? wishlist.items : []);
  } catch (error) {
    console.error("Wishlist GET error", error);
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Ensure wishlist exists
    let wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({ data: { userId } });
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: { wishlistId: wishlist.id, productId }
      }
    });

    if (existing) {
      return NextResponse.json({ message: "Item already in wishlist" }, { status: 400 });
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId
      }
    });

    return NextResponse.json({ message: "Added to wishlist" });
  } catch (error) {
    console.error("Wishlist POST error", error);
    return NextResponse.json({ error: "Failed to add to wishlist" }, { status: 500 });
  }
}
