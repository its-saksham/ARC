import { useEffect, useState } from "react";
import styles from "./ui.module.css";
export function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (disposed) return;
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          installing?.addEventListener("statechange", () => {
            if (
              !disposed &&
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setWaiting(reg.waiting);
          });
        });
        timer = setInterval(() => void reg.update().catch(() => {}), 3600000);
      })
      .catch(() => {});
    let hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    const change = () => {
      if (hadController && !reloading) {
        reloading = true;
        location.reload();
      }
      hadController = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", change);
    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", change);
    };
  }, []);
  return waiting ? (
    <div className={styles.update} role="status">
      <span>A new ARC version is ready.</span>
      <button onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>
        Update
      </button>
      <button onClick={() => setWaiting(null)}>Later</button>
    </div>
  ) : null;
}
