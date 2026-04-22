import Image from "next/image";
import Link from "next/link";

import type { MenuItem, TenantBundle } from "@rcc/contracts";

import { AddToCartButton, CartPageClient, CheckoutPageClient, FloatingCartButton } from "./cart-ui";
import { CustomerAuthForm } from "./customer-auth-form";
import { formatMoney } from "../lib/currency";
import { MenuCategoryNav } from "./menu-category-nav";
import { PublicBookingForm, PublicContactForm } from "./public-interactions";

const fallbackGalleryImages = [
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80"
];

function ResponsiveImage({
  src,
  alt,
  className,
  sizes = "100vw"
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  return <Image src={src} alt={alt} width={1200} height={900} sizes={sizes} className={className} />;
}

function MenuHighlight({ item }: { item: MenuItem }) {
  return (
    <article className="menu-card">
      <ResponsiveImage src={item.image} alt={item.name} sizes="(max-width: 768px) 100vw, 33vw" />
      <div className="menu-card-body">
        <div className="menu-card-topline">
          <h3>{item.name}</h3>
          <strong>{formatMoney(item.basePrice)}</strong>
        </div>
        <p>{item.description}</p>
        <div className="chip-row">
          {item.bestSeller ? <span className="chip">Best seller</span> : null}
        </div>
        <div className="menu-card-actions">
          <Link href="/cart" className="button-ghost compact-button menu-order-button">
            Add to order
          </Link>
          <Link href="/menu" className="text-link">
            Customize
          </Link>
        </div>
      </div>
    </article>
  );
}

function toSectionId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function MenuOrderingCard({ item }: { item: MenuItem }) {
  return (
    <article className="menu-order-card">
      <div className="menu-order-card-media">
        <ResponsiveImage src={item.image} alt={item.name} sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="menu-order-card-body">
        <div className="menu-order-card-top">
          <div>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
          </div>
          <div className="menu-order-card-meta">
            <strong>{formatMoney(item.basePrice)}</strong>
            {item.bestSeller ? <span className="chip">Best seller</span> : null}
          </div>
        </div>
        <div className="menu-order-card-actions">
          <AddToCartButton menuItemId={item.id} />
        </div>
      </div>
    </article>
  );
}

export function StorefrontHome({ bundle }: { bundle: TenantBundle }) {
  const featured = bundle.menuItems.filter((item) => item.featured).slice(0, 3);
  const signature = featured[0];
  const galleryImages = bundle.content.galleryImages?.length
    ? bundle.content.galleryImages
    : fallbackGalleryImages;

  return (
    <div className="home-stack stack-xl">
      <section className="hero-editorial">
        <div className="hero-editorial-copy">
          <div className="hero-status">
            <span className="hero-status-dot" aria-hidden="true" />
            <span>Open now</span>
          </div>
          <p className="eyebrow">Contemporary Italian dining</p>
          <h1>
            Savor every
            <br />
            moment with
            <br />
            <span>every bite</span>
          </h1>
          <p className="hero-lead">
            Bella Roma brings together warm hospitality, elegant plating, and direct
            online ordering for guests who want the restaurant experience before the
            first bite arrives.
          </p>
          <div className="actions">
            <Link href="/booking" className="button-ghost">
              Reserve your table
            </Link>
            <Link href="/menu" className="button-primary">
              Order Now
            </Link>
          </div>
          <div className="hero-feature-list">
            <article>
              <strong>Special events</strong>
              <span>Private dining and curated group experiences.</span>
            </article>
            <article>
              <strong>Chef&apos;s experience</strong>
              <span>Signature dishes built for memorable evenings.</span>
            </article>
            <article>
              <strong>Direct ordering</strong>
              <span>Best offers and collection timing available here.</span>
            </article>
          </div>
        </div>
        <div className="hero-editorial-visual">
          <div className="hero-plate-wrap">
            <ResponsiveImage
              src={bundle.tenant.branding.heroImage}
              alt={bundle.tenant.name}
              className="hero-plate"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="floating-callout">
            <p className="eyebrow">Signature pick</p>
            <h3>{signature?.name ?? "House special"}</h3>
            <p>{signature?.description ?? bundle.content.about}</p>
          </div>
        </div>
      </section>

      <section className="stat-band stat-band-premium">
        <article>
          <strong>30-45 min</strong>
          <span>Delivery estimate</span>
        </article>
        <article>
          <strong>7 days</strong>
          <span>Open every week</span>
        </article>
        <article>
          <strong>Direct site</strong>
          <span>Best offers live here</span>
        </article>
        <article>
          <strong>4.9/5</strong>
          <span>Rated by regular guests</span>
        </article>
      </section>

      <section>
        <article className="panel tone-warm story-intro">
          <p className="eyebrow">Culinary artistry</p>
          <h2>Indulgent plates with a quieter sense of luxury</h2>
          <p>
            {bundle.content.about} Every section of the menu is built to feel refined,
            generous, and worth returning to.
          </p>
        </article>
      </section>

      <section className="trio-showcase">
        {featured.map((item) => (
          <article key={item.id} className="showcase-dish">
            <div className="showcase-dish-media">
              <span className="showcase-dish-badge">
                {item.bestSeller ? "Best seller" : "Chef pick"}
              </span>
              <ResponsiveImage src={item.image} alt={item.name} sizes="(max-width: 768px) 100vw, 33vw" />
            </div>
            <div className="showcase-dish-copy">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <strong>{formatMoney(item.basePrice)}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="panel feature-panel">
        <div className="section-heading feature-heading">
          <div>
            <p className="eyebrow">Featured dishes</p>
            <h2>Customer favorites worth ordering first</h2>
          </div>
          <Link href="/menu" className="text-link">
            View full menu
          </Link>
        </div>
        <div className="card-grid">
          {featured.map((item) => (
            <MenuHighlight key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="chef-section chef-section-premium">
        <article className="panel tone-dark chef-story">
          <p className="eyebrow">Crafted by experts</p>
          <h2>A kitchen team focused on consistency, elegance, and flavor</h2>
          <p>
            From weekday delivery orders to weekend dinner reservations, every service
            is treated like a reflection of the restaurant itself.
          </p>
        </article>
        <div className="chef-cards">
          {["Marco Bellini", "Elena Rossi", "Takeshi Mori"].map((name, index) => (
            <article key={name} className="panel chef-card">
              <ResponsiveImage src={galleryImages[index]} alt={name} sizes="(max-width: 768px) 100vw, 33vw" />
              <h3>{name}</h3>
              <p>{index === 0 ? "Head Chef" : index === 1 ? "Pastry Chef" : "Sous Chef"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="testimonial-reservation-grid">
        <article className="panel testimonial-column">
          <p className="eyebrow">Praise from our patrons</p>
          <h2>Guests remember the mood as much as the meal</h2>
          <div className="testimonial-cards">
            {bundle.reviews.concat(bundle.reviews.slice(0, 2)).map((review, index) => (
              <article key={`${review.id}-${index}`} className="testimonial-card">
                <strong>{review.author}</strong>
                <span>{review.content}</span>
              </article>
            ))}
          </div>
        </article>
        <article className="panel reservation-banner">
          <ResponsiveImage
            src={galleryImages[1]}
            alt="Restaurant table service"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="reservation-banner-card">
            <p className="eyebrow">Reserve your table</p>
            <h3>Book an evening built around the full Bella Roma experience</h3>
            <Link href="/booking" className="button-primary block-button">
              Book now
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

export function MenuPage({ bundle }: { bundle: TenantBundle }) {
  const visibleCategories = bundle.categories.filter((category) =>
    bundle.menuItems.some((item) => item.categoryIds.includes(category.id))
  );
  return (
    <div className="menu-page stack-xl">
      <FloatingCartButton menuItems={bundle.menuItems} />
      <section className="menu-hero">
        <article className="panel tone-dark menu-hero-copy">
          <p className="eyebrow">Menu overview</p>
          <h2>Built for browsing quickly and ordering confidently</h2>
          <p>
            Every dish can support sizes, add-ons, and special requests. Browse by
            section, jump to favorites fast, and order directly without marketplace
            markups.
          </p>
        </article>
      </section>

      <MenuCategoryNav
        categories={visibleCategories.map((category) => ({
          id: category.id,
          name: category.name,
          href: `#${toSectionId(category.name)}`
        }))}
      />

      {visibleCategories.map((category) => {
        const items = bundle.menuItems.filter((item) => item.categoryIds.includes(category.id));

        return (
          <article key={category.id} id={toSectionId(category.name)} className="menu-category-section">
            <div className="section-heading menu-category-heading">
              <div>
                <p className="eyebrow">Category</p>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
              </div>
              <span className="menu-category-count">{items.length} dishes</span>
            </div>
            <div className="menu-order-grid">
              {items.map((item) => (
                <MenuOrderingCard key={item.id} item={item} />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function CartPageContent({ bundle }: { bundle: TenantBundle }) {
  return <CartPageClient menuItems={bundle.menuItems} />;
}

export function CheckoutPageContent({ bundle }: { bundle: TenantBundle }) {
  return <CheckoutPageClient menuItems={bundle.menuItems} />;
}

export function GalleryPage({ bundle }: { bundle: TenantBundle }) {
  const galleryImages = bundle.content.galleryImages?.length
    ? bundle.content.galleryImages
    : fallbackGalleryImages;
  return (
    <section className="stack-xl">
      <article className="panel tone-warm">
        <p className="eyebrow">Gallery</p>
        <h2>The dining room, the kitchen energy, and the plates guests remember</h2>
      </article>
      <div className="gallery-grid">
        {galleryImages.map((image) => (
          <ResponsiveImage key={image} src={image} alt="Restaurant gallery" sizes="(max-width: 768px) 100vw, 33vw" />
        ))}
      </div>
    </section>
  );
}

export function BookingPage({ tenantId }: { tenantId: string }) {
  return (
    <div className="content-grid">
      <section className="panel tone-dark">
        <p className="eyebrow">Reservations</p>
        <h2>Book a table with the restaurant directly</h2>
        <p>
          Reserve for lunch, dinner, celebrations, or casual drop-ins. The team
          reviews requests and confirms availability manually.
        </p>
      </section>
      <section className="panel form-panel">
        <h2>Booking request</h2>
        <PublicBookingForm tenantId={tenantId} />
      </section>
    </div>
  );
}

export function ReviewsPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="stack-xl">
      <article className="panel tone-dark">
        <p className="eyebrow">Guest reviews</p>
        <h2>Social proof that feels earned, not manufactured</h2>
      </article>
      <div className="card-grid">
        {bundle.reviews.concat(bundle.reviews).map((review, index) => (
          <article key={`${review.id}-${index}`} className="panel review-card">
            <span className="review-stars">★★★★★</span>
            <h3>{review.author}</h3>
            <p>{review.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FaqPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <section className="stack-xl">
      <article className="panel tone-warm">
        <p className="eyebrow">FAQ</p>
        <h2>Questions guests usually ask before ordering</h2>
      </article>
      <div className="stack">
        {bundle.content.faq.map((entry) => (
          <article key={entry.question} className="panel faq-item">
            <h3>{entry.question}</h3>
            <p>{entry.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ContactPage({ bundle }: { bundle: TenantBundle }) {
  return (
    <div className="content-grid">
      <article className="panel tone-dark">
        <p className="eyebrow">Contact</p>
        <h2>Visit, call, or message the team directly</h2>
        <div className="contact-list">
          <div>
            <span>Address</span>
            <strong>{bundle.tenant.address}</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{bundle.tenant.phone}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{bundle.tenant.email}</strong>
          </div>
        </div>
      </article>
      <article className="panel">
        <h2>Send an enquiry</h2>
        <PublicContactForm tenantId={bundle.tenant.id} />
      </article>
    </div>
  );
}

export function AuthPage({
  mode,
  title,
  subtitle
}: {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
}) {
  return (
    <div className="content-grid auth-grid">
      <section className="panel tone-dark">
        <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create account"}</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </section>
      <section className="panel">
        <CustomerAuthForm mode={mode} />
      </section>
    </div>
  );
}
