"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  locationId?: string;
  initial?: {
    name?: string;
    description?: string;
    parentId?: string;
    publicInfo?: string;
    gmOnly?: string;
    tags?: string;
  };
  locations: { id: string; name: string }[];
};

export default function LocationForm({ locationId, initial, locations }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [parentId, setParentId] = useState(initial?.parentId ?? "");
  const [publicInfo, setPublicInfo] = useState(initial?.publicInfo ?? "");
  const [gmOnly, setGmOnly] = useState(initial?.gmOnly ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const url = locationId ? `/api/locations/${locationId}` : "/api/locations";
    const res = await fetch(url, {
      method: locationId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        parentId: parentId || null,
        publicInfo,
        gmOnly,
        tags,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save location.");
      return;
    }
    const data = await res.json();
    router.push(`/locations/${data.id ?? locationId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-serif text-3xl text-amber-400">
        {locationId ? "Edit Location" : "Add Location"}
      </h1>

      <label className="block text-sm">
        Name *
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      <label className="block text-sm">
        Parent Location
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">None (top-level)</option>
          {locations
            .filter((l) => l.id !== locationId)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </select>
      </label>

      <label className="block text-sm">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      <label className="block text-sm">
        Public Information
        <textarea
          value={publicInfo}
          onChange={(e) => setPublicInfo(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      <label className="block text-sm">
        GM-Only Information
        <textarea
          value={gmOnly}
          onChange={(e) => setGmOnly(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-amber-800/60 bg-amber-950/20 px-3 py-2 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      <label className="block text-sm">
        Tags (comma-separated)
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      {error && <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Location"}
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