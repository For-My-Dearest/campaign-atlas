import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

function cleanBody(raw: string): string {
  let s = raw;
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/\u00a0/g, " "); // nbsp
  // Remove HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  // Resolve wiki links
  s = s.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1");
  // Remove horizontal rules between sections (creature statblocks) — keep single section sep
  s = s.replace(/^\s*---\s*$/gm, "");
  // Collapse 4+ dashes
  s = s.replace(/\n{4,}/g, "\n\n\n");
  // Trim trailing spaces
  s = s.split("\n").map((l) => l.trimEnd()).join("\n");
  // Collapse 3+ blank lines to 2
  s = s.replace(/\n{3,}/g, "\n\n");
  // Tables: ensure header separator has at least 3 dashes per cell so GFM parses
  s = s.replace(/^\| ([- ]+) \|$/gm, (_m, dashes) => {
    const cells = dashes.split(/\s*\|\s*/);
    return "| " + cells.map((c) => (c.length >= 3 ? c : "-".repeat(3))).join(" | ") + " |";
  });
  return s;
}

async function main() {
  const notes = await prisma.note.findMany();
  let updated = 0;
  for (const n of notes) {
    const clean = cleanBody(n.body);
    if (clean !== n.body) {
      await prisma.note.update({ where: { id: n.id }, data: { body: clean } });
      updated += 1;
    }
  }
  console.log(`cleaned ${updated}/${notes.length} note bodies`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});