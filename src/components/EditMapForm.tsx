"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MapOption = { id: string; name: string; parentId: string | null };
type MapData = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  parentId: string | null;
  childCount: number;
  markerCount: number;
};

function buildTree(maps: MapOption[], excludeId: string): MapOption[] {
  const out: MapOption[] = [];
  const childrenOf = (pid: string | null) => maps.filter((m) => m.parentId === pid);
  function walk(pid: string | null, depth: number) {
    childrenOf(pid).forEach((m) => {
      if (m.id === excludeId) return;
      out.push({ ...m, name: `${"  ".repeat(depth)}${m.name}` });
      walk(m.id, depth + 1);
    });
  }
  walk(null, 0);
  return out;
}

export default function EditMapForm({ map, maps }: { map: MapData; maps: MapOption[] }) {
  const router = useRouter();
  const [name, setName] = useState(map.name);
  const [description, setDescription] = useState(map.description);
  const [parentId, setParentId] = useState(map.parentId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newDims, setNewDims] = useState<{ w: number; h: number } | null>(null);

  function onNewImage(f: File | null) {
    setNewImage(f);
    setNewDims(null);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => setNewDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  const tree = buildTree(maps, map.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let body: Record<string, unknown> = {
      name,
      description,
      parentId: parentId || null,
    };
    if (newImage) {
      if (!newDims) {
        setError("Reading image dimensions…");
        setSaving(false);
        return;
      }
      const fd = new FormData();
      fd.append("file", newImage);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) {
        const d = await up.json().catch(() => ({}));
        setError(d.error ?? "Upload failed.");
        setSaving(false);
        return;
      }
      const { url } = await up.json();
      body = { ...body, imageUrl: url, widthPx: newDims.w, heightPx: newDims.h };
    }

    const res = await fetch(`/api/maps/${map.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save.");
      return;
    }
    router.refresh();
    router.push("/admin/maps");
  }

  async function del() {
    const n = map.childCount;
    const hint = n > 0 ? ` It has ${n} sub-map(s) — those must be moved or deleted first.` : "";
    if (!confirm(`Delete map "${map.name}"? This removes its ${map.markerCount} marker(s).${hint}`)) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/maps/${map.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to delete.");
      return;
    }
    router.push("/admin/maps");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={map.imageUrl} alt={map.name} className="max-h-40 w-full rounded border border-stone-700 object-cover" />

      <div>
        <label className="block text-sm text-stone-300">Replace map image (optional)</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => onNewImage(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm text-stone-400 file:mr-3 file:rounded file:border-0 file:bg-stone-700 file:px-3 file:py-2 file:text-stone-100 hover:file:bg-stone-600"
        />
        {newDims && (
          <p className="mt-1 text-xs text-amber-400">
            New image: {newDims.w} × {newDims.h} px — will replace on save
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-stone-300">Map name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm text-stone-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm text-stone-300">Parent map (folder)</label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">— No parent (top-level) —</option>
          {tree.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-stone-500">
        Image: {map.widthPx} × {map.heightPx} px · {map.childCount} sub-map(s) · {map.markerCount} marker(s)
      </p>

      {error && <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={saving}
          className="rounded bg-red-900/60 px-5 py-2 text-red-300 hover:bg-red-900 disabled:opacity-50"
        >
          Delete Map
        </button>
      </div>
    </form>
  );
}