import { io, type Socket } from "socket.io-client";
import { getToken } from "./auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/api/socket.io",
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.auth = { token: getToken() };
    s.connect();
  }
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
