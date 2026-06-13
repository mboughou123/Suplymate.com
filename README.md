# Suplymate — AI Procurement Platform

Next.js MVP with **auth**, **SQLite backend**, and **AI assistant** (OpenAI optional).

## Quick start

```bash
cd /Users/amb/Suplymate.com
npm install
npm run db:setup    # create DB + seed data + demo user
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login:** `demo@suplymate.com` / `demo123`

## What's included

### Auth
- Sign up: `/signup`
- Sign in: `/login`
- Forgot password: `/forgot-password` (UI only — no email yet)
- Protected dashboard: `/dashboard`
- NextAuth.js + bcrypt passwords

### Backend (SQLite + Prisma)
- Suppliers, products, materials stored in DB
- API routes:
  - `GET /api/suppliers`
  - `GET /api/products`
  - `GET /api/materials`
  - `POST /api/price-alerts` (requires login)
  - `POST /api/auth/register`
- Price alerts saved per user

### AI Assistant
- `POST /api/ai/chat`
- Uses **OpenAI** when `OPENAI_API_KEY` is set in `.env`
- Falls back to smart demo responses without a key

## Environment

Copy `.env.example` to `.env`:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY=""   # optional — enables real AI
```

Generate secret:

```bash
openssl rand -base64 32
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:setup` | Push schema + seed |
| `npm run db:seed` | Re-seed data |

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/suppliers` | Find suppliers (from DB) |
| `/products` | Search products (from DB) |
| `/products/[id]` | Compare offers |
| `/price-charts` | Material prices + alerts |
| `/ai-assistant` | AI chat |
| `/pricing` | Plans |
| `/dashboard` | User hub (auth required) |
| `/login` `/signup` | Auth |

## Deploy (Vercel)

1. Push to GitHub.
2. Import on Vercel.
3. Set env vars: `AUTH_SECRET`, `DATABASE_URL` (use Vercel Postgres or Turso for production — SQLite is local-only).
4. Build command: `prisma generate && next build`
5. Run migrations/seed on production DB separately.

For production, switch `datasource` in `prisma/schema.prisma` to `postgresql` and use a hosted DB.

## Architecture

```
Suppliers  → Who can I buy from?     (DB + API)
Products   → What can I compare?     (DB + API)
Price Charts → When should I buy?    (DB + alerts)
AI Assistant → Smartest decision?    (OpenAI or demo)
```
