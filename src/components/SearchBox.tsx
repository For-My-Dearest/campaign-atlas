"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={submit} className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
        className="w-32 rounded border border-stone-700 bg-stone-900 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-600 focus:w-48 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
      />
    </form>
  );
}