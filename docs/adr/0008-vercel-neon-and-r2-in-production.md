# Production runs on Vercel, Neon Postgres and Cloudflare R2, all through portable interfaces

Before the first deploy we chose managed platforms over one big cloud, with a launch budget of
about $0–25 a month and an EU region (Frankfurt; Israeli data residency isn't required). The web
app runs on Vercel (`fra1`). Postgres is Neon (`eu-central-1`). Product images, and the nightly
database dumps, go to Cloudflare R2. Each one is reached only through an interface that other
providers also speak: a plain `DATABASE_URL` for Postgres and the S3 API for storage (a local
S3 server in development, ADR 0011). No `@vercel/postgres`, `@vercel/blob`, Edge Config or
provider auth. Leaving any one of them is then a config change plus a data copy, not a rewrite.

**Neon over Supabase.** ADR 0002 picked Supabase, but nothing had been deployed when we looked
again. We already use only Postgres from it: ADR 0002 rules out Supabase Auth, RLS and storage,
and ADR 0003 keeps authorization in app code. Supabase Pro ($25 flat) plus Vercel Pro (~$20) is
over budget. On the free tiers, Supabase pauses a project after a week idle until someone
restores it by hand, and Neon scales to zero and wakes on the next request (about 1s the first
time). Neon's free tier is 1 GB per database, which is roughly 100k orders, since images live in
R2. It also gives a Neon branch per Vercel preview deploy. The cost is the cold start, and a
usage-based bill once we move to Neon's Launch plan.

**Backups are ours.** Neon's free tier only restores to any point in the last 6 hours. So a
GitHub Action runs `pg_dump` every night into a private R2 bucket and keeps about 30 days. A dump
restores into any Postgres host. Neon Launch (7-day point-in-time restore) comes on top once real
businesses depend on the app.

**R2 for Product images.** Its free tier is 10 GB with no egress fees, and every catalog, order
page and PDF loads the images. Images are public URLs whose keys hold the cuid, so they can't be
guessed. They're shoe photos, not private data, and this lets Cloudflare's CDN cache them. The
database stores the key, never the full URL, and the base URL comes from env. That way moving
from `r2.dev` to `images.<domain>`, or off R2, never touches data.

**Vercel now, Cloudflare maybe later.** Cloudflare Workers is cheaper (about $5/mo paid, and
the free plan allows commercial use) and would put the apps next to R2 and the domain. But
Next.js runs there only through the OpenNext adapter, the `@react-pdf/renderer` bundle with its
font has to fit the Worker size limit, and Fastify (ADR 0010) doesn't run on Workers. So we
start on Vercel and keep the code portable. If cost ever forces the move, it's a project with a
spike first, and `apps/api` would need a Workers-native framework.

Consequences: migrations run from a GitHub Action on merge to `master` (`prisma migrate deploy`
with `DIRECT_URL`) before Vercel deploys, so a failed migration stops the deploy. Every preview
deploy gets its own Neon branch, so previews never touch production data. We start on
`*.vercel.app` and `r2.dev`, and buy a domain (Cloudflare, so R2 can use it) before the first
real business relies on the app. Vercel Hobby doesn't allow commercial use, so Pro starts at that
point too.
