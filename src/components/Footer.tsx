import Link from "next/link";
import { SITE } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="relative border-t border-[var(--border)] bg-[var(--bg)] overflow-hidden">
      {/* Giant background word */}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 select-none font-mono text-[120px] md:text-[200px] font-bold leading-none text-[var(--text)]/[0.025] whitespace-nowrap">
        KANTAKA
      </span>

      <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-16">
          {/* Brand */}
          <div>
            <div
              className="text-5xl md:text-7xl font-bold text-[var(--accent)] leading-none mb-3"
              style={{ fontFamily: "var(--font-devanagari), sans-serif" }}
            >
              क्ष
            </div>
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-[var(--text-muted)]">
              {SITE.tagline}
            </p>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-2">
            {[
              { label: "Process", href: "/#process" },
              { label: "Stack", href: "/#stack" },
              { label: "Wins", href: "/#wins" },
              { label: "Contact", href: "/#contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-200 w-fit"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="space-y-4">
            <p className="font-mono text-xs text-[var(--text-muted)] max-w-[220px] leading-relaxed">
              Deploying fraud detection at scale. Let&rsquo;s talk.
            </p>
            <Link
              href="/#contact"
              className="inline-block rounded-full bg-[var(--accent)] px-6 py-2.5 font-mono text-[11px] tracking-[0.2em] uppercase text-white hover:opacity-90 transition-opacity"
            >
              Get in touch →
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-mono text-[9px] tracking-wider text-[var(--text-muted)]">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="font-mono text-[9px] tracking-wider text-[var(--text-muted)]">
            {SITE.coordinates}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="font-mono text-[9px] tracking-wider text-[var(--text-muted)]">
              SYS.LIVE · 2026.KS.AI
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
