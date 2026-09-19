import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";

export default async function AdminMapsPage() {
  await requireGM();
  const maps = await prisma.map.findMany({
    include: { _count: { select: { markers: true, children: true } }, parent: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  // Build a tree: roots first, children nested under parent
  const byParent = new Map<string | null, typeof maps>();
  maps.forEach((m) => {
    const key = m.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  });

  const rows: { m: (typeof maps)[number]; depth: number }[] = [];
  function walk(pid: string | null, depth: number) {
    (byParent.get(pid) ?? []).forEach((m) => {
      rows.push({ m, depth });
      walk(m.id, depth + 1);
    });
  }
  walk(null, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-amber-400">Manage Maps</h1>
          <p className="mt-1 text-sm text-stone-400">Rename, reorganize into folders, add maps, or edit markers.</p>
        </div>
        <Link
          href="/admin/maps/new"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          + New Map
        </Link>
      </div>

      <div className="space-y-2">
        {rows.map(({ m, depth }) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900 p-3"
            style={{ marginLeft: depth * 20 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.imageUrl ?? ""}
              alt=""
              className="h-10 w-14 rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-stone-100">{m.name}</div>
              <div className="text-xs text-stone-500">
                {m._count.markers} marker(s) · {m._count.children} sub-map(s)
                {m.parent && m.parentId && <span> · in {m.parent.name}</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/admin/maps/${m.id}`}
                className="rounded border border-stone-700 px-2.5 py-1 text-xs text-stone-300 hover:border-amber-600 hover:text-amber-300"
              >
                Markers
              </Link>
              <Link
                href={`/admin/maps/${m.id}/edit`}
                className="rounded border border-stone-700 px-2.5 py-1 text-xs text-stone-300 hover:border-amber-600 hover:text-amber-300"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}