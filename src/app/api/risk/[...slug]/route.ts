import { NextRequest, NextResponse } from "next/server";

const API = process.env.RISK_API_URL ?? "http://localhost:8000";

const ALLOWED_PATHS = new Set(["predict", "explain", "hospitals", "features"]);

async function proxy(req: NextRequest, slug: string[], method: string) {
  const path = slug.join("/");
  if (!ALLOWED_PATHS.has(path)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = `${API}/${path}${req.nextUrl.search}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const init: RequestInit = { method, headers };
  if (method === "POST") {
    init.body = await req.text();
  }

  try {
    const res = await fetch(url, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Risk scoring service unavailable." },
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
