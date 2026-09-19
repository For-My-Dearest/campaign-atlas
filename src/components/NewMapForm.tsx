"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MapOption = { id: string; name: string; parentId: string | null };

function buildTree(maps: MapOption[]): MapOption[] {
  const roots = maps.filter((m) => !m.parentId);
  const out: MapOption[] = [];
  function walk(m: MapOption, depth: number) {
    out.push({ ...m, name: `${"  ".repeat(depth)}${m.name}` });
    maps
      .filter((c) => c.parentId === m.id)
      .forEach((c) => walk(c, depth + 1));
  }
  roots.forEach((r) => walk(r, 0));
  return out;
}

export default function NewMapForm({ maps }: { maps: MapOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tree = buildTree(maps);

  function onFile(f: File | null) {
    setFile(f);
    setError(null);
    if (!f) {
      setPreview(null);
      setDims(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setError("Could not read image. Use PNG/JPG/WebP.");
    img.src = url;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a map image.");
      return;
    }
    if (!dims) {
      setError("Waiting for image dimensions…");
      return;
    }
    setSaving(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    if (!up.ok) {
      const d = await up.json().catch(() => ({}));
      setError(d.error ?? "Upload failed.");
      setSaving(false);
      return;
    }
    const { url } = await up.json();

    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        imageUrl: url,
        widthPx: dims.w,
        heightPx: dims.h,
        parentId: parentId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to create map.");
      return;
    }
    router.push("/admin/maps");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm text-stone-300">Map name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. New City District"
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm text-stone-300">Description (optional)</label>
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

      <div>
        <label className="block text-sm text-stone-300">Map image</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm text-stone-400 file:mr-3 file:rounded file:border-0 file:bg-stone-700 file:px-3 file:py-2 file:text-stone-100 hover:file:bg-stone-600"
        />
        {dims && <p className="mt-1 text-xs text-stone-500">{dims.w} × {dims.h} px</p>}
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="mt-2 max-h-48 rounded border border-stone-700" />
        )}
      </div>

      {error && <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !dims}
          className="rounded bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create Map"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/maps")}
          className="rounded border border-stone-700 px-5 py-2 text-stone-300 hover:bg-stone-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}