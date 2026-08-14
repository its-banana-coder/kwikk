# Production Infrastructure

Target: **< $50 / month fixed**. No Docker.

---

## Architecture

Two tiers. The API and renderer **must** be co-located — Puppeteer connects to the renderer at `localhost:5174` during export jobs.

```
┌─────────────────────────────────┐     ┌──────────────────────┐
│  Hetzner CX32 (compute VPS)     │     │  Neon (managed DB)   │
│                                 │────▶│  Postgres + pgvector │
│  kwikk-api  :8080               │     └──────────────────────┘
│  kwikk-renderer  :5174          │
│  FFmpeg + Chromium              │     ┌──────────────────────┐
│  Nginx + Certbot                │────▶│  Cloudflare R2       │
└─────────────────────────────────┘     │  asset storage       │
                                        └──────────────────────┘
                    ┌──────────────────┐
                    │  Cloudflare Pages│
                    │  editor (SPA)    │
                    └──────────────────┘
```

---

## Services

| Role | Service | Plan | Cost |
|---|---|---|---|
| Compute (API + renderer + FFmpeg) | [Hetzner CX32](https://hetzner.com/cloud) | 4 vCPU / 8 GB RAM | ~$8.30/mo |
| Database | [Neon](https://neon.tech) | Launch (pgvector included) | $19/mo |
| Asset storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) | Free 10 GB; $0.015/GB after | ~$0–2/mo |
| Editor (Vite SPA) | [Cloudflare Pages](https://pages.cloudflare.com) | Free | $0 |
| CDN + DNS + SSL | [Cloudflare](https://cloudflare.com) | Free | $0 |
| **Total fixed** | | | **~$28/mo** |

**Why Neon over self-hosted Postgres:**
- Postgres on the same export box means Chrome + FFmpeg compete with the DB for RAM during export jobs
- Neon handles backups, point-in-time restore, and pgvector extension automatically
- Still under budget with room to grow

**Want to go cheaper?** Self-host Postgres on a separate small VPS (Hetzner CX11, ~$3.30/mo) — total drops to ~$12/mo but you manage backups yourself. Not recommended for production.

Upgrade triggers:
- DB > 10 GB storage → Neon Scale ($69/mo) or self-host on a larger volume
- Export queue is slow → upgrade compute to CX42 (~$20/mo, 8 vCPU / 16 GB)

---

## Compute VPS layout

```
/opt/kwikk/
  api/          ← apps/api build   (Node.js/Hono :8080)
  renderer/     ← apps/renderer    (Vite preview :5174, Puppeteer target)
```

Processes managed by **PM2** (no Docker):
```
kwikk-api        node dist/index.js        (port 8080)
kwikk-renderer   vite preview --port 5174
```

Nginx on :443, SSL via Certbot, proxies to :8080.

---

## Process setup (PM2 + systemd)

```bash
npm install -g pm2

pm2 start /opt/kwikk/api/dist/index.js      --name kwikk-api
pm2 start "vite preview --port 5174"        --name kwikk-renderer --cwd /opt/kwikk/renderer

pm2 save
pm2 startup systemd   # follow the printed command
```

---

## Database — Neon

1. Create a project at [neon.tech](https://neon.tech), choose Postgres 16.
2. Enable pgvector: in the Neon SQL editor run `CREATE EXTENSION IF NOT EXISTS vector;`
3. Copy the connection string into `DATABASE_URL`.

The app schema (`initDb()`) runs on first startup — no manual migration needed.

Neon handles daily backups and point-in-time restore automatically on the Launch plan.

---

## Asset storage — Cloudflare R2

Currently assets write to `./uploads/` (local disk). Swap in R2 before go-live:

1. Create an R2 bucket `kwikk-assets` in the Cloudflare dashboard.
2. Set a custom domain `assets.yourdomain.com` on the bucket.
3. Add env vars to the API (see below).
4. In [apps/api/src/routes/assets.ts](../apps/api/src/routes/assets.ts): replace the `writeFile` + local path with `PutObjectCommand` via the S3-compatible R2 API (`@aws-sdk/client-s3`).
5. Asset URLs become `https://assets.yourdomain.com/filename` instead of `/uploads/filename`.

This is the **one code change** still needed before the first production deploy.

---

## Environment variables

**VPS** — `/opt/kwikk/api/.env`:

```env
# Database (Neon connection string)
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/kwikk?sslmode=require

# Vision — powers auto-description/tagging for uploaded image assets
LLM_API_KEY=...
LLM_BASE_URL=https://api.openai.com/v1
VISION_MODEL=gpt-4o-mini

# Embeddings
EMBEDDING_MODEL=text-embedding-3-small

# Asset storage (R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=kwikk-assets
R2_PUBLIC_URL=https://assets.yourdomain.com

# Export renderer (co-located on same VPS)
RENDERER_URL=http://localhost:5174

# Admin
ADMIN_TOKEN=<random 32-char string>

# Logs
LOG_FILE=/var/log/kwikk-api.log
```

---

## DNS

| Record | Points to |
|---|---|
| `api.yourdomain.com` | Hetzner VPS IP |
| `assets.yourdomain.com` | R2 custom domain |
| `editor.yourdomain.com` | Cloudflare Pages |

All proxied through Cloudflare (orange cloud) — free DDoS protection + CDN for assets.

---

## First-deploy checklist

- [ ] Hetzner CX32 provisioned, SSH key auth only
- [ ] Neon project created, pgvector extension enabled, `DATABASE_URL` copied
- [ ] Chromium installed: `npx puppeteer browsers install chrome`
- [ ] FFmpeg installed: `sudo apt install ffmpeg`
- [ ] Nginx configured + Certbot SSL cert for `api.yourdomain.com`
- [ ] PM2 processes running + saved + systemd startup registered
- [ ] R2 bucket created + `assets.ts` updated to use R2
- [ ] All env vars set in `/opt/kwikk/api/.env`
- [ ] Smoke test: `curl https://api.yourdomain.com/health`
- [ ] `GET /v1/admin/reembed/status` — verify tables exist
- [ ] `POST /v1/admin/reembed` with `{"tables":["animations","composition_catalog","fonts"]}`
