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

## Setup — 5 Commands

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
