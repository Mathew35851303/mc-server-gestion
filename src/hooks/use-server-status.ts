"use client";

import { useState, useEffect, useCallback } from "react";

interface ServerStatus {
  online: boolean;
  status: string;
  uptime: string;
  players: {
    online: number;
    max: number;
    list: string[];
  };
  memory: {
    used: number;
    total: number;
    percent: number;
    usedFormatted: string;
    totalFormatted: string;
  };
  cpu: {
    percent: number;
  };
}

export function useServerStatus(refreshInterval: number = 5000) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/server/status");
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshInterval]);

  return { status, loading, error, refetch: fetchStatus };
}
