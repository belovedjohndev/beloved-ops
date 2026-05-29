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
