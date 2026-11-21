"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

export default function MapBackdrop({ src }: { src: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "end start"] });
  const offset = useTransform(scrollYProgress, [0, 1], [-18, 18]);
  const reduced = useReducedMotion();
  return <div className="hero-backdrop" ref={frame} aria-hidden="true">
    <motion.div className="hero-map" style={{ backgroundImage: `url(${src})`, y: reduced ? 0 : offset }} />
  </div>;
}
