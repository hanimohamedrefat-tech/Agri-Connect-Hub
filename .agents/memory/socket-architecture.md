---
name: Socket.io architecture
description: How real-time WebSocket features are wired up in Zira3a
---

Socket.io server lives at path `/api/socket.io` (within the existing `/api` proxy route — no artifact.toml changes needed).

Auth: JWT token passed as `socket.handshake.auth.token` in the middleware. Same SESSION_SECRET as REST auth.

Rooms:
- `user:{userId}` — joined on connect; receives `new:notification`, `new:message_notification`
- `conversation:{id}` — joined via `join:conversation` event; receives `new:message`
- `meeting:{id}` — joined via `join:meeting`; receives `meeting:chat_message`, `meeting:participant_joined`, `meeting:participant_left`

Client-side: `artifacts/zira3a/src/lib/socket.ts` manages singleton socket instance. `SocketContext.tsx` wraps app, auto-connects when user is logged in, exposes `unreadNotifications` counter for the Bell badge in AppLayout.

**Why:** `/api/socket.io` keeps WebSocket upgrades inside the existing `/api` proxy path so no new artifact.toml entries are needed.
