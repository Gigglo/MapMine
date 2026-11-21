import Image from "next/image";
import Link from "next/link";
import { brand } from "../config/assets";
import { site } from "../config/site";

export function Wordmark() {
  return <Link href="/" className="wordmark" aria-label="MapMine home" prefetch={false}>
    <Image src={brand.logo} width={26} height={26} alt="" className="wordmark-image" />
    <span>MapMine</span>
  </Link>;
}

export function Navbar() {
  return <header className="header">
    <nav className="shell nav" aria-label="Main navigation">
      <Wordmark />
      <div className="nav-links">
        <Link href="/#explore" prefetch={false}>Explore</Link><Link href="/#features" prefetch={false}>Features</Link><Link href="/#privacy" prefetch={false}>Privacy</Link>
      </div>
      <Link className="button button-light nav-download" href="/#download" prefetch={false}>Download</Link>
    </nav>
  </header>;
}

export function Footer() {
  return <footer className="shell footer">
    <div className="footer-brand"><Wordmark /><p>{site.tagline}</p></div>
    <nav aria-label="Footer">
      <Link href="/#download" prefetch={false}>Download</Link><Link href="/#features" prefetch={false}>Features</Link><Link href="/privacy/" prefetch={false}>Privacy policy</Link>
      {site.terms && <a href={site.terms}>Terms</a>}
      {site.contact && <a href={`mailto:${site.contact}`}>Contact</a>}
      {site.github && <a href={site.github}>GitHub</a>}
    </nav>
    <p className="copyright">© {new Date().getUTCFullYear()} MapMine</p>
  </footer>;
}

export function MapCredits() {
  return <span className="map-credits">
    <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
    <span aria-hidden="true"> · </span><a href="https://carto.com/attributions">© CARTO</a>
  </span>;
}
