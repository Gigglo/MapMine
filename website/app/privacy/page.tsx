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
    <section><h2>Location tracking</h2><p>MapMine requests foreground location access when you turn tracking on. If you grant background location access, MapMine can continue using GPS when your screen is locked or another app is open. It uses location to reveal territory, record journeys, and detect visits to saved places. You can pause tracking in the app and change location permissions in your device settings.</p></section>
    <section><h2>On-device storage</h2><p>Location samples, journeys, saved places, spot memories and photos, visits, and discoveries are kept in a local SQLite database. You can configure raw location retention in Settings, clear location history, reset exploration progress, or export your records as JSON. If you share an export, the destination you choose receives that file. Device backups may include app data according to your system settings.</p></section>
    <section><h2>Maps and services</h2><p>The app loads its basemap from CARTO. Ordinary map requests can disclose your IP address and the map area being viewed to the provider. MapMine does not send its saved journey history or private places as part of those requests. The website’s exploration demo runs locally without asking for location access.</p></section>
    <section><h2>Analytics</h2><p>MapMine uses PostHog in the United States to understand app usage. Release builds send an app-generated identifier, basic device and app metadata, lifecycle events, screen names, and selected actions, such as saving a spot or opening a share sheet. Analytics events exclude GPS coordinates, names, search text, routes, memories, and photos. Session recording and IP-based location enrichment are disabled. PostHog receives the IP address used to connect to its service.</p><p>This website uses GoatCounter to measure page views. Its hosting provider may process ordinary request logs for delivery and security.</p></section>
    <section><h2>Notifications</h2><p>Walk reminders, nearby landmark suggestions, and exploration alerts run locally when enabled. Nearby suggestions are selected on your device from the latest tracked location.</p></section>
    <section><h2>Product Hunt badge</h2><p>The download page loads a badge image from Product Hunt. Loading it can disclose your IP address to Product Hunt.</p></section>
    {site.contact && <section><h2>Contact</h2><p><a href={`mailto:${site.contact}`}>{site.contact}</a></p></section>}
  </main><Footer /></>;
}
