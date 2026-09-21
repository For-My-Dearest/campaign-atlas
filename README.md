# The World & Kingdoms — Campaign Atlas

This is our D&D campaign app. It has all the maps, notes, characters, and locations for our game. Everything is pre-loaded — you just need to install and run it.

## What You Need First

Install **Node.js** on your computer (this is required to run the app):

1. Go to: https://nodejs.org/
2. Download the **LTS** version (the green button on the left)
3. Run the installer — click "Next" through everything, accept all defaults
4. When it finishes, close the installer

**How to verify it worked:** Open a terminal/command prompt and type:
```
node -v
```
You should see something like `v22.x.x`. If you see that, you're good. If not, restart your computer and try again.

## Setup

Open a terminal and run these one at a time, waiting for each to finish:

```bash
git clone https://github.com/For-My-Dearest/campaign-atlas
```

```bash
cd campaign-atlas
```
This moves you into the project folder.

```bash
npm install
```
This installs everything the app needs. Takes about 2-5 minutes the first time. You'll see some text scrolling — that's normal. Wait until you see the terminal prompt come back (no more text appearing).

Run this to generate prisma:
```
npx prisma generate
```
This starts the app.
```bash
npm run dev
```
 You'll see something like:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
```

Now open your browser and go to: **http://localhost:3000**

That's it. The campaign atlas is running.

## Getting Updates From the GM (important!)

When the GM publishes new world content, you need to **merge** it into your local database — **not** just `git pull`. This keeps your own notes safe.

**The rule:** Never pull with the app running, and always backup your database first.

**The 4-step update flow:**

1. **Stop the app** (press `Ctrl+C` in the terminal running it)

2. **Backup your database:**
   run PowerShell in the folder "campaign atlas". To do that, just click on the address bar, remove the address, and type PowerShell and enter.
   The, run this:

   ```bash
   cp dev.db dev.db.backup-before-pull
   ```

4. **Pull the new code:**

   ```bash
   git pull
   ```

   If you see a merge conflict about `dev.db`, don't panic — run:
   ```bash
   git checkout --theirs dev.db
   ```
   This keeps the GM's newer world database.

5. **Merge the GM's world data into your local DB:**

   Run in PowerShell, doesn't give an output in the PowerShell.
   ```bash
   cp dev.db dev.db.gm
   ```
   Run this for the databases to merge.
   ```
   node prisma/merge-pull.mjs 
   ```

   The script:
   - Copies anything **new** from the GM's database into yours (maps, notes, characters, folders)
   - **Skips anything you already have** — your personal notes and folder placements stay untouched
   - Backs up your `dev.db` to `dev.db.backup` first

7. **Start the app again:**

   ```bash
   npm run dev
   ```

**What the merge does NOT do:**
- Doesn't overwrite your notes (if you and the GM both edited the same note, GM's version wins — rare but possible)
- Doesn't touch your folders or folder placements
- Doesn't touch your account info
- Doesn't remove anything you deleted

**Restore:** If anything ever looks wrong, restore your backup with:
```bash
cp dev.db.backup-before-pull dev.db
```
and delete `dev.db.backup` + `dev.db.gm` afterward.
