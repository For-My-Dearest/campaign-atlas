import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isGM } from "@/lib/access";
import DeleteNoteButton from "@/components/DeleteNoteButton";
import Markdown from "@/components/Markdown";
import MoveNoteForm from "@/components/MoveNoteForm";

export default async function NoteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const gm = isGM(user.role);

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      folder: { select: { name: true, isPublic: true, ownerId: true } },
      characters: { include: { character: true } },
      locations: { include: { location: true } },
      factions: { include: { faction: true } },
    },
  });

  if (!note) notFound();

  // Authorization: GM sees everything; players see own notes + SHARED notes
  const canView = gm || note.authorId === user.id || note.visibility === "SHARED";
  if (!canView) notFound();

  const visibilityLabel: Record<string, string> = {
    PRIVATE: "Private",
    SHARED: "Shared",
    GM_SHARED: "Shared with GM",
  };

  // Folders the user may move this note into (visible folders)
  const moveFolders = await prisma.noteFolder.findMany({
    where: {
      campaignId: user.campaignId,
      ...(gm ? {} : { OR: [{ isPublic: true }, { ownerId: user.id }] }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Player's placement for this note (their personal folder), if any
  const placement = gm
    ? null
    : await prisma.notePlacement.findUnique({
        where: { userId_noteId: { userId: user.id!, noteId: note.id } },
        include: { folder: { select: { name: true, id: true } } },
      }).catch(() => null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/notes" className="text-xs uppercase tracking-wider text-stone-500 hover:text-amber-400">
        ← Notes
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`font-serif text-3xl text-amber-400 ${note.rtl ? "text-right" : ""}`} dir={note.rtl ? "rtl" : "ltr"}>
            {note.title}
          </h1>
          <p className="mt-1 text-xs text-stone-500" dir="ltr">
            by {note.author.name} · {visibilityLabel[note.visibility]} · updated{" "}
            {note.updatedAt.toLocaleDateString()}
            {note.folderId && <span> · 📁 {note.folder?.name}</span>}
          </p>
        </div>
        {note.authorId === user.id && (
          <div className="flex gap-2">
            <Link
              href={`/notes/${note.id}/edit`}
              className="rounded border border-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
            >
              Edit
            </Link>
            <DeleteNoteButton noteId={note.id} />
          </div>
        )}
      </div>

      <Markdown rtl={note.rtl}>{note.body || "No content."}</Markdown>

      {/* Non-author viewers (players with public notes): can move but not edit */}
      {note.authorId !== user.id && (
        <MoveNoteForm
          noteId={note.id}
          currentFolderId={placement?.folderId ?? null}
          folders={moveFolders}
          currentFolderName={placement?.folder?.name ?? note.folder?.name}
        />
      )}

      {(note.characters.length > 0 ||
        note.locations.length > 0 ||
        note.factions.length > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-stone-500">
            Linked Entities
          </h2>
          <ul className="space-y-2 mb-4">
            {note.characters.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/characters/${l.character.id}`}
                  className="flex items-center gap-2 text-sm text-stone-300 hover:text-amber-400"
                >
                  👤 <span>{l.character.name}</span>
                </Link>
              </li>
            ))}
            {note.locations.map((l) => (
              <li key={l.id} className="flex items-center gap-2 text-sm text-stone-300">
                📍 <span>{l.location.name}</span>
              </li>
            ))}
            {note.factions.map((l) => (
              <li key={l.id} className="flex items-center gap-2 text-sm text-stone-300">
                ⚔ <span>{l.faction.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}