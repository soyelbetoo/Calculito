"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // si falla el registro, la app sigue funcionando sin modo offline
      });
    }
  }, []);

  return null;
}
