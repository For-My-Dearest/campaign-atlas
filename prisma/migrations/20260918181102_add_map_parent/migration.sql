-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_maps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "widthPx" INTEGER NOT NULL,
    "heightPx" INTEGER NOT NULL,
    "campaignId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "maps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "maps_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "maps" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_maps" ("campaignId", "createdAt", "description", "heightPx", "id", "imageUrl", "name", "updatedAt", "widthPx") SELECT "campaignId", "createdAt", "description", "heightPx", "id", "imageUrl", "name", "updatedAt", "widthPx" FROM "maps";
DROP TABLE "maps";
ALTER TABLE "new_maps" RENAME TO "maps";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
