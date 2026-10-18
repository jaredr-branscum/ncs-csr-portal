# Database Migration & Schema Versioning Guide

This document establishes the schema versioning, migration lifecycle, and operational runbook for the AMP CSR Portal PostgreSQL database managed via Prisma Migrate.

---

## Architecture & Lifecycle Overview

```
┌────────────────────────────┐     prisma migrate dev      ┌──────────────────────────────┐
│ Local Schema Changes       ├────────────────────────────►│ prisma/migrations/           │
│ (prisma/schema.prisma)     │                             │ └── YYYYMMDDHHMMSS_name/     │
└────────────────────────────┘                             │     └── migration.sql        │
                                                           └──────────────┬───────────────┘
                                                                          │
                                                               prisma migrate deploy
                                                               (CI/CD / Production)
                                                                          │
                                                           ┌──────────────▼───────────────┐
                                                           │ Target PostgreSQL Database   │
                                                           │ ├── _prisma_migrations       │
                                                           │ └── Application Tables       │
                                                           └──────────────────────────────┘
```

### Migration History Directory Structure
```
prisma/
├── schema.prisma              # Declarative schema definition
├── seed.ts                    # Idempotent seed data for personas & plans
├── migrations/
│   ├── migration_lock.toml    # Locked database provider (postgresql)
│   └── 0_init/
│       └── migration.sql      # Baseline schema migration
```

---

## Baseline Migration (`0_init`)

The initial migration [`prisma/migrations/0_init/migration.sql`](../prisma/migrations/0_init/migration.sql) encapsulates the complete core schema:
- **Enums**: `UserStatus`, `SubscriptionStatus`, `PurchaseStatus`, `PurchaseType`, `OperatorRole`, `AuditAction`.
- **Tables**: `User`, `Vehicle`, `Plan`, `Subscription`, `Purchase`, `AuditLog`.
- **Indexes**: Composite and single-column performance indices for search, status, and sorted transaction queries.
- **Foreign Keys**: Enforced referential integrity with `ON DELETE RESTRICT` protection.

---

## Operational Runbooks

### 1. Baselining an Existing Live Deployment

If a production or staging database was previously initialized via `prisma db push`, its tables already exist, but the `_prisma_migrations` tracking table does not contain the initial migration.

To baseline the live database without re-executing existing DDL statements:

1. **Verify target database connection string:**
   Ensure `DATABASE_URL` points to the live target database (e.g. Neon PostgreSQL, AWS RDS).

2. **Check migration status:**
   ```bash
   npm run prisma:migrate:status
   ```
   *Expected output: Reports that `0_init` has not yet been applied.*

3. **Mark the initial migration as applied:**
   ```bash
   npm run prisma:migrate:resolve -- --applied 0_init
   ```
   *This inserts the `0_init` migration record into `_prisma_migrations` without executing DDL, establishing the baseline.*

4. **Confirm sync:**
   ```bash
   npm run prisma:migrate:status
   ```
   *Expected output: `Database schema is up to date!`*

---

### 2. Automated Production & CI/CD Deployment

In production environments (e.g., Docker container startup, Kubernetes job, Vercel/Render build steps):

```bash
npm run prisma:migrate:deploy
```

- **Idempotent**: Evaluates pending migrations against `_prisma_migrations` and applies only unapplied scripts.
- **Fail-Fast**: Halts execution if a migration fails, rolling back where supported.
---

### 3. Creating New Schema Migrations (Development)

When modifying [`prisma/schema.prisma`](../prisma/schema.prisma):

1. **Modify the schema** in `prisma/schema.prisma`.
2. **Generate and apply the migration locally:**
   ```bash
   npm run prisma:migrate:dev -- --name add_feature_name
   ```
   - Generates a new timestamped migration directory under `prisma/migrations/`.
   - Executes the migration on your local database.
   - Regenerates Prisma Client types (`prisma generate`).
3. **Commit the generated migration files** (`prisma/migrations/<timestamp>_<name>/migration.sql`) to git.

---

## NPM Script Reference

| NPM Script | Underlying Command | Purpose |
| :--- | :--- | :--- |
| `npm run prisma:migrate:status` | `prisma migrate status` | Inspects migration state against target DB |
| `npm run prisma:migrate:deploy` | `prisma migrate deploy` | Applies pending migrations in production / CI |
| `npm run prisma:migrate:dev` | `prisma migrate dev` | Generates & executes migrations during development |
| `npm run prisma:migrate:resolve` | `prisma migrate resolve` | Baselines existing databases or resolves failed steps |
| `npm run postinstall` | `prisma generate` | Automatically generates TypeScript client bindings on install |
| `npm run prisma:seed` | `prisma db seed` | Seeds idempotent customer personas and plans |
