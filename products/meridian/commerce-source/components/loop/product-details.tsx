import { type Product, money, recommendations } from '@/lib/catalog';
import { Card } from '@/app/marketplace';
import { MapPin, ShieldCheck, UserRound } from 'lucide-react';
export function ProductDetails({ p }: { p: Product }) {
  return (
    <>
      <div className="product-detail">
        <div>
          <div className="detail-photo">
            <img
              src={p.image}
              alt={p.name}
              style={{ viewTransitionName: `product-${p.id}` }}
            />
            <span className="photo-label">
              Illustrative product photo · Sample listing
            </span>
          </div>
          <section className="detail-box">
            <h2>About this find</h2>
            <p>{p.description}</p>
            <p className="recommendation-note">
              Demo specifications · Illustrative details for this shopping
              experience.
            </p>
            <div className="spec-grid">
              {Object.entries({
                Brand: p.brand,
                Condition: p.condition,
                ...p.specs,
              }).map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </section>
          <section className="detail-box" id="reviews">
            <span className="eyebrow">WHAT SAMPLE REVIEWERS SAY</span>
            <h2>{p.reviewSummary}</h2>
            <p>
              4.0 / 5 · {p.reviews.length} illustrative reviews. Generated for
              this demo; not real customer reviews.
            </p>
            <div className="product-reviews">
              {p.reviews.map((review, index) => (
                <article className="product-review" key={index}>
                  <small>
                    {review.author} · {review.rating} / 5 stars
                  </small>
                  <h3>{review.title}</h3>
                  <p>{review.text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside>
          <section className="detail-box price-box">
            <span className="condition">{p.condition}</span>
            <h1>{money(p.price)}</h1>
            <h2>
              {p.name}
              {p.storage ? ' · ' + p.storage + ' GB' : ''}
            </h2>
            <p className="detail-location">
              <MapPin size={16} />
              {p.location}, Bengaluru
            </p>
            <div className="detail-age">
              Posted {p.age.toLowerCase()} · ID {p.id}
            </div>
          </section>
          <section className="detail-box seller-box">
            <div className="seller">
              <div className="avatar">
                <UserRound />
              </div>
              <div>
                <h3>{p.seller}</h3>
                <small>Sample seller · Bengaluru</small>
              </div>
            </div>
            <p>
              This is a demo listing. Seller contact and purchases aren’t
              available.
            </p>
            <a
              className="button dark"
              href={'/commerce/search?category=' + encodeURIComponent(p.category)}
            >
              Browse similar finds
            </a>
          </section>
          <section className="trust-note">
            <ShieldCheck size={23} />
            <div>
              <b>Make a confident choice</b>
              <p>
                Compare the specs, condition, and price before choosing your
                next device.
              </p>
            </div>
          </section>
        </aside>
      </div>
      <section className="recommendation-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">A DIFFERENT TAKE ON YOUR NEXT FIND</div>
            <h2>You might like these, too.</h2>
            <p>
              Same category. Different strengths. Here’s why each is worth a
              look.
            </p>
          </div>
        </div>
        <div className="product-grid">
          {recommendations(p).map(({ product, why }) => (
            <Card key={product.id} p={product} why={why} />
          ))}
        </div>
        <p className="recommendation-note">
          Comparisons use the screen size, weight, condition, and price in this
          demo catalog.
        </p>
      </section>
    </>
  );
}
