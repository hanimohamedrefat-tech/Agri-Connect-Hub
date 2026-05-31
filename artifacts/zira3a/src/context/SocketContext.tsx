import { createContext, useContext, useEffect, useState, useRef } from "react";
import { type Socket } from "socket.io-client";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import { useGetMe } from "@workspace/api-client-react";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  unreadNotifications: number;
  incrementUnread: () => void;
  clearUnread: () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  unreadNotifications: 0,
  incrementUnread: () => {},
  clearUnread: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useGetMe();
  const [connected, setConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    connectSocket();
    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onNotification = () => setUnreadNotifications(n => n + 1);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("new:notification", onNotification);

    if (s.connected) setConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("new:notification", onNotification);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      unreadNotifications,
      incrementUnread: () => setUnreadNotifications(n => n + 1),
      clearUnread: () => setUnreadNotifications(0),
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
