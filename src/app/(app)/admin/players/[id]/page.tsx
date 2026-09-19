import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";
import { auth } from "@/auth";
import EditPlayerForm from "@/components/EditPlayerForm";

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gm = await requireGM();
  const session = await auth();
  const meId = (session?.user as any)?.id;

  const player = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!player) notFound();

  const gmCount = await prisma.user.count({ where: { role: "GM" } });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-amber-400">Edit Player</h1>
        <Link href="/admin/players" className="text-xs uppercase tracking-wider text-stone-500 hover:text-amber-400">
          ← All players
        </Link>
      </div>

      <EditPlayerForm
        player={{ id: player.id, name: player.name ?? "", email: player.email, role: player.role }}
        isSelf={player.id === meId}
        isLastGM={player.role === "GM" && gmCount <= 1}
      />
    </div>
  );
}