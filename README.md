# Shop Inventory

Next.js + Prisma (SQLite) inventory app.

## Setup (new device / fresh clone)

1. Install dependencies
   ​```bash
   npm install
   ​```

2. Create `.env` (gitignored, won't come with the clone)
   ​```bash
   cp .env.example .env
   ​```
   Default:
   ​```
   DATABASE_URL="file:./dev.db"
   ​```

3. Generate Prisma client
   ​```bash
   npx prisma generate
   ​```
   (Only run `npx prisma migrate dev` if `prisma/dev.db` is missing or migrations are out of date.)

4. Run dev server
   ​```bash
   npm run dev
   ​```
   → [http://localhost:3000](http://localhost:3000)

## Troubleshooting

- **`Environment variable not found: DATABASE_URL`** → `.env` missing, run `cp .env.example .env`.
- **Still failing after adding `.env`** → stale build cache: `rm -rf .next && npm run dev`.
- **`prisma studio` fails with same error** → uses `prisma.config.ts` + `dotenv`, needs `.env` in project root and `node_modules` installed.