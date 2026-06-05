"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { SITE, STATS, TECH_STACK } from "@/lib/constants";
import SegmentedControl from "@/components/SegmentedControl";
import ScrollCard from "@/components/ScrollCard";
import ProgressiveBlur from "@/components/ProgressiveBlur";
import TextRotate from "@/components/TextRotate";
import ChamberIntro from "@/components/ChamberIntro";
import SecureContactForm from "@/components/SecureContactForm";
import CountUp from "@/components/CountUp";
import {
  HOMEPAGE_ACHIEVEMENTS,
  HOMEPAGE_CHAMBERS,
  HOMEPAGE_PROCESS_STEPS,
  HOMEPAGE_TEAM_MEMBERS,
  STACK_CONTENT,
  STACK_SEGMENTS,
} from "@/lib/homepage";

const ProcessShowcase = dynamic(() => import("@/components/ProcessShowcase"), { ssr: false });
const EnergyRing = dynamic(() => import("@/components/EnergyRing"), { ssr: false });
const RulerCarousel = dynamic(() => import("@/components/RulerCarousel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] animate-pulse">
        Loading...
      </span>
    </div>
  ),
});
const TeamShowcase = dynamic(() => import("@/components/TeamShowcase"), { ssr: false });
const EnterGate = dynamic(() => import("@/components/EnterGate"), { ssr: false });
const GLSLTerrain = dynamic(() => import("@/components/GLSLTerrain"), { ssr: false });
const SweepText = dynamic(() => import("@/components/SweepText"), { ssr: false });
import UseCasesScroller from "@/components/UseCasesScroller";

function useBelowFold() {
  const ref = useRef<HTMLDivElement>(null);
  // Reveal immediately if: has hash, or returning from another page (gate already passed)
  const initVisible = typeof window !== "undefined"
    ? (!!window.location.hash || sessionStorage.getItem("ks-gate-passed") === "1")
    : false;
  const [visible, setVisible] = useState(initVisible);

  useEffect(() => {
    const reveal = () => setVisible(true);
    window.addEventListener("ks-reveal-sections", reveal);
    return () => window.removeEventListener("ks-reveal-sections", reveal);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

export default function Home() {
  // Read sessionStorage synchronously so first render is never opacity-0 on return visits
  const alreadyPassed = typeof window !== "undefined"
    ? sessionStorage.getItem("ks-gate-passed") === "1"
    : false;

  const [entered, setEntered] = useState(alreadyPassed);
  const [showGate, setShowGate] = useState(!alreadyPassed);
  const [gatePassed, setGatePassed] = useState(alreadyPassed);
  const [activeStack, setActiveStack] = useState("data");
  const belowFold = useBelowFold();

  const handleEnter = () => {
    sessionStorage.setItem("ks-gate-passed", "1");
    setEntered(true);
  };

  const handleGateGone = () => {
    setShowGate(false);
    setGatePassed(true);
  };

  useEffect(() => {
    if (!entered) return;

    const handleMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      const bgLayer = document.getElementById("hero-bg-layer");
      const textLayer = document.getElementById("hero-text-layer");

      if (bgLayer) bgLayer.style.transform = `translate(${-x * 4}px, ${-y * 4}px)`;
      if (textLayer) textLayer.style.transform = `translate(${x * 2}px, ${y * 2}px)`;
    };

    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [entered]);

  const stackData = STACK_CONTENT[activeStack];

  useEffect(() => {
    if (!entered || !belowFold.visible || typeof window === "undefined") return;
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      });
    });
  }, [belowFold.visible, entered]);

  return (
    <div className="relative">
      {showGate && !gatePassed && (
        <EnterGate onEnter={handleEnter} onGateGone={handleGateGone} />
      )}

      <div className={`relative transition-opacity duration-700 ${entered ? "opacity-100" : "opacity-0"}`}>
        <section className="relative min-h-[130vh] bg-[var(--bg)]">
          <div
            className="absolute inset-0 z-0 transition-transform duration-75 ease-out"
            id="hero-bg-layer"
          >
            {entered && <GLSLTerrain />}
            <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-transparent to-[var(--bg)]" />
            <ProgressiveBlur
              direction="bottom"
              blurLayers={6}
              blurIntensity={0.2}
              className="bottom-0 top-auto h-[30vh]"
            />
          </div>

          <div
            className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
            id="hero-text-layer"
          >
            <p
              className="mb-6 font-mono text-[10px] uppercase tracking-[0.5em] text-[var(--accent)] transition-all duration-1000 ease-out"
              style={{
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0)" : "translateY(20px)",
                transitionDelay: "300ms",
              }}
            >
              {SITE.description}
            </p>

            <div
              className="transition-all duration-1000 ease-out"
              style={{
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0)" : "translateY(40px)",
                transitionDelay: "600ms",
              }}
            >
              {entered && <SweepText />}
            </div>

            <p
              className="mx-auto mt-8 max-w-lg font-mono text-sm leading-relaxed text-[var(--text-muted)] transition-all duration-1000 ease-out"
              style={{
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0)" : "translateY(30px)",
                transitionDelay: "900ms",
              }}
            >
              Every fraudster leaves a fingerprint — in the data, the timing, the pattern.
              <br />
              <span className="text-[var(--text)]">We built the scanner.</span>
            </p>

            <div
              className="absolute bottom-[12vh] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-1000"
              style={{ opacity: entered ? 0.4 : 0, transitionDelay: "1500ms" }}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                scroll
              </span>
              <div className="h-8 w-px animate-pulse bg-gradient-to-b from-[var(--accent)] to-transparent" />
            </div>
          </div>
        </section>

        <section className="relative px-6 py-24">
          <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] md:grid-cols-4">
            {STATS.map((stat, i) => (
              <ScrollCard
                key={stat.value}
                delay={i * 0.1}
                className="group flex flex-col items-center justify-center gap-3 bg-[var(--surface)] px-6 py-10 transition-colors duration-300 hover:bg-[var(--accent)]/5"
              >
                <div className="origin-bottom font-mono text-5xl font-bold text-[var(--accent)] transition-transform duration-300 group-hover:scale-110 md:text-6xl">
                  <CountUp value={stat.value} />
                </div>
                <p className="text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.3em] text-[var(--text-muted)]">
                  {stat.label}
                </p>
              </ScrollCard>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-[var(--border)] py-12">
          <div className="relative h-6 overflow-hidden">
            <div className="absolute left-0 top-1/2 flex min-w-max -translate-y-1/2 animate-marquee hover:[animation-play-state:paused]">
              {[...TECH_STACK, ...TECH_STACK].map((tech, i) => (
                <span
                  key={`${tech}-${i}`}
                  className="mx-8 select-none font-mono text-sm uppercase tracking-wider text-[var(--text-muted)]"
                >
                  <span className="mr-8 text-[var(--accent)]/30">·</span>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 py-32">
          <div className="mx-auto max-w-3xl text-center">
            <ScrollCard>
              <div className="mb-10 flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--accent)]/40" />
                <span className="font-mono text-[9px] uppercase tracking-[0.5em] text-[var(--accent)]/60">
                  Kantaka Śodhana
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--accent)]/40" />
              </div>
              <h2 className="font-mono text-3xl font-bold leading-tight text-[var(--text)] md:text-5xl">
                Every fraud leaves a trace.
                <br />
                <span className="text-[var(--accent)]">We find it.</span>
              </h2>
              <p className="mx-auto mt-8 max-w-xl font-mono text-sm leading-relaxed text-[var(--text-muted)]">
                In classical statecraft, <em className="not-italic text-[var(--text)]">Kantaka Śodhana</em> meant
                the proactive removal of thorns — antisocial actors preying on the marketplace.
                We run that operation at machine speed.
              </p>
            </ScrollCard>
          </div>
        </section>

        <div ref={belowFold.ref} />

        {belowFold.visible && (
          <>
            <section id="process" className="relative overflow-hidden border-t border-[var(--border)] px-6 py-24">
              <div className="mx-auto max-w-5xl">
                <ScrollCard className="mb-16 text-center">
                  <ChamberIntro {...HOMEPAGE_CHAMBERS.process} />
                </ScrollCard>
                <ScrollCard delay={0.15}>
                  <ProcessShowcase steps={HOMEPAGE_PROCESS_STEPS} />
                </ScrollCard>
              </div>
            </section>

            <section id="stack" className="relative overflow-hidden border-t border-[var(--border)] px-6 py-24">
              <div className="mx-auto max-w-5xl">
                <ScrollCard className="mb-12">
                  <ChamberIntro {...HOMEPAGE_CHAMBERS.stack} />
                  <div className="mt-8 flex justify-center">
                    <SegmentedControl
                      segments={STACK_SEGMENTS}
                      value={activeStack}
                      onChange={setActiveStack}
                    />
                  </div>
                </ScrollCard>

                <motion.div
                  key={activeStack}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="mb-6 text-center">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]/70">
                      {stackData.tech}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {stackData.items.map((item, i) => (
                      <ScrollCard key={item.name} delay={i * 0.1}>
                        <div className="group relative h-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors duration-300 hover:border-[var(--accent)]/40">
                          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          <div className="mb-3 font-mono text-lg font-bold text-[var(--text)]">{item.name}</div>
                          <p className="font-mono text-xs leading-relaxed text-[var(--text-muted)]">{item.desc}</p>
                        </div>
                      </ScrollCard>
                    ))}
                  </div>
                </motion.div>
              </div>
            </section>

            <section id="wins" className="relative overflow-hidden border-t border-[var(--border)] px-6 py-24">
              <div className="mx-auto max-w-6xl">
                <ScrollCard className="mb-16">
                  <ChamberIntro {...HOMEPAGE_CHAMBERS.wins} />
                </ScrollCard>
                <RulerCarousel items={HOMEPAGE_ACHIEVEMENTS} />
              </div>
            </section>

            <UseCasesScroller />

            <section id="contact" className="relative overflow-hidden border-t border-[var(--border)] px-6 py-32">
              <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/4 opacity-30">
                <EnergyRing size={600} />
              </div>
              <div className="relative mx-auto max-w-3xl text-center">
                <ScrollCard>
                  <ChamberIntro {...HOMEPAGE_CHAMBERS.contact} />
                  <h2 className="mb-4 font-mono text-3xl font-bold leading-tight text-[var(--text)] md:text-5xl">
                    Ready to initiate
                    <br />
                    <TextRotate
                      words={["secure contact?", "the next case?", "a live deployment?", "the response loop?"]}
                      className="text-[var(--accent)]"
                    />
                  </h2>
                  <p className="mx-auto mb-12 max-w-md font-mono text-sm leading-relaxed text-[var(--text-muted)]">
                    Use this channel for deployment conversations, forensic reviews, or the next system integration.
                    The form stays functional; the framing no longer sounds like the page gave up.
                  </p>
                </ScrollCard>
                <ScrollCard delay={0.2}>
                  <SecureContactForm />
                </ScrollCard>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
