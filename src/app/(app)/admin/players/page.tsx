import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";

export default async function AdminPlayersPage() {
  await requireGM();

  const players = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, _count: { select: { notes: true } } },
    orderBy: { email: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-amber-400">Players & Roles</h1>
          <p className="mt-1 text-sm text-stone-400">Manage campaign membership.</p>
        </div>
        <Link
          href="/admin/players/new"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          + New Player
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <Link
            key={p.id}
            href={`/admin/players/${p.id}`}
            className="rounded-lg border border-stone-800 bg-stone-900 p-4 transition hover:border-amber-700"
          >
            <div className="flex items-center gap-3">
              {p.role === "GM" && (
                <span className="rounded bg-amber-950/30 px-2 py-1 text-xs text-amber-300">GM</span>
              )}
              <span className="font-medium text-stone-100">{p.name || p.email}</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">{p.email}</p>
            <p className="mt-1 text-xs text-stone-600">{p._count.notes} note(s)</p>
          </Link>
        ))}
      </div>
    </div>
  );
}