"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribes to a consultation's SSE stream.
 *
 * Both chat pages previously ran their own `setInterval(load, 5000)`; this
 * exists so they share one implementation instead of growing two copies that
 * drift. See docs/plans/chat-realtime.md.
 *
 * EventSource reconnects on its own after a drop, and `onSync` fires on every
 * (re)connect, so a client that misses events while offline catches up without
 * any explicit retry logic here.
 */
export function useConsultationStream(
  consultationId: string | undefined,
  handlers: {
    /** A new chat message arrived — append it. */
    onMessage: (message: unknown) => void;
    /** Something else changed, or we just (re)connected — refetch everything. */
    onSync: () => void;
  }
) {
  // Keep handlers in a ref so changing callback identity doesn't tear down and
  // rebuild the connection on every render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!consultationId) return;

    const source = new EventSource(
      `/api/consultations/${consultationId}/stream`
    );

    source.addEventListener("message", (e) => {
      try {
        handlersRef.current.onMessage(JSON.parse((e as MessageEvent).data));
      } catch {
        // Malformed frame — fall back to a full refetch rather than drop it.
        handlersRef.current.onSync();
      }
    });

    source.addEventListener("sync", () => handlersRef.current.onSync());

    // Sent once per connection, including after an automatic reconnect.
    source.addEventListener("ready", () => handlersRef.current.onSync());

    // "ping" needs no handler — receiving it is enough to keep the socket warm.

    source.onerror = () => {
      console.warn("[consultation-stream] connection interrupted, retrying");
      if (source.readyState === EventSource.CLOSED) {
        source.close();
      }
    };

    return () => source.close();
  }, [consultationId]);
}
