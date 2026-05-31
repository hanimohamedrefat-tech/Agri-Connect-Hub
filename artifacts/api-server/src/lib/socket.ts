import { Server, type Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { logger } from "./logger";

let io: Server;

interface AuthSocket extends Socket {
  data: { userId: number; displayName?: string };
}

export function createSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", credentials: true },
    transports: ["websocket", "polling"],
  });

  io.use((socket: AuthSocket, next) => {
    const token = (socket.handshake.auth as { token?: string })?.token;
    if (!token) return next(new Error("unauthorized"));
    try {
      const secret = process.env["SESSION_SECRET"];
      if (!secret) return next(new Error("server_error"));
      const payload = jwt.verify(token, secret) as { userId: number; displayName?: string };
      socket.data.userId = payload.userId;
      socket.data.displayName = payload.displayName;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    logger.info({ userId }, "Socket connected");

    socket.on("join:conversation", (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave:conversation", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("join:meeting", (meetingId: number) => {
      socket.join(`meeting:${meetingId}`);
      io.to(`meeting:${meetingId}`).emit("meeting:participant_joined", {
        userId,
        displayName: socket.data.displayName ?? "مشارك",
        meetingId,
      });
    });

    socket.on("leave:meeting", (meetingId: number) => {
      io.to(`meeting:${meetingId}`).emit("meeting:participant_left", { userId, meetingId });
      socket.leave(`meeting:${meetingId}`);
    });

    socket.on("meeting:chat", ({ meetingId, content }: { meetingId: number; content: string }) => {
      io.to(`meeting:${meetingId}`).emit("meeting:chat_message", {
        userId,
        displayName: socket.data.displayName ?? "مشارك",
        content,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      logger.info({ userId }, "Socket disconnected");
    });
  });

  return io;
}

export function getIO(): Server | undefined {
  return io;
}

export function emitToUser(userId: number, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToConversation(conversationId: number, event: string, data: unknown) {
  io?.to(`conversation:${conversationId}`).emit(event, data);
}
