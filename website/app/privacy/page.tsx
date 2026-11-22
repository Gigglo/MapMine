import type { Metadata } from "next";
import { Footer, Navbar } from "../../components/Layout";
import { site } from "../../config/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  alternates: site.url ? { canonical: new URL("privacy/", site.url).href } : undefined,
};

export default function PrivacyPage() {
  return <><Navbar /><main className="shell policy" id="main">
    <h1>Privacy policy</h1>
    <p>MapMine lets you explore the world and keep a private record of where you’ve been. This page describes how the current app and download website handle that information.</p>
    <section><h2>Location tracking</h2><p>MapMine requests foreground location access when you turn tracking on. It uses GPS readings to reveal territory, record journeys, and detect visits to saved places. You can pause tracking in the app and change location permissions in your device settings.</p></section>
    <section><h2>On-device storage</h2><p>Location samples, journeys, saved places, visits, and discoveries are kept in a local SQLite database. You can configure raw location retention in Settings, clear location history, reset exploration progress, or export your records as JSON. If you share an export, the destination you choose receives that file. Device backups may include app data according to your system settings.</p></section>
    <section><h2>Maps and services</h2><p>The app loads its basemap from CARTO. Ordinary map requests can disclose your IP address and the map area being viewed to the provider. MapMine does not send its saved journey history or private places as part of those requests. The website’s exploration demo runs locally without asking for location access.</p></section>
    <section><h2>Analytics and notifications</h2><p>MapMine does not include app analytics or advertising trackers. If enabled, exploration alerts are delivered locally through your device’s notification system. This website does not install analytics or tracking cookies. Its hosting provider may process ordinary request logs for delivery and security.</p></section>
    <section><h2>Product Hunt badge</h2><p>The download page loads a badge image from Product Hunt. Loading it can disclose your IP address to Product Hunt.</p></section>
    {site.contact && <section><h2>Contact</h2><p><a href={`mailto:${site.contact}`}>{site.contact}</a></p></section>}
  </main><Footer /></>;
}
