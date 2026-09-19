import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

function cleanBody(raw: string): string {
  let s = raw;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1");
  s = s.replace(/\r\n/g, "\n");
  // Collapse 3+ blank lines to 1
  s = s.replace(/\n{3,}/g, "\n\n");
  // Remove lines that are only dashes (---)
  s = s.replace(/\n---\n/g, "\n\n");
  // Remove heading hashes + space at start of lines (make bold instead)
  s = s.replace(/^(#{1,4})\s+(.+)$/gm, (_, _h, text) => `**${text}**`);
  // Collapse triple+ newlines again
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

// Map note titles to existing character IDs (already seeded)
const EXISTING = new Map<string, string>([
  ["Sir Kai", "char-sir-kai"],
  ["Rosie Bloom", "char-rosie"],
  ["Meriele Holymion", "char-meriele"],
  ["Gron", "char-gron"],
  ["Elara", "char-elara"],
  ["Blackwood Family", "char-blackwood"],
]);

// Locations from the Character notes (from the zip structure)
const LOCATION_MAP: Record<string, string> = {
  "District of coins": "District of coins, Arcadia",
  "Guild Quarter": "Guild Quarter, Arcadia",
  "Old Arcadia": "Old Arcadia, Arcadia",
  "Rest Mile": "Rest Mile, Arcadia",
  "The Gilded Peacock": "The Gilded Peacock, District of coins, Arcadia",
};

async function main() {
  const gm = await prisma.user.findUnique({ where: { email: "gm@campaign.test" } });
  if (!gm) throw new Error("No GM");
  const campaign = await prisma.campaign.findFirst({
    where: { users: { some: { id: gm.id } } },
  });
  if (!campaign) throw new Error("No campaign");

  // Get all character notes (under Characters/ folder tree)
  const charFolders = await prisma.noteFolder.findMany({
    where: {
      parent: {
        OR: [{ name: "Characters" }, { parent: { name: "Characters" } }],
      },
    },
    select: { id: true },
  });
  const charFolderIds = charFolders.map((f) => f.id);

  const notes = await prisma.note.findMany({
    where: { folderId: { in: charFolderIds } },
    orderBy: { title: "asc" },
  });

  console.log(`Found ${notes.length} character notes`);

  let created = 0;
  let skipped = 0;
  let existing = 0;

  for (const note of notes) {
    const title = note.title;
    const body = cleanBody(note.body);

    // Skip if already exists
    if (EXISTING.has(title)) {
      const charId = EXISTING.get(title)!;
      // Update the existing character's description if missing
      await prisma.character.update({
        where: { id: charId },
        data: {
          description: body,
          status: "hidden", // hide all existing ones too until user decides
        },
      });
      existing += 1;
      console.log(`  [existing] ${title} → ${charId}`);
      continue;
    }

    // Determine location from the note's folder parent
    const folder = await prisma.noteFolder.findUnique({ where: { id: note.folderId! } });
    const parent = folder?.parentId
      ? await prisma.noteFolder.findUnique({ where: { id: folder.parentId } })
      : null;
    const districtName = parent?.name ?? folder?.name ?? "";

    const char = await prisma.character.create({
      data: {
        name: title,
        description: body,
        portraitUrl: null,
        role: null,
        publicInfo: null,
        gmOnly: null,
        tags: "imported",
        status: "hidden",
        campaignId: campaign.id,
        locationId: null, // location names stored in description, not FK
      },
    });
    created += 1;
    console.log(`  [created] ${title} → ${char.id} (${districtName})`);
  }

  console.log(`\nDone: ${created} created, ${existing} updated (all hidden)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
