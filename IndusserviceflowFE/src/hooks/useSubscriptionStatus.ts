import { useCallback, useEffect, useState } from "react";
import { getMySubscriptionStatus } from "../services/api";
import type { MySubscriptionStatus } from "../types/subscription";

const POLL_MS = 60000;

let cachedStatus: MySubscriptionStatus | null = null;
let hasLoadedOnce = false;
let inFlight: Promise<void> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;
const listeners = new Set<(status: MySubscriptionStatus | null, loading: boolean) => void>();

const notify = (loading: boolean) => {
  listeners.forEach((listener) => listener(cachedStatus, loading));
};
const fetchStatus = async (): Promise<void> => {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await getMySubscriptionStatus();
      cachedStatus = response?.data ?? response ?? null;
    } catch (err) {
      console.error("Failed to load subscription status:", err);
    } finally {
      hasLoadedOnce = true;
      inFlight = null;
      notify(false);
    }
  })();

  return inFlight;
};

const startPolling = () => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    fetchStatus();
  }, POLL_MS);
};

const stopPolling = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

export function useSubscriptionStatus() {
  const [status, setStatus] = useState<MySubscriptionStatus | null>(cachedStatus);
  const [loading, setLoading] = useState(!hasLoadedOnce);
  const refetch = useCallback(async () => {
    await fetchStatus();
    const retryDelaysMs = [3000, 8000];
    retryDelaysMs.forEach((delay) => {
      setTimeout(() => {
        fetchStatus();
      }, delay);
    });
  }, []);

  useEffect(() => {
    const listener = (nextStatus: MySubscriptionStatus | null, nextLoading: boolean) => {
      setStatus(nextStatus);
      setLoading(nextLoading);
    };
    listeners.add(listener);
    subscriberCount += 1;

    if (!hasLoadedOnce && !inFlight) {
      fetchStatus();
    } else if (hasLoadedOnce) {
      setStatus(cachedStatus);
      setLoading(false);
    }

    startPolling();

    return () => {
      listeners.delete(listener);
      subscriberCount -= 1;
      if (subscriberCount <= 0) {
        stopPolling();
      }
    };
  }, []);

  return { status, loading, refetch };
}

export default useSubscriptionStatus;