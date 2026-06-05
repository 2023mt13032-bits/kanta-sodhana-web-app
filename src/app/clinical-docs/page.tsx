"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Upload, Filter } from "lucide-react";

// ── Package metadata ───────────────────────────────────────

const PKG_META: Record<string, { name: string; color: string; bg: string; docTypes: string[] }> = {
  MG064A: { name: "Severe Anemia",        color: "text-red-400",    bg: "border-red-500/30 bg-red-500/10",
    docTypes: ["clinical_notes","cbc_hb_report","indoor_case","treatment_details","post_hb_report","discharge_summary","extra_document"] },
  SG039C: { name: "Cholecystectomy",      color: "text-amber-400",  bg: "border-amber-500/30 bg-amber-500/10",
    docTypes: ["clinical_notes","usg_report","lft_report","pre_anesthesia","operative_notes","discharge_summary","photo_evidence","histopathology","extra_document"] },
  MG006A: { name: "Enteric Fever",        color: "text-blue-400",   bg: "border-blue-500/30 bg-blue-500/10",
    docTypes: ["clinical_notes","investigation_pre","vitals_treatment","investigation_post","discharge_summary","extra_document"] },
  SB039A: { name: "Knee Replacement",     color: "text-purple-400", bg: "border-purple-500/30 bg-purple-500/10",
    docTypes: ["clinical_notes","xray_ct_knee","indoor_case","operative_notes","implant_invoice","post_op_photo","post_op_xray","discharge_summary","extra_document"] },
};

const CLINICAL_FLAGS: Record<string, string[]> = {
  MG064A: ["severe_anemia","common_signs","significant_signs","life_threatening_signs"],
  SG039C: ["clinical_condition","usg_calculi","pain_present","previous_surgery"],
  MG006A: ["fever","symptoms","poor_quality"],
  SB039A: ["arthritis_type","post_op_implant_present","age_valid"],
};

type DocRow = Record<string, string | number | null | boolean>;

function getDocType(row: DocRow, pkg: string): string {
  const types = PKG_META[pkg]?.docTypes ?? [];
  return types.find(t => row[t] === 1 || row[t] === "1") ?? "extra_document";
}

function KPI({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className={`font-mono text-2xl font-bold ${color ?? "text-[var(--accent)]"}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

export default function ClinicalDocsPage() {
  const [data, setData] = useState<{ pkg: string; rows: DocRow[] }[]>([]);
  const [activePkg, setActivePkg] = useState<string>("MG064A");
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Load built-in JSON files
  const loadBuiltIn = useCallback(async () => {
    const pkgs = ["MG064A", "SG039C", "MG006A", "SB039A"];
    const loaded = await Promise.all(pkgs.map(async (pkg) => {
      const res = await fetch(`/data/${pkg}.json`);
      const rows = await res.json();
      return { pkg, rows };
    }));
    setData(loaded);
    setActivePkg("MG064A");
  }, []);

  // Load custom JSON upload
  const handleUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = JSON.parse(e.target?.result as string);
        const pkg = (rows[0]?.procedure_code as string) ?? "CUSTOM";
        setData(prev => {
          const filtered = prev.filter(d => d.pkg !== pkg);
          return [...filtered, { pkg, rows }];
        });
        setActivePkg(pkg);
      } catch {}
    };
    reader.readAsText(file);
  }, []);

  const current = data.find(d => d.pkg === activePkg);
  const rows = current?.rows ?? [];
  const meta = PKG_META[activePkg];
  const docTypes = meta?.docTypes ?? [];
  const flags = CLINICAL_FLAGS[activePkg] ?? [];

  // Filter
  const filtered = rows.filter(r => {
    const typeMatch = filterType === "all" || getDocType(r, activePkg) === filterType;
    const searchMatch = !search || Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    return typeMatch && searchMatch;
  });

  // Stats
  const typeCounts = docTypes.reduce((acc, t) => {
    acc[t] = rows.filter(r => getDocType(r, activePkg) === t).length;
    return acc;
  }, {} as Record<string, number>);

  const flagCounts = flags.reduce((acc, f) => {
    acc[f] = rows.filter(r => r[f] === 1 || r[f] === "1").length;
    return acc;
  }, {} as Record<string, number>);

  const uniqueCases = new Set(rows.map(r => r.case_id)).size;
  const extraDocs = typeCounts["extra_document"] ?? 0;

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">NHA PS1 — AB PM-JAY HACKATHON</p>
            <h1 className="font-mono text-2xl font-bold md:text-4xl text-[var(--text)]">Clinical Document Classifier</h1>
            <p className="mt-2 font-mono text-sm text-[var(--text-muted)] max-w-xl">
              Multi-package claim document classification with STG compliance checks across MG064A, SG039C, MG006A, SB039A.
            </p>
          </div>
          <div className="flex gap-2">
            {data.length === 0 && (
              <button onClick={loadBuiltIn}
                className="rounded-full border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all">
                Load Demo Data
              </button>
            )}
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
              <Upload size={12} /> Upload JSON
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)]">
            <div className="text-center">
              <p className="font-mono text-sm text-[var(--text-muted)]">Click &ldquo;Load Demo Data&rdquo; to view classification results</p>
              <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]/60">or upload a custom package JSON</p>
            </div>
          </div>
        ) : (
          <>
            {/* Package tabs */}
            <div className="mb-8 flex flex-wrap gap-2">
              {data.map(d => (
                <button key={d.pkg} onClick={() => { setActivePkg(d.pkg); setFilterType("all"); setSearch(""); }}
                  className={`rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${
                    activePkg === d.pkg
                      ? `${PKG_META[d.pkg]?.bg ?? "border-[var(--accent)]/30 bg-[var(--accent)]/10"} ${PKG_META[d.pkg]?.color ?? "text-[var(--accent)]"}`
                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40"
                  }`}>
                  {d.pkg} — {PKG_META[d.pkg]?.name ?? d.pkg}
                </button>
              ))}
            </div>

            {/* KPIs */}
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KPI label="Total Pages" value={rows.length.toLocaleString()} />
              <KPI label="Unique Cases" value={uniqueCases.toLocaleString()} />
              <KPI label="Extra/Invalid Docs" value={extraDocs} color="text-amber-400" />
              <KPI label="Avg Pages/Case" value={uniqueCases ? (rows.length / uniqueCases).toFixed(1) : "—"} />
            </div>

            {/* Clinical Flags */}
            {flags.length > 0 && (
              <div className="mb-8 grid grid-cols-2 gap-2 md:grid-cols-4">
                {flags.map(f => (
                  <div key={f} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="font-mono text-xl font-bold text-[var(--accent)]">{flagCounts[f] ?? 0}</div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{f.replace(/_/g, " ")}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Doc type breakdown */}
            <div className="mb-8 overflow-x-auto rounded-2xl border border-[var(--border)]">
              <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Document Type Distribution</p>
              </div>
              <div className="flex flex-wrap gap-3 p-5">
                {docTypes.map(t => {
                  const count = typeCounts[t] ?? 0;
                  const pct = rows.length ? Math.round(count / rows.length * 100) : 0;
                  return (
                    <button key={t} onClick={() => setFilterType(filterType === t ? "all" : t)}
                      className={`rounded-lg border px-3 py-2 text-left transition-all ${filterType === t ? "border-[var(--accent)]/40 bg-[var(--accent)]/10" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/20"}`}>
                      <div className="font-mono text-sm font-bold text-[var(--text)]">{count}</div>
                      <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{t.replace(/_/g, " ")}</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-[var(--border)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search + table */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3 gap-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] shrink-0">
                  {filtered.length} rows {filterType !== "all" ? `· ${filterType}` : ""}
                </p>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search case ID, filename..."
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-mono text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent)] w-64 placeholder:text-[var(--text-muted)]/40" />
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[var(--bg)]">
                    <tr className="border-b border-[var(--border)]">
                      {["Case ID","Document","Type","Rank","Page","Flags"].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 200).map((r, i) => {
                      const docType = getDocType(r, activePkg);
                      const activeFlags = flags.filter(f => r[f] === 1 || r[f] === "1");
                      const fname = (r["S3_link/DocumentName"] ?? r["link"] ?? r["S3_link"] ?? r["s3_link"] ?? "") as string;
                      return (
                        <tr key={i} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                          <td className="px-4 py-2 font-mono text-[9px] text-[var(--text-muted)]">{String(r.case_id ?? "").slice(-12)}</td>
                          <td className="px-4 py-2 font-mono text-[9px] text-[var(--text-muted)] max-w-[160px] truncate">{fname.split("__").pop()}</td>
                          <td className="px-4 py-2">
                            <span className="rounded border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-1.5 py-0.5 font-mono text-[8px] text-[var(--accent)]">
                              {docType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-center text-[var(--text-muted)]">{String(r.document_rank ?? "—")}</td>
                          <td className="px-4 py-2 font-mono text-xs text-center text-[var(--text-muted)]">{String(r.page_number ?? 1)}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {activeFlags.map(f => (
                                <span key={f} className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1 py-0.5 font-mono text-[7px] uppercase text-emerald-400">
                                  {f.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > 200 && (
                <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-2">
                  <p className="font-mono text-[9px] text-[var(--text-muted)]">Showing 200 of {filtered.length} rows</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
