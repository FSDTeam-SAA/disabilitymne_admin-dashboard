"use client";

import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getApiBaseUrl } from "@/lib/api";

export type IncomingSocketEvent =
  | { type: "chat:message:new"; payload: unknown }
  | { type: "chat:thread:updated"; payload: unknown }
  | { type: "chat:thread:read"; payload: unknown };

type SocketAck<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export function useChatSocket(activeThreadId?: string) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [events, setEvents] = useState<IncomingSocketEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketUrl = useMemo(() => {
    const baseApiUrl = getApiBaseUrl();
    return baseApiUrl.replace(/\/api\/v1$/, "");
  }, []);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return;

    const socket = io(socketUrl, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", () => setIsConnected(false));

    socket.on("chat:message:new", (payload) => {
      setEvents((prev) => [...prev.slice(-40), { type: "chat:message:new", payload }]);
    });

    socket.on("chat:thread:updated", (payload) => {
      setEvents((prev) => [...prev.slice(-40), { type: "chat:thread:updated", payload }]);
    });

    socket.on("chat:thread:read", (payload) => {
      setEvents((prev) => [...prev.slice(-40), { type: "chat:thread:read", payload }]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [session?.accessToken, socketUrl]);

  useEffect(() => {
    if (!socketRef.current || !activeThreadId) return;

    socketRef.current.emit("chat:join-thread", activeThreadId);

    return () => {
      socketRef.current?.emit("chat:leave-thread", activeThreadId);
    };
  }, [activeThreadId]);

  const clearEvents = () => setEvents([]);

  const sendSocketMessage = <T,>(payload: {
    threadId: string;
    message?: string;
    attachments?: Array<{ url: string; publicId?: string; mimetype?: string; size?: number }>;
  }) =>
    new Promise<T>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        reject(new Error("Socket is not connected."));
        return;
      }

      socket.timeout(15000).emit("chat:message:send", payload, (error: Error | null, ack?: SocketAck<T>) => {
        if (error) {
          reject(error);
          return;
        }

        if (!ack?.success || !ack.data) {
          reject(new Error(ack?.message || "Failed to send message."));
          return;
        }

        resolve(ack.data);
      });
    });

  return {
    events,
    clearEvents,
    isConnected,
    sendSocketMessage,
  };
}
