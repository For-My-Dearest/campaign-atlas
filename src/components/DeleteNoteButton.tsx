"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteNoteButton({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm("Delete this note?")) return;
    setBusy(true);
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/notes");
      router.refresh();
    } else {
      alert("Failed to delete note.");
    }
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="rounded border border-red-900/60 px-4 py-2 text-sm text-red-400 hover:bg-red-950/40 disabled:opacity-50"
    >
      Delete
    </button>
  );
}