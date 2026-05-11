import type { ReactNode } from "react";

export function LayoutShell({
  eyebrow,
  title,
  subtitle,
  showHero = true,
  children
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showHero?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="page-shell">
      {showHero && title ? (
        <section className="page-hero">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </section>
      ) : null}
      {children}
    </main>
  );
}
