"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileImage, AlertTriangle, CheckCircle, X } from "lucide-react";

const API = "";

// ── Sample demo result (shown without backend) ─────────────
const SAMPLE_RESULT: Result = {
  filename: "sample_pm_jay_claim.jpg",
  categories: ["C1", "C4"],
  annotated_image: "",
  details: {
    C1: { label: "Copy-Paste", regions: 3 },
    C4: { label: "Erasure", regions: 2 },
  },
};

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  C1:  { label: "C1 — Copy-Paste",        color: "text-red-400",    bg: "border-red-500/30 bg-red-500/10",     desc: "Regions copied & pasted within the document" },
  C3:  { label: "C3 — Added Content",     color: "text-emerald-400",bg: "border-emerald-500/30 bg-emerald-500/10", desc: "Stamps, signatures, or text added post-creation" },
  C4:  { label: "C4 — Erasure",           color: "text-blue-400",   bg: "border-blue-500/30 bg-blue-500/10",   desc: "Content erased or whited-out" },
  C5:  { label: "C5 — Content Merging",   color: "text-purple-400", bg: "border-purple-500/30 bg-purple-500/10",desc: "Document spliced from multiple sources" },
  C10: { label: "C10 — Authentic",        color: "text-emerald-400",bg: "border-emerald-500/30 bg-emerald-500/10", desc: "No forgery detected" },
};

type Result = {
  categories: string[];
  details: Record<string, { label?: string; regions?: number; verdict?: string; score?: number }>;
  annotated_image: string;
  filename: string;
};

export default function DocForgeryPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file"); return; }
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/api/detect`, { method: "POST", body: form });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? "Detection failed"); }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(null); };

  const isForged = result && !result.categories.includes("C10");

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-12">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">
            NHA PS3 — AB PM-JAY HACKATHON
          </p>
          <h1 className="font-mono text-2xl font-bold md:text-4xl text-[var(--text)]">
            DOCUMENT FORGERY DETECTION
          </h1>
          <p className="mt-3 font-mono text-sm text-[var(--text-muted)] max-w-xl">
            Upload a claim document image. The pipeline detects copy-paste (C1), added content (C3), erasure (C4), and content merging (C5).
          </p>
        </div>

        {/* Category legend */}
        <div className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-4">
          {["C1","C3","C4","C5"].map((c) => (
            <div key={c} className={`rounded-lg border px-3 py-2 ${CATEGORY_META[c].bg}`}>
              <p className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${CATEGORY_META[c].color}`}>
                {c}
              </p>
              <p className="mt-0.5 font-mono text-[8px] text-[var(--text-muted)]">
                {CATEGORY_META[c].desc.split(" ").slice(0,4).join(" ")}...
              </p>
            </div>
          ))}
        </div>

        {/* Sample data zone */}
        <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-amber-500/10">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400">📦 Sample Document</p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">Drag this sample or click Load to run a pre-analysed demo</p>
            </div>
            <button
              onClick={() => {
                setPreview("/samples/claim-sample.jpg");
                setFile(new File([], "sample_pm_jay_claim.jpg"));
                setResult(SAMPLE_RESULT);
              }}
              className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              Load Sample →
            </button>
          </div>
          {/* Sample image preview */}
          <div
            draggable
            onDragStart={(e) => {
              // Allow dragging the sample into the upload zone
              e.dataTransfer.setData("text/plain", "sample");
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/samples/claim-sample.jpg"
              alt="Sample claim document"
              className="w-full max-h-48 object-contain bg-[var(--bg)] opacity-80 hover:opacity-100 transition-opacity"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Upload panel */}
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
                dragging
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--surface)]"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              {preview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="w-full rounded-2xl object-contain max-h-72" />
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
                    <Upload size={20} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="font-mono text-sm text-[var(--text)]">Drop image here</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">or click to browse — JPG, PNG, TIFF</p>
                </div>
              )}
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <FileImage size={16} className="text-[var(--accent)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-[var(--text)]">{file.name}</p>
                  <p className="font-mono text-[9px] text-[var(--text-muted)]">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={analyze}
              disabled={!file || loading}
              className="w-full rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 py-3 font-mono text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> ANALYSING...
                </span>
              ) : "ANALYSE DOCUMENT →"}
            </button>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="font-mono text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Results panel */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)]">
                    Results appear here
                  </p>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                >
                  <div className="flex gap-1">
                    {["C1","C3","C4","C5"].map((c, i) => (
                      <motion.span
                        key={c}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
                        className="font-mono text-xs font-bold text-[var(--accent)]"
                      >
                        {c}
                      </motion.span>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)]">
                    Running forensic analysis...
                  </p>
                </motion.div>
              )}

              {result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Verdict banner */}
                  <div className={`relative overflow-hidden rounded-2xl border p-5 ${
                    isForged
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-emerald-500/30 bg-emerald-500/10"
                  }`}>
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${isForged ? "via-red-500/60" : "via-emerald-500/60"} to-transparent`} />
                    <div className="flex items-center gap-3">
                      {isForged
                        ? <AlertTriangle size={20} className="text-red-400" />
                        : <CheckCircle size={20} className="text-emerald-400" />
                      }
                      <div>
                        <p className={`font-mono text-lg font-bold ${isForged ? "text-red-400" : "text-emerald-400"}`}>
                          {isForged ? "FORGERY DETECTED" : "DOCUMENT AUTHENTIC"}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--text-muted)]">
                          {result.filename}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category chips */}
                  <div className="flex flex-wrap gap-2">
                    {result.categories.map((c) => (
                      <div
                        key={c}
                        className={`rounded-lg border px-3 py-1.5 ${CATEGORY_META[c]?.bg ?? "border-[var(--border)] bg-[var(--surface)]"}`}
                      >
                        <p className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${CATEGORY_META[c]?.color ?? "text-[var(--text)]"}`}>
                          {CATEGORY_META[c]?.label ?? c}
                        </p>
                        {result.details[c] && (
                          <p className="mt-0.5 font-mono text-[8px] text-[var(--text-muted)]">
                            {result.details[c].regions ? `${result.details[c].regions} region(s)` : ""}
                            {result.details[c].score !== undefined ? `score: ${result.details[c].score}` : ""}
                            {c === "C10" ? "Clean document" : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Annotated image */}
                  <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                    <p className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      Annotated Output
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/jpeg;base64,${result.annotated_image}`}
                      alt="annotated"
                      className="w-full object-contain max-h-64"
                    />
                  </div>

                  <button
                    onClick={reset}
                    className="w-full rounded-full border border-[var(--border)] py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Analyse Another Document
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
