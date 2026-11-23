import { useRef } from "react";
import type { Egg } from "./catalog";
import { discoverEgg } from "./discovery";

export function useEggClicks(egg: Egg, count: number) {
  const taps = useRef({ count: 0, started: 0 });

  return () => {
    const now = Date.now();
    const current = taps.current;
    if (now - current.started > 3200) {
      current.count = 0;
      current.started = now;
    }
    current.count++;
    if (current.count === count) {
      current.count = 0;
      void discoverEgg(egg);
    }
  };
}
