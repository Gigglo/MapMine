"use client";

import { useRef, useState } from "react";
import type { Screen } from "../../config/assets";
import { PhoneFrame, PreviewUI } from "./PhonePreview";

export default function InteractivePreview({ screen }: { screen: Screen }) {
  const [active, setActive] = useState(false);
  const [offset, setOffset] = useState(0);
  const start = useRef<number | null>(null);
  return <PhoneFrame><PreviewUI screen={screen} active={active} onAction={() => setActive(value => !value)}
    sheet={screen === "places" ? {
      offset,
      down: event => { start.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); },
      move: event => { if (start.current !== null) setOffset(Math.max(0, event.clientY - start.current)); },
      end: event => {
        if (start.current !== null && event.clientY - start.current > 30) setActive(false);
        start.current = null;
        setOffset(0);
      },
      cancel: () => { start.current = null; setOffset(0); },
      close: () => setActive(false),
    } : undefined} /></PhoneFrame>;
}
