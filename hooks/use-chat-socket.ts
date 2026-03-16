"use client";

import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getApiBaseUrl } from "@/lib/api";

export type IncomingSocketEvent =
  | { type: "chat:message:new"; payload: unknown }
  | { type: "chat:thread:updated"; payload: unknown }
  | { type: "chat:thread:read"; payload: unknown };

export function useChatSocket(activeThreadId?: string) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [events, setEvents] = useState<IncomingSocketEvent[]>([]);

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

  return {
    events,
    clearEvents,
  };
}
