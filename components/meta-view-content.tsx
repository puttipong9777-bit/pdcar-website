"use client";

import { useEffect } from "react";

export function MetaViewContent({ carId, title, value }: { carId: string; title: string; value?: number }) {
  useEffect(() => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = () => {
      if (typeof window.fbq === "function") {
        window.fbq("track", "ViewContent", {
          content_ids: [carId],
          content_name: title,
          content_type: "product",
          currency: "THB",
          value: value ?? 0
        });
        return;
      }
      attempts += 1;
      if (attempts < 20) timer = setTimeout(send, 100);
    };
    send();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [carId, title, value]);

  return null;
}
