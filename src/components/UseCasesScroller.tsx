"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Lock, Play } from "lucide-react";
import ScrollCard from "@/components/ScrollCard";
import ChamberIntro from "@/components/ChamberIntro";
import CountUp from "@/components/CountUp";
import { HOMEPAGE_CHAMBERS } from "@/lib/homepage";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────

type CaseStudy = {
  id: string;
  caseId: string;
  sector: string;
  status: "DEPLOYED" | "RESOLVED" | "PILOT" | "INVESTIGATING";
  title: string;
  tagline: string;
  problem: string;
  solution: string;
  impact: { label: string; value: string }[];
  tech: string[];
  link?: string;
  video?: string; // URL to demo video — shows ▶ WATCH DEMO badge
};

// ─── Data ─────────────────────────────────────────────────

const USE_CASES: CaseStudy[] = [
  {
    id: "uc-rs", caseId: "KS-RS-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Insurance Claim Risk Scoring",
    tagline: "Live XGBoost + SHAP fraud detection dashboard with real-time prediction and explainability.",
    problem: "Healthcare insurance claims face constant fraud from inflated bills, phantom procedures, and collusion between providers and patients. Manual review cannot scale to millions of claims.",
    solution: "XGBoost ensemble model with Platt scaling calibrated to 99.7% AUC. Real-time risk scoring via FastAPI with SHAP explainability for every prediction. Hospital ranking by fraud exposure.",
    impact: [{ label: "AUC Score", value: "99.7%" }, { label: "Latency", value: "<100ms" }, { label: "Claims Scored", value: "10M+" }, { label: "Fraud Caught", value: "$42M" }],
    tech: ["XGBoost", "FastAPI", "SHAP", "Recharts", "Platt Scaling"],
    link: "/risk-scoring",
  },
  {
    id: "uc-docforgery", caseId: "KS-DF-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Document Forgery Detection",
    tagline: "4-engine forensic pipeline detecting copy-paste, erasure, added content, and document splicing in PM-JAY claim documents.",
    problem: "PM-JAY claim fraud includes forged discharge summaries, tampered bills, and spliced documents from multiple patients. Manual review misses sophisticated digital forgeries.",
    solution: "C1 (DCT+ORB copy-paste), C3 (stamp/signature detection), C4 (5-signal erasure forensics), C5 (ELA-based content merging). Each engine runs independently and votes on final category.",
    impact: [{ label: "Detection Types", value: "4" }, { label: "Engines", value: "C1–C5" }, { label: "False Positive", value: "<8%" }, { label: "Processing", value: "<3s" }],
    tech: ["OpenCV", "scikit-image", "DCT", "ORB", "ELA", "FastAPI"],
    link: "/doc-forgery",
  },
  {
    id: "uc-clinical", caseId: "KS-PS1-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Clinical Document Classifier",
    tagline: "NHA PS1 — Multi-package claim document classification with STG compliance across MG064A, SG039C, MG006A, SB039A.",
    problem: "AB PM-JAY claim adjudication requires classifying hundreds of document types per claim package — discharge summaries, lab reports, operative notes, implant invoices — and checking STG compliance flags.",
    solution: "Filename pattern classifier + Gemma 3 12B LLM pipeline. Assigns document type, clinical rank, and compliance flags per page. Outputs ranked JSON per package code.",
    impact: [{ label: "Packages", value: "4" }, { label: "Doc Types", value: "32" }, { label: "Pages", value: "1,200+" }, { label: "Accuracy", value: "94%" }],
    tech: ["Gemma 3 12B", "PyMuPDF", "NHA Client", "Python", "JSON"],
    link: "/clinical-docs",
  },
  {
    id: "uc-dupcheck", caseId: "KS-DT-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Duplication & Tampering Detection",
    tagline: "Detects exact duplicate images (SHA-256), visual similarity (pHash), and tampered regions (SSIM + contour analysis) in claim documents.",
    problem: "Fraudsters reuse the same medical images across multiple claims or digitally tamper with discharge summaries and lab reports to change patient details, dates, or values.",
    solution: "Three-layer detection: exact hash match (SHA-256), perceptual similarity (pHash distance), and pixel-level tampering analysis using SSIM difference + contour region mapping.",
    impact: [{ label: "Hash Match", value: "SHA-256" }, { label: "Similarity", value: "pHash" }, { label: "Tamper", value: "SSIM" }, { label: "Speed", value: "<2s" }],
    tech: ["OpenCV", "imagehash", "scikit-image", "FastAPI", "SSIM"],
    link: "/dup-tamper",
  },
  {
    id: "uc-qrverify", caseId: "KS-QR-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Death Certificate QR Verification",
    tagline: "Decodes QR on death certificates, scrapes the official government portal, and cross-references against OCR-extracted document text.",
    problem: "Fraudulent PM-JAY claims include fake or tampered death certificates with forged QR codes that either don't exist in government registries or point to different beneficiaries.",
    solution: "pyzbar decodes QR → requests scrapes official registry portal → Tesseract OCR extracts document text → fuzzy field matching flags discrepancies between physical doc and portal data.",
    impact: [{ label: "QR Decode", value: "pyzbar" }, { label: "OCR", value: "Tesseract" }, { label: "Scrape", value: "BS4" }, { label: "Fields", value: "Auto" }],
    tech: ["pyzbar", "Tesseract", "BeautifulSoup", "FastAPI", "OpenCV"],
    link: "/qr-verify",
  },
  {
    id: "uc-sameday", caseId: "KS-SD-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Same-Day Admission Fraud",
    tagline: "Detect same-day admit/discharge fraud patterns, hospital fraud rates, and repeat offenders from claims data.",
    problem: "Fraudulent PM-JAY claims include same-day admissions where patients are admitted and discharged the same day to inflate claim counts without genuine medical need.",
    solution: "CSV upload pipeline computing Is_Same_Day flag, hospital fraud rates, temporal admission patterns, and repeat offender detection with per-claim risk scoring.",
    impact: [{ label: "Patterns", value: "4" }, { label: "Risk Signals", value: "5" }, { label: "Analysis", value: "Live" }, { label: "Export", value: "CSV" }],
    tech: ["Next.js", "PapaParse", "Recharts", "TypeScript"],
    link: "/same-day",
  },
  {
    id: "uc-family", caseId: "KS-FC-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Family Cluster Fraud",
    tagline: "Identify coordinated family fraud rings by analysing diagnosis patterns, timing clusters, and high-risk admission sequences.",
    problem: "Fraud rings exploit family benefit cards by submitting coordinated high-value claims (heart attacks, strokes) across family members within short time windows.",
    solution: "3-pattern detection: multiple high-risk diagnoses in 48h window, excess unique diagnoses, and mixed-diagnosis cluster analysis. Flags suspicious vs warning families.",
    impact: [{ label: "Patterns", value: "3" }, { label: "Diagnoses", value: "15" }, { label: "Detection", value: "Real-time" }, { label: "Clusters", value: "Scored" }],
    tech: ["Next.js", "PapaParse", "Recharts", "TypeScript"],
    link: "/family-cluster",
  },
  {
    id: "uc-medoo", caseId: "KS-MD-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Medical Consultation AI",
    tagline: "AI-powered medical consultation platform with intelligent symptom analysis and clinical guidance.",
    problem: "Patients lack immediate access to reliable medical guidance between appointments. Clinicians need faster triage tools to prioritise critical cases.",
    solution: "Conversational AI platform built on Next.js with Supabase backend. Real-time symptom analysis, consultation history, and intelligent clinical decision support.",
    impact: [{ label: "Consultations", value: "25K+" }, { label: "Response Time", value: "<2s" }, { label: "Accuracy", value: "91.4%" }, { label: "User Rating", value: "4.8★" }],
    tech: ["Next.js", "Supabase", "OpenAI", "TypeScript", "Tailwind"],
    video: "", // upload demo video URL here
  },
  {
    id: "uc-medai", caseId: "KS-MA-001", sector: "Healthcare", status: "DEPLOYED",
    title: "Medical Claim AI Adjudication",
    tagline: "Two-model AI pipeline for PM-JAY claim review: MedGemma reads images, Gemma checks reports.",
    problem: "India's PM-JAY program processes millions of health claims manually. Doctors cannot verify every angiogram, X-ray, and written report for fraud and clinical accuracy.",
    solution: "MedGemma 4B extracts structured findings from medical images. Gemma 3 4B cross-checks written reports against image findings. Rules engine validates STG compliance and flags fraud patterns.",
    impact: [{ label: "Claims Processed", value: "50K+" }, { label: "Accuracy", value: "94.2%" }, { label: "Review Speed", value: "10×" }, { label: "Fraud Detected", value: "12%" }],
    tech: ["Flask", "MedGemma", "Gemma 3", "Ollama", "SQLite", "OpenCV"],
    video: "", // upload demo video URL here
  },
  {
    id: "uc-whatsapp-face", caseId: "KS-WF-001", sector: "Identity", status: "DEPLOYED",
    title: "WhatsApp Face Verification",
    tagline: "Real-time face liveness detection and identity verification via WhatsApp for PM-JAY beneficiary authentication.",
    problem: "Ghost beneficiaries and proxy claimants exploit PM-JAY by registering with stolen identity documents. Manual verification at hospitals is slow and easily bypassed.",
    solution: "WhatsApp-native liveness check using facial landmark detection and anti-spoofing. Compares live selfie against Aadhaar photo with match confidence score. Zero-app-install for patients.",
    impact: [{ label: "Liveness Accuracy", value: "99.1%" }, { label: "Spoof Attempts", value: "Blocked" }, { label: "Verification", value: "<5s" }, { label: "App Install", value: "Zero" }],
    tech: ["WhatsApp API", "MediaPipe", "Face Recognition", "FastAPI", "OpenCV"],
    video: "", // upload demo video URL here
  },
  {
    id: "uc-resume", caseId: "KS-RP-001", sector: "Healthcare", status: "PILOT",
    title: "Resume & Document Parser",
    tagline: "Intelligent extraction of structured data from resumes, medical records, and claim documents using multimodal AI.",
    problem: "Healthcare organisations spend thousands of hours manually digitising paper records, resumes, and claim forms. OCR alone fails on handwritten documents and multi-column layouts.",
    solution: "Vision-language model pipeline extracts structured fields from any document layout. Handles handwriting, stamps, tables, and mixed formats. Outputs clean JSON ready for downstream systems.",
    impact: [{ label: "Accuracy", value: "96.8%" }, { label: "Speed", value: "3s/doc" }, { label: "Formats", value: "15+" }, { label: "Manual Work", value: "−90%" }],
    tech: ["Gemma 3", "PaddleOCR", "FastAPI", "PyMuPDF", "Tesseract"],
    video: "", // upload demo video URL here
  },
];

// Card width: 300px on small screens, 360px on desktop
const ITEM_WIDTH = typeof window !== "undefined" && window.innerWidth < 640 ? 280 : 360;
const ITEM_GAP = typeof window !== "undefined" && window.innerWidth < 640 ? 16 : 32;
const STEP = ITEM_WIDTH + ITEM_GAP;

const STATUS_COLORS: Record<string, string> = {
  DEPLOYED: "border-emerald-500/30 text-emerald-400",
  RESOLVED: "border-blue-500/30 text-blue-400",
  PILOT: "border-amber-500/30 text-amber-400",
  INVESTIGATING: "border-[var(--accent)]/30 text-[var(--accent)]",
};

// ─── Evidence Card ────────────────────────────────────────

function EvidenceCard({
  study,
  isActive,
  onOpen,
  isAuthed,
  authLoading,
}: {
  study: CaseStudy;
  isActive: boolean;
  onOpen?: () => void;
  isAuthed: boolean;
  authLoading: boolean;
}) {
  return (
    <motion.div
      animate={{
        scale: isActive ? 1 : 0.9,
        opacity: isActive ? 1 : 0.4,
        y: isActive ? -8 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      style={{ width: ITEM_WIDTH, flexShrink: 0 }}
      className="group relative select-none"
    >
      {/* Photo frame body */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all duration-300">
        {/* Active rim glow */}
        {isActive && (
          <>
            <div className="absolute inset-0 rounded-xl border border-[var(--accent)]/30 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />
            <div className="absolute -bottom-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[var(--accent)]/5 blur-3xl" />
          </>
        )}

        {/* Backlit table effect (subtle warm glow on active) */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/[0.02] to-transparent pointer-events-none" />
        )}

        {/* Evidence tag — top-right badge */}
        <div className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded border px-2 py-1 backdrop-blur-sm ${
          study.video !== undefined
            ? "border-purple-500/30 bg-purple-500/10"
            : study.link
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-[var(--accent)]/20 bg-[var(--accent)]/5"
        }`}>
          {study.video !== undefined && <Play size={7} className="text-purple-400" />}
          <span className={`font-mono text-[8px] font-bold uppercase tracking-[0.25em] leading-none ${
            study.video !== undefined ? "text-purple-400" : study.link ? "text-emerald-400" : "text-[var(--accent)]"
          }`}>
            {study.video !== undefined ? "VIDEO DEMO" : study.link ? "LIVE APP" : study.caseId}
          </span>
        </div>

        {/* Top row: sector + status */}
        <div className="mb-5 flex items-center gap-2">
          <span className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {study.sector}
          </span>
          <span className={`rounded border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] ${STATUS_COLORS[study.status]}`}>
            {study.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 font-mono text-lg font-bold leading-snug text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
          {study.title}
        </h3>

        {/* Tagline */}
        <p className="mb-6 font-mono text-xs leading-relaxed text-[var(--text-muted)]">
          {study.tagline}
        </p>

        {/* Photo grid placeholder (evidence aesthetic) */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {study.impact.slice(0, 3).map((m) => (
            <div
              key={m.label}
              className={`rounded border p-2 text-center transition-colors ${
                isActive ? "border-[var(--accent)]/20 bg-[var(--accent)]/[0.03]" : "border-[var(--border)] bg-[var(--bg)]"
              }`}
            >
              <div className="font-mono text-lg font-bold text-[var(--accent)]">
                <CountUp value={m.value} />
              </div>
              <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tech pills */}
        <div className="flex flex-wrap gap-1.5">
          {study.tech.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-[var(--text-muted)]"
            >
              {t}
            </span>
          ))}
          {study.tech.length > 4 && (
            <span className="font-mono text-[8px] text-[var(--text-muted)]">
              +{study.tech.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* OPEN stamp on active */}
      {isActive && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen?.();
          }}
          className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-1/2 cursor-pointer"
        >
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
            study.video !== undefined
              ? "border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20"
              : study.link
              ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
              : "border-[var(--accent)]/40 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20"
          }`}>
            {study.video !== undefined && !authLoading && isAuthed && <Play size={8} className="text-purple-400" />}
            <span className={`font-mono text-[8px] font-bold uppercase tracking-[0.3em] leading-none ${
              study.video !== undefined ? "text-purple-400" : study.link ? "text-emerald-400" : "text-[var(--accent)]"
            }`}>
              {authLoading ? "···" : !isAuthed ? "🔒 LOGIN TO ACCESS" : study.video !== undefined ? "WATCH DEMO" : study.link ? "OPEN APP →" : "OPEN"}
            </span>
          </div>
        </motion.button>
      )}

      {/* Thread connector dot */}
      <div
        className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
          isActive ? "bg-[var(--accent)] shadow-[0_0_8px_rgba(255,77,0,0.6)]" : "bg-[var(--border)]"
        }`}
        style={{ marginTop: 0 }}
      />
    </motion.div>
  );
}

// ─── Detail Modal (unchanged) ─────────────────────────────

function DetailModal({
  study,
  onClose,
}: {
  study: CaseStudy;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-8 md:p-10"
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
        >
          [ CLOSE ]
        </button>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-wider text-[var(--accent)]">
              {study.caseId}
            </span>
            <span className="h-3 w-px bg-[var(--border)]" />
            <span className={`rounded border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.25em] ${STATUS_COLORS[study.status]}`}>
              {study.status}
            </span>
          </div>
          <h2 className="font-mono text-2xl font-bold text-[var(--text)] md:text-3xl">
            {study.title}
          </h2>
          <p className="mt-2 font-mono text-sm leading-relaxed text-[var(--text-muted)]">
            {study.tagline}
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Problem
            </p>
            <p className="font-mono text-sm leading-relaxed text-[var(--text)]">
              {study.problem}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Solution
            </p>
            <p className="font-mono text-sm leading-relaxed text-[var(--text)]">
              {study.solution}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]/70">
            Impact Metrics
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {study.impact.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="font-mono text-xl font-bold text-[var(--accent)]">
                  <CountUp value={m.value} />
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]/70">
            Technology Stack
          </p>
          <div className="flex flex-wrap gap-2">
            {study.tech.map((t) => (
              <span
                key={t}
                className="rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
          <p className="mb-3 font-mono text-sm text-[var(--text-muted)]">
            Want similar results in {study.sector.toLowerCase()}?
          </p>
          <a
            href="/contact"
            className="inline-block rounded-full border border-[var(--accent)] px-6 py-2 font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] transition-all duration-200 hover:bg-[var(--accent)] hover:text-white"
          >
            Initiate Contact →
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────

// ─── Video Demo Modal ─────────────────────────────────────

function VideoModal({ study, onClose }: { study: CaseStudy; onClose: () => void }) {
  const hasVideo = study.video && study.video.trim() !== "";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden"
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[9px] tracking-wider text-purple-400">{study.caseId}</span>
              <span className="inline-flex items-center gap-1 rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-purple-400">
                <Play size={7} /> VIDEO DEMO
              </span>
            </div>
            <h2 className="font-mono text-xl font-bold text-[var(--text)]">{study.title}</h2>
            <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{study.tagline}</p>
          </div>
          <button onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] shrink-0 ml-4">
            [ CLOSE ]
          </button>
        </div>

        {/* Video area */}
        <div className="mx-6 mb-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {hasVideo ? (
            <video
              src={study.video}
              controls
              autoPlay
              className="w-full max-h-[420px] object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              {/* Animated play button placeholder */}
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-purple-500/30 bg-purple-500/10"
              >
                <Play size={28} className="text-purple-400 ml-1" />
              </motion.div>
              <p className="font-mono text-sm font-bold text-[var(--text)]">Demo Video Coming Soon</p>
              <p className="mt-2 font-mono text-xs text-[var(--text-muted)] max-w-sm">
                A full walkthrough of this use case will be uploaded shortly. Check back later or contact us for a live demo.
              </p>
              <div className="mt-5 flex gap-3">
                {study.tech.map((t) => (
                  <span key={t} className="rounded border border-purple-500/20 bg-purple-500/5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-purple-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Impact metrics */}
        <div className="grid grid-cols-4 gap-2 px-6 pb-6">
          {study.impact.map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
              <div className="font-mono text-lg font-bold text-purple-400">{m.value}</div>
              <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--text-muted)]">{m.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AuthGateModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-8 text-center"
      >
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10">
          <Lock size={20} className="text-[var(--accent)]" />
        </div>
        <h3 className="mb-2 font-mono text-xl font-bold text-[var(--text)]">
          RESTRICTED ACCESS
        </h3>
        <p className="mb-6 font-mono text-xs leading-relaxed text-[var(--text-muted)]">
          This application is available to approved personnel only. Login or request access to continue.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="flex-1 rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white text-center"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="flex-1 rounded-full border border-[var(--border)] py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] text-center"
          >
            Request Access
          </Link>
        </div>
        <button
          onClick={onClose}
          className="mt-5 font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
        >
          [ DISMISS ]
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function UseCasesScroller() {
  const { user, loading: authLoading } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCase, setSelectedCase] = useState<CaseStudy | null>(null);
  const [videoCase, setVideoCase] = useState<CaseStudy | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const x = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 20 });
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, USE_CASES.length - 1));
      setActiveIndex(clamped);
      const containerWidth = containerRef.current?.offsetWidth ?? 0;
      const offset = containerWidth / 2 - ITEM_WIDTH / 2 - clamped * STEP;
      x.set(offset);
    },
    [x]
  );

  useEffect(() => {
    goTo(0);
  }, [goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(activeIndex - 1);
      if (e.key === "ArrowRight") goTo(activeIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, goTo]);

  return (
    <section id="use-cases" className="relative overflow-hidden border-t border-[var(--border)] py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <ScrollCard className="mb-16">
          <ChamberIntro {...HOMEPAGE_CHAMBERS.useCases} />
        </ScrollCard>

        {/* Light Table Track */}
        <div className="relative">
          {/* Connecting thread line */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2">
            <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />
            {/* Dashed overlay */}
            <div className="mx-auto h-px max-w-6xl bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNSIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSw3NywwLDAuMTUpIi8+PC9zdmc+')]" />
          </div>

          <div ref={containerRef} className="relative z-10 overflow-hidden py-8">
            <motion.div
              style={{ x: springX }}
              className="flex"
              drag="x"
              dragConstraints={{
                left: -(USE_CASES.length - 1) * STEP,
                right: (containerRef.current?.offsetWidth ?? 0) / 2 - ITEM_WIDTH / 2,
              }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) goTo(activeIndex + 1);
                else if (info.offset.x > 80) goTo(activeIndex - 1);
                else goTo(activeIndex);
              }}
            >
              {USE_CASES.map((study, i) => (
                <div
                  key={study.id}
                  style={{ marginRight: i < USE_CASES.length - 1 ? ITEM_GAP : 0 }}
                  onClick={() => goTo(i)}
                  className="cursor-pointer"
                >
                  <EvidenceCard
                    study={study}
                    isActive={i === activeIndex}
                    isAuthed={!!user}
                    authLoading={authLoading}
                    onOpen={() => {
                      if (!user) {
                        setShowAuthGate(true);
                        return;
                      }
                      if (study.video !== undefined) {
                        setVideoCase(study);
                      } else if (study.link) {
                        window.open(study.link, "_blank", "noopener,noreferrer");
                      } else {
                        setSelectedCase(study);
                      }
                    }}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Bottom dots */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-20"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-2">
            {USE_CASES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? 24 : 6,
                  background: i === activeIndex ? "var(--accent)" : "var(--border)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === USE_CASES.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-20"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)]">
          {activeIndex + 1} / {USE_CASES.length} — drag or use arrow keys
        </p>
      </div>

      {/* Detail Modal */}
      {selectedCase && (
        <DetailModal
          study={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}

      {/* Video Demo Modal */}
      <AnimatePresence>
        {videoCase && (
          <VideoModal
            study={videoCase}
            onClose={() => setVideoCase(null)}
          />
        )}
      </AnimatePresence>

      {/* Auth Gate Modal */}
      <AnimatePresence>
        {showAuthGate && (
          <AuthGateModal onClose={() => setShowAuthGate(false)} />
        )}
      </AnimatePresence>
    </section>
  );
}
