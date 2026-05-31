# Beloved Ops

Beloved Ops is an internal client operations system for Beloved John Dev.

It manages freelance leads, client opportunities, follow-ups, notes, activity history, and project operations.

## Current MVP

- Lead management
- Lead notes
- Lead follow-ups
- Activity events
- Dashboard summary
- Tenant-scoped PostgreSQL schema
- TypeScript API
- React/Vite frontend

## Local Development

Start local PostgreSQL:

```powershell
docker compose up -d postgres
```

Create a local environment file from the committed example:

```powershell
Copy-Item .env.example .env
```

The local database URL uses host port `15435` to avoid conflicts with other local projects:

```txt
postgres://belovedops:belovedops_dev_password@localhost:15435/belovedops_dev
```

Run migrations:

```powershell
npm run db:migrate
```

Start both the API and web app:

```powershell
npm run dev
```

Or run them separately:

```powershell
npm run dev:api
npm run dev:web
```

## Staging Deployment

Staging is split across three services:

- Database: Neon Postgres
- API: Render web service
- Web: Vercel Vite app

Do not commit production or staging secrets. Configure the environment variables in each hosting provider.

### Neon Postgres

1. Create a Neon project for Beloved Ops staging.
2. Create or select the staging database.
3. Copy the pooled or direct PostgreSQL connection string.
4. Use a connection string that requires SSL, typically ending with `?sslmode=require`.

Required Neon value:

```txt
DATABASE_URL=<Neon database URL>
```

Run migrations against Neon from a trusted shell:

```powershell
$env:DATABASE_URL='<Neon database URL>'; npm run db:migrate
$env:DATABASE_URL='<Neon database URL>'; npm run verify:migrations
```

Equivalent Bash commands:

```bash
DATABASE_URL='<Neon database URL>' npm run db:migrate
DATABASE_URL='<Neon database URL>' npm run verify:migrations
```

### Render API

Create a Render web service from the repository root.

Recommended settings:

```txt
Runtime: Node
Root Directory: .
Build Command: npm install && npm run build --workspace @belovedops/api
Start Command: npm run start --workspace @belovedops/api
Health Check Path: /api/health
```

Required API environment variables:

```txt
NODE_ENV=production
DATABASE_URL=<Neon database URL>
SESSION_SECRET=<long random production secret>
SESSION_COOKIE_NAME=belovedops_session
WEB_ORIGIN=<Vercel web URL>
```

Render provides `PORT`; the API also supports `API_PORT` for local development. Do not set local-only `.env` values in Render.

### Vercel Web

Create a Vercel project for the Vite frontend.

Recommended settings:

```txt
Framework Preset: Vite
Root Directory: apps/web
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Required web environment variable:

```txt
VITE_API_BASE_URL=<Render API URL>
```

After Vercel deploys, update Render `WEB_ORIGIN` to the exact Vercel web origin, for example `https://belovedops-staging.vercel.app`.

### Deployment Checks

Before pointing the web app at staging, verify:

```powershell
npm run typecheck
npm run build
npm run check
```

After deployment, verify:

```txt
GET <Render API URL>/api/health
Open <Vercel web URL>
Confirm the browser can load dashboard data without a CORS error.
```

### Current Production Risks

- Authentication still uses the explicit development tenant/user context and must be replaced before real production use.
- Session variables are reserved for the upcoming auth layer; they must still be configured as production secrets.
- Database migrations are manually triggered; there is no automated release gate yet.
- CORS allows one configured `WEB_ORIGIN`; preview deployments need their own API environment or an explicit origin strategy.
