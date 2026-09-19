"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MapInfo = { id: string; name: string; imageUrl: string; widthPx: number; heightPx: number };
type Marker = {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  characterId?: string;
  locationId?: string;
  portraitUrl?: string | null;
};

type Props = {
  map: MapInfo;
  markers: Marker[];
  characters: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  presetEntityType?: string;
  presetEntityId?: string;
};

const TYPE_COLORS: Record<string, string> = {
  character: "#f59e0b",
  location: "#38bdf8",
  faction: "#a78bfa",
  quest: "#34d399",
  item: "#fb7185",
  custom: "#e2e8f0",
};

export default function MarkerEditor({
  map,
  markers: initialMarkers,
  characters,
  locations,
  presetEntityType,
  presetEntityId,
}: Props) {
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement>(null);
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers);
  const [selected, setSelected] = useState<Marker | null>(null);
  const [targetX, setTargetX] = useState(0.5);
  const [targetY, setTargetY] = useState(0.5);
  const [kind, setKind] = useState<"character" | "location">(
    presetEntityType === "location" ? "location" : "character"
  );
  const [characterId, setCharacterId] = useState(presetEntityId ?? "");
  const [locationId, setLocationId] = useState(presetEntityId ?? "");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTargetX(Math.min(1, Math.max(0, x)));
    setTargetY(Math.min(1, Math.max(0, y)));
  }

  async function place() {
    // Resolve chosen entity
    const entityId = kind === "character" ? characterId : locationId;
    if (!entityId) {
      setError(`Select a ${kind} to place.`);
      return;
    }
    const chosen = kind === "character" ? characters.find((c) => c.id === entityId) : locations.find((l) => l.id === entityId);
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/maps/${map.id}/markers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: kind,
        label: label || chosen?.name,
        x: targetX,
        y: targetY,
        characterId: kind === "character" ? entityId : undefined,
        locationId: kind === "location" ? entityId : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to place marker.");
      return;
    }
    const created = await res.json();
    // Refresh markers (post returns moved-or-created with x/y + portraitUrl)
    setMarkers((prev) => {
      const idx = prev.findIndex((m) => m.id === created.id);
      const mk = {
        id: created.id,
        type: created.type,
        label: created.label ?? chosen?.name ?? "",
        x: created.x,
        y: created.y,
        characterId: created.characterId ?? undefined,
        locationId: created.locationId ?? undefined,
        portraitUrl: created.portraitUrl ?? undefined,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = mk;
        return next;
      }
      return [...prev, mk];
    });
    setSelected(null);
  }

  async function removeMarker(m: Marker) {
    if (!confirm(`Remove marker for "${m.label}"?`)) return;
    const res = await fetch(`/api/markers/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to remove marker.");
      return;
    }
    setMarkers((prev) => prev.filter((x) => x.id !== m.id));
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl text-amber-400">Markers — {map.name}</h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Map with markers */}
        <div className="relative overflow-hidden rounded-lg border border-stone-800 bg-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={map.imageUrl}
            alt={map.name}
            onClick={handleClick}
            className="block w-full cursor-crosshair select-none"
            draggable={false}
          />
          {markers.map((m) => (
            <button
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(m);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus:ring-2 focus:ring-white"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
              title={m.label}
              aria-label={`Marker: ${m.label}`}
            >
              <span className="flex flex-col items-center">
                {m.type === "character" && m.label && (
                  <span className="mb-1 whitespace-nowrap rounded-full bg-stone-950/80 px-2 py-0.5 text-xs font-semibold text-stone-100 shadow">
                    {m.label}
                  </span>
                )}
                {m.type === "character" && m.portraitUrl ? (
                  <span
                    className="block overflow-hidden rounded-full ring-2 ring-white/80 shadow-md"
                    style={{ width: 36, height: 36, border: `2px solid ${TYPE_COLORS[m.type] ?? "#e2e8f0"}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.portraitUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </span>
                ) : (
                  <span
                    className="block h-4 w-4 rounded-full ring-2 ring-white/80"
                    style={{ backgroundColor: TYPE_COLORS[m.type] ?? "#e2e8f0" }}
                  />
                )}
              </span>
            </button>
          ))}
          {/* Click target indicator */}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${targetX * 100}%`, top: `${targetY * 100}%` }}
          >
            <span className="block h-6 w-6 rounded-full border-2 border-dashed border-white/80" />
          </div>
        </div>

        {/* Panel */}
        <div className="space-y-4 rounded-lg border border-stone-800 bg-stone-900 p-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-200">Place a marker</h2>
            <p className="text-xs text-stone-500">Click the map to set position, then save.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setKind("character")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${kind === "character" ? "border-amber-600 bg-amber-950/40 text-amber-300" : "border-stone-700 text-stone-400 hover:bg-stone-800"}`}
            >
              Character
            </button>
            <button
              onClick={() => setKind("location")}
              className={`flex-1 rounded border px-3 py-2 text-sm ${kind === "location" ? "border-sky-600 bg-sky-950/40 text-sky-300" : "border-stone-700 text-stone-400 hover:bg-stone-800"}`}
            >
              Location
            </button>
          </div>

          {kind === "character" ? (
            <label className="block text-sm">
              Character
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm">
              Location
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            Label (optional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </label>

          <div className="rounded border border-stone-700 bg-stone-800/60 px-3 py-2 text-xs text-stone-400">
            Position: ({targetX.toFixed(3)}, {targetY.toFixed(3)})
          </div>

          {error && <p className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button
            onClick={place}
            disabled={saving}
            className="w-full rounded bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Place Marker"}
          </button>

          {selected && (
            <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-3">
              <div className="text-sm text-stone-200">{selected.label}</div>
              <button
                onClick={() => removeMarker(selected)}
                className="mt-2 rounded bg-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900"
              >
                Remove Marker
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => router.push("/admin/maps")}
        className="text-xs uppercase tracking-wider text-stone-500 hover:text-amber-400"
      >
        ← All maps
      </button>
    </div>
  );
}