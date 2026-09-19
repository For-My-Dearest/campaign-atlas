"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CharacterNotes({ characterId }: { characterId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function save() {
    if (!title.trim() || !body.trim()) {
      setError("Both title and note body are required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    const res = await fetch(`/api/characters/${characterId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, visibility }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save note.");
      return;
    }
    setSuccess(true);
    setBody("");
    setTitle("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-stone-200">Add Note</h3>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
        className="w-full rounded border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Your thoughts about this character…"
        className="w-full rounded border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <div className="flex items-center gap-2">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="rounded border border-stone-700 bg-stone-950 px-2 py-1.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="PRIVATE">Private</option>
          <option value="SHARED">Shared</option>
          <option value="GM_SHARED">Share with GM</option>
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Note"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-emerald-400">Note saved.</p>}
    </div>
  );
}