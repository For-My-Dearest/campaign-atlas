import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const ZIP_PATH = path.join(process.cwd(), "D&D World.zip");

const PERSIAN_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Folder names to SKIP (root "index" files that are just nav/overview inside folders)
const SKIP_FILES = new Set([
  "E rank.md",
  "Player.md",
  "Monsters.md",
  "District of coins.md",
  "Guild Quarter.md",
  "Old Arcadia.md",
  "Rest Mile.md",
]);

function cleanTitle(name: string): string {
  return name
    .replace(/\.md$/, "")
    .replace(/\s*-\s*DONE\s*$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function cleanBody(raw: string): string {
  let s = raw;

  // Remove HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, "");

  // Resolve [[wiki links]] to plain text (keep label)
  s = s.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1");

  // Normalize line endings
  s = s.replace(/\r\n/g, "\n");

  // Collapse 3+ blank lines to 1
  s = s.replace(/\n{3,}/g, "\n\n");

  // Trim leading/trailing whitespace
  s = s.trim();

  return s;
}

function isPersian(text: string): boolean {
  return PERSIAN_RE.test(text);
}

// Parse zip into { path, content }[] using python (handles Unicode filenames)
function readZip(): { path: string; content: string }[] {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dndzip-"));
  const script = path.join(process.cwd(), "prisma", "unzip-helper.py");
  execSync(`python ${JSON.stringify(script)} ${JSON.stringify(ZIP_PATH)} ${JSON.stringify(tmp)}`);
  const files: { path: string; content: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = full.slice(tmp.length + 1).replace(/\\/g, "/");
        files.push({ path: rel, content: fs.readFileSync(full, "utf8") });
      }
    }
  };
  walk(tmp);
  return files;
}

async function main() {
  const gm = await prisma.user.findUnique({ where: { email: "gm@campaign.test" } });
  if (!gm) throw new Error("GM user not found. Run db:seed first.");

  const campaign = await prisma.campaign.findFirst({ where: { users: { some: { id: gm.id } } } });
  if (!campaign) throw new Error("Campaign not found");

  const files = readZip();
  console.log(`Read ${files.length} markdown files from zip`);

  // Folder cache: path -> id
  const folderIds = new Map<string, string>();
  const rootFolder = await prisma.noteFolder.create({
    data: { name: "World Library", campaignId: campaign.id },
  });
  folderIds.set("", rootFolder.id);

  async function ensureFolder(relDir: string): Promise<string> {
    if (!relDir) return rootFolder.id;
    if (folderIds.has(relDir)) return folderIds.get(relDir)!;

    // Ensure parent first
    const parts = relDir.split("/");
    const parentDir = parts.slice(0, -1).join("/");
    const parentId = await ensureFolder(parentDir);

    const folder = await prisma.noteFolder.create({
      data: { name: parts[parts.length - 1], campaignId: campaign.id, parentId },
    });
    folderIds.set(relDir, folder.id);
    return folder.id;
  }

  let created = 0;
  let skipped = 0;
  for (const f of files) {
    const parts = f.path.split("/");
    const filename = parts[parts.length - 1];
    if (SKIP_FILES.has(filename)) {
      skipped += 1;
      continue;
    }
    const dir = parts.slice(0, -1).join("/");
    const title = cleanTitle(filename);
    const body = cleanBody(f.content);
    if (!body) {
      skipped += 1;
      continue;
    }
    const folderId = await ensureFolder(dir);

    await prisma.note.create({
      data: {
        title,
        body,
        visibility: "SHARED",
        rtl: isPersian(f.content),
        authorId: gm.id,
        campaignId: campaign.id,
        folderId,
      },
    });
    created += 1;
  }

  console.log(`Created ${created} notes, skipped ${skipped} (index/short files)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});