"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MoveNoteForm({
  noteId,
  currentFolderId,
  currentFolderName,
  folders,
}: {
  noteId: string;
  currentFolderId: string | null;
  currentFolderName?: string;
  folders: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [folderId, setFolderId] = useState(currentFolderId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function move() {
    setBusy(true);
    setError(null);
    setOk(false);
    const res = await fetch(`/api/notes/${noteId}/placement`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: folderId || null }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to move note.");
      return;
    }
    setOk(true);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        Move to folder
      </h3>
      {currentFolderName && (
        <p className="mt-1 text-xs text-stone-500">
          Currently in: 📁 {currentFolderName}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="flex-1 rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-sm text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">— no folder —</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          onClick={move}
          disabled={busy}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Moving…" : "Move"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {ok && <p className="mt-2 text-xs text-emerald-400">Moved ✓</p>}
    </div>
  );
}