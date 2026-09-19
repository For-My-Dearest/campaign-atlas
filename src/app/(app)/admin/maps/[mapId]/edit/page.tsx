import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";
import EditMapForm from "@/components/EditMapForm";

export default async function EditMapPage({ params }: { params: Promise<{ mapId: string }> }) {
  const { mapId } = await params;
  await requireGM();

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: { _count: { select: { children: true, markers: true } } },
  });
  if (!map) notFound();

  const maps = await prisma.map.findMany({
    where: { id: { not: mapId } },
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-amber-400">Edit Map</h1>
        <Link href="/admin/maps" className="text-xs uppercase tracking-wider text-stone-500 hover:text-amber-400">
          ← All maps
        </Link>
      </div>

      <EditMapForm
        map={{
          id: map.id,
          name: map.name,
          description: map.description ?? "",
          imageUrl: map.imageUrl ?? "",
          widthPx: map.widthPx,
          heightPx: map.heightPx,
          parentId: map.parentId,
          childCount: map._count.children,
          markerCount: map._count.markers,
        }}
        maps={maps}
      />
    </div>
  );
}