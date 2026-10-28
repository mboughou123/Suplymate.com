# Pre-launch links

Use these URLs in LinkedIn and X posts. The first page a visitor opens stores `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, the referrer, and the landing path in `sessionStorage` for that browser tab. If they sign up later in the same visit, the signup keeps that first landing.

The site does not write a tracking cookie for this.

## Ready-to-use links

LinkedIn:

https://suplymate.com/en/early-access?utm_source=linkedin&utm_medium=social&utm_campaign=prelaunch

X:

https://suplymate.com/en/early-access?utm_source=x&utm_medium=social&utm_campaign=prelaunch

French example (other locales use the same query string):

https://suplymate.com/fr/early-access?utm_source=linkedin&utm_medium=social&utm_campaign=prelaunch

A post can also land on a supplier or product page. Keep the same query string:

https://suplymate.com/en/suppliers?utm_source=linkedin&utm_medium=social&utm_campaign=prelaunch&utm_content=mills-carousel

## Naming rules

| Parameter | Value |
| --- | --- |
| `utm_source` | `linkedin` or `x`. One site per link. |
| `utm_medium` | `social` for organic posts. |
| `utm_campaign` | `prelaunch` for this campaign. Do not rename it mid-flight or the admin counts split. |
| `utm_content` | Which post. Lowercase, hyphens, no spaces. |

`utm_content` examples:

- `founder-post-1` — first founder post
- `mills-carousel` — carousel about mills
- `quote-thread` — thread about requesting quotes
- `reply-2026-10-28` — a reply or reshare on that date

Do not put email addresses, names, or phone numbers in `utm_content`. It is stored with the signup and shown in the admin list.

## Where signups go

Rows are stored in `EarlyAccessSignup`. Admin → Early access (`/admin/early-access`) shows the list, counts by `utm_source`, and a CSV download. The page uses the same `ADMIN_EMAILS` allowlist as job applications.

No email is sent when someone signs up.

## What Amine runs on Vercel

No new environment variables. Enable **Web Analytics** and **Speed Insights** on the Vercel project so `@vercel/analytics` and `@vercel/speed-insights` report traffic. They do not need API keys in this repo.

`ADMIN_EMAILS` must already include the people who should open the signup list. `DATABASE_URL` and `DIRECT_URL` stay as they are.

The production build runs `prisma db push` and `prisma/schema-repair.sql`, which create `EarlyAccessSignup`. Preview builds do not push the schema, because they share the production database.

To create the table before that production deploy:

```bash
npx prisma db execute --file prisma/sql/early_access_signup.sql --schema prisma/schema.prisma
```

Run that with production `DATABASE_URL` and `DIRECT_URL`. It only adds the table and indexes.
