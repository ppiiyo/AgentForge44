import { useState, useEffect } from "react";

export interface StreamEvent {
  type: 'node_start' | 'token' | 'node_complete' | 'error';
  nodeId?: string;
  title?: string;
  token?: string;
  finalValue?: string;
  error?: string;
}

export function useAgentStream() {
  const [activeTokens, setActiveTokens] = useState<string>("");
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'streaming' | 'completed' | 'error'>('idle');

  const startStream = (url: string = "/api/agent/stream") => {
    setStatus("streaming");
    setActiveTokens("");
    setActiveNode(null);

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      if (event.data === "[DONE]") {
        setStatus("completed");
        eventSource.close();
        return;
      }

      try {
        const payload = JSON.parse(event.data) as StreamEvent;
        if (payload.type === "node_start") {
          setActiveNode(payload.nodeId || null);
        } else if (payload.type === "token" && payload.token) {
          setActiveTokens((prev) => prev + payload.token);
        } else if (payload.type === "node_complete") {
          setActiveNode(null);
        } else if (payload.type === "error") {
          setStatus("error");
          eventSource.close();
        }
      } catch {
        // Stream chunk parse fallback
      }
    };

    eventSource.onerror = () => {
      setStatus("error");
      eventSource.close();
    };

    return eventSource;
  };

  return {
    activeTokens,
    activeNode,
    status,
    startStream
  };
}
