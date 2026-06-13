# Deploying Suplymate to suplymate.com (Vercel + Neon Postgres)

This app is Next.js (App Router) + Prisma + Auth.js. Production uses **Postgres**
(SQLite is local-only and won't work on serverless).

## 1. Create the database (Neon — free)

1. Go to https://neon.tech → sign up → **Create project** (name it `suplymate`).
2. Copy the **connection string** (looks like
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`).
   Keep it handy — this is your `DATABASE_URL`.

> Tip: From the Vercel dashboard you can also add Neon in one click via
> **Storage → Create → Neon**, which wires `DATABASE_URL` automatically.

## 2. Deploy to Vercel

1. Go to https://vercel.com → sign up with **GitHub**.
2. **Add New → Project** → import `mboughou123/Suplymate.com`.
3. Framework is auto-detected as **Next.js**. Before clicking Deploy, add
   **Environment Variables**:

   | Name             | Value                                                        |
   | ---------------- | ------------------------------------------------------------ |
   | `DATABASE_URL`   | Neon **pooled** connection string (`-pooler` in the host)    |
   | `DIRECT_URL`     | Neon **direct** connection string (for migrations)           |
   | `AUTH_SECRET`    | run `openssl rand -base64 32` and paste the output           |
   | `AUTH_TRUST_HOST`| `true`                                                       |
   | `NEXTAUTH_URL`   | `https://suplymate.com`                                      |
   | `OPENAI_API_KEY` | (optional) your OpenAI key for live AI responses             |

   > **Important:** On Vercel you must use Neon's **pooled** URL for
   > `DATABASE_URL` (hostname contains `-pooler`). Use the direct URL only for
   > `DIRECT_URL`. Without the pooler URL, login and registration will fail.

4. Click **Deploy**. Wait for the build to finish.

## 3. Create tables + seed data

After the first deploy, push the schema and seed the demo data. Locally:

```bash
# put the Neon DATABASE_URL in your .env first
npm run db:push     # creates the tables
npm run db:seed     # loads suppliers/products/materials + demo user
```

(Demo login: `demo@suplymate.com` / `demo123`.)

## 4. Connect the domain (registrar: Namecheap)

1. In Vercel: **Project → Settings → Domains → Add** → type `suplymate.com`
   (add `www.suplymate.com` too). Vercel shows the DNS records to set.
2. In Namecheap: **Domain List → Manage → Advanced DNS**. Remove default
   parking records, then add:

   | Type    | Host  | Value                  |
   | ------- | ----- | ---------------------- |
   | A       | `@`   | `76.76.21.21`          |
   | CNAME   | `www` | `cname.vercel-dns.com` |

3. Back in Vercel, wait for the domains to show **Valid Configuration**
   (DNS can take 5–60 min). HTTPS is issued automatically.

Done — https://suplymate.com is live. Every push to `main` auto-deploys.
