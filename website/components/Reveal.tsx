"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export default function Reveal({ children, className, delay = 0, media = false }: {
  children: ReactNode; className?: string; delay?: number; media?: boolean;
}) {
  const reduced = useReducedMotion();
  return <motion.div className={className ? `scroll-reveal ${className}` : "scroll-reveal"}
    initial={reduced ? false : { opacity: media ? 0.7 : 0.8, y: media ? 24 : 16 }}
    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }}
    transition={reduced ? { duration: 0 } : { duration: media ? 0.72 : 0.54, delay, ease: [0.22, 1, 0.36, 1] }}>
    {children}
  </motion.div>;
}
