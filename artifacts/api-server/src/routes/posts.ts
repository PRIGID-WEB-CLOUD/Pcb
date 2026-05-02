import { Router } from "express";

const router = Router();

const POSTS = [
  {
    id: 1,
    category: "Editorial",
    title: "The Architecture of Modern Silhouettes",
    excerpt: "Exploring the intersection of structural engineering and high-fashion tailoring in our latest collection.",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1936&auto=format&fit=crop",
    date: "OCT 12, 2024",
    author: "ALEXANDER THORNE",
  },
  {
    id: 2,
    category: "Heritage",
    title: "Decades of Precision: The Savile Row Legacy",
    excerpt: "Transcending time with techniques passed down through generations of master artisans.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=2071&auto=format&fit=crop",
    date: "SEP 28, 2024",
    author: "ELIZA VANCE",
  },
  {
    id: 3,
    category: "Sustainability",
    title: "The Future is Slow: Conscious Luxury",
    excerpt: "Why we choose to produce restricted quantities in a world of fast-moving trends.",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2013&auto=format&fit=crop",
    date: "SEP 15, 2024",
    author: "MARCUS REED",
  },
];

router.get("/", (_req, res) => {
  res.json(POSTS);
});

export default router;
