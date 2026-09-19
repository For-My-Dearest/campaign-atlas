import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isGM } from "@/lib/access";
import { requireUser } from "@/lib/session";
import MapViewer, { type MapMarkerData } from "@/components/MapViewer";

export default async function MapPage({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = await params;
  const user = await requireUser();
  const role = user.role;

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: {
      markers: {
        include: {
          character: true,
          location: true,
        },
      },
      parent: true,
      children: true,
    },
  });

  if (!map) notFound();

  const markers: MapMarkerData[] = map.markers
    .filter((mk) => {
      // Hidden/archived characters are GM-only — hide their markers from players
      if (mk.character && (mk.character.status === "hidden" || mk.character.status === "archived") && !isGM(role)) {
        return false;
      }
      return true;
    })
    .map((mk) => {
    let label = mk.label;
    let entityId: string | undefined;
    let portraitUrl: string | null | undefined;
    if (mk.character) {
      label = label ?? mk.character.name;
      entityId = mk.character.id;
      portraitUrl = mk.character.portraitUrl;
    } else if (mk.location) {
      label = label ?? mk.location.name;
      entityId = mk.location.id;
    }
    return {
      id: mk.id,
      type: (mk.type as MapMarkerData["type"]) ?? "custom",
      label,
      x: mk.xNormalized,
      y: mk.yNormalized,
      entityId,
      portraitUrl,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500">
            {map.parent ? (
              <Link href={`/map/${map.parent.id}`} className="hover:text-amber-400">
                {map.parent.name}
              </Link>
            ) : (
              "World"
            )}
          </div>
          <h1 className="font-serif text-3xl text-amber-400">{map.name}</h1>
          {map.description && <p className="mt-1 text-stone-400">{map.description}</p>}
        </div>

        {map.children.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {map.children.map((c) => (
              <Link
                key={c.id}
                href={`/map/${c.id}`}
                className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300 hover:border-amber-600 hover:text-amber-300"
              >
                {c.name} →
              </Link>
            ))}
          </div>
        )}
      </div>

      <MapViewer
        imageUrl={map.imageUrl ?? ""}
        widthPx={map.widthPx}
        heightPx={map.heightPx}
        mapName={map.name}
        markers={markers}
      />

      <p className="text-xs text-stone-600">
        Click a character marker to view their profile. Use the mouse wheel or +/− to zoom, drag to pan.{" "}
        {isGM(role) && (
          <Link href={`/admin/maps/${map.id}`} className="text-emerald-400 hover:underline">
            Edit markers on this map →
          </Link>
        )}
      </p>
    </div>
  );
}