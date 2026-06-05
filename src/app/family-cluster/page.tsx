"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Upload, AlertTriangle, X, Users } from "lucide-react";

// ── Diagnosis map ──────────────────────────────────────────

const DIAGNOSIS_MAP: Record<string, { name: string; category: string; risk: "legitimate" | "suspicious" | "warning" }> = {
  D001: { name: "Trauma - Road Accident", category: "trauma",      risk: "legitimate"  },
  D002: { name: "Food Poisoning",          category: "poisoning",   risk: "legitimate"  },
  D003: { name: "Gas Poisoning",           category: "poisoning",   risk: "legitimate"  },
  D004: { name: "Trauma - Fall",           category: "trauma",      risk: "legitimate"  },
  D005: { name: "House Fire Injury",       category: "trauma",      risk: "legitimate"  },
  D006: { name: "Drowning Recovery",       category: "trauma",      risk: "legitimate"  },
  D007: { name: "Heart Attack",            category: "cardio",      risk: "suspicious"  },
  D008: { name: "Cardiac Arrest",          category: "cardio",      risk: "suspicious"  },
  D009: { name: "Stroke",                  category: "neuro",       risk: "suspicious"  },
  D010: { name: "Diabetes Crisis",         category: "metabolic",   risk: "suspicious"  },
  D011: { name: "Pneumonia",               category: "respiratory", risk: "warning"     },
  D012: { name: "Flu/Influenza",           category: "respiratory", risk: "warning"     },
  D013: { name: "Gastroenteritis",         category: "digestive",   risk: "warning"     },
  D014: { name: "Fracture",               category: "trauma",      risk: "legitimate"  },
  D015: { name: "Burns",                   category: "trauma",      risk: "legitimate"  },
};

const RISK_COLORS: Record<string, string> = {
  legitimate: "#4ade80",
  suspicious: "#f87171",
  warning: "#fbbf24",
};

// ── Types ─────────────────────────────────────────────────

type RawRow = {
  Patient_ID: string;
  Family_ID: string;
  Diagnosis_Code: string;
  Admission_Time: string;
  Discharge_Time: string;
  [key: string]: string;
};

type Admission = RawRow & {
  admission: Date;
  discharge: Date;
  durationHours: number;
  diagName: string;
  diagCategory: string;
  diagRisk: "legitimate" | "suspicious" | "warning";
};

type FamilyResult = {
  familyId: string;
  members: string[];
  admissions: Admission[];
  uniqueDiagnoses: number;
  suspicious: boolean;
  warning: boolean;
  reason: string;
  legitimateClusters: [Admission, Admission][];
  suspiciousClusters: [Admission, Admission][];
};

// ── Analysis ───────────────────────────────────────────────

function analyze(rows: Admission[]): FamilyResult[] {
  const families: Record<string, { members: Set<string>; admissions: Admission[] }> = {};
  rows.forEach((r) => {
    if (!families[r.Family_ID]) families[r.Family_ID] = { members: new Set(), admissions: [] };
    families[r.Family_ID].members.add(r.Patient_ID);
    families[r.Family_ID].admissions.push(r);
  });

  return Object.entries(families).map(([familyId, fam]) => {
    const admissions = fam.admissions.sort((a, b) => a.admission.getTime() - b.admission.getTime());
    const uniqueDiagnoses = new Set(admissions.map((a) => a.Diagnosis_Code)).size;

    let suspicious = false, warning = false, reason = "";

    // Pattern 1: Multiple high-risk diagnoses in short window
    const highRisk = admissions.filter((a) => ["cardio", "neuro", "metabolic"].includes(a.diagCategory));
    if (highRisk.length > 1) {
      const timeDiff = (highRisk[highRisk.length - 1].admission.getTime() - highRisk[0].admission.getTime()) / 3_600_000;
      if (timeDiff <= 48) {
        suspicious = true;
        reason = `Multiple high-risk diagnoses (${[...new Set(highRisk.map((h) => h.Diagnosis_Code))].join(", ")}) within ${timeDiff.toFixed(1)}h`;
      }
    }

    // Pattern 2: Too many different diagnoses
    if (!suspicious && uniqueDiagnoses > 3 && admissions.length > 3) {
      suspicious = true;
      reason = `${uniqueDiagnoses} different diagnoses across ${admissions.length} admissions`;
    }

    // Pattern 3: Cluster analysis
    const legitimateClusters: [Admission, Admission][] = [];
    const suspiciousClusters: [Admission, Admission][] = [];
    for (let i = 0; i < admissions.length; i++) {
      for (let j = i + 1; j < admissions.length; j++) {
        const a = admissions[i], b = admissions[j];
        const timeDiff = (b.admission.getTime() - a.admission.getTime()) / 3_600_000;
        if (a.Diagnosis_Code === b.Diagnosis_Code && timeDiff <= 2) legitimateClusters.push([a, b]);
        else if (a.Diagnosis_Code !== b.Diagnosis_Code && timeDiff <= 4) suspiciousClusters.push([a, b]);
      }
    }
    if (!suspicious && suspiciousClusters.length > 0) {
      warning = true;
      reason = `${suspiciousClusters.length} mixed-diagnosis cluster(s) detected`;
    }

    return {
      familyId, members: Array.from(fam.members), admissions,
      uniqueDiagnoses, suspicious, warning, reason,
      legitimateClusters, suspiciousClusters,
    };
  });
}

// ── Sub-components ────────────────────────────────────────

function KPI({ label, value, accent, warn }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className={`font-mono text-2xl font-bold ${accent ? "text-red-400" : warn ? "text-amber-400" : "text-[var(--accent)]"}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".csv")) onFile(f); }}
      onClick={() => ref.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-16 text-center transition-all ${drag ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--surface)]"}`}
    >
      <input ref={ref} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Upload size={28} className="mx-auto mb-3 text-[var(--text-muted)]" />
      <p className="font-mono text-sm text-[var(--text)]">Drop CSV here or click to browse</p>
      <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
        Required: Patient_ID, Family_ID, Diagnosis_Code, Admission_Time, Discharge_Time
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────

export default function FamilyClusterPage() {
  const [results, setResults] = useState<FamilyResult[] | null>(null);
  const [rawRows, setRawRows] = useState<Admission[]>([]);
  const [filename, setFilename] = useState("");
  const [tab, setTab] = useState<"clusters" | "diagnoses" | "data">("clusters");

  const handleFile = useCallback((file: File) => {
    setFilename(file.name);
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows: Admission[] = data
          .filter((r) => r.Patient_ID && r.Family_ID && r.Admission_Time)
          .map((r) => {
            const admission = new Date(r.Admission_Time);
            const discharge = new Date(r.Discharge_Time);
            const info = DIAGNOSIS_MAP[r.Diagnosis_Code] ?? { name: "Unknown", category: "other", risk: "warning" as const };
            return {
              ...r, admission, discharge,
              durationHours: (discharge.getTime() - admission.getTime()) / 3_600_000,
              diagName: info.name, diagCategory: info.category, diagRisk: info.risk,
            };
          });
        setRawRows(rows);
        setResults(analyze(rows));
      },
    });
  }, []);

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch("/samples/family-sample.csv");
      const text = await res.text();
      Papa.parse<RawRow>(text, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          const rows: Admission[] = data
            .filter((r) => r.Patient_ID && r.Family_ID && r.Admission_Time)
            .map((r) => {
              const admission = new Date(r.Admission_Time);
              const discharge = new Date(r.Discharge_Time);
              const info = DIAGNOSIS_MAP[r.Diagnosis_Code] ?? { name: r.Diagnosis_Name || "Unknown", category: "other", risk: "warning" as const };
              return { ...r, admission, discharge, durationHours: (discharge.getTime() - admission.getTime()) / 3_600_000, diagName: info.name, diagCategory: info.category, diagRisk: info.risk };
            });
          setFilename("sample_family_data.csv");
          setRawRows(rows);
          setResults(analyze(rows));
        },
      });
    } catch { /* silent */ }
  }, []);

  if (!results) {
    return (
      <div className="min-h-screen px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">KS-FC-001 — FRAUD DETECTION</p>
          <h1 className="mb-3 font-mono text-2xl font-bold md:text-4xl text-[var(--text)]">Family Cluster Fraud</h1>
          <p className="mb-10 font-mono text-sm text-[var(--text-muted)]">Detect coordinated family admission fraud rings by analysing diagnosis patterns, timing clusters, and high-risk admission sequences.</p>
          {/* Sample banner */}
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400 mb-1">📦 sample_family_data.csv</p>
              <p className="font-mono text-xs text-[var(--text-muted)]">15 families · 3 suspicious (F003, F005, F009 — coordinated high-risk cardiac/stroke claims) · 12 legitimate</p>
            </div>
            <button onClick={loadSample}
              className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-500/20 transition-all">
              Load Sample →
            </button>
          </div>
          <UploadZone onFile={handleFile} />
        </div>
      </div>
    );
  }

  // Aggregates
  const suspicious = results.filter((f) => f.suspicious);
  const warned = results.filter((f) => !f.suspicious && f.warning);
  const clean = results.filter((f) => !f.suspicious && !f.warning);
  const totalLegitimate = results.reduce((s, f) => s + f.legitimateClusters.length, 0);
  const totalSuspicious = results.reduce((s, f) => s + f.suspiciousClusters.length, 0);

  // Diagnosis breakdown
  const diagMap: Record<string, number> = {};
  rawRows.forEach((r) => { diagMap[r.Diagnosis_Code] = (diagMap[r.Diagnosis_Code] ?? 0) + 1; });
  const diagData = Object.entries(diagMap)
    .map(([code, count]) => ({ code, name: DIAGNOSIS_MAP[code]?.name ?? code, count, risk: DIAGNOSIS_MAP[code]?.risk ?? "warning" }))
    .sort((a, b) => b.count - a.count);

  const pieData = [
    { name: "Suspicious", value: suspicious.length, color: "#f87171" },
    { name: "Warning",    value: warned.length,     color: "#fbbf24" },
    { name: "Clean",      value: clean.length,      color: "#4ade80" },
  ].filter((d) => d.value > 0);

  const TABS = ["clusters", "diagnoses", "data"] as const;

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">KS-FC-001</p>
            <h1 className="font-mono text-3xl font-bold text-[var(--text)]">Family Cluster Fraud</h1>
            <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{filename}</p>
          </div>
          <button onClick={() => { setResults(null); setFilename(""); setRawRows([]); }}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            <X size={11} /> New File
          </button>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          <KPI label="Total Families"      value={results.length} />
          <KPI label="Suspicious"          value={suspicious.length} accent />
          <KPI label="Warnings"            value={warned.length} warn />
          <KPI label="Legitimate Clusters" value={totalLegitimate} />
          <KPI label="Suspicious Clusters" value={totalSuspicious} accent={totalSuspicious > 0} />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all ${tab === t ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Clusters */}
        {tab === "clusters" && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Pie */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]/70">Family Status</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Suspicious families list */}
            <div className="md:col-span-2 space-y-3">
              {suspicious.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                  <p className="font-mono text-sm text-emerald-400">No suspicious families detected</p>
                </div>
              ) : (
                suspicious.map((f) => (
                  <div key={f.familyId} className="relative overflow-hidden rounded-xl border border-red-500/30 bg-red-500/5 p-5">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users size={12} className="text-red-400" />
                          <span className="font-mono text-sm font-bold text-[var(--text)]">Family {f.familyId}</span>
                          <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-red-400">SUSPICIOUS</span>
                        </div>
                        <p className="font-mono text-[10px] text-red-400/80 mb-2">{f.reason}</p>
                        <div className="flex flex-wrap gap-1">
                          {f.admissions.map((a, i) => (
                            <span key={i} className="rounded border px-1.5 py-0.5 font-mono text-[8px]"
                              style={{ borderColor: `${RISK_COLORS[a.diagRisk]}30`, color: RISK_COLORS[a.diagRisk], background: `${RISK_COLORS[a.diagRisk]}10` }}>
                              {a.diagName}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs text-[var(--text-muted)]">{f.members.length} member(s)</p>
                        <p className="font-mono text-xs text-[var(--text-muted)]">{f.admissions.length} admission(s)</p>
                        <p className="font-mono text-xs text-amber-400">{f.suspiciousClusters.length} suspicious cluster(s)</p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {warned.map((f) => (
                <div key={f.familyId} className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="font-mono text-xs font-bold text-[var(--text)]">Family {f.familyId}</span>
                      <span className="rounded border border-amber-500/30 px-2 py-0.5 font-mono text-[8px] text-amber-400">WARNING</span>
                    </div>
                    <p className="font-mono text-[10px] text-amber-400/80">{f.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Diagnoses */}
        {tab === "diagnoses" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]/70">Diagnosis Frequency</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={diagData} margin={{ left: -10 }}>
                  <XAxis dataKey="code" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                  <YAxis tick={{ fontSize: 9, fontFamily: "monospace" }} />
                  <Tooltip
                    formatter={(v, _, p) => [v, p.payload.name]}
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 11 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {diagData.map((d) => <Cell key={d.code} fill={RISK_COLORS[d.risk]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex gap-4">
                {(["suspicious","warning","legitimate"] as const).map((r) => (
                  <div key={r} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: RISK_COLORS[r] }} />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Diagnosis Breakdown</p>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-[var(--border)]">
                  {["Code","Name","Category","Count","Risk"].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {diagData.map((d, i) => (
                    <tr key={d.code} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--accent)]">{d.code}</td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text)]">{d.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text-muted)]">{DIAGNOSIS_MAP[d.code]?.category ?? "other"}</td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text)]">{d.count}</td>
                      <td className="px-4 py-2">
                        <span className="rounded border px-2 py-0.5 font-mono text-[8px] font-bold uppercase"
                          style={{ color: RISK_COLORS[d.risk], borderColor: `${RISK_COLORS[d.risk]}30`, background: `${RISK_COLORS[d.risk]}10` }}>
                          {d.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Data */}
        {tab === "data" && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3 flex justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Raw Data Preview</p>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">First 50 rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[var(--border)]">
                  {["Patient","Family","Diagnosis","Name","Admitted","Duration","Risk"].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rawRows.slice(0, 50).map((r, i) => (
                    <tr key={i} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text)]">{r.Patient_ID}</td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text-muted)]">{r.Family_ID}</td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--accent)]">{r.Diagnosis_Code}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-[var(--text-muted)]">{r.diagName}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-[var(--text-muted)]">{r.admission.toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-mono text-xs text-amber-400">{r.durationHours.toFixed(1)}h</td>
                      <td className="px-4 py-2">
                        <span className="rounded border px-2 py-0.5 font-mono text-[8px] uppercase"
                          style={{ color: RISK_COLORS[r.diagRisk], borderColor: `${RISK_COLORS[r.diagRisk]}30`, background: `${RISK_COLORS[r.diagRisk]}10` }}>
                          {r.diagRisk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
