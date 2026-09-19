-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_note_folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "campaignId" TEXT NOT NULL,
    "ownerId" TEXT,
    "parentId" TEXT,
    CONSTRAINT "note_folders_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "note_folders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "note_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "note_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_note_folders" ("campaignId", "createdAt", "id", "name", "parentId", "updatedAt") SELECT "campaignId", "createdAt", "id", "name", "parentId", "updatedAt" FROM "note_folders";
DROP TABLE "note_folders";
ALTER TABLE "new_note_folders" RENAME TO "note_folders";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
