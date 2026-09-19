"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function NoteForm({
  initial,
  noteId,
  folders,
  canShare = false,
}: {
  initial?: { title: string; body: string; visibility: string; folderId?: string | null; rtl?: boolean };
  noteId?: string;
  folders: { id: string; name: string }[];
  canShare?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetFolder = searchParams.get("folder") ?? initial?.folderId ?? "";
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [visibility, setVisibility] = useState(initial?.visibility ?? "PRIVATE");
  const [folderId, setFolderId] = useState(presetFolder);
  const [rtl, setRtl] = useState(initial?.rtl ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const url = noteId ? `/api/notes/${noteId}` : "/api/notes";
    const res = await fetch(url, {
      method: noteId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, visibility, folderId: folderId || null, rtl }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save note.");
      return;
    }
    const data = await res.json();
    router.push(`/notes/${data.id ?? noteId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-serif text-3xl text-amber-400">
        {noteId ? "Edit Note" : "New Note"}
      </h1>

      <label className="block text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          dir={rtl ? "rtl" : "ltr"}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Folder
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">— no folder —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Text direction
          <select
            value={rtl ? "rtl" : "ltr"}
            onChange={(e) => setRtl(e.target.value === "rtl")}
            className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ltr">Left-to-right (English)</option>
            <option value="rtl">Right-to-left (فارسی)</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        Body
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          dir={rtl ? "rtl" : "ltr"}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Your private thoughts…"
        />
      </label>

      <label className="block text-sm">
        Visibility
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="PRIVATE">Private (only you)</option>
          {canShare && <option value="SHARED">Shared (all campaign members)</option>}
          <option value="GM_SHARED">Share with GM</option>
        </select>
      </label>

      {error && <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Note"}
        </button>
        <button
          onClick={() => window.history.back()}
          className="rounded border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}