import Image from "next/image";
import { ChevronRight, Coffee, Compass, Footprints, Landmark, Layers3, LocateFixed, Search, Settings2, Trophy } from "lucide-react";
import type { PointerEventHandler, ReactNode } from "react";
import type { Screen } from "../../config/assets";
import { cartography } from "../../config/cartography";

const mapImage = cartography.portrait;
const savedPlaces = [
  { name: "Neighbourhood café", detail: "Café · 3 visits", icon: Coffee },
  { name: "State Museum", detail: "Museum · 1 visit", icon: Landmark },
  { name: "Morning walking route", detail: "Outdoors", icon: Footprints },
];

export function PreviewUI({ screen, active = false, onAction, sheet }: {
  screen: Screen; active?: boolean; onAction?: () => void;
  sheet?: { offset: number; down: PointerEventHandler<HTMLButtonElement>; move: PointerEventHandler<HTMLButtonElement>; end: PointerEventHandler<HTMLButtonElement>; cancel: PointerEventHandler<HTMLButtonElement>; close: () => void };
}) {
  const map = screen === "explore" || screen === "fog-of-war" || screen === "heatmap";
  if (map) {
    const heat = screen === "heatmap" && active;
    return <div className="preview-map">
      <div className="preview-map-image" style={{ backgroundImage: `url(${mapImage})` }} />
      {!heat ? <div className={`preview-fog ${screen === "fog-of-war" && !active ? "preview-fog-heavy" : ""}`} /> :
        <div className="preview-heat" aria-hidden="true"><i /><i /><i /></div>}
      <div className="preview-search"><Search /><span>Search places and landmarks</span><div className="preview-avatar" /></div>
      {!heat && <svg className="preview-route" viewBox="0 0 240 490" aria-hidden="true" preserveAspectRatio="none">
        <path d="M76 369l25-32 21-37-6-24 22-27-5-27 24-35" className="route-shadow" />
        <path d="M76 369l25-32 21-37-6-24 22-27-5-27 24-35" className="route-line" />
        <circle cx="157" cy="187" r="17" className="route-halo" /><circle cx="157" cy="187" r="4.5" className="route-dot" />
      </svg>}
      <div className="preview-controls"><LocateFixed /><Layers3 /><Compass /></div>
      <div className="preview-sheet">
        <i className="preview-grabber" />
        <div className="preview-row"><span className="preview-icon"><Footprints /></span>
          <div><strong>{heat ? "Heatmap" : "Exploration"}</strong><small>{heat ? "Travel density · This week" : "2.48 km travelled · 0.16 km² new"}</small></div>
        </div>
        {onAction && <button className="preview-action" type="button" onClick={onAction}>
          {screen === "heatmap" ? (active ? "Show exploration map" : "Show heatmap") : (active ? "Reset preview" : "Reveal territory")}
        </button>}
      </div>
    </div>;
  }

  if (screen === "places") return <div className="preview-page">
    <div className="preview-page-title"><div><strong>Saved places</strong><small>{savedPlaces.length} saved</small></div></div>
    <div className="preview-filters"><span className="chosen">All</span><span>Favourites</span><span>Outdoors</span></div>
    <div className="preview-place-list">
      {savedPlaces.map(({ name, detail, icon: Icon }) => (
        <div className="preview-place" key={name}><span className="preview-icon"><Icon /></span>
          <div><strong>{name}</strong><small>{detail}</small></div>
          <ChevronRight />
        </div>
      ))}
    </div>
    {onAction && !active && <button className="preview-action" onClick={onAction} type="button">Open saved place</button>}
    {active && <div className="preview-details" style={{ translate: sheet?.offset ? `0 ${sheet.offset}px` : undefined }}>
      <button className="preview-handle" aria-label="Close place details or drag down" type="button"
        onPointerDown={sheet?.down} onPointerMove={sheet?.move} onPointerUp={sheet?.end} onPointerCancel={sheet?.cancel} onClick={sheet?.close ?? onAction}>
        <i className="preview-grabber" />
      </button>
      <strong>Neighbourhood café</strong><small>Latest visit · 42 min</small><small>3 visits recorded locally</small>
    </div>}
  </div>;

  if (screen === "activity") return <div className="preview-page">
    <div className="preview-page-title"><div><strong>Activity</strong><small>Last seven days</small></div></div>
    <div className="preview-stats preview-activity-stats"><div><strong>{active ? "0.68 km²" : "12.4 km"}</strong><small>{active ? "New territory" : "Distance travelled"}</small></div>
      <div><strong>4</strong><small>Days explored</small></div></div>
    <div className="preview-chart" aria-label="Example seven-day activity chart">
      {(active ? [19,29,83,36,61,74,38] : [22,55,36,63,42,82,57]).map((value, index) => (
        <div key={index}><i style={{ height: value + "%" }} /><small>{"MTWTFSS"[index]}</small></div>
      ))}
    </div>
    {onAction && <button className="preview-action" type="button" onClick={onAction}>{active ? "View distance" : "View discovered area"}</button>}
    <div className="preview-place"><span className="preview-icon"><Compass /></span><div><strong>Recent journeys</strong><small>Sunset walk · 2.48 km</small></div></div>
  </div>;

  if (screen === "achievements") return <div className="preview-page">
    <div className="preview-page-title"><span className="preview-icon"><Trophy /></span><div><strong>Achievements</strong><small>Level 4 · 820 XP</small></div></div>
    <div className="preview-progress"><i /></div>
    {active ? <div className="preview-award">
      <div className="preview-award-art">
        <span aria-hidden="true">✦</span>
        <Image src="/brand/logo.webp" alt="" width={44} height={44} />
        <span aria-hidden="true">🎉</span>
      </div>
      <small className="preview-award-label">Achievement unlocked</small>
      <strong>Delulu Estate Holdings</strong>
      <small>Discover 5 square kilometres.</small>
      <small className="preview-award-xp">+550 XP</small>
    </div> : [["Stray Cat", "First territory"], ["Delulu Estate Holdings", "5 km² discovered"], ["New Map, Who Dis?", "Five discovery days"]].map(([name, desc]) => (
      <div className="preview-place" key={name}><span className="preview-icon"><Trophy /></span>
        <div><strong>{name}</strong><small>{desc}</small></div>
      </div>
    ))}
    {onAction && <button className="preview-action" type="button" onClick={onAction}>{active ? "Reset preview" : "Reveal milestone"}</button>}
  </div>;

  return <div className="preview-page">
    <div className="preview-page-title"><span className="preview-icon"><Settings2 /></span><div><strong>Profile & settings</strong><small>Level 4 · 820 XP</small></div></div>
    <div className="preview-stats"><div><strong>12.4 km</strong><small>Travelled</small></div><div><strong>0.68 km²</strong><small>Discovered</small></div></div>
    {["Location tracking", "Export exploration data", "Clear location history"].map(text => <div key={text} className="preview-place"><strong>{text}</strong><ChevronRight /></div>)}
  </div>;
}

export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`phone-frame ${className}`}>
    <div className="phone-screen">{children}</div>
  </div>;
}

export function AppScreenshot({ src, alt, screen, priority = false }: {
  src?: string; alt: string; screen: Screen; priority?: boolean;
}) {
  return <PhoneFrame>
    {src ? <Image src={src} alt={alt} fill sizes="(max-width: 600px) 76vw, 320px" priority={priority} className="phone-image" />
      : <PreviewUI screen={screen} active={screen === "heatmap"} />}
  </PhoneFrame>;
}
