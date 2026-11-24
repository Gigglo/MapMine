import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, Database, Footprints, Power, FileDown, Trash2, Play, Fingerprint, Route } from "lucide-react";
import { site } from "../config/site";
import { mediaFor, screenAssets, type Screen } from "../config/assets";
import { cartography } from "../config/cartography";
import { androidRelease, downloads } from "../config/downloads";
import { Footer, MapCredits, Navbar } from "../components/Layout";
import Reveal from "../components/Reveal";
import { DownloadChoices, StickyDownload } from "../components/DownloadActions";
import { AppScreenshot } from "../components/product/PhonePreview";
import InteractivePreview from "../components/product/InteractivePreview";
import VideoShowcase from "../components/product/VideoShowcase";
import FogDemo from "../components/product/FogDemo";
import MapBackdrop from "../components/product/MapBackdrop";

export const metadata: Metadata = {
  alternates: site.url ? { canonical: site.url } : undefined,
};

const features: { screen: Screen; category: string; title: string; description: string }[] = [
  { screen: "fog-of-war", category: "Territory", title: "The unknown is waiting.", description: "Go somewhere new. As you move, the fog lifts and the streets you discover stay on your map." },
  { screen: "places", category: "Saved places", title: "A map that belongs to you.", description: "Save the places you come back to. MapMine can recognise repeat visits while location tracking is on." },
  { screen: "heatmap", category: "Activity heatmaps", title: "See where life takes you.", description: "See the streets you travel most often and the places where you spend the most time." },
  { screen: "activity", category: "Travel history", title: "More than just distance.", description: "See how far you travelled, how much new ground you covered, and which days took you somewhere new." },
  { screen: "achievements", category: "Levels & streaks", title: "The adventure never ends.", description: "Earn milestones for new territory, landmarks, and streaks. Share an achievement when you want to show it off." },
];

const privacy = [
  { icon: Database, text: "Exploration history stored on your device" },
  { icon: Power, text: "Location tracking you can pause" },
  { icon: FileDown, text: "Personal data export" },
  { icon: Trash2, text: "Location history deletion" },
  { icon: Fingerprint, text: "GPS coordinates and routes excluded from usage analytics" },
];

const releaseHighlights = [
  { icon: Footprints, title: "Background exploration", description: "Keep revealing territory and recording journeys with the screen locked when you allow background location." },
  { icon: Route, title: "Route replay", description: "Open Activity to replay a day’s route or revisit an individual journey." },
  { icon: Camera, title: "Photo memories", description: "Add photos to saved places to remember what you found there." },
];

export default function Home() {
  const hero = mediaFor("explore");
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    description: site.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Android, iOS",
    softwareVersion: site.version,
    ...(site.url ? { url: site.url } : {}),
  };
  return <>
    <Navbar />
    <div aria-hidden="true" className="scroll-progress" />
    <main id="main">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy shell">
          <a className="eyebrow hero-eyebrow release-label" href="#whats-new">MapMine {androidRelease.tag} · What’s new</a>
          <h1 id="hero-heading">The world is yours<br className="hero-break" /> <span>to discover.</span></h1>
          <p className="hero-description">Explore the real world, lift the fog as you go, and build a map of everywhere you’ve been.</p>
          <div className="hero-actions" id="hero-actions">
            <a className="button button-light" href={androidRelease.url}>Download {androidRelease.tag} for Android</a>
            <a className="button button-dark" href="#launch-film"><Play size={14} aria-hidden="true" />Watch the launch film</a>
          </div>
        </div>
        <figure className="hero-showcase shell">
          <div className="hero-stage">
            <MapBackdrop src={cartography.map} />
            <div className="hero-stage-device">
              {hero.video ? <VideoShowcase sources={hero.video} title="MapMine exploration recording"
                fallback={<AppScreenshot {...hero} src={hero.screenshot} screen="explore" priority />} /> :
                <AppScreenshot src={hero.screenshot} alt={hero.alt} screen="explore" priority />}
            </div>
          </div>
          <figcaption className="showcase-caption">
            <span>{hero.video || hero.screenshot ? "MapMine Explore" : "MapMine Explore · Interface preview with demo data"}</span>
            <MapCredits />
          </figcaption>
        </figure>
      </section>

      <section id="whats-new" className="shell release-update section-space" aria-labelledby="release-heading">
        <h2 id="release-heading">What’s new in MapMine {androidRelease.tag}</h2>
        <ul className="release-highlights">
          {releaseHighlights.map(({ icon: Icon, title, description }) => (
            <li key={title}>
              <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="launch-film" className="shell launch-film section-space" aria-labelledby="launch-film-heading">
        <h2 id="launch-film-heading">MapMine launch film</h2>
        <video controls playsInline preload="none" width={1280} height={720}
          poster="/posters/mapmine-launch.webp" aria-labelledby="launch-film-heading">
          <source src="/videos/mapmine-launch.mp4" type="video/mp4" />
          <a href="/videos/mapmine-launch.mp4">Download the MapMine launch film</a>
        </video>
      </section>

      <section id="explore" className="shell demo section-space" aria-labelledby="demo-heading">
        <Reveal className="demo-heading"><p className="eyebrow">Interactive demo</p><h2 id="demo-heading">Every step reveals<br />something new.</h2>
          <p>Move the marker and watch the fog lift. Your own map works the same way as you travel.</p>
        </Reveal>
        <Reveal className="demo-card" media delay={0.06}><FogDemo /><div className="demo-credit"><MapCredits /></div></Reveal>
      </section>

      <section className="features section-space shell" id="features" aria-label="Features">
        {features.map((feature, index) => {
          const media = mediaFor(feature.screen);
          const mapBased = feature.screen === "fog-of-war" || feature.screen === "heatmap";
          return <article className={`feature ${index % 2 ? "feature-reversed" : ""}`} key={feature.screen}>
            <Reveal className="feature-copy"><p className="eyebrow">{feature.category}</p><h2>{feature.title}</h2><p>{feature.description}</p></Reveal>
            <Reveal className="feature-card" media delay={0.07}>
              <figure>
                <div className={`feature-visual feature-${feature.screen}`}>
                  {media.video ? <VideoShowcase sources={media.video} title={media.alt}
                    fallback={<AppScreenshot src={media.screenshot} alt={media.alt} screen={feature.screen} />} /> :
                    media.screenshot ? <AppScreenshot src={media.screenshot} alt={media.alt} screen={feature.screen} /> :
                      <InteractivePreview screen={feature.screen} />}
                </div>
                <figcaption className="feature-caption">
                  {media.video ? "App recording" : media.screenshot ? "App screenshot" : "Interactive interface preview"}
                  {mapBased && <MapCredits />}
                </figcaption>
              </figure>
            </Reveal>
          </article>;
        })}
      </section>

      <section className="gallery-section section-space shell" aria-labelledby="gallery-heading">
        <Reveal className="gallery-heading"><h2 id="gallery-heading">A closer look.</h2></Reveal>
        <div className="gallery" role="region" aria-label="MapMine interface gallery" tabIndex={0}>
          {screenAssets.map(({ id, label, alt }) => {
            const { screenshot } = mediaFor(id);
            return <figure key={id} className="gallery-item">
              <Reveal media><AppScreenshot src={screenshot} alt={alt} screen={id} /></Reveal>
              <figcaption><strong>{label}</strong><span>{screenshot ? "App screenshot" : "Interface preview"}</span></figcaption>
            </figure>;
          })}
        </div>
        <div className="gallery-credit"><MapCredits /></div>
      </section>

      <section id="privacy" className="privacy section-space" aria-labelledby="privacy-heading">
        <div className="shell privacy-layout">
          <Reveal><p className="eyebrow">Privacy</p><h2 id="privacy-heading">Your world.<br />Your data.</h2>
            <p>MapMine keeps your journeys, saved places, and discovered territories on your device. You decide when tracking runs and what to keep.</p>
            <Link className="privacy-link" href="/privacy/" prefetch={false}>Read the privacy policy</Link>
          </Reveal>
          <Reveal delay={0.09}><ul>{privacy.map(({ icon: Icon, text }) => <li key={text}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /><span>{text}</span></li>)}</ul></Reveal>
        </div>
      </section>

      <section id="download" className="download shell section-space" aria-labelledby="download-heading">
        <Reveal><h2 id="download-heading">Go outside.<br />Discover something.</h2><p>A familiar street can become a new adventure.</p></Reveal>
        <Reveal delay={0.08}>
          <DownloadChoices links={downloads} />
          <div className="project-links">
            <a href={site.productHunt.url} target="_blank" rel="noopener noreferrer" className="product-hunt-badge">
              <Image alt="MapMine — The World Is Yours to Discover. | Product Hunt" width={250} height={54}
                src={site.productHunt.badge} referrerPolicy="no-referrer" unoptimized />
            </a>
            <a href={site.github} className="button button-quiet">Open source on GitHub <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </Reveal>
      </section>
    </main>
    <Reveal><Footer /></Reveal>
    <StickyDownload />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
  </>;
}
