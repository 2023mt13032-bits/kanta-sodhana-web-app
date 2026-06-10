import { NextRequest, NextResponse } from "next/server";

const RISK_SCORING_URL = process.env.RISK_SCORING_URL ?? "http://localhost:8000";

// Whitelist — only these exact paths can be proxied
const ALLOWED_PATHS = new Set(["predict", "explain", "hospitals", "features"]);

async function proxy(req: NextRequest, slug: string[], method: string) {
  const path = slug.join("/");

  if (!ALLOWED_PATHS.has(path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = `${RISK_SCORING_URL}/${path}${req.nextUrl.search}`;

  const init: RequestInit = { method };
  if (method === "POST") {
    init.headers = { "Content-Type": "application/json" };
    init.body = await req.text();
  }

  try {
    const res = await fetch(url, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[risk-scoring-proxy] service unreachable:", err);
    return NextResponse.json(
      { error: "Risk scoring service unavailable. Try again shortly." },
      { status: 503 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxy(req, slug, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  return proxy(req, slug, "POST");
}
