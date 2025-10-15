"use client";

import { useEffect } from "react";

export default function ExtensionBridge() {
  useEffect(() => {
    let isCancelled = false;

    const postToken = async () => {
      try {
        const res = await fetch("/api/extension/token", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { token?: string };
        if (!data?.token || isCancelled) return;
        window.postMessage({ source: "gmm", type: "token", token: data.token }, "*");
      } catch {
        // ignore
      }
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== window) return;
      const d = e.data as { source?: string; type?: string } | undefined;
      if (!d) return;
      if (d.source === "gmm-extension" && d.type === "request_token") postToken();
    };

    window.addEventListener("message", onMessage);
    postToken();

    const interval = setInterval(postToken, 9 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}



