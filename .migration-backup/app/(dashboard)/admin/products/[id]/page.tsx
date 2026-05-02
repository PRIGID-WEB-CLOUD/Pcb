"use client";

export default async function ProductEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-12">
        <h1 className="font-serif text-4xl text-slate-900 mb-2">Edit Product: {id}</h1>
      </header>
      {/* Product Editor Form */}
    </div>
  );
}
