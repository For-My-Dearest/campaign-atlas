import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";
import MarkerEditor from "@/components/MarkerEditor";

export default async function MapEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ mapId: string }>;
  searchParams: Promise<{ place?: string; entityId?: string }>;
}) {
  const { mapId } = await params;
  const sp = await searchParams;
  const gm = await requireGM();

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: { markers: { include: { character: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } } } },
  });
  if (!map) notFound();

  const [characters, locations] = await Promise.all([
    prisma.character.findMany({
      where: { campaignId: gm.campaignId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { campaignId: gm.campaignId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <MarkerEditor
      map={{
        id: map.id,
        name: map.name,
        imageUrl: map.imageUrl ?? "",
        widthPx: map.widthPx,
        heightPx: map.heightPx,
      }}
      markers={map.markers.map((mk) => ({
        id: mk.id,
        type: mk.type,
        label: mvLabel(mk),
        x: mk.xNormalized,
        y: mk.yNormalized,
        characterId: mk.characterId ?? undefined,
        locationId: mk.locationId ?? undefined,
      }))}
      characters={characters}
      locations={locations}
      presetEntityType={sp.place}
      presetEntityId={sp.entityId}
    />
  );
}

function mvLabel(mk: {
  label: string | null;
  character: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}) {
  if (mk.label) return mk.label;
  if (mk.character) return mk.character.name;
  if (mk.location) return mk.location.name;
  return "";
}