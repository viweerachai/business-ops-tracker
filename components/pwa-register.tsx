"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    const recoverFromMissingChunk = (event: ErrorEvent | PromiseRejectionEvent) => {
      const reason = "reason" in event ? event.reason : event.error;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      const isChunkLoadError =
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk") ||
        message.includes("/_next/static/chunks/");

      if (!isChunkLoadError || sessionStorage.getItem("chunk-reload-attempted") === "1") return;
      sessionStorage.setItem("chunk-reload-attempted", "1");
      window.location.reload();
    };

    window.addEventListener("error", recoverFromMissingChunk);
    window.addEventListener("unhandledrejection", recoverFromMissingChunk);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.update().catch(() => {
            // Ignore update failures. The existing worker can still serve cached routes.
          });
        })
        .catch(() => {
          // PWA support is best-effort. The app still works without a service worker.
        });
    }

    return () => {
      window.removeEventListener("error", recoverFromMissingChunk);
      window.removeEventListener("unhandledrejection", recoverFromMissingChunk);
    };
  }, []);

  return null;
}
