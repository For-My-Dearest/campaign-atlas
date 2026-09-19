import { requireGM } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import NewMapForm from "@/components/NewMapForm";

export default async function NewMapPage() {
  await requireGM();

  const maps = await prisma.map.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-serif text-3xl text-amber-400">New Map</h1>
      <p className="text-sm text-stone-400">Upload a map image and place it in the hierarchy.</p>
      <NewMapForm maps={maps} />
    </div>
  );
}