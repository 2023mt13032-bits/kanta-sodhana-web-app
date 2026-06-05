"use client";

import type { ChamberRailItem } from "@/lib/homepage";

type ChamberIntroProps = {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  railItems: ChamberRailItem[];
};

export default function ChamberIntro({
  index,
  eyebrow,
  title,
  description,
  railItems,
}: ChamberIntroProps) {
  return (
    <div className="mb-14 md:mb-16">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--accent)]/35" />
        <span className="font-mono text-[9px] tracking-[0.45em] uppercase text-[var(--accent)]/75">
          {eyebrow}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--accent)]/35" />
      </div>

      <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_300px] md:items-end lg:grid-cols-[minmax(0,1fr)_340px]">
        <span className="pointer-events-none absolute -left-4 -top-6 select-none font-mono text-[100px] font-bold leading-none text-[var(--text)]/[0.03] md:-left-6 md:-top-8 md:text-[140px]">
          {index}
        </span>

        <div>
          <p className="mb-4 font-mono text-[10px] tracking-[0.4em] uppercase text-[var(--accent)]">
            Threshold Established
          </p>
          <h2 className="font-mono text-2xl font-bold text-[var(--text)] md:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-2xl font-mono text-sm leading-relaxed text-[var(--text-muted)]">
            {description}
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {railItems.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className="grid grid-cols-[92px_1fr] items-center gap-4 border-b border-[var(--border)]/80 px-4 py-3 last:border-b-0"
            >
              <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-[var(--text-muted)]">
                {item.label}
              </span>
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--text)]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
