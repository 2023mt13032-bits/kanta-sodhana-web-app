"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, AlertTriangle, CheckCircle, Copy } from "lucide-react";

type Result = {
  verdict: string;
  is_exact_duplicate: boolean;
  phash_distance: number;
  similar: boolean;
  ssim_score: number | null;
  tampered_regions: string[];
  tampered_boxes: number;
  highlighted_image: string | null;
  mask_image: string | null;
  hash1: string;
  hash2: string;
};

const SAMPLE_RESULT: Result = {
  verdict: "TAMPERED",
  is_exact_duplicate: false,
  phash_distance: 11,
  similar: true,
  ssim_score: 0.71,
  tampered_regions: ["Top-Right", "Bottom-Left"],
  tampered_boxes: 4,
  highlighted_image: null,
  mask_image: null,
  hash1: "a3f9c2e1d4b7082f...",
  hash2: "a3f9c2e1d4b7082f...",
};

const VERDICT_META: Record<string, { label: string; color: string; bg: string; icon: "ok" | "warn" | "error" }> = {
  EXACT_DUPLICATE:   { label: "Exact Duplicate",      color: "text-red-400",    bg: "border-red-500/30 bg-red-500/10",       icon: "error" },
  TAMPERED:          { label: "Tampering Detected",    color: "text-red-400",    bg: "border-red-500/30 bg-red-500/10",       icon: "error" },
  SIMILAR_CLEAN:     { label: "Similar — No Tampering",color: "text-emerald-400",bg: "border-emerald-500/30 bg-emerald-500/10",icon: "ok"   },
  NOT_RELATED:       { label: "Not Related",           color: "text-amber-400",  bg: "border-amber-500/30 bg-amber-500/10",   icon: "warn"  },
};

function ImgDropzone({ label, preview, onFile, onClear }: {
  label: string; preview: string | null;
  onFile: (f: File) => void; onClear: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)]">{label}</p>
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        onClick={() => !preview && ref.current?.click()}
        className={`relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all ${drag ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--surface)]"}`}
        style={{ minHeight: 180 }}
      >
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={label} className="w-full object-contain max-h-56" />
            <button onClick={e => { e.stopPropagation(); onClear(); }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Upload size={20} className="mb-2 text-[var(--text-muted)]" />
            <p className="font-mono text-xs text-[var(--text-muted)]">Drop or click</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DupTamperPage() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [prev1, setPrev1] = useState<string | null>(null);
  const [prev2, setPrev2] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFile = (n: 1 | 2, f: File) => {
    const url = URL.createObjectURL(f);
    if (n === 1) { setFile1(f); setPrev1(url); }
    else { setFile2(f); setPrev2(url); }
    setResult(null);
  };

  const clear = (n: 1 | 2) => {
    if (n === 1) { setFile1(null); setPrev1(null); }
    else { setFile2(null); setPrev2(null); }
    setResult(null);
  };

  const analyze = async () => {
    if (!file1 || !file2) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      form.append("file1", file1);
      form.append("file2", file2);
      const res = await fetch("/api/dup-tamper", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const vm = result ? VERDICT_META[result.verdict] : null;

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-5xl">

        <div className="mb-10">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">KS-DT-001 — FRAUD DETECTION</p>
          <h1 className="font-mono text-2xl font-bold md:text-4xl text-[var(--text)]">Duplication & Tampering</h1>
          <p className="mt-2 font-mono text-sm text-[var(--text-muted)]">
            Upload two claim document images. Detects exact duplicates (SHA-256), visual similarity (pHash), and tampered regions (SSIM + contour analysis).
          </p>
        </div>

        {/* Sample zone */}
        <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-amber-500/10">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400">📦 Sample Document</p>
              <p className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">Click Load to auto-fill both image slots with the same sample doc and show a tampering demo</p>
            </div>
            <button onClick={() => {
              setPrev1("/samples/claim-sample.jpg");
              setPrev2("/samples/claim-sample.jpg");
              setFile1(new File([], "sample_original.jpg"));
              setFile2(new File([], "sample_compare.jpg"));
              setResult(SAMPLE_RESULT);
            }}
              className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-500/20 transition-all">
              Load Sample →
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/samples/claim-sample.jpg" alt="Sample" className="w-full max-h-48 object-contain bg-[var(--bg)] opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Upload panel */}
          <div className="space-y-4">
            <ImgDropzone label="Image 1 — Original" preview={prev1} onFile={f => addFile(1, f)} onClear={() => clear(1)} />
            <ImgDropzone label="Image 2 — Compare" preview={prev2} onFile={f => addFile(2, f)} onClear={() => clear(2)} />

            <button onClick={analyze} disabled={!file1 || !file2 || loading}
              className="w-full rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 py-3 font-mono text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white disabled:opacity-40">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> ANALYSING...</span> : "ANALYSE IMAGES →"}
            </button>

            {error && (
              <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="font-mono text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Results panel */}
          <div>
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)]">Results appear here</p>
                </motion.div>
              )}

              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)]">Running forensic analysis...</p>
                </motion.div>
              )}

              {result && vm && (
                <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* Verdict banner */}
                  <div className={`relative overflow-hidden rounded-2xl border p-5 ${vm.bg}`}>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current/40 to-transparent" />
                    <div className="flex items-center gap-3">
                      {vm.icon === "ok" ? <CheckCircle size={20} className="text-emerald-400" />
                        : <AlertTriangle size={20} className={vm.color} />}
                      <p className={`font-mono text-lg font-bold ${vm.color}`}>{vm.label}</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "pHash Distance", value: result.phash_distance, bad: result.phash_distance <= 25 && result.phash_distance > 0 },
                      { label: "SSIM Score", value: result.ssim_score !== null ? `${(result.ssim_score * 100).toFixed(1)}%` : "N/A", bad: result.ssim_score !== null && result.ssim_score < 0.85 },
                      { label: "Tampered Regions", value: result.tampered_regions.length || "None", bad: result.tampered_regions.length > 0 },
                      { label: "Tampered Boxes", value: result.tampered_boxes || 0, bad: result.tampered_boxes > 0 },
                    ].map(m => (
                      <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <div className={`font-mono text-xl font-bold ${m.bad ? "text-red-400" : "text-[var(--accent)]"}`}>{String(m.value)}</div>
                        <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tampered regions */}
                  {result.tampered_regions.length > 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                      <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-red-400">Tampered Areas</p>
                      <div className="flex flex-wrap gap-2">
                        {result.tampered_regions.map(r => (
                          <span key={r} className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 font-mono text-[9px] text-red-400">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hash values */}
                  <div className="space-y-1">
                    {[["SHA-256 (img 1)", result.hash1], ["SHA-256 (img 2)", result.hash2]].map(([l, v]) => (
                      <div key={l} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                        <span className="font-mono text-[9px] text-[var(--text-muted)]">{l}</span>
                        <code className="font-mono text-[9px] text-[var(--text)]">{v}</code>
                      </div>
                    ))}
                  </div>

                  {/* Highlighted image */}
                  {result.highlighted_image && (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2">
                        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Tampered Regions Highlighted</p>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`data:image/jpeg;base64,${result.highlighted_image}`} alt="highlighted" className="w-full object-contain max-h-48" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
