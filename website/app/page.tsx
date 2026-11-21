import type { Metadata } from "next";
import Link from "next/link";
import { Database, Power, FileDown, Trash2, Play, Fingerprint } from "lucide-react";
import { site } from "../config/site";
import { mediaFor, screenAssets, type Screen } from "../config/assets";
import { cartography } from "../config/cartography";
import { downloads } from "../config/downloads";
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
  { screen: "places", category: "Saved places", title: "A map that belongs to you.", description: "Save the places you come back to. MapMine can recognise repeat visits while foreground tracking is on." },
  { screen: "heatmap", category: "Activity heatmaps", title: "See where life takes you.", description: "See the streets you travel most often and the places where you spend the most time." },
  { screen: "activity", category: "Travel history", title: "More than just distance.", description: "See how far you travelled, how much new ground you covered, and which days took you somewhere new." },
  { screen: "achievements", category: "Levels & streaks", title: "The adventure never ends.", description: "Earn milestones for new territory, landmarks, and streaks. Share an achievement when you want to show it off." },
];

const privacy = [
  { icon: Database, text: "Exploration history stored on your device" },
  { icon: Power, text: "Foreground location tracking you can pause" },
  { icon: FileDown, text: "Personal data export" },
  { icon: Trash2, text: "Location history deletion" },
  { icon: Fingerprint, text: "No in-app analytics or advertising trackers" },
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
    <main id="main">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy shell">
          <p className="eyebrow hero-eyebrow">The world is your map</p>
          <h1 id="hero-heading">The world is yours<br className="hero-break" /> <span>to discover.</span></h1>
          <p className="hero-description">Explore the real world, lift the fog as you go, and build a map of everywhere you’ve been.</p>
          <div className="hero-actions" id="hero-actions">
            <a className="button button-light" href="#download">Download MapMine</a>
            <a className="button button-dark" href="#explore"><Play size={14} aria-hidden="true" />See it in action</a>
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

      <section id="explore" className="shell demo section-space" aria-labelledby="demo-heading">
        <Reveal className="demo-heading"><p className="eyebrow">Interactive demo</p><h2 id="demo-heading">Every step reveals<br />something new.</h2>
          <p>Move the marker and watch the fog lift. Your own map works the same way as you travel.</p>
        </Reveal>
        <div className="demo-card"><FogDemo /><div className="demo-credit"><MapCredits /></div></div>
      </section>

      <section className="features section-space shell" id="features" aria-label="Features">
        {features.map((feature, index) => {
          const media = mediaFor(feature.screen);
          const mapBased = feature.screen === "fog-of-war" || feature.screen === "heatmap";
          return <article className={`feature ${index % 2 ? "feature-reversed" : ""}`} key={feature.screen}>
            <Reveal className="feature-copy"><p className="eyebrow">{feature.category}</p><h2>{feature.title}</h2><p>{feature.description}</p></Reveal>
            <Reveal className="feature-card">
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
              <AppScreenshot src={screenshot} alt={alt} screen={id} />
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
          <ul>{privacy.map(({ icon: Icon, text }) => <li key={text}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /><span>{text}</span></li>)}</ul>
        </div>
      </section>

      <section id="download" className="download shell section-space" aria-labelledby="download-heading">
        <Reveal><h2 id="download-heading">Go outside.<br />Discover something.</h2><p>A familiar street can become a new adventure.</p></Reveal>
        <DownloadChoices links={downloads} />
        <p className="release-version">App version {site.version}</p>
      </section>
    </main>
    <Footer />
    <StickyDownload />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
  </>;
}
