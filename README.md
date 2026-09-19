# The World & Kingdoms — Campaign Atlas

Interactive D&D campaign map hub built with Next.js 16 + SQLite (Prisma) + Tailwind CSS 4.

## Quick Start — One Command

```bash
git clone <your-repo-url>
cd campaign-atlas
npm run dev
# Open http://localhost:3000
```

**No manual setup needed.** The `.env` file and database are included in the repo, so `npm install` gives you the complete campaign atlas immediately.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies (includes @prisma/client, adapter, better-sqlite3) |
| `npm run dev` | Start development server at http://localhost:3000 |
| `npm run build` | Create production build |
| `npm run start` | Start production server |

## Security Note

The `.env` file contains AUTH_SECRET. This file is tracked in the repo since this is a closed game environment — no external services or production deployment is intended. The secret signs JWT sessions for GM/login authentication.