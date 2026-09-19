import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireUser();

  if (!q?.trim()) {
    return (
      <p className="text-stone-400">Type a query in the search box to find characters, locations, factions, or your notes.</p>
    );
  }

  const term = q.trim();

  const [chars, locs, facts, notes] = await Promise.all([
    prisma.character.findMany({
      where: {
        status: "active",
        OR: [
          { name: { contains: term } },
          { role: { contains: term } },
          { publicInfo: { contains: term } },
        ],
      },
      select: { id: true, name: true, portraitUrl: true, role: true, location: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 30,
    }),
    prisma.location.findMany({
      where: {
        status: "active",
        OR: [{ name: { contains: term } }, { description: { contains: term } }, { publicInfo: { contains: term } }],
      },
      select: { id: true, name: true, parent: { select: { name: true } } },
      take: 30,
    }),
    prisma.faction.findMany({
      where: {
        status: "active",
        OR: [{ name: { contains: term } }, { description: { contains: term } }],
      },
      select: { id: true, name: true },
      take: 20,
    }),
    prisma.note.findMany({
      where: {
        authorId: user.id,
        OR: [{ title: { contains: term } }, { body: { contains: term } }, { tags: { contains: term } }],
      },
      select: { id: true, title: true, visibility: true },
      take: 20,
    }),
  ]);

  const total = chars.length + locs.length + facts.length + notes.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-amber-400">Search: “{term}”</h1>
        <p className="mt-1 text-sm text-stone-500">{total} result{total === 1 ? "" : "s"}</p>
      </div>

      {chars.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Characters</h2>
          <div className="space-y-2">
            {chars.map((c) => (
              <Link key={c.id} href={`/characters/${c.id}`} className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900 p-3 hover:border-amber-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.portraitUrl ?? ""} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <div className="font-medium text-stone-100">{c.name}</div>
                  <div className="text-xs text-stone-500">{c.location?.name ?? "Unknown location"}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {locs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Locations</h2>
          <div className="space-y-2">
            {locs.map((l) => (
              <Link key={l.id} href="#" className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900 p-3 hover:border-amber-700">
                <div className="h-10 w-10 flex-none rounded-full bg-sky-900/40 ring-1 ring-sky-700/50 text-sky-300 flex items-center justify-center">📍</div>
                <div>
                  <div className="font-medium text-stone-100">{l.name}</div>
                  <div className="text-xs text-stone-500">{l.parent?.name ?? "Top-level"}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {facts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Factions</h2>
          <div className="space-y-2">
            {facts.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900 p-3">
                <div className="h-10 w-10 flex-none rounded-full bg-violet-900/40 ring-1 ring-violet-700/50 text-violet-300 flex items-center justify-center">⚔</div>
                <div className="font-medium text-stone-100">{f.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {notes.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Your Notes</h2>
          <div className="space-y-2">
            {notes.map((n) => (
              <Link key={n.id} href={`/notes/${n.id}`} className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900 p-3 hover:border-amber-700">
                <div className="h-10 w-10 flex-none rounded-full bg-stone-800 ring-1 ring-stone-700 text-stone-400 flex items-center justify-center">📝</div>
                <div>
                  <div className="font-medium text-stone-100">{n.title}</div>
                  <div className="text-xs text-stone-500">{n.visibility}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <p className="rounded-lg border border-dashed border-stone-700 p-8 text-center text-stone-500">
          Nothing found for “{term}”.
        </p>
      )}
    </div>
  );
}