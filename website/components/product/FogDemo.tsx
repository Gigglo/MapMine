"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { LocateFixed } from "lucide-react";
import type { Map as MapLibre } from "maplibre-gl";
import { cartography } from "../../config/cartography";

type Point = { x: number; y: number };
const start = { x: 0.42, y: 0.57 };
const { bounds, map: imageUrl, center } = cartography;
const [[west, south], [east, north]] = bounds;
const clamp = (value: number) => Math.min(0.965, Math.max(0.035, value));

export default function FogDemo() {
  const surface = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const fog = useRef<HTMLCanvasElement>(null);
  const points = useRef<Point[]>([start]);
  const cursor = useRef(start);
  const frame = useRef(0);
  const drag = useRef<number | null>(null);
  const [position, setPosition] = useState(start);
  const [moved, setMoved] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  function paint() {
    const canvas = fog.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const { width, height } = canvas;
    const radius = Math.min(width, height) * 0.16;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "rgba(7,7,7,0.94)";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = radius * 1.46;
    context.shadowColor = "#000";
    context.shadowBlur = radius * 0.5;
    context.strokeStyle = "#000";
    context.beginPath();
    context.moveTo(start.x * width, start.y * height);
    for (const point of points.current) context.lineTo(point.x * width, point.y * height);
    context.stroke();
    const x = cursor.current.x * width;
    const y = cursor.current.y * height;
    context.shadowBlur = 0;
    const feather = context.createRadialGradient(x, y, radius * 0.58, x, y, radius);
    feather.addColorStop(0, "#000");
    feather.addColorStop(1, "transparent");
    context.fillStyle = feather;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    context.globalCompositeOperation = "source-over";
  }

  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    function resize() {
      const canvas = fog.current;
      if (!canvas || !element) return;
      const scale = Math.min(devicePixelRatio || 1, 1.65);
      canvas.width = Math.max(1, Math.round(element.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(element.clientHeight * scale));
      paint();
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, []);

  useEffect(() => {
    const element = mapContainer.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    let instance: MapLibre | undefined;
    let disposed = false;
    let size: ResizeObserver | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const surfaceRatio = cartography.width / cartography.height;
      void import("maplibre-gl").then(({ Map }) => {
        if (disposed) return;
        instance = new Map({
          container: element, interactive: false, attributionControl: false,
          center, fadeDuration: 0, renderWorldCopies: false,
          style: {
            version: 8,
            sources: { city: { type: "image", url: imageUrl,
              coordinates: [[west, north], [east, north], [east, south], [west, south]] } },
            layers: [{ id: "city", type: "raster", source: "city", paint: { "raster-fade-duration": 0 } }],
          },
        });
        const current = instance;
        const fit = () => {
          if (!element.clientWidth || !element.clientHeight) return;
          current.resize();
          current.fitBounds(bounds, { duration: 0, padding: 0 });
          const ratio = element.clientWidth / element.clientHeight / surfaceRatio;
          current.setZoom(current.getZoom() + Math.log2(Math.max(ratio, 1 / ratio)));
        };
        current.once("idle", () => { if (!disposed && current.isSourceLoaded("city")) setMapReady(true); });
        size = new ResizeObserver(fit);
        size.observe(element);
        fit();
      }).catch(() => undefined);
    }, { rootMargin: "140px" });
    observer.observe(element);
    return () => { disposed = true; observer.disconnect(); size?.disconnect(); instance?.remove(); };
  }, []);

  function move(point: Point) {
    const next = { x: clamp(point.x), y: clamp(point.y) };
    const last = points.current.at(-1) ?? start;
    if (Math.hypot(last.x - next.x, last.y - next.y) < 0.003) return;
    points.current.push(next);
    cursor.current = next;
    setPosition(next);
    setMoved(true);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current !== event.pointerId) return;
    const box = surface.current?.getBoundingClientRect();
    if (box) move({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
  }

  function keyMove(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 0.08 : 0.03;
    const offset = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!offset) return;
    event.preventDefault();
    move({ x: cursor.current.x + offset[0], y: cursor.current.y + offset[1] });
  }

  function reset() {
    points.current = [start];
    cursor.current = start;
    setPosition(start);
    setMoved(false);
    paint();
  }

  return <>
    <div ref={surface} className="demo-surface">
      <div className="demo-poster" style={{ backgroundImage: `url(${imageUrl})` }} />
      <div ref={mapContainer} className={`demo-maplibre ${mapReady ? "demo-maplibre-ready" : ""}`} aria-hidden="true" />
      <canvas ref={fog} aria-hidden="true" />
      <button type="button" className="explorer-marker" aria-label="Explorer marker. Drag or use arrow keys to move."
        style={{ left: position.x * 100 + "%", top: position.y * 100 + "%" }}
        onPointerDown={event => {
          if (event.button !== 0) return;
          drag.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={pointerMove} onLostPointerCapture={() => { drag.current = null; }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={keyMove}>
        <LocateFixed size={18} strokeWidth={2.25} />
      </button>
      <span className="map-place">Bhubaneswar, India</span>
      <noscript><p className="demo-no-js">Enable JavaScript to move the marker.</p></noscript>
    </div>
    <div className="demo-tools">
      <p aria-live="polite">{moved ? "Territory revealed" : "Drag to explore or use the arrow keys."}</p>
      <button className="button button-quiet" type="button" onClick={reset}>Reset exploration</button>
    </div>
  </>;
}
