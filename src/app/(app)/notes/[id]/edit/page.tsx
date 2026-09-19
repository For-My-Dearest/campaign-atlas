import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isGM } from "@/lib/access";
import NoteForm from "@/components/NoteForm";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const gm = isGM(user.role);

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) notFound();
  if (note.authorId !== user.id) notFound();

  const folders = await prisma.noteFolder.findMany({
    where: {
      campaignId: user.campaignId,
      ...(gm ? {} : { OR: [{ isPublic: true }, { ownerId: user.id }] }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <NoteForm
      noteId={note.id}
      folders={folders}
      canShare={gm}
      initial={{
        title: note.title,
        body: note.body,
        visibility: note.visibility,
        folderId: note.folderId,
        rtl: note.rtl,
      }}
    />
  );
}