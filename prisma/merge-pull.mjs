/**
 * merge-pull.mjs — content merge of GM world data + player's own data
 *
 * Sources (compared against each other, row by row, by CONTENT):
 *   dev.db.gm                  -> the GM's world database (pulled from git)
 *   dev.db.backup-before-pull  -> the player's own database before the pull
 * Target (merged result written to):
 *   dev.db
 *
 * Merge rules (per primary-key id):
 *   - Row in ONLY ONE source            -> copied over (new row)
 *   - Row in BOTH, content IDENTICAL    -> kept once
 *   - Row in BOTH, content DIFFERS      -> newest `updatedAt` wins
 *       (no updatedAt from player-owned tables -> player's copy wins)
 *   - Rows already in dev.db and in NEITHER source -> left untouched
 *
 * Safety: dev.db is backed up to dev.db.merge-backup before any write.
 *
 * Usage:
 *   node prisma/merge-pull.mjs                          (defaults)
 *   node prisma/merge-pull.mjs <target> <gm> <backup>   (custom paths)
 */

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const [TARGET_ARG, GM_ARG, BACKUP_ARG] = process.argv.slice(2);
const TARGET_DB = TARGET_ARG ? path.resolve(TARGET_ARG) : path.join(ROOT, "dev.db");
const GM_DB = GM_ARG ? path.resolve(GM_ARG) : path.join(ROOT, "dev.db.gm");
const BACKUP_DB = BACKUP_ARG ? path.resolve(BACKUP_ARG) : path.join(ROOT, "dev.db.backup-before-pull");

// Insertion order respects foreign keys (parents before children).
const TABLES = [
  "campaigns",
  "users",
  "locations",
  "factions",
  "maps",
  "note_folders",
  "map_markers",
  "characters",
  "notes",
  "note_character_links",
  "note_location_links",
  "note_faction_links",
  "note_placements",
];

// Player-owned rows: if GM and backup disagree and there's no updatedAt, player's copy wins.
const PLAYER_WINS = new Set(["note_placements"]);

function openDb(file) {
  const adapter = new PrismaLibSql({ url: `file:${file}` });
  return new PrismaClient({ adapter });
}

function normVal(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (Buffer.isBuffer(v)) return v.toString("base64");
  if (Array.isArray(v)) return v.map(normVal);
  return v;
}

function rowFingerprint(row) {
  const cols = Object.keys(row).sort();
  return JSON.stringify(cols.map((c) => [c, normVal(row[c])]));
}

function rowsEqual(a, b) {
  return rowFingerprint(a) === rowFingerprint(b);
}

function pickWinner(backupRow, gmRow, table) {
  if (rowsEqual(backupRow, gmRow)) return { row: gmRow, status: "same", winner: null };

  if ("updatedAt" in backupRow && backupRow.updatedAt !== null) {
    const tb = new Date(backupRow.updatedAt).getTime();
    const tg = new Date(gmRow.updatedAt).getTime();
    if (tb !== tg) {
      return {
        row: tb > tg ? backupRow : gmRow,
        status: "conflict-newer",
        winner: tb > tg ? "backup(player)" : "gm",
      };
    }
    return { row: gmRow, status: "conflict-equal-ts", winner: "gm" };
  }

  const pref = PLAYER_WINS.has(table) ? backupRow : gmRow;
  return { row: pref, status: "conflict-pref", winner: pref === backupRow ? "backup(player)" : "gm" };
}

async function main() {
  for (const f of [TARGET_DB, GM_DB, BACKUP_DB]) {
    if (!fs.existsSync(f)) {
      console.error(`ERROR: missing file: ${f}`);
      console.error("Expected to run from the campaign-atlas folder with dev.db, dev.db.gm, dev.db.backup-before-pull");
      process.exit(1);
    }
  }

  const mergeBackup = TARGET_DB + ".merge-backup";
  fs.copyFileSync(TARGET_DB, mergeBackup);
  console.log(`Backup of target saved: ${mergeBackup}`);

  const target = openDb(TARGET_DB);
  const gm = openDb(GM_DB);
  const backup = openDb(BACKUP_DB);

  let grandAdded = 0, grandUpdated = 0, grandSame = 0;

  try {
    for (const table of TABLES) {
      const gmRows = await gm.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      const backupRows = await backup.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      const targetRows = await target.$queryRawUnsafe(`SELECT * FROM "${table}"`);

      if (gmRows.length === 0 && backupRows.length === 0) continue;

      // index both sources by id
      const byId = new Map();
      for (const r of backupRows) byId.set(String(r.id), { backup: r, gm: null });
      for (const r of gmRows) {
        const id = String(r.id);
        if (byId.has(id)) byId.get(id).gm = r;
        else byId.set(id, { backup: null, gm: r });
      }

      const targetIds = new Set(targetRows.map((r) => String(r.id)));

      const merged = [];
      let added = 0, updated = 0, same = 0;

      for (const [id, { backup: b, gm: g }] of byId) {
        let row, status, winner = null;
        if (b && g) {
          const res = pickWinner(b, g, table);
          row = res.row; status = res.status; winner = res.winner;
          if (status === "same") same++;
          else updated++;
        } else {
          row = b ?? g;
          status = "new";
          added++;
        }
        merged.push({ id, row, status, winner });
      }

      // write merged rows into target (skip identical; upsert the rest without delete)
      for (const { row, status } of merged) {
        if (status === "same") continue;
        const cols = Object.keys(row);
        const values = cols.map((c) => {
          const v = row[c];
          if (v === undefined) return null;
          if (v instanceof Date) return v.toISOString();
          return v;
        });
        const placeholders = cols.map(() => "?").join(", ");
        const quoted = cols.map((c) => `"${c}"`).join(", ");
        // upsert without deleting — keeps FK refs intact, handles target already having the id
        const updates = cols.filter((c) => c !== "id").map((c) => `"${c}"=excluded."${c}"`).join(", ");
        await target.$executeRawUnsafe(
          `INSERT INTO "${table}" (${quoted}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
          ...values
        );
      }

      console.log(
        `  ${table}: +${added} new, ~${updated} updated, =${same} identical ` +
        `(target had ${merged.filter((m) => targetIds.has(m.id)).length}/${targetRows.length})`
      );

      grandAdded += added; grandUpdated += updated; grandSame += same;

      for (const c of merged.filter((m) => m.status.startsWith("conflict")).slice(0, 5)) {
        console.log(`      conflict ${table} id=${c.id} -> ${c.status} (winner: ${c.winner})`);
      }
    }

    console.log(
      `\nDone. +${grandAdded} new, ~${grandUpdated} updated, =${grandSame} identical merged into ${TARGET_DB}.`
    );
  } finally {
    await target.$disconnect();
    await gm.$disconnect();
    await backup.$disconnect();
  }
}

main().catch((err) => {
  console.error("Merge failed:", err.message);
  console.error(`Target backup: ${TARGET_DB}.merge-backup — copy it back to restore.`);
  process.exit(1);
});