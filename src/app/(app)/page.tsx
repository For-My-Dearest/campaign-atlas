import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type MapNode = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  _count: { markers: number };
  children: MapNode[];
};

export default async function HomePage() {
  const session = await auth();
  const user = session?.user as any;

  const campaign = await prisma.campaign.findFirst({
    where: { users: { some: { email: user?.email } } },
    include: {
      maps: {
        include: { _count: { select: { markers: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!campaign) {
    return <p className="text-stone-400">No campaign found for your account.</p>;
  }

  // Build tree
  const nodes = new Map<string, MapNode>();
  campaign.maps.forEach((m) => {
    nodes.set(m.id, { ...m, children: [] });
  });
  const roots: MapNode[] = [];
  nodes.forEach((n) => {
    if (n.parentId && nodes.has(n.parentId)) {
      nodes.get(n.parentId)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  // Sort by name after construction
  const sortRec = (list: MapNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-serif text-3xl text-amber-400">{campaign.name}</h1>
        <p className="mt-1 text-stone-400">{campaign.description}</p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">The Atlas</h2>
        <div className="space-y-2">
          {roots.map((m) => (
            <MapFolder key={m.id} map={m} depth={0} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MapFolder({ map, depth }: { map: MapNode; depth: number }) {
  const isFolder = map.children.length > 0;
  return (
    <div style={{ marginLeft: depth * 24 }}>
      <Link
        href={`/map/${map.id}`}
        className="group flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900 p-3 transition hover:border-amber-700"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={map.imageUrl ?? ""} alt={map.name} className="h-12 w-16 flex-none rounded object-cover" />
        <div className="flex-1">
          <h3 className={`font-semibold ${isFolder ? "text-amber-300" : "text-stone-100"}`}>
            {isFolder && <span className="mr-1">📁</span>}
            {map.name}
          </h3>
          {map.description && <p className="truncate text-xs text-stone-500">{map.description}</p>}
        </div>
        <span className="text-xs text-stone-500">
          {map._count.markers} marker{map._count.markers === 1 ? "" : "s"}
          {map.children.length > 0 && <span> · {map.children.length} sub-map{map.children.length === 1 ? "" : "s"}</span>}
        </span>
      </Link>
      {map.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {map.children.map((c) => (
            <MapFolder key={c.id} map={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}