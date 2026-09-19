import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isGM } from "@/lib/access";
import CharacterNotes from "@/components/CharacterNotes";
import Markdown from "@/components/Markdown";

// Auto-detect Persian/Arabic script → RTL
function isRtl(text: string): boolean {
  return /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFF]/.test(text);
}

export default async function CharacterProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const gm = isGM(user.role);

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      location: true,
      faction: true,
      owner: { select: { name: true } },
      markers: { include: { map: { select: { name: true } } } },
      noteLinks: {
        include: {
          note: {
            include: { author: { select: { name: true, id: true } } },
          },
        },
      },
    },
  });

  if (!character) notFound();

  // Hidden characters are GM-only: players get 404
  if (character.status === "hidden" && !gm) notFound();
  if (character.status === "archived" && !gm) notFound();

  // Only show this player's own notes (not other players' private notes)
  const myNotes = character.noteLinks
    .map((l) => l.note)
    .filter((n) => n.authorId === user.id || n.visibility !== "PRIVATE");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/characters"
        className="text-xs uppercase tracking-wider text-stone-500 hover:text-amber-400"
      >
        ← Characters
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={character.portraitUrl ?? "/chars/placeholder.jpg"}
          alt={`Portrait of ${character.name}`}
          className="h-48 w-48 flex-none rounded-lg object-cover ring-2 ring-stone-700"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl text-amber-400">{character.name}</h1>
            {gm && character.status === "hidden" && (
              <span className="rounded-full bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-300">
                Hidden from players
              </span>
            )}
            {gm && character.status === "archived" && (
              <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs font-semibold text-stone-400">
                Archived
              </span>
            )}
          </div>
          {character.role && (
            <p className="text-sm font-medium text-stone-400">{character.role}</p>
          )}
          {character.faction && (
            <p className="text-xs text-stone-500">Faction: {character.faction.name}</p>
          )}
          <p className="text-xs text-stone-500">
            Location: {character.location?.name ?? "Unknown"}
          </p>
          {character.owner?.name && (
            <p className="text-xs text-stone-500">Played by: {character.owner.name}</p>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────── */}
      {/* PUBLIC INFO (everyone sees; markdown styled)         */}
      {/* ──────────────────────────────────────────────────── */}

      {character.publicInfo && (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-stone-500">
            Public Information
          </h2>
          <Markdown rtl={isRtl(character.publicInfo)}>{character.publicInfo}</Markdown>
        </section>
      )}

      {character.tags && (
        <section>
          <div className="flex flex-wrap gap-2">
            {character.tags.split(",").map((t) => (
              <span
                key={t}
                className="rounded-full bg-stone-800 px-3 py-1 text-xs text-stone-400"
              >
                {t.trim()}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ──────────────────────────────────────────────────── */}
      {/* GM ONLY (description + gmOnly, both hidden from      */}
      {/* players; rendered as markdown)                        */}
      {/* ──────────────────────────────────────────────────── */}

      {gm && (character.description || character.gmOnly) && (
        <section className="rounded-lg border border-amber-900 bg-amber-950/30 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-600">
            DM Only
          </h2>
          <div className="space-y-4">
            {character.description && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                  Description
                </h3>
                <Markdown rtl={isRtl(character.description)} className="text-amber-100/90">
                  {character.description}
                </Markdown>
              </div>
            )}
            {character.gmOnly && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                  GM Notes
                </h3>
                <Markdown rtl={isRtl(character.gmOnly)} className="text-amber-100/90">
                  {character.gmOnly}
                </Markdown>
              </div>
            )}
          </div>
        </section>
      )}

      {gm && (
        <Link
          href={`/admin/characters/${character.id}`}
          className="inline-block rounded border border-amber-800 px-4 py-2 text-sm text-amber-300 hover:bg-amber-950/40"
        >
          Edit Character
        </Link>
      )}

      {/* ──────────────────────────────────────────────────── */}
      {/* MAPS                                                */}
      {/* ──────────────────────────────────────────────────── */}

      {character.markers.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-stone-500">
            On Maps
          </h2>
          <ul className="space-y-1">
            {character.markers.map((mk) => (
              <li key={mk.id}>
                <Link
                  href={`/map/${mk.mapId}`}
                  className="text-sm text-stone-300 hover:text-amber-400"
                >
                  {mk.map.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ──────────────────────────────────────────────────── */}
      {/* MY NOTES ABOUT THIS CHARACTER                       */}
      {/* ──────────────────────────────────────────────────── */}

      <section className="border-t border-stone-800 pt-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
          My Notes About {character.name}
        </h2>

        {myNotes.length === 0 ? (
          <p className="text-sm text-stone-500">
            No notes about this character yet. Add your first note below.
          </p>
        ) : (
          <ul className="space-y-3 mb-4">
            {myNotes.map((n) => (
              <li key={n.id} className="rounded-lg border border-stone-800 bg-stone-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-stone-200 text-sm">{n.title}</div>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      n.visibility === "PRIVATE"
                        ? "bg-stone-800 text-stone-500"
                        : n.visibility === "SHARED"
                          ? "bg-sky-900/60 text-sky-300"
                          : "bg-amber-900/60 text-amber-300"
                    }`}
                  >
                    {n.visibility === "PRIVATE"
                      ? "Private"
                      : n.visibility === "SHARED"
                        ? "Shared"
                        : "GM"}
                  </span>
                </div>
                <div className="mt-1 text-stone-400">
                  <Markdown rtl={n.rtl}>{n.body}</Markdown>
                </div>
                <p className="mt-2 text-xs text-stone-600">
                  by {n.author.name} · {n.updatedAt.toLocaleDateString()}
                </p>
                <Link
                  href={`/notes/${n.id}`}
                  className="mt-2 inline-block text-xs text-amber-600 hover:underline"
                >
                  View full note →
                </Link>
              </li>
            ))}
          </ul>
        )}

        <CharacterNotes characterId={character.id} />
      </section>

      {/* ──────────────────────────────────────────────────── */}
      {/* GM ACTIONS                                           */}
      {/* ──────────────────────────────────────────────────── */}

      {gm && (
        <div className="flex gap-3 border-t border-stone-800 pt-4">
          <Link
            href={`/admin/characters/${character.id}`}
            className="rounded border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
          >
            Edit
          </Link>
          <Link
            href={`/admin/maps?place=character&entityId=${character.id}`}
            className="rounded border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
          >
            Place on Map
          </Link>
        </div>
      )}
    </div>
  );
}