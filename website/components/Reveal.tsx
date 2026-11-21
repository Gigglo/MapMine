"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export default function Reveal({ children, className, delay = 0, eager = false }: {
  children: ReactNode; className?: string; delay?: number; eager?: boolean;
}) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false}
    {...(eager ? { animate: { opacity: 1, y: 0 } } : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.16 } })}
    transition={reduced ? { duration: 0 } : { duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}
    variants={{ hidden: { opacity: 0.85, y: 14 } }}
    {...(!reduced && !eager && { initial: "hidden" })}>
    {children}
  </motion.div>;
}
