# زراعة (Zira3a)

منصة اجتماعية زراعية متكاملة للمزارعين والمهندسين الزراعيين وخبراء القطاع في العالم العربي، تجمع شبكة تواصل اجتماعي مع غرف اجتماعات فيديو.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/zira3a run dev` — run the frontend (port 20056)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Demo Accounts

- Email: `ahmed@zira3a.com` / Password: `secret`
- Email: `sara@zira3a.com` / Password: `secret`
- Email: `khalid@zira3a.com` / Password: `secret`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, shadcn/ui, Wouter, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken + bcryptjs)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema (users, posts, comments, follows, notifications, conversations, messages, meetings)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/zira3a/src/` — React frontend
- `lib/api-client-react/src/generated/` — generated React Query hooks (don't edit)
- `lib/api-zod/src/generated/` — generated Zod validators (don't edit)

## Architecture decisions

- Contract-first OpenAPI spec gates all codegen — never hand-write types the codegen produces
- JWT stored in localStorage, passed via Authorization Bearer header in custom-fetch
- Endpoints with both path params AND query params cause Orval TS2308 — removed query pagination from those 3 endpoints as a workaround
- Notification creation is inline in route handlers (no separate queue)
- Video meeting room UI is a full-screen WebRTC-ready shell; actual media streams are not connected (requires WebRTC signaling server in a future phase)

## Product

- **Social feed**: post text/images with hashtags, like/comment/repost/bookmark, follow users
- **Explore**: trending posts and hashtags discovery
- **Profile pages**: user bio, specialty, location, follower/following counts
- **Direct messages**: private 1:1 conversations
- **Notifications**: like/comment/follow/repost alerts
- **Meetings**: schedule and join video meetings with a full Zoom-like room UI

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run codegen after every spec change: `pnpm --filter @workspace/api-spec run codegen`
- Endpoints with BOTH path params AND query params cause Orval TS2308 — avoid this combination or remove query params
- `pnpm run dev` at root is intentionally missing — use workflows or per-package `dev` commands
- DB schema push: `pnpm --filter @workspace/db run push`
