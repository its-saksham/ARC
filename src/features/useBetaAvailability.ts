import { useCallback, useEffect, useState } from "react";
import { getBetaAvailability, type BetaAvailability } from "../lib/betaApi";
export function useBetaAvailability() {
  const [data,setData] = useState<BetaAvailability>();
  const [loading,setLoading] = useState(true);
  const [online,setOnline] = useState(navigator.onLine);
  const [revision,setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1),[]);
  useEffect(() => {
    let active = true;
    let request:AbortController | undefined;
    async function refresh() {
      request?.abort();
      setOnline(navigator.onLine);
      if (!navigator.onLine) {setData(undefined);setLoading(false);return;}
      const controller = new AbortController();
      request = controller;
      try {
        const result = await getBetaAvailability(controller.signal);
        if (active && !controller.signal.aborted) setData(result);
      } catch {
        if (active && !controller.signal.aborted) setData(undefined);
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    }
    const visibleRefresh = () => { if (!document.hidden) void refresh(); };
    const offline = () => { request?.abort();setOnline(false);setData(undefined);setLoading(false); };
    void refresh();
    const timer = window.setInterval(visibleRefresh,30000);
    window.addEventListener("focus",visibleRefresh);
    window.addEventListener("online",visibleRefresh);
    window.addEventListener("offline",offline);
    document.addEventListener("visibilitychange",visibleRefresh);
    return () => {
      active = false; request?.abort();window.clearInterval(timer);
      window.removeEventListener("focus",visibleRefresh);
      window.removeEventListener("online",visibleRefresh);
      window.removeEventListener("offline",offline);
      document.removeEventListener("visibilitychange",visibleRefresh);
    };
  },[revision]);
  return {data,loading,online,retry};
}
