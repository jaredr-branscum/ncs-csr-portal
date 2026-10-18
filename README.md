# AMP CSR Portal

> **Live Deployment**: [https://ncs-csr-portal.vercel.app/](https://ncs-csr-portal.vercel.app/)

Customer Service Representative (CSR) portal built for managing AMP car wash memberships, vehicle subscriptions, customer accounts, and billing resolution.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack) & React 19
- **Database**: PostgreSQL 17 via Prisma ORM (`@prisma/adapter-pg`)
- **Infrastructure**: Docker & Docker Compose
---

## Quickstart

### 1. Start the Database
Ensure Docker is running, then spin up the PostgreSQL container:
```bash
npm run docker:db
```

### 2. Initialize & Seed Data
Apply database migrations and populate the test data:
```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

### 3. Launch the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the CSR portal.

---

## Seed Personas & Workflows

The portal comes preloaded with realistic test personas showcasing key customer scenarios:
- **Jordan Blake** (`AMP-101`): Overdue account with declined card renewal; demonstrates payment resolution flow.
- **Michael Chang** (`AMP-201`, `AMP-202`): Multi-vehicle household; demonstrates subscription transfer across vehicles.
- **Samantha Reed** (`AMP-301`): Active Platinum VIP member with 25 purchase records; demonstrates high-volume transaction ledger and decoupled lifetime spend aggregation.
- **David Miller** (`AMP-401`): Active wash pass with single wash and coupon redemption history.
- **Elena Rostova** (`AMP-901`, `AMP-902`): Multi-vehicle household with multiple delinquent passes; demonstrates selective overdue resolution.
- **Marcus Vance** (`AMP-903`, `AMP-904`, `AMP-905`): Multi-vehicle member with multiple active tiers.
- **Sophia Davis** (`AMP-701`): Account in overdue delinquency with no active passes ($0.00 balance) due to a past cancelled pass; demonstrates zero-dollar delinquency clearance and RFID gate access restoration.

---

## Verification & Quality Gates

```bash
npm test              # Run unit tests
npm run test:coverage # Enforce test coverage (100% threshold)
npm run lint          # ESLint & function length limits (<= 50 lines)
npm run build         # Next.js production build verification
npm run test:e2e      # Playwright end-to-end tests (cross-platform)
```

---

## Deployment & Production Topology

The application is deployed on Vercel backed by serverless PostgreSQL (Neon) and containerized via Docker:
- **Live Production URL**: [https://ncs-csr-portal.vercel.app/](https://ncs-csr-portal.vercel.app/)
- **Serverless PostgreSQL**: Configured with `@prisma/adapter-pg` targeting Neon pooled connections (`sslmode=require`).
- **Production Container**: Multi-stage [Dockerfile](Dockerfile) with root privilege dropping to non-root `nextjs:nodejs` user.
- **Automated Client Generation**: Retains `"postinstall": "prisma generate"` for reliable zero-config CI/CD deployments.
- **Audit Logging & Governance**: CSR actions are recorded in an immutable `AuditLog` table and viewable via the customer profile Audit History console.
- **Concurrency & Invariant Guards**: Atomic database transactions guard against multi-pass payment race conditions, cross-garage license plate collisions, and invalid pass transfers.

---

## Documentation Reference

- **[ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md)**: System architecture, domain design principles, scalability patterns, and technical trade-offs.
- **[DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md)**: Schema versioning, baseline migration instructions for live deployments, and CI/CD deployment guide.
- **[DOCKER.md](docs/DOCKER.md)**: Operational guide for container deployment, CI/CD seed runners, and database volume management.
