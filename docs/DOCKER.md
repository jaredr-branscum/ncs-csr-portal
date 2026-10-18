# Docker & Container Architecture Guide

This guide covers the container architecture, workflows, and operational commands for running PostgreSQL and Next.js in Docker.

---

## Architecture Overview

PostgreSQL runs inside an isolated Docker container.

```
┌────────────────────────────────────────────────────────┐
│                      HOST MACHINE                      │
│                                                        │
│   Next.js Dev Server (npm run dev)                     │
│   Prisma CLI (npx prisma db seed / push)               │
│         │                                              │
│         │ DATABASE_URL="...localhost:5432..."          │
└─────────┼──────────────────────────────────────────────┘
          │
Port Forward (5432:5432)
          │
┌─────────▼──────────────────────────────────────────────┐
│                    DOCKER CONTAINER                    │
│                                                        │
│   Container: amp-csr-postgres (postgres:17-alpine)     │
│   Database:  ncs_csr_portal                            │
│   Volume:    postgres_data (persisted on disk)         │
└────────────────────────────────────────────────────────┘
```

## Developer Workflows

### Workflow A: Hybrid Development
*Run only PostgreSQL in Docker; run Next.js on your host machine for instant hot reloading.*

1. **Start the Database:**
   ```bash
   npm run docker:db
   ```
2. **Deploy Migrations & Seed:**
   ```bash
   npm run prisma:migrate:deploy
   npm run prisma:seed
   ```
3. **Start Next.js on Host:**
   ```bash
   npm run dev
   ```

---

### Workflow B: Full Stack in Docker (Pre-deployment Test)
*Run both the Next.js application and the PostgreSQL database containerized.*

```bash
npm run docker:up
```

This command executes `docker compose --profile seed up -d`:
1. Launches `amp-csr-postgres` and verifies health.
2. Runs `amp-csr-db-init` to deploy versioned migrations.
3. Runs `amp-csr-db-seed` to populate test personas.
4. Builds and launches the Next.js standalone container at `http://localhost:3000`.

---

## Command Reference

| Command | Action | Description |
| :--- | :--- | :--- |
| `npm run docker:db` | `docker compose up db -d` | Starts PostgreSQL container in background |
| `npm run docker:seed` | `docker compose run --rm db-seed` | Runs seed script inside a disposable container |
| `npm run docker:up` | `docker compose --profile seed up -d` | Builds and runs full stack (App + DB + Seed) |
| `docker compose down -v` | `docker compose down -v` | Stops containers and **deletes the local database volume** |
| `docker compose logs -f db` | View logs | Streams real-time database logs |

---

## Interactive Database Access (`psql`)

To open an interactive PostgreSQL shell directly inside the running container:

```bash
docker compose exec -it db psql -U postgres -d ncs_csr_portal
```

Common `psql` queries:
```sql
\dt                                  -- List all database tables
SELECT count(*) FROM "User";         -- Verify seeded customer count
SELECT count(*) FROM "Subscription"; -- Verify subscription count
\q                                   -- Exit psql
```
---
