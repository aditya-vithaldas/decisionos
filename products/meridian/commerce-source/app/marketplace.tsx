'use client';
import { LiveEntry } from '@/components/loop/live-entry';
import { useState, useEffect } from 'react';
import {
  Search,
  AudioLines,
  MapPin,
  Heart,
  Mic,
  ArrowUpRight,
  ChevronDown,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Watch,
  Speaker,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  products,
  categories,
  initialFilters,
  money,
  type Product,
} from '@/lib/catalog';
const icons = [Smartphone, Laptop, Tablet, Headphones, Watch, Speaker];
export default function Marketplace() {
  const [q, setQ] = useState('');
  return (
    <>
      <header className="header">
        <a href="/commerce/" className="logo">
          loop<span>●</span>
        </a>
        <div className="location">
          <MapPin size={19} /> Bengaluru <ChevronDown size={17} />
        </div>
        <form className="search" action="/commerce/search">
          <input
            aria-label="Search electronics"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find your next phone, laptop, and more…"
          />
          <button aria-label="Search">
            <Search />
          </button>
        </form>
        <a
          href="/commerce/search?saved=1"
          className="icon-button"
          aria-label="Saved items"
        >
          <Heart />
        </a>
        <LiveEntry />
      </header>
      <nav className="nav">
        <a href="/commerce/search">
          <b>All categories</b>
          <ChevronDown size={15} />
        </a>
        {categories.slice(1).map((c) => (
          <a key={c} href={'/commerce/search?category=' + encodeURIComponent(c)}>
            {c}
          </a>
        ))}
        <a className="partner-link" href="/#contact">
          Scan your shelf <ArrowUpRight size={15} />
        </a>
      </nav>
      <main className="container marketplace-home">
        <section className="home-intro">
          <div className="home-copy">
            <div className="eyebrow">
              <span className="green-dot" /> FIND SOMETHING GOOD
            </div>
            <h1>
              New to you.
              <br />
              <span>Made for what’s next.</span>
            </h1>
            <p>A little pre-loved. A lot left to give.</p>
            <a className="button home-live-button" href="/commerce/search?live=1">
              <AudioLines size={20} /> Just say what you need{' '}
              <ArrowUpRight size={18} />
            </a>
            <div className="home-microcopy">
              Live shopping, at the speed of a conversation.
            </div>
          </div>
          <div className="home-showcase">
            <span className="showcase-caption">GOOD TECH, ANOTHER LIFE.</span>
            <img
              className="showcase-laptop"
              src={products[1].image}
              alt="MacBook Pro"
            />
            <img
              className="showcase-audio"
              src={products[3].image}
              alt="AirPods Max"
            />
            <div className="showcase-query">
              <AudioLines size={18} />
              <span>“Something for my next big idea.”</span>
              <span className="query-dot" />
            </div>
          </div>
        </section>
        <section className="category-section">
          <div className="section-heading">
            <h2>Follow your curiosity.</h2>
            <a href="/commerce/search">
              Explore all <ArrowRight size={17} />
            </a>
          </div>
          <div className="categories">
            {categories.slice(1).map((c, i) => {
              const Icon = icons[i];
              return (
                <a key={c} href={'/commerce/search?category=' + encodeURIComponent(c)}>
                  <span>
                    <Icon size={28} strokeWidth={1.5} />
                  </span>
                  <b>{c}</b>
                  <small>
                    {products.filter((p) => p.category === c).length} listings
                  </small>
                </a>
              );
            })}
          </div>
        </section>
        <div className="section-heading">
          <div>
            <h2>A few good finds.</h2>
            <p>Good things don’t always have to be brand new.</p>
          </div>
          <a href="/commerce/search">
            View all 200 <ArrowRight size={17} />
          </a>
        </div>
        <div className="product-grid">
          {products.slice(0, 12).map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
        <div className="load-more">
          <a className="button outline" href="/commerce/search">
            Explore more finds <ArrowRight size={17} />
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
export function Card({
  p,
  why,
  ordinal,
}: {
  p: Product;
  why?: string;
  ordinal?: number;
}) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      setSaved(
        JSON.parse(localStorage.getItem('loop-saved') || '[]').includes(p.id),
      );
    } catch {}
  }, [p.id]);
  return (
    <article className="card">
      <div className="card-photo">
        <a href={'/commerce/product/' + p.id}>
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            style={{ viewTransitionName: `product-${p.id}` }}
          />
        </a>
        <span className="review-takeaway">
          <small>SAMPLE REVIEW TAKEAWAY</small>
          {p.reviewSummary}
        </span>
        {ordinal ? (
          <span className="product-ordinal" aria-label={'Product ' + ordinal}>
            {String(ordinal).padStart(2, '0')}
          </span>
        ) : (
          p.featured && <span className="featured">FEATURED</span>
        )}
        <button
          className={'save ' + (saved ? 'saved' : '')}
          aria-label={(saved ? 'Unsave ' : 'Save ') + p.name}
          onClick={() => {
            const ids = JSON.parse(localStorage.getItem('loop-saved') || '[]');
            localStorage.setItem(
              'loop-saved',
              JSON.stringify(
                saved
                  ? ids.filter((x: string) => x !== p.id)
                  : [...new Set([...ids, p.id])],
              ),
            );
            setSaved(!saved);
          }}
        >
          <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <a href={'/commerce/product/' + p.id} className="card-info">
        <strong>{money(p.price)}</strong>
        <h3>
          {p.name}
          {p.storage ? ' · ' + p.storage + ' GB' : ''}
        </h3>
        <span className="condition">{p.condition}</span>
        <span className="product-detail-link">View details & reviews ↗</span>
        <div className="card-meta">
          <span>{p.location}, Bengaluru</span>
          <span>{p.age}</span>
        </div>
      </a>
      {why && <blockquote>“{why}”</blockquote>}
    </article>
  );
}
export function Footer() {
  return (
    <footer>
      <a className="logo" href="/commerce/">
        loop<span>●</span>
      </a>
      <p>Better finds. Less footprint.</p>
      <span>Demo marketplace · 200 sample listings</span>
      <span>© 2026 Loop</span>
    </footer>
  );
}
