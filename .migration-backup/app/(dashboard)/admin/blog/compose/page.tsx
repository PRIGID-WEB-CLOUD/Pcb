"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { useRouter } from "next/navigation";

export default function CreatePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleCreate = async () => {
    // API call to create post
    await fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({ title, content }),
        headers: { "Content-Type": "application/json" },
    });
    router.push("/admin/blog");
  };

  return (
    <div className="max-w-[800px] mx-auto py-8">
      <h1 className="text-4xl mb-6">Create New Post</h1>
      <input 
        type="text" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-3 border mb-4"
        placeholder="Title"
      />
      <RichTextEditor content={content} onChange={setContent} />
      <button onClick={handleCreate} className="bg-slate-900 text-white p-3 mt-4">Create Post</button>
    </div>
  );
}
