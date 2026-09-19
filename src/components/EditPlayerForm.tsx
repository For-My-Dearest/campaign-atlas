"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Player = { id: string; name: string; email: string; role: string };

export default function EditPlayerForm({
  player,
  isSelf,
  isLastGM,
}: {
  player: Player;
  isSelf: boolean;
  isLastGM: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(player.name);
  const [email, setEmail] = useState(player.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PLAYER" | "GM">(player.role === "GM" ? "GM" : "PLAYER");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: password || undefined, role }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
      return;
    }
    setPassword("");
    setError("Saved ✓");
    router.refresh();
  }

  async function del() {
    if (!confirm(`Delete ${player.email}? This removes their account and notes.`)) return;
    setSaving(true);
    const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete.");
      return;
    }
    router.push("/admin/players");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block text-sm text-stone-300">Display name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="block text-sm text-stone-300">Email (login)</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="block text-sm text-stone-300">
          New password {isSelf ? "(changing your own)" : "(leave blank to keep)"}
        </label>
        <input
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSelf ? "Leave blank to keep current" : "Leave blank to keep current"}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm text-stone-300">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "PLAYER" | "GM")}
          disabled={isSelf || (isLastGM && player.role === "GM")}
          className="mt-1 w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
        >
          <option value="PLAYER">Player</option>
          <option value="GM">GM</option>
        </select>
        {isLastGM && player.role === "GM" && (
          <p className="mt-1 text-xs text-amber-500">This is the only GM — cannot demote.</p>
        )}
      </div>

      {error && (
        <p
          className={`rounded px-3 py-2 text-sm ${
            error === "Saved ✓" ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"
          }`}
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={saving || isSelf}
          className="rounded bg-red-900/60 px-5 py-2 text-red-300 hover:bg-red-900 disabled:opacity-50"
        >
          Delete Player
        </button>
      </div>
      {isSelf && <p className="text-xs text-stone-500">You can&apos;t delete or demote yourself here.</p>}
    </form>
  );
}