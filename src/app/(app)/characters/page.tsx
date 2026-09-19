import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isGM } from "@/lib/access";

export default async function CharactersPage() {
  const user = await requireUser();
  const gm = isGM(user.role);

  const characters = await prisma.character.findMany({
    where: { status: gm ? { in: ["active", "hidden"] } : "active" },
    include: {
      location: true,
      faction: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-amber-400">Characters</h1>
        {gm && (
          <Link
            href="/admin/characters/new"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            + New Character
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => (
          <Link
            key={c.id}
            href={`/characters/${c.id}`}
            className="group flex gap-4 rounded-lg border border-stone-800 bg-stone-900 p-4 transition hover:border-amber-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.portraitUrl ?? "/chars/placeholder.jpg"}
              alt={`Portrait of ${c.name}`}
              className="h-20 w-20 flex-none rounded-md object-cover ring-1 ring-stone-700"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-semibold text-stone-100 group-hover:text-amber-300">
                  {c.name}
                </h2>
                {gm && c.status === "hidden" && (
                  <span className="flex-none rounded-full bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Hidden
                  </span>
                )}
              </div>
              {c.role && <p className="text-sm text-stone-400">{c.role}</p>}
              <p className="mt-1 truncate text-xs text-stone-500">
                {c.location?.name ?? "Location unknown"}
                {c.faction ? ` · ${c.faction.name}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {characters.length === 0 && (
        <p className="rounded-lg border border-dashed border-stone-700 p-8 text-center text-stone-500">
          No characters yet.
        </p>
      )}
    </div>
  );
}