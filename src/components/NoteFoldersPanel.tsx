"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  _count: { notes: number; children: number };
};

export default function NoteFoldersPanel({
  folders,
  activeFolderId,
}: {
  folders: Folder[];
  activeFolderId: string | null;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Build tree
  const byParent = new Map<string | null, Folder[]>();
  folders.forEach((f) => {
    const key = f.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  });
  const roots = byParent.get(null) ?? [];

  const toggle = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  function renderFolder(f: Folder, depth: number): React.ReactNode {
    const hasKids = (byParent.get(f.id) ?? []).length > 0;
    const isCollapsed = collapsed.has(f.id);
    return (
      <div key={f.id}>
        <div
          className={`group flex items-center gap-1 rounded px-2 py-1 text-sm ${
            activeFolderId === f.id ? "bg-amber-950/50 text-amber-300" : "text-stone-300 hover:bg-stone-800"
          }`}
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          {hasKids ? (
            <button onClick={(e) => toggle(f.id, e)} className="w-4 flex-none text-stone-500 hover:text-stone-300">
              {isCollapsed ? "▸" : "▾"}
            </button>
          ) : (
            <span className="w-4 flex-none" />
          )}
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("folder", f.id);
              window.location.href = url.toString();
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <span className="flex-none">📁</span>
            <span className="truncate">{f.name}</span>
            <span className="flex-none text-[10px] text-stone-500">({f._count.notes})</span>
          </button>
          <a
            href={`/notes/new?folder=${f.id}`}
            className="hidden flex-none rounded px-1 text-[10px] text-stone-500 hover:text-emerald-300 group-hover:inline"
            title="New note in this folder"
          >
            +
          </a>
        </div>
        {hasKids && !isCollapsed && <div>{byParent.get(f.id)!.map((c) => renderFolder(c, depth + 1))}</div>}
      </div>
    );
  }

  return (
    <aside className="rounded-lg border border-stone-800 bg-stone-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Folders</h2>
        <a href="/notes/new" className="text-[10px] text-emerald-400 hover:text-emerald-300">
          + New
        </a>
      </div>
      {folders.length === 0 ? (
        <p className="text-xs text-stone-500">No folders yet.</p>
      ) : (
        <div className="space-y-0.5">{roots.map((f) => renderFolder(f, 0))}</div>
      )}
    </aside>
  );
}