"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Smartphone, Apple } from "lucide-react";

export type ReleaseLinks = { androidApk?: string; androidStore?: string; iosStore?: string };

const observePlatform = () => () => undefined;
function mobilePlatform() {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return "android";
  if (/iPhone|iPod|iPad/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)) return "ios";
  return "";
}

export function DownloadChoices({ links }: { links: ReleaseLinks }) {
  const platform = useSyncExternalStore(observePlatform, mobilePlatform, () => "");
  return <div className="download-choices" data-platform={platform}>
    <div className="release-choice" data-release="android">
      <Smartphone size={21} aria-hidden="true" />
      <div><strong>Android</strong>
        <span>{links.androidApk ? "APK available on GitHub" : links.androidStore ? "Available on Google Play" : "Coming soon"}</span></div>
      {links.androidApk && <a className="button button-light" href={links.androidApk} download={links.androidApk.startsWith("/") || undefined}>Download APK</a>}
      {links.androidStore && <a className={`button ${links.androidApk ? "button-dark" : "button-light"}`} href={links.androidStore}>Google Play</a>}
    </div>
    <div className="release-choice" data-release="ios">
      <Apple size={21} aria-hidden="true" />
      <div><strong>iOS</strong><span>{links.iosStore ? "Available on the App Store" : "Coming soon"}</span></div>
      {links.iosStore && <a className="button button-light" href={links.iosStore}>App Store</a>}
    </div>
  </div>;
}

export function StickyDownload() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.querySelector("#hero-actions");
    const download = document.querySelector("#download");
    if (!hero || !download || !("IntersectionObserver" in window)) return;
    let heroPassed = false;
    let atDownload = false;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        else atDownload = entry.isIntersecting;
      }
      setShown(heroPassed && !atDownload && download.getBoundingClientRect().top > 0);
    });
    observer.observe(hero);
    observer.observe(download);
    return () => observer.disconnect();
  }, []);
  return shown && <div className="sticky-download"><a href="#download" className="button button-light">Download MapMine</a></div>;
}
