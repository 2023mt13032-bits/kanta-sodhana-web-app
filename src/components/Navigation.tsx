"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { getNavSectionId, shouldHandleNavInPage } from "@/lib/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[10px] tracking-wider text-[var(--text-muted)] tabular-nums">{time}</span>;
}

function Tab({
  children, href, isActive, setPosition, onClick,
}: {
  children: React.ReactNode;
  href: string;
  isActive: boolean;
  setPosition: (pos: { left: number; width: number; opacity: number }) => void;
  onClick: (href: string, e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { width } = ref.current.getBoundingClientRect();
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft });
      }}
      className="relative z-10 block cursor-pointer"
    >
      <Link
        href={href}
        onClick={(e) => onClick(href, e)}
        className={`block whitespace-nowrap px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] transition-colors duration-200 ${
          isActive ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
        } md:px-4 md:py-2`}
      >
        {children}
      </Link>
    </li>
  );
}

function Cursor({ position }: { position: { left: number; width: number; opacity: number } }) {
  return (
    <motion.li
      animate={position}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute z-0 h-7 rounded-full bg-[var(--accent)] md:h-9"
      style={{ top: "50%", transform: "translateY(-50%)" }}
    />
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [position, setPosition] = useState({ left: 0, width: 0, opacity: 0 });
  const [visible, setVisible] = useState(true);
  const [activeHash, setActiveHash] = useState("");
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (current < 64 || current < lastY.current - 6) setVisible(true);
      else if (current > lastY.current + 6) setVisible(false);
      lastY.current = current;

      // Track active section
      const ids = ["process", "stack", "wins", "use-cases", "contact"];
      for (const id of [...ids].reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveHash(`/#${id}`);
          return;
        }
      }
      setActiveHash("");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href === "/" && pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!shouldHandleNavInPage(pathname, href)) return;

    const sectionId = getNavSectionId(href);
    if (!sectionId) return;

    e.preventDefault();
    window.dispatchEvent(new CustomEvent("ks-reveal-sections"));

    // Wait for React re-render after belowFold reveal, then scroll
    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (attempts < 15) {
        setTimeout(() => tryScroll(attempts + 1), 30);
      }
    };
    requestAnimationFrame(() => tryScroll());
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" && activeHash === "";
    if (href.startsWith("/#")) return activeHash === href;
    return pathname === href;
  };

  return (
    <nav className={`fixed top-3 left-1/2 z-[100] w-[calc(100vw-24px)] max-w-fit -translate-x-1/2 transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"}`}>
      <div className="flex items-center gap-2 md:gap-4">
        <ul
          className="relative flex items-center rounded-full border border-black/[0.12] bg-[var(--surface)]/95 p-1 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.18)] overflow-x-auto scrollbar-none"
          onMouseLeave={() => setPosition((p) => ({ ...p, opacity: 0 }))}
        >
          {NAV_LINKS.map((link) => (
            <Tab
              key={link.href}
              href={link.href}
              isActive={isActive(link.href)}
              setPosition={setPosition}
              onClick={handleNavClick}
            >
              {link.label}
            </Tab>
          ))}
          <Cursor position={position} />
        </ul>

        {/* Clock hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 rounded-full border border-black/[0.12] bg-[var(--surface)]/95 px-3 py-1.5 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.18)]">
          <LiveClock />
          <div className="h-4 w-px bg-[var(--border)]" />
          <ThemeToggle />
        </div>
        {/* Theme toggle only on mobile */}
        <div className="flex md:hidden items-center rounded-full border border-black/[0.12] bg-[var(--surface)]/95 px-2 py-1.5 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.18)]">
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 rounded-full border border-black/[0.12] bg-[var(--surface)]/95 p-1 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.18)]">
          {user ? (
            <>
              <span className="hidden sm:block whitespace-nowrap px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-[var(--accent)]">
                {user.username}
              </span>
              {user.is_admin && (
                <Link
                  href="/admin"
                  className="whitespace-nowrap rounded-full border border-[var(--accent)]/40 px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 md:px-3"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={() => logout()}
                className="whitespace-nowrap rounded-full border border-[var(--border)] px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] md:px-3"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text)] rounded-full md:px-3">
                Login
              </Link>
              <Link href="/signup" className="whitespace-nowrap rounded-full bg-[var(--accent)] px-2 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-white transition-opacity duration-200 hover:opacity-90 md:px-3">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
