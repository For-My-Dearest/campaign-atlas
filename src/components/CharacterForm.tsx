"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  characterId?: string;
  initial?: {
    name?: string;
    description?: string;
    portraitUrl?: string;
    role?: string;
    locationId?: string;
    publicInfo?: string;
    gmOnly?: string;
    tags?: string;
    factionId?: string;
    status?: string;
  };
  locations: { id: string; name: string }[];
  factions: { id: string; name: string }[];
};

export default function CharacterForm({ characterId, initial, locations, factions }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [locationId, setLocationId] = useState(initial?.locationId ?? "");
  const [publicInfo, setPublicInfo] = useState(initial?.publicInfo ?? "");
  const [gmOnly, setGmOnly] = useState(initial?.gmOnly ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [portraitUrl, setPortraitUrl] = useState(initial?.portraitUrl ?? "");
  const [factionId, setFactionId] = useState(initial?.factionId ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPortrait(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
      return;
    }
    const data = await res.json();
    setPortraitUrl(data.url);
  }

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const url = characterId ? `/api/characters/${characterId}` : "/api/characters";
    const res = await fetch(url, {
      method: characterId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        role: role || null,
        locationId: locationId || null,
        publicInfo,
        gmOnly,
        tags,
        portraitUrl: portraitUrl || null,
        factionId: factionId || null,
        status,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save character.");
      return;
    }
    const data = await res.json();
    router.push(`/characters/${data.id ?? characterId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-serif text-3xl text-amber-400">
        {characterId ? "Edit Character" : "Add Character"}
      </h1>

      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {portraitUrl && (
          <img src={portraitUrl} alt="Portrait preview" className="h-24 w-24 rounded-lg object-cover ring-2 ring-stone-700" />
        )}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPortrait(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : portraitUrl ? "Change Portrait" : "Upload Portrait"}
          </button>
        </div>
      </div>

      <label className="block text-sm">
        Name *
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Role / Title
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>
        <label className="block text-sm">
          Current Location
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Unknown</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Faction
          <select
            value={factionId}
            onChange={(e) => setFactionId(e.target.value)}
            className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">None</option>
            {factions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Tags (comma-separated)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>
      </div>

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
          placeholder="Visible only to the GM."
        />
      </label>

      <div>
        <label className="block text-sm">
          Visibility
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={() => setStatus("active")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                status === "active"
                  ? "border-emerald-600 bg-emerald-950/40 text-emerald-300"
                  : "border-stone-700 text-stone-400 hover:bg-stone-800"
              }`}
            >
              Active — players can see
            </button>
            <button
              type="button"
              onClick={() => setStatus("hidden")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${
                status === "hidden"
                  ? "border-amber-600 bg-amber-950/40 text-amber-300"
                  : "border-stone-700 text-stone-400 hover:bg-stone-800"
              }`}
            >
              Hidden — only GM sees (not yet met)
            </button>
          </div>
        </label>
      </div>

      {error && <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Character"}
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