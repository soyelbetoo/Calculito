"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de una API del navegador al montar
    setInstalled(standalone);

    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;
  if (!deferred && !isIos) return null;

  return (
    <div className="rounded-lg border border-accent/40 bg-surface-quiet px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-xs text-text-muted">
        {isIos
          ? "Toca compartir y luego «Agregar a pantalla de inicio» para tenerla como app."
          : "Instala esta app en tu teléfono para abrirla directo desde el ícono."}
      </p>
      {deferred && (
        <button
          onClick={async () => {
            await deferred.prompt();
            setDeferred(null);
          }}
          className="text-xs shrink-0 px-3 py-1.5 rounded bg-accent text-bg font-medium"
        >
          Instalar
        </button>
      )}
    </div>
  );
}
