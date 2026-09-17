import { useState } from "react";

export function useGeo() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  function capture(): Promise<{ lat: number; lng: number } | null> {
    setStatus("loading");
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setStatus("error");
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setStatus("ok");
          resolve(c);
        },
        () => {
          setStatus("error");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  return { coords, status, capture };
}
