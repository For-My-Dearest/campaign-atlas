import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGM } from "@/lib/session";

export default async function AdminDashboardPage() {
  await requireGM();

  const [chars, maps, users] = await Promise.all([
    prisma.character.count(),
    prisma.map.count(),
    prisma.user.count(),
  ]);

  const cards = [
    { label: "Characters", value: chars, href: "/admin/characters", color: "text-amber-400" },
    { label: "Maps", value: maps, href: "/admin/maps", color: "text-emerald-400" },
    { label: "Players", value: users, href: "/admin/players", color: "text-violet-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-amber-400">GM Panel</h1>
        <p className="mt-1 text-stone-400">Manage the campaign.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-stone-800 bg-stone-900 p-5 transition hover:border-amber-700"
          >
            <div className={`font-serif text-3xl ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-sm text-stone-400">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/characters/new"
          className="rounded-lg border border-stone-800 bg-stone-900 p-5 transition hover:border-emerald-700"
        >
          <div className="font-semibold text-emerald-400">+ Add Character</div>
          <p className="mt-1 text-sm text-stone-500">Create a character with portrait, location, and notes.</p>
        </Link>
        <Link
          href="/admin/maps"
          className="rounded-lg border border-stone-800 bg-stone-900 p-5 transition hover:border-emerald-700"
        >
          <div className="font-semibold text-emerald-400">Place Markers</div>
          <p className="mt-1 text-sm text-stone-500">Visually place characters and locations on maps.</p>
        </Link>
        <Link
          href="/admin/players"
          className="rounded-lg border border-stone-800 bg-stone-900 p-5 transition hover:border-emerald-700"
        >
          <div className="font-semibold text-emerald-400">Manage Players</div>
          <p className="mt-1 text-sm text-stone-500">View campaign members and roles.</p>
        </Link>
      </div>
    </div>
  );
}