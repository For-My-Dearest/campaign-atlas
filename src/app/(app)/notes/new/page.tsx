import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isGM } from "@/lib/access";
import NoteForm from "@/components/NoteForm";

export default async function NewNotePage() {
  const user = await requireUser();
  const gm = isGM(user.role);
  const folders = await prisma.noteFolder.findMany({
    where: {
      campaignId: user.campaignId,
      ...(gm ? {} : { OR: [{ isPublic: true }, { ownerId: user.id }] }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <NoteForm folders={folders} canShare={gm} />;
}