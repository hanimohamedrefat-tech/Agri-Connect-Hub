---
name: Production deployment config
description: VM type, build/run commands for Zira3a production deployment
---

# Production Deployment Config

**Type:** VM (not autoscale) — required for Socket.io persistent connections

**Build command:**
```
bash -c "PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/zira3a run build && pnpm --filter @workspace/api-server run build"
```

**Run command:**
```
bash -c "PORT=5000 NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs"
```

**Required secrets:** DATABASE_URL, SESSION_SECRET (both present as Replit secrets)

**Static serving:** In production, API server serves frontend static files from `artifacts/zira3a/dist/public/` with SPA fallback to index.html (configured in `artifacts/api-server/src/app.ts`).

**Why VM:** Socket.io requires sticky sessions / persistent WebSocket connections. Autoscale load balancers break this.
