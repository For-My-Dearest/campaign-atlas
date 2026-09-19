"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Folder = { id: string; name: string; parentId: string | null; isPublic?: boolean };

export default function FolderManager({
  folders,
  gm = false,
}: {
  folders: Folder[];
  gm?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "create" | "manage">("closed");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Manage state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParent, setEditParent] = useState("");
  const [editPublic, setEditPublic] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/note-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId: parentId || null, isPublic }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to create folder.");
      return;
    }
    setName("");
    setParentId("");
    setIsPublic(false);
    setError(null);
    router.refresh();
  }

  async function saveEdit(folderId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/note-folders/${folderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, parentId: editParent || null, isPublic: editPublic }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to update folder.");
      return;
    }
    setEditId(null);
    router.refresh();
  }

  async function deleteFolder(folderId: string, folderName: string) {
    if (!confirm(`Delete folder "${folderName}"? (Must be empty — no notes or sub-folders.)`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/note-folders/${folderId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to delete folder.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {mode === "closed" && gm && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("create")}
            className="rounded border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800"
          >
            + New Folder
          </button>
          <button
            onClick={() => setMode("manage")}
            className="rounded border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800"
          >
            Manage
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={create} className="space-y-2 rounded border border-stone-700 bg-stone-800/50 p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-sm text-stone-100"
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1.5 text-sm text-stone-100"
          >
            <option value="">— root —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {gm && (
            <label className="flex items-center gap-2 text-xs text-stone-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-stone-600 bg-stone-800"
              />
              Public (visible to players)
            </label>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("closed");
                setError(null);
              }}
              className="rounded border border-stone-600 px-3 py-1.5 text-xs text-stone-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "manage" && (
        <div className="space-y-2 rounded border border-stone-700 bg-stone-800/50 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-400">Manage folders</h3>
            <button
              onClick={() => {
                setMode("closed");
                setEditId(null);
                setError(null);
              }}
              className="text-[10px] text-stone-500 hover:text-stone-300"
            >
              ✕
            </button>
          </div>

          {folders.map((f) =>
            editId === f.id ? (
              <div key={f.id} className="space-y-1.5 rounded bg-stone-900 p-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-100"
                />
                <select
                  value={editParent}
                  onChange={(e) => setEditParent(e.target.value)}
                  className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1 text-xs text-stone-100"
                >
                  <option value="">— root —</option>
                  {folders
                    .filter((x) => x.id !== f.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                {gm && (
                  <label className="flex items-center gap-2 text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={editPublic}
                      onChange={(e) => setEditPublic(e.target.checked)}
                      className="rounded border-stone-600 bg-stone-800"
                    />
                    Public (visible to players)
                  </label>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => saveEdit(f.id)}
                    disabled={busy}
                    className="rounded bg-emerald-600 px-2 py-1 text-[10px] text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded border border-stone-600 px-2 py-1 text-[10px] text-stone-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={f.id} className="flex items-center gap-1.5 rounded bg-stone-900/60 px-2 py-1 text-xs">
                <span className="min-w-0 flex-1 truncate text-stone-300">
                  📁 {f.name}
                  {f.isPublic && (
                    <span className="ml-1 rounded bg-sky-900/60 px-1 text-[9px] text-sky-300">public</span>
                  )}
                  {f.parentId && <span className="text-stone-600"> → {folders.find((p) => p.id === f.parentId)?.name}</span>}
                </span>
                <button
                  onClick={() => {
                    setEditId(f.id);
                    setEditName(f.name);
                    setEditParent(f.parentId ?? "");
                    setEditPublic(Boolean((f as any).isPublic));
                  }}
                  className="flex-none rounded px-1.5 py-0.5 text-[10px] text-amber-400 hover:bg-stone-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteFolder(f.id, f.name)}
                  className="flex-none rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-950/40"
                >
                  Del
                </button>
              </div>
            )
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}