"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type MapMarkerData = {
  id: string;
  type: "character" | "location" | "faction" | "quest" | "item" | "custom";
  label?: string | null;
  x: number; // 0..1
  y: number; // 0..1
  entityId?: string;
  portraitUrl?: string | null; // for character markers
};

const ZOOM_STEP = 1.25;

const TYPE_COLORS: Record<string, string> = {
  character: "#f59e0b",
  location: "#38bdf8",
  faction: "#a78bfa",
  quest: "#34d399",
  item: "#fb7185",
  custom: "#e2e8f0",
};

export default function MapViewer({
  imageUrl,
  widthPx,
  heightPx,
  mapName,
  markers,
  interactive = true,
}: {
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  mapName: string;
  markers: MapMarkerData[];
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 });
  const [popup, setPopup] = useState<MapMarkerData | null>(null);
  const router = useRouter();

  // Fit to container on first load
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fit = Math.min(rect.width / widthPx, rect.height / heightPx, 1);
    setScale(fit);
    setOffset({ x: (rect.width - widthPx * fit) / 2, y: (rect.height - heightPx * fit) / 2 });
  }, [widthPx, heightPx]);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setScale((s) => {
        const next = Math.min(8, Math.max(0.2, s * factor));
        if (cx !== undefined && cy !== undefined && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const worldX = (cx - rect.left - offset.x) / s;
          const worldY = (cy - rect.top - offset.y) / s;
          setOffset((o) => ({
            x: cx - rect.left - worldX * next,
            y: cy - rect.top - worldY * next,
          }));
        }
        return next;
      });
    },
    [offset]
  );

  // Wheel zoom
  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive, zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setOffsetStart(offset);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: offsetStart.x + (e.clientX - dragStart.x),
      y: offsetStart.y + (e.clientY - dragStart.y),
    });
  };

  const endDrag = () => setDragging(false);

  const resetView = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fit = Math.min(rect.width / widthPx, rect.height / heightPx, 1);
    setScale(fit);
    setOffset({ x: (rect.width - widthPx * fit) / 2, y: (rect.height - heightPx * fit) / 2 });
  };

  const onMarkerClick = (m: MapMarkerData) => {
    if (m.type === "character" && m.entityId) {
      router.push(`/characters/${m.entityId}`);
    } else {
      // locations/factions/etc: show a popup (no dedicated page for locations)
      setPopup(m);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg border border-stone-800 bg-stone-900 select-none"
      style={{ height: "min(72vh, 640px)", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      role="group"
      aria-label={`Map: ${mapName}`}
    >
      {interactive && (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
          <button
            aria-label="Zoom in"
            onClick={(e) => {
              e.stopPropagation();
              zoomAt(ZOOM_STEP);
            }}
            className="h-9 w-9 rounded bg-stone-800/90 text-lg font-bold text-stone-100 hover:bg-stone-700"
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            onClick={(e) => {
              e.stopPropagation();
              zoomAt(1 / ZOOM_STEP);
            }}
            className="h-9 w-9 rounded bg-stone-800/90 text-lg font-bold text-stone-100 hover:bg-stone-700"
          >
            −
          </button>
          <button
            aria-label="Reset view"
            onClick={(e) => {
              e.stopPropagation();
              resetView();
            }}
            className="h-9 w-9 rounded bg-stone-800/90 text-xs text-stone-100 hover:bg-stone-700"
          >
            ⟳
          </button>
        </div>
      )}

      <div
        className="absolute"
        style={{
          width: widthPx,
          height: heightPx,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Map of ${mapName}`}
          draggable={false}
          style={{ width: widthPx, height: heightPx, maxWidth: "none" }}
          className="pointer-events-none"
        />

        {markers.map((m) => {
          const color = TYPE_COLORS[m.type] ?? TYPE_COLORS.custom;
          const isCharacter = m.type === "character";
          const name = m.label ?? "";

          return (
            <button
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to character profile for character markers; popup for the rest
                if (m.type === "character" && m.entityId) {
                  router.push(`/characters/${m.entityId}`);
                } else {
                  setPopup(m);
                }
              }}
              aria-label={`Marker: ${name || m.type}`}
              title={name || undefined}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-white rounded-full"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
            >
              <span className="flex flex-col items-center">
                {/* Name above the marker */}
                {isCharacter && name && (
                  <span
                    className="mb-1 whitespace-nowrap rounded-full bg-stone-950/80 px-2 py-0.5 text-xs font-semibold text-stone-100 shadow"
                    style={{ border: `1px solid ${color}` }}
                  >
                    {name}
                  </span>
                )}
                {/* Marker body: portrait circle for characters, colored dot otherwise */}
                {isCharacter && m.portraitUrl ? (
                  <span
                    className="block overflow-hidden rounded-full ring-2 ring-white/80 shadow-md"
                    style={{ width: 36, height: 36, border: `2px solid ${color}` }}
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
                    className="block rounded-full ring-2 ring-white/80 shadow-md"
                    style={{
                      width: isCharacter ? 28 : 14,
                      height: isCharacter ? 28 : 14,
                      backgroundColor: color,
                    }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-stone-500">
          No markers placed on this map yet.
        </div>
      )}

      {/* Popup for non-character markers */}
      {popup && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30"
          onClick={() => setPopup(null)}
        >
          <div
            className="max-w-xs rounded-lg border border-stone-700 bg-stone-900 p-4 text-stone-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-serif text-lg" style={{ color: TYPE_COLORS[popup.type] ?? "#e2e8f0" }}>
              {popup.label ?? popup.type}
            </div>
            <p className="mt-1 text-xs text-stone-500 capitalize">{popup.type}</p>
            <button
              onClick={() => setPopup(null)}
              className="mt-3 rounded bg-stone-700 px-3 py-1 text-sm text-stone-200 hover:bg-stone-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}