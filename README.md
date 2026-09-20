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

### How to open a terminal

- **Windows:** Press the Windows key, type `cmd` or `powershell`, press Enter
- **Mac:** Press Cmd+Space, type `terminal`, press Enter
- **Linux:** Ctrl+Alt+T

You'll use this terminal for the next steps.

## Setup — 3 Commands

Open a terminal and run these one at a time, waiting for each to finish:

```bash
git clone <repo-url-here>
```
This downloads the project. Replace `<repo-url-here>` with the actual GitHub URL — it looks something like `https://github.com/username/campaign-atlas.git`

```bash
cd campaign-atlas
```
This moves you into the project folder.

```bash
npm install
```
This installs everything the app needs. Takes about 2-5 minutes the first time. You'll see some text scrolling — that's normal. Wait until you see the terminal prompt come back (no more text appearing).

```bash
npm run dev
```
This starts the app. You'll see something like:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
```

Now open your browser and go to: **http://localhost:3000**

That's it. The campaign atlas is running.

## Login

When the page opens, you'll see a login screen. Use these accounts:

**GM account (full access to everything):**
- Email: `gm@campaign.test`
- Password: `gm-secret`

**Player account (see shared notes and characters):**
- Email: `player1@campaign.test`
- Password: `player-secret`

These are already in the app — just type them in and click login.

## What You'll See

- **Atlas Home** — All the campaign maps laid out in a grid
- **Maps** — Click any map to explore it. Zoom in, click markers to see characters and locations on the map
- **Characters** — Full character profiles with portraits, roles, factions, and backstory
- **Locations** — Places in the world, connected to maps
- **Notes** — Shared notes about sessions, lore, and everything we've done

## Stopping the App

When you're done looking at it, go back to the terminal and press `Ctrl + C`. This stops the server. To start it again later, just run `npm run dev` from the campaign-atlas folder.

## Tips

- **To start fresh:** If something breaks or looks weird, close the app (Ctrl+C), then run `npm run dev` again
- **You can't break anything:** The app is read-only for you — you can't delete or change campaign data accidentally
- **Close the terminal?** Just open a new one, `cd` to the campaign-atlas folder, and run `npm run dev` again
- **Bookmark the page:** Add http://localhost:3000 to your bookmarks for quick access

## Troubleshooting

**"node is not recognized" or "command not found"**
Node.js isn't installed or not in your PATH. Try restarting your computer after installing, or reinstall Node.js.

**"npm install" gives an error**
Make sure you're in the campaign-atlas folder. Run `ls` (Mac/Linux) or `dir` (Windows) to check — you should see files like `package.json`, `dev.db`, `README.md`.

**Page shows "This site can't be reached"**
The app isn't running. Open a terminal, `cd` to the campaign-atlas folder, and run `npm run dev`.

**"Port 3000 is already in use"**
Something else is using that port. Run `npm run dev -- -p 3001` and go to http://localhost:3001 instead.

**Login doesn't work / "CredentialsSignin" error**
Close all browser tabs with the app open, clear your browser cache (or try incognito/private mode), and try again.

## What's Inside (technical details)

- **App:** Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Database:** SQLite via Prisma ORM + libSQL adapter (no server needed — the database is a file called `dev.db` that's included)
- **Auth:** NextAuth v5 with JWT sessions
- **Everything is local:** No internet connection needed to use the app once it's installed. No accounts to create. No servers to connect to.
- **No native compilation:** The app installs clean on Windows/Mac/Linux with zero build tools required. The `.npmrc` is configured to skip peer dependencies that would require compilation.