-- CreateTable
CREATE TABLE "note_placements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "note_placements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "note_placements_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "note_placements_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "note_folders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "note_placements_userId_noteId_key" ON "note_placements"("userId", "noteId");
