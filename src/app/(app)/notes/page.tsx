import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isGM } from "@/lib/access";
import NoteFoldersPanel from "@/components/NoteFoldersPanel";
import FolderManager from "@/components/FolderManager";

const VIS: Record<string, string> = {
  PRIVATE: "Private",
  SHARED: "Shared",
  GM_SHARED: "Shared with GM",
};

// Rough markdown → plain text for list snippets
function snippet(body: string, len = 200): string {
  let s = body
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1") // wiki links
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_~`>#|]/g, "") // md chars
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > len ? s.slice(0, len) + "…" : s;
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const user = await requireUser();
  const gm = isGM(user.role);
  const sp = await searchParams;
  const activeFolderId = sp.folder || null;

  const folders = await prisma.noteFolder.findMany({
    where: {
      campaignId: user.campaignId,
      ...(gm ? {} : { OR: [{ isPublic: true }, { ownerId: user.id }] }),
    },
    include: { _count: { select: { notes: true, children: true } } },
    orderBy: { name: "asc" },
  });

  // GM sees everything (canonical folder); player sees own + SHARED, placed per-user
  const whereBase: any = gm
    ? { campaignId: user.campaignId }
    : {
        campaignId: user.campaignId,
        OR: [{ authorId: user.id }, { visibility: "SHARED" }],
      };

  // Player folder view: notes with a placement row in this folder,
  // or (no placement) notes whose canonical folder IS this folder — only if folder is public.
  const [orphanNotes, folderNotes] = await Promise.all([
    // Notes across all folders (only when viewing "all")
    activeFolderId
      ? Promise.resolve([])
      : prisma.note.findMany({
          where: { ...whereBase },
          include: { author: { select: { name: true } }, folder: true, placements: { where: { userId: user.id }, include: { folder: { select: { name: true } } } } },
          orderBy: { updatedAt: "desc" },
        }),
    // Notes in the selected folder
    activeFolderId
      ? prisma.note.findMany({
          where: {
            ...whereBase,
            ...(gm
              ? { folderId: activeFolderId }
              : {
                  OR: [
                    { placements: { some: { userId: user.id, folderId: activeFolderId } } },
                    { folderId: activeFolderId, folder: { is: { isPublic: true } } },
                  ],
                }),
          },
          include: { author: { select: { name: true } }, folder: true, placements: { where: { userId: user.id }, include: { folder: { select: { name: true } } } } },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;
  const shownNotes = activeFolderId ? folderNotes : orphanNotes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-amber-400">
            {activeFolder ? `📁 ${activeFolder.name}` : "Notes"}
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            {activeFolder ? `${folderNotes.length} note(s) in this folder` : "Notes not in a folder"}
          </p>
        </div>
        <Link
          href={`/notes/new${activeFolderId ? `?folder=${activeFolderId}` : ""}`}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          + New Note
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <NoteFoldersPanel folders={folders} activeFolderId={activeFolderId} />
          <FolderManager folders={folders} gm={gm} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shownNotes.map((n) => (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              className="rounded-lg border border-stone-800 bg-stone-900 p-4 transition hover:border-amber-700"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className={`font-semibold text-stone-100 ${n.rtl ? "text-right" : ""}`}>{n.title}</h2>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                    n.visibility === "PRIVATE"
                      ? "bg-stone-800 text-stone-500"
                      : n.visibility === "SHARED"
                        ? "bg-sky-900/60 text-sky-300"
                        : "bg-amber-900/60 text-amber-300"
                  }`}
                >
                  {VIS[n.visibility]}
                </span>
              </div>
              <p
                className={`mt-2 line-clamp-3 text-sm text-stone-400 ${n.rtl ? "text-right" : ""}`}
                dir={n.rtl ? "rtl" : "ltr"}
              >
                {snippet(n.body)}
              </p>
              <p className="mt-3 text-xs text-stone-600">
                by {n.author.name} · {n.updatedAt.toLocaleDateString()}
                {!gm && n.placements?.[0]?.folder && (
                  <span> · 📁 {n.placements[0].folder.name} (you)</span>
                )}
                {!gm && !n.placements?.[0] && n.folder && <span> · 📁 {n.folder.name}</span>}
                {n.rtl && <span className="ml-1 rounded bg-stone-800 px-1 text-[9px] text-amber-400">عربي/فارسی</span>}
              </p>
            </Link>
          ))}
          {shownNotes.length === 0 && (
            <p className="col-span-full rounded-lg border border-dashed border-stone-700 p-8 text-center text-stone-500">
              {activeFolder ? "No notes in this folder yet." : "No notes here. Pick a folder or create one."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}