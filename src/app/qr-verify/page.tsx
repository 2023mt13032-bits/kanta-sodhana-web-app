"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";

type CrossRef = { field: string; value: string; found_in_ocr: boolean; status: string };

type Result = {
  verdict: string;
  qr_url: string | null;
  ocr_text: string | null;
  portal_fields: { field: string; value: string }[];
  cross_reference: CrossRef[];
  match_count: number;
  total_fields: number;
  all_matched: boolean;
};

const SAMPLE_RESULT: Result = {
  verdict: "DISCREPANCIES_FOUND",
  qr_url: "https://crsorgi.gov.in/web/index.php/auth/viewDeathCert?regnNo=CG-2024-0123456",
  ocr_text: "DEATH CERTIFICATE\nName: Ramesh Kumar Singh\nDate of Death: 14/03/2024\nPlace: District Hospital Raipur\nCause: Cardiac Arrest",
  portal_fields: [
    { field: "Name", value: "Ramesh Kumar Singh" },
    { field: "Date of Death", value: "14/03/2024" },
    { field: "Registration No", value: "CG-2024-0123456" },
    { field: "Place of Death", value: "City Hospital, Raipur" },
    { field: "Cause of Death", value: "Cardiac Arrest" },
  ],
  cross_reference: [
    { field: "Name", value: "Ramesh Kumar Singh", found_in_ocr: true, status: "matched" },
    { field: "Date of Death", value: "14/03/2024", found_in_ocr: true, status: "matched" },
    { field: "Registration No", value: "CG-2024-0123456", found_in_ocr: false, status: "not_matched" },
    { field: "Place of Death", value: "City Hospital, Raipur", found_in_ocr: false, status: "not_matched" },
    { field: "Cause of Death", value: "Cardiac Arrest", found_in_ocr: true, status: "matched" },
  ],
  match_count: 3,
  total_fields: 5,
  all_matched: false,
};

const VERDICT_META: Record<string, { label: string; color: string; bg: string }> = {
  VERIFIED:             { label: "Document Verified",       color: "text-emerald-400", bg: "border-emerald-500/30 bg-emerald-500/10" },
  DISCREPANCIES_FOUND:  { label: "Discrepancies Found",     color: "text-red-400",     bg: "border-red-500/30 bg-red-500/10" },
  NO_QR:                { label: "No QR Code Found",        color: "text-amber-400",   bg: "border-amber-500/30 bg-amber-500/10" },
  QR_FOUND_NO_DATA:     { label: "QR Found — Portal Empty", color: "text-amber-400",   bg: "border-amber-500/30 bg-amber-500/10" },
};

export default function QRVerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"match" | "ocr" | "portal">("match");
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null); setError(null);
  };

  const verify = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/qr-verify", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const vm = result ? VERDICT_META[result.verdict] : null;

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-5xl">

        <div className="mb-10">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">KS-QR-001 — KANTAKA ŚODHANA</p>
          <h1 className="font-mono text-2xl font-bold md:text-4xl text-[var(--text)]">Death Certificate QR Verification</h1>
          <p className="mt-2 font-mono text-sm text-[var(--text-muted)]">
            Upload a death certificate. Decodes QR code → scrapes official portal → cross-references against OCR-extracted text to detect forgeries.
          </p>
        </div>

        {/* Sample banner */}
        <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400 mb-1">📦 Sample Data Available</p>
            <p className="font-mono text-xs text-[var(--text-muted)]">No backend? Load a pre-verified sample certificate to see what the QR cross-reference output looks like.</p>
          </div>
          <button onClick={() => setResult(SAMPLE_RESULT)}
            className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-500/20 transition-all">
            Load Sample →
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-[360px_1fr]">

          {/* Upload */}
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => !preview && ref.current?.click()}
              className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all ${preview ? "border-[var(--border)]" : "border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--surface)]"}`}
            >
              <input ref={ref} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {preview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="certificate" className="w-full object-contain max-h-72" />
                  <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null); }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                    <X size={12} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Upload size={24} className="mb-3 text-[var(--text-muted)]" />
                  <p className="font-mono text-sm text-[var(--text)]">Drop certificate here</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">JPG, PNG — death certificate with QR</p>
                </div>
              )}
            </div>

            <button onClick={verify} disabled={!file || loading}
              className="w-full rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 py-3 font-mono text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white disabled:opacity-40">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">⟳</span> VERIFYING...</span> : "VERIFY DOCUMENT →"}
            </button>

            {error && (
              <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="font-mono text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Pipeline steps */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">Verification Pipeline</p>
              {[
                ["01", "QR Decode", "pyzbar / OpenCV"],
                ["02", "Portal Scrape", "requests + BeautifulSoup"],
                ["03", "OCR Extract", "Tesseract"],
                ["04", "Cross-Reference", "Fuzzy field matching"],
              ].map(([n, step, tech]) => (
                <div key={n} className="flex items-center gap-3">
                  <span className="font-mono text-[8px] text-[var(--accent)]">{n}</span>
                  <div>
                    <p className="font-mono text-[10px] text-[var(--text)]">{step}</p>
                    <p className="font-mono text-[8px] text-[var(--text-muted)]">{tech}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div>
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)]">Upload a certificate to verify</p>
                </motion.div>
              )}

              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  {["QR Decode", "Portal Scrape", "OCR Extract", "Cross-Reference"].map((step, i) => (
                    <motion.div key={step} className="flex items-center gap-3"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }}>
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">{step}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {result && vm && (
                <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* Verdict */}
                  <div className={`relative rounded-2xl border p-5 ${vm.bg}`}>
                    <div className="flex items-center gap-3">
                      {result.all_matched ? <CheckCircle size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className={vm.color} />}
                      <div>
                        <p className={`font-mono text-lg font-bold ${vm.color}`}>{vm.label}</p>
                        {result.total_fields > 0 && (
                          <p className="font-mono text-[10px] text-[var(--text-muted)]">
                            {result.match_count}/{result.total_fields} fields matched
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR URL */}
                  {result.qr_url && (
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">QR Destination</p>
                        <p className="font-mono text-[10px] text-[var(--accent)] truncate">{result.qr_url}</p>
                      </div>
                      <a href={result.qr_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={12} className="text-[var(--text-muted)] hover:text-[var(--accent)]" />
                      </a>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
                    {(["match","ocr","portal"] as const).filter(t =>
                      t !== "match" || result.cross_reference.length > 0
                    ).map(t => (
                      <button key={t} onClick={() => setTab(t)}
                        className={`rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] transition-all ${tab === t ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>
                        {t === "match" ? "Cross-Reference" : t === "ocr" ? "OCR Text" : "Portal Data"}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Cross-reference */}
                  {tab === "match" && result.cross_reference.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                            {["Field","Portal Value","Status"].map(h => (
                              <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.cross_reference.map((r, i) => (
                            <tr key={i} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                              <td className="px-4 py-2 font-mono text-[10px] text-[var(--text)]">{r.field}</td>
                              <td className="px-4 py-2 font-mono text-[10px] text-[var(--text-muted)]">{r.value}</td>
                              <td className="px-4 py-2">
                                <span className={`rounded border px-2 py-0.5 font-mono text-[8px] font-bold uppercase ${r.status === "matched" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab: OCR */}
                  {tab === "ocr" && (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-[var(--text-muted)] mb-3">OCR Extracted Text</p>
                      <pre className="font-mono text-[10px] text-[var(--text)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {result.ocr_text || "No text extracted"}
                      </pre>
                    </div>
                  )}

                  {/* Tab: Portal */}
                  {tab === "portal" && (
                    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                      {result.portal_fields.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="font-mono text-xs text-[var(--text-muted)]">No data extracted from portal</p>
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                              {["Field","Value"].map(h => (
                                <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.portal_fields.map((f, i) => (
                              <tr key={i} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                                <td className="px-4 py-2 font-mono text-[10px] text-[var(--text-muted)]">{f.field}</td>
                                <td className="px-4 py-2 font-mono text-[10px] text-[var(--text)]">{f.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
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
