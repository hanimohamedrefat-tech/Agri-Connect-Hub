---
name: Database schema push required
description: The Replit PostgreSQL database needs schema push before first use; tables don't exist automatically.
---

# Database Schema Push

The `@workspace/db` package has a `push` script that must be run before the API server can execute any queries.

**Why:** On a fresh repl or after importing from GitHub, the database tables don't exist even if `DATABASE_URL` is set. All API routes will return 500 errors with "Failed query" from drizzle-orm.

**Command:**
```
pnpm --filter @workspace/db run push
```

**How to apply:** Run this whenever the API server returns 500s with drizzle "Failed query" errors, or after a fresh import. It uses drizzle-kit to push the schema defined in `lib/db/src/` to the Replit PostgreSQL instance.
