"use client";

import { useEffect, useRef } from "react";

type Props = {
  slot: string;
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function Adsense({ slot, className }: Props) {
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // silencioso
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block", textAlign: "center" }}
      data-ad-client="ca-pub-SEU_CLIENT_ID"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
