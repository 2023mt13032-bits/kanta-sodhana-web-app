import type {
  ClaimInput,
  PredictResponse,
  ExplainResponse,
  HospitalEntry,
  FeatureImportances,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  predict: (claim: ClaimInput) =>
    post<PredictResponse>("/predict", claim),
  explain: (claim: ClaimInput) =>
    post<ExplainResponse>("/explain", claim),
  hospitals: (limit = 20) =>
    get<HospitalEntry[]>(`/hospitals?limit=${limit}`),
  features: () => get<FeatureImportances>("/features"),
};
