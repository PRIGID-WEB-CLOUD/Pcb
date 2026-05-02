"use client";

import { useState, useEffect } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { useRouter, useParams } from "next/navigation";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then(res => res.json())
      .then(data => {
        setTitle(data.title);
        setContent(data.content);
        setLoading(false);
      });
  }, [id]);

  const handleUpdate = async () => {
    await fetch(`/api/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content }),
        headers: { "Content-Type": "application/json" },
    });
    router.push("/admin/blog");
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-[800px] mx-auto py-8">
      <h1 className="text-4xl mb-6">Edit Post</h1>
      <input 
        type="text" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-3 border mb-4"
        placeholder="Title"
      />
      <RichTextEditor content={content} onChange={setContent} />
      <button onClick={handleUpdate} className="bg-slate-900 text-white p-3 mt-4">Update Post</button>
    </div>
  );
}
