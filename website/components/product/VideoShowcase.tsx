"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function VideoShowcase({ sources, title, fallback }: {
  sources: { webm?: string; mp4?: string; poster?: string }; title: string; fallback: ReactNode;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const userPaused = useRef(false);
  const automaticPause = useRef(false);

  useEffect(() => {
    if (!wrapper.current || typeof IntersectionObserver === "undefined") return;
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setEnabled(true); preload.disconnect(); }
    }, { rootMargin: "160px" });
    preload.observe(wrapper.current);
    return () => preload.disconnect();
  }, []);

  useEffect(() => {
    if (!video.current || !wrapper.current || typeof IntersectionObserver === "undefined") return;
    const player = video.current;
    if (enabled) player.load();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    function sync() {
      if (visible && !reduced.matches && !userPaused.current) void player.play().catch(() => undefined);
      else if (!player.paused) { automaticPause.current = true; player.pause(); }
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.45 });
    observer.observe(wrapper.current);
    reduced.addEventListener("change", sync);
    return () => { observer.disconnect(); reduced.removeEventListener("change", sync); };
  }, [enabled, failed]);

  return <div ref={wrapper} className="video-showcase">
    {failed || (!enabled && !sources.poster) ? fallback : <video ref={video} playsInline muted loop controls preload="none" poster={sources.poster}
      aria-label={title} onError={() => setFailed(true)}
      onPlay={() => { userPaused.current = false; }}
      onPause={() => { if (!automaticPause.current) userPaused.current = true; automaticPause.current = false; }}>
      {enabled && sources.webm && <source src={sources.webm} type="video/webm" />}
      {enabled && sources.mp4 && <source src={sources.mp4} type="video/mp4" />}
    </video>}
  </div>;
}
