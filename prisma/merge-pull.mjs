/**
 * merge-pull.mjs — GM world data into player's dev.db
 *
 * Run after `git pull` to merge new world content into your local database
 * without overwriting your personal notes and folder placements.
 *
 * Usage:
 *   node prisma/merge-pull.mjs
 *   node prisma/merge-pull.mjs <path-to-gm-db>
 *
 * The script:
 *   1. Reads the GM's dev.db (from dev.db.gm or the path you pass)
 *   2. Reads your local dev.db
 *   3. Copies any new GM content (maps, characters, notes, etc.) into your db
 *   4. Skips anything with the same ID (your existing data is untouched)
 *   5. Creates a backup of your dev.db before doing anything
 */

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PLAYER_DB = path.join(ROOT, "dev.db");
const GM_DB_DEFAULT = path.join(ROOT, "dev.db.gm");

// Tables to merge from GM → player, in dependency order
// Each entry: table name + the columns to copy
const TABLES = [
  { table: "campaigns",          idCol: "id" },
  { table: "locations",          idCol: "id" },
  { table: "factions",           idCol: "id" },
  { table: "maps",               idCol: "id" },
  { table: "map_markers",        idCol: "id" },
  { table: "characters",         idCol: "id" },
  { table: "notes",              idCol: "id" },
  { table: "note_folders",       idCol: "id" },
  { table: "note_character_links", idCol: "id" },
  { table: "note_location_links",  idCol: "id" },
  { table: "note_faction_links",   idCol: "id" },
];

// These tables are PERSONAL — don't merge from GM
const SKIP_TABLES = new Set(["users", "accounts", "sessions", "note_placements"]);

async function main() {
  const gmDbPath = fs.existsSync(process.argv[2])
    ? path.resolve(process.argv[2])
    : GM_DB_DEFAULT;

  if (!fs.existsSync(PLAYER_DB)) {
    console.error("ERROR: dev.db not found. Are you in the campaign-atlas folder?");
    process.exit(1);
  }
  if (!fs.existsSync(gmDbPath)) {
    console.error(`ERROR: GM database not found at: ${gmDbPath}`);
    console.error("Tip: After git pull, the GM's db is at dev.db. Copy it to dev.db.gm:");
    console.error("  cp dev.db dev.db.gm    (Mac/Linux)");
    console.error("  copy dev.db dev.db.gm  (Windows)");
    process.exit(1);
  }

  // Backup player's db first
  const backupPath = PLAYER_DB + ".backup";
  fs.copyFileSync(PLAYER_DB, backupPath);
  console.log(`Backup saved: ${backupPath}`);

  const gmAdapter = new PrismaLibSql({ url: `file:${gmDbPath}` });
  const playerAdapter = new PrismaLibSql({ url: `file:${PLAYER_DB}` });
  const gm = new PrismaClient({ adapter: gmAdapter });
  const player = new PrismaClient({ adapter: playerAdapter });

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const { table, idCol } of TABLES) {
    if (SKIP_TABLES.has(table)) continue;

    // Get all columns from GM table
    const gmRows = await gm.$queryRawUnsafe(`SELECT * FROM ${table}`);
    const playerRows = await player.$queryRawUnsafe(`SELECT ${idCol} FROM ${table}`);
    const existingIds = new Set(playerRows.map(r => r[idCol]));

    let inserted = 0;
    let skipped = 0;

    for (const row of gmRows) {
      if (existingIds.has(row[idCol])) {
        skipped++;
        continue;
      }

      const cols = Object.keys(row);
      const placeholders = cols.map(() => "?").join(", ");
      const values = cols.map(c => row[c] === undefined ? null : row[c]);

      try {
        await player.$executeRawUnsafe(
          `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
          ...values
        );
        inserted++;
      } catch (err) {
        // FK constraint failure or duplicate — skip silently
        skipped++;
      }
    }

    if (inserted > 0 || skipped > 0) {
      console.log(`  ${table}: +${inserted} new, =${skipped} already existed`);
    }
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  await gm.$disconnect();
  await player.$disconnect();

  console.log(`\nDone. ${totalInserted} records added, ${totalSkipped} skipped.`);
  console.log(`Run "npm run dev" to start the app.`);

  // Remove the GM db copy (clean up)
  try { fs.unlinkSync(gmDbPath); } catch {}
}

main().catch(err => {
  console.error("Merge failed:", err.message);
  console.error("Your dev.db backup is at dev.db.backup — rename it back to dev.db to restore.");
  process.exit(1);
});
