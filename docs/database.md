# 💾 Database Configuration & Migration Guide

AgentForge44 features a polymorphic database adapter layer managed by a central database connection factory (`src/api/db.ts`). This allows seamless transitioning between local, lightweight development instances (using SQLite) and highly available multi-tenant production configurations (using PostgreSQL).

---

## ⚙️ Supported Database Types

### 1. SQLite (Development & Single-Instance Testing)
Ideal for local prototyping, lightweight setups, and offline runs. SQLite stores data locally in a single file (`agentforge.db`) and requires zero separate infrastructure.

* **Configuration**:
  ```env
  DB_TYPE=sqlite
  ```
* **Storage Location**: Root directory (`./agentforge.db`). Temporary journals or cache are generated alongside as `agentforge.db-shm` and `agentforge.db-wal` (which are excluded from version control tracking via `.gitignore`).

---

### 2. PostgreSQL (Enterprise Production Environments)
Required for high-availability, clustering, horizontal scaling, and secure multi-tenant data isolation.

* **Configuration**:
  ```env
  DB_TYPE=postgres
  DATABASE_URL=postgres://<username>:<password>@<host>:<port>/<database_name>?sslmode=require
  ```
* **Durable Pooling**: Utilizes robust pooled connections handled by our high-performance Drizzle PostgreSQL adapter (`src/db/adapters.ts`).

---

## 🔌 The Database Connection Factory (`src/api/db.ts`)

All database instances are created through a central factory function `createDatabaseConnection()`. This wrapper ensures consistent initialization, pre-flight safety checks, and resilient exception handling:

1. **Pre-flight Credential Validation**: When `DB_TYPE` is set to `postgres`, the factory parses `DATABASE_URL` to ensure it is present, non-empty, and correctly formatted (must begin with either `postgres://` or `postgresql://`). If credentials are missing, the process terminates immediately with an explicit configuration error to halt runtime execution before unsafe database connections are attempted.
2. **Polymorphic Adaptation**: The factory returns an object satisfying the `IDatabaseAdapter` contract. Callers do not need to worry about the underlying dialect, as `Drizzle` serves type-safe queries on top of SQLite Core or pg-core depending on the dynamically bound driver.

---

## 🚀 Migration Procedures: SQLite to PostgreSQL

### Step 1: Pre-requisites
1. Provision a stable PostgreSQL instance (such as GCP Cloud SQL, Supabase, ElephantSQL, or a stateful container in Kubernetes).
2. Gather your connection URI, ensuring credentials include permissions to create tables and execute index definitions (`CREATE TABLE`, `ALTER TABLE`, etc.).

### Step 2: Configure Environment Variables
Update your server's environment variables (typically in your cloud control plane or local `.env` file):
```env
# Switch database dialect
DB_TYPE=postgres

# Provide the fully qualified secure connection string
DATABASE_URL=postgresql://app_user:strong_password@prod-db-host.com:5432/agentforge?sslmode=verify-full
```

### Step 3: Run Auto-Healing Migrations
Unlike other traditional setups that require manual database patching or secondary migration execution flags, AgentForge44 relies on **Auto-Healing Schema Migrations** (`src/api/migrate.ts`):
1. Upon start, the main Express server boot cycle initiates `runSchemaMigrations()`.
2. The migrator tests connection path viability via an adapter health-check probe.
3. Upon success, it transactionally executes dynamic schema verification, building all core tables (`users`, `graphs`, `metrics`, `deployments`, `versions`, `api_keys`) if they do not yet exist.
4. Schema migrations execute gracefully in less than 50 milliseconds directly in the cold-startup phase.

---

## 🛠️ Diagnostics & Connection Troubleshooting

If you encounter database startup crashes, check the following checklist:

* **Error: `CRITICAL PRE-FLIGHT CHECK FAILURE: DATABASE_URL environment variable is required when DB_TYPE is set to "postgres"...`**
  * *Cause*: Your environment is set to PostgreSQL, but the application is starting without a valid connection string.
  * *Fix*: Define `DATABASE_URL` in your active command line environment or `.env` file.
* **Error: `Postgres connection timeout / TCP connection refused`**
  * *Cause*: The server is unable to physically talk to the PostgreSQL host (likely due to network perimeter constraints, firewall rules, or missing VPC bindings).
  * *Fix*: Ensure SSL mode parameters matching your database provider are appended to the string (e.g., `?sslmode=no-verify` or `?sslmode=require`) and check security group rules.
