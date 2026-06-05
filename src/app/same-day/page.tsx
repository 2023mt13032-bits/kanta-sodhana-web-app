"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Upload, AlertTriangle, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────

type Row = {
  Patient_ID: string;
  Hospital_ID: string;
  Admission_Time: string;
  Discharge_Time: string;
  [key: string]: string;
};

type ProcessedRow = Row & {
  admission: Date;
  discharge: Date;
  isSameDay: boolean;
  durationHours: number;
  durationDays: number;
};

type HospitalStat = {
  hospital: string;
  total: number;
  sameDay: number;
  fraudRate: number;
};

type PatientStat = {
  patient: string;
  sameDayCount: number;
  hospitals: string[];
};

// ── Helpers ───────────────────────────────────────────────

function parseData(rows: Row[]): ProcessedRow[] {
  return rows
    .filter((r) => r.Patient_ID && r.Admission_Time && r.Discharge_Time)
    .map((r) => {
      const admission = new Date(r.Admission_Time);
      const discharge = new Date(r.Discharge_Time);
      const isSameDay =
        admission.getFullYear() === discharge.getFullYear() &&
        admission.getMonth() === discharge.getMonth() &&
        admission.getDate() === discharge.getDate();
      const durationHours = (discharge.getTime() - admission.getTime()) / 3_600_000;
      return { ...r, admission, discharge, isSameDay, durationHours, durationDays: durationHours / 24 };
    });
}

function riskScore(row: ProcessedRow, hospitalFraudRate: number): number {
  let score = 0;
  if (row.isSameDay) score += 40;
  if (row.durationHours < 6) score += 20;
  if (row.durationHours < 2) score += 20;
  score += Math.round(hospitalFraudRate * 20);
  return Math.min(score, 100);
}

// ── KPI card ──────────────────────────────────────────────

function KPI({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className={`font-mono text-2xl font-bold ${accent ? "text-red-400" : "text-[var(--accent)]"}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{label}</div>
      {sub && <div className="mt-0.5 font-mono text-[9px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

// ── Upload zone ────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handle = (f: File) => { if (f.name.endsWith(".csv")) onFile(f); };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      onClick={() => ref.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-16 text-center transition-all ${drag ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--surface)]"}`}
    >
      <input ref={ref} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      <Upload size={28} className="mx-auto mb-3 text-[var(--text-muted)]" />
      <p className="font-mono text-sm text-[var(--text)]">Drop CSV here or click to browse</p>
      <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
        Required columns: Patient_ID, Hospital_ID, Admission_Time, Discharge_Time
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────

export default function SameDayPage() {
  const [data, setData] = useState<ProcessedRow[] | null>(null);
  const [filename, setFilename] = useState("");
  const [tab, setTab] = useState<"overview" | "temporal" | "patients" | "cases">("overview");

  const handleFile = useCallback((file: File) => {
    setFilename(file.name);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => setData(parseData(result.data)),
    });
  }, []);

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch("/samples/family-sample.csv");
      const text = await res.text();
      Papa.parse<Record<string,string>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          // Map Family_ID → Hospital_ID for same-day analysis
          const rows: Row[] = data
            .filter((r) => r.Patient_ID && r.Admission_Time && r.Discharge_Time)
            .map((r) => ({
              Patient_ID: r.Patient_ID,
              Hospital_ID: r.Family_ID || "H001",
              Admission_Time: r.Admission_Time,
              Discharge_Time: r.Discharge_Time,
            }));
          setFilename("sample_family_data.csv");
          setData(parseData(rows));
        },
      });
    } catch { /* silent */ }
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">KS-SD-001 — FRAUD DETECTION</p>
          <h1 className="mb-3 font-mono text-2xl font-bold md:text-4xl text-[var(--text)]">Same-Day Admission Fraud</h1>
          <p className="mb-10 font-mono text-sm text-[var(--text-muted)]">Upload admission/discharge data to detect same-day fraud patterns, repeat offenders, and high-risk hospitals.</p>
          {/* Sample banner */}
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-amber-400 mb-1">📦 sample_family_data.csv</p>
              <p className="font-mono text-xs text-[var(--text-muted)]">62 admission records · multiple same-day patterns · repeat offenders across families</p>
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

  // ── Compute ─────────────────────────────────────────────

  const sameDayRows = data.filter((r) => r.isSameDay);
  const uniquePatients = new Set(data.map((r) => r.Patient_ID)).size;
  const uniqueHospitals = new Set(data.map((r) => r.Hospital_ID)).size;
  const avgStay = data.reduce((s, r) => s + r.durationHours, 0) / data.length;

  // Hospital stats
  const hospMap: Record<string, { total: number; sameDay: number }> = {};
  data.forEach((r) => {
    if (!hospMap[r.Hospital_ID]) hospMap[r.Hospital_ID] = { total: 0, sameDay: 0 };
    hospMap[r.Hospital_ID].total++;
    if (r.isSameDay) hospMap[r.Hospital_ID].sameDay++;
  });
  const hospitalStats: HospitalStat[] = Object.entries(hospMap)
    .map(([hospital, s]) => ({ hospital, ...s, fraudRate: s.sameDay / s.total }))
    .sort((a, b) => b.fraudRate - a.fraudRate);

  // Temporal
  const hourMap: Record<number, number> = {};
  sameDayRows.forEach((r) => {
    const h = r.admission.getHours();
    hourMap[h] = (hourMap[h] ?? 0) + 1;
  });
  const temporalData = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: hourMap[h] ?? 0 }));

  // Repeat offenders
  const patientMap: Record<string, { count: number; hospitals: Set<string> }> = {};
  sameDayRows.forEach((r) => {
    if (!patientMap[r.Patient_ID]) patientMap[r.Patient_ID] = { count: 0, hospitals: new Set() };
    patientMap[r.Patient_ID].count++;
    patientMap[r.Patient_ID].hospitals.add(r.Hospital_ID);
  });
  const repeatOffenders: PatientStat[] = Object.entries(patientMap)
    .filter(([, v]) => v.count > 1)
    .map(([patient, v]) => ({ patient, sameDayCount: v.count, hospitals: Array.from(v.hospitals) }))
    .sort((a, b) => b.sameDayCount - a.sameDayCount);

  // Cases with risk score
  const fraudCases = sameDayRows
    .map((r) => {
      const hospFraudRate = hospMap[r.Hospital_ID]?.sameDay / (hospMap[r.Hospital_ID]?.total || 1);
      return { ...r, risk: riskScore(r, hospFraudRate) };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 50);

  const TABS = ["overview", "temporal", "patients", "cases"] as const;

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--accent)]">KS-SD-001</p>
            <h1 className="font-mono text-3xl font-bold text-[var(--text)]">Same-Day Admission Fraud</h1>
            <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{filename}</p>
          </div>
          <button onClick={() => { setData(null); setFilename(""); }}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
            <X size={11} /> New File
          </button>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          <KPI label="Total Records" value={data.length.toLocaleString()} />
          <KPI label="Same-Day Cases" value={sameDayRows.length.toLocaleString()} accent />
          <KPI label="Same-Day Rate" value={`${((sameDayRows.length / data.length) * 100).toFixed(1)}%`} accent />
          <KPI label="Unique Patients" value={uniquePatients.toLocaleString()} />
          <KPI label="Unique Hospitals" value={uniqueHospitals.toLocaleString()} />
        </div>
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          <KPI label="Avg Stay" value={`${avgStay.toFixed(1)}h`} />
          <KPI label="Repeat Offenders" value={repeatOffenders.length} accent={repeatOffenders.length > 0} />
          <KPI label="High-Risk Hospitals" value={hospitalStats.filter(h => h.fraudRate > 0.3).length} accent />
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

        {/* Tab: Overview */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]/70">Hospital Fraud Rate (Top 20)</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hospitalStats.slice(0, 20)} margin={{ left: -10 }}>
                  <XAxis dataKey="hospital" tick={{ fontSize: 9, fontFamily: "monospace" }} />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 9, fontFamily: "monospace" }} />
                  <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 11 }} />
                  <Bar dataKey="fraudRate" radius={[4, 4, 0, 0]}>
                    {hospitalStats.slice(0, 20).map((h) => (
                      <Cell key={h.hospital} fill={h.fraudRate > 0.5 ? "#f87171" : h.fraudRate > 0.3 ? "#fb923c" : "var(--accent)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Hospital Breakdown</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-[var(--border)]">
                    {["Hospital","Total","Same-Day","Fraud Rate","Risk"].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {hospitalStats.slice(0, 20).map((h, i) => (
                      <tr key={h.hospital} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                        <td className="px-4 py-2 font-mono text-xs text-[var(--text)]">{h.hospital}</td>
                        <td className="px-4 py-2 font-mono text-xs text-[var(--text-muted)]">{h.total}</td>
                        <td className="px-4 py-2 font-mono text-xs text-red-400">{h.sameDay}</td>
                        <td className="px-4 py-2 font-mono text-xs">
                          <span className={`${h.fraudRate > 0.5 ? "text-red-400" : h.fraudRate > 0.3 ? "text-amber-400" : "text-emerald-400"}`}>
                            {(h.fraudRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`rounded border px-2 py-0.5 font-mono text-[8px] uppercase ${h.fraudRate > 0.5 ? "border-red-500/30 bg-red-500/10 text-red-400" : h.fraudRate > 0.3 ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
                            {h.fraudRate > 0.5 ? "HIGH" : h.fraudRate > 0.3 ? "MEDIUM" : "LOW"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Temporal */}
        {tab === "temporal" && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]/70">Same-Day Admissions by Hour</p>
            <p className="mb-6 font-mono text-[10px] text-[var(--text-muted)]">Peaks in early morning may indicate batch/fraudulent submissions</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={temporalData} margin={{ left: -10 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fontFamily: "monospace" }} interval={1} />
                <YAxis tick={{ fontSize: 9, fontFamily: "monospace" }} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 11 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tab: Patients */}
        {tab === "patients" && (
          <div>
            {repeatOffenders.length === 0 ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
                <p className="font-mono text-sm text-emerald-400">No repeat offenders detected</p>
                <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">Each patient has at most one same-day admission</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3">
                  <AlertTriangle size={14} className="text-red-400" />
                  <p className="font-mono text-xs text-red-400">{repeatOffenders.length} repeat offender(s) found</p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Repeat Offenders</p>
                  </div>
                  <table className="w-full">
                    <thead><tr className="border-b border-[var(--border)]">
                      {["Patient ID","Same-Day Admissions","Hospitals Involved"].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {repeatOffenders.map((p, i) => (
                        <tr key={p.patient} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                          <td className="px-4 py-2 font-mono text-xs text-[var(--text)]">{p.patient}</td>
                          <td className="px-4 py-2 font-mono text-xs text-red-400 font-bold">{p.sameDayCount}</td>
                          <td className="px-4 py-2 font-mono text-xs text-[var(--text-muted)]">{p.hospitals.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Cases */}
        {tab === "cases" && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Top Fraud Cases (by risk score)</p>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">Showing top {fraudCases.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[var(--border)]">
                  {["Patient","Hospital","Admitted","Discharged","Duration","Risk"].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {fraudCases.map((c, i) => (
                    <tr key={i} className={`border-b border-[var(--border)]/50 ${i % 2 === 0 ? "" : "bg-[var(--surface)]"}`}>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text)]">{c.Patient_ID}</td>
                      <td className="px-4 py-2 font-mono text-xs text-[var(--text-muted)]">{c.Hospital_ID}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-[var(--text-muted)]">{c.admission.toLocaleString()}</td>
                      <td className="px-4 py-2 font-mono text-[10px] text-[var(--text-muted)]">{c.discharge.toLocaleString()}</td>
                      <td className="px-4 py-2 font-mono text-xs text-amber-400">{c.durationHours.toFixed(1)}h</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-[var(--border)]">
                            <div className="h-full rounded-full" style={{ width: `${c.risk}%`, background: c.risk > 70 ? "#f87171" : c.risk > 40 ? "#fb923c" : "var(--accent)" }} />
                          </div>
                          <span className="font-mono text-[9px] text-[var(--text-muted)]">{c.risk}</span>
                        </div>
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
