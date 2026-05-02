import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const postsCount = await prisma.post.count();
    if (postsCount > 0) {
      return NextResponse.json({ message: "Posts already seeded" });
    }

    const posts = [
      {
        title: "The Art of Sustainable Silk",
        content: "Sustainability is at the core of everything we do. Our silk is sourced from heritage mills that prioritize environmental stewardship and ethical labor. Each piece is designed to last a lifetime, blending timeless silhouettes with modern craftsmanship.\n\nWorking with natural fibers requires a deep understanding of their properties. Silk, in particular, offers unparalleled breathability and a natural luster that synthetic fabrics simply cannot replicate. Our artisans use traditional weaving techniques to create textiles that are as durable as they are beautiful.\n\nWhen you choose Prigid Collection, you're not just buying a garment; you're investing in a legacy of conscious luxury.",
        excerpt: "A study in precision tailoring and sustainable silk fabrics.",
        imageUrl: "https://images.unsplash.com/photo-1544022613-e87ce7526ed1?q=80&w=1974&auto=format&fit=crop",
      },
      {
        title: "Modern Minimalist: A Guide",
        content: "Minimalism is more than just an aesthetic; it's a philosophy of intentional living. By focusing on quality over quantity, we can create a wardrobe that is both versatile and enduring. Our minimalist collection features clean lines, neutral palettes, and impeccable tailoring.\n\nThe key to a successful minimalist wardrobe is the selection of foundation pieces. A perfectly fitted white shirt, a structured blazer, and tailored trousers are the building blocks of endless outfits. By investing in high-quality basics, you reduce the need for constant updates and contribute to a more sustainable fashion ecosystem.\n\nDiscover how to simplify your style without sacrificing elegance.",
        excerpt: "Simplify your wardrobe with our essential minimalist pieces.",
        imageUrl: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=2070&auto=format&fit=crop",
      }
    ];

    for (const post of posts) {
      await prisma.post.create({
        data: post,
      });
    }

    return NextResponse.json({ message: "Seed data created successfully!" });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}
