import { NextResponse } from "next/server";

function normalizeUrl(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

async function fetchWithTimeout(url: string, method: "HEAD" | "GET") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "SeattleDesiTV-LinkChecker/1.0" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = normalizeUrl(searchParams.get("url") || "");

  if (!url) {
    return NextResponse.json({ ok: false, reason: "Page not found" }, { status: 400 });
  }

  try {
    let response = await fetchWithTimeout(url, "HEAD");

    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(url, "GET");
    }

    if (response.ok) {
      return NextResponse.json({ ok: true, url: response.url || url });
    }

    return NextResponse.json({ ok: false, reason: "Page not found" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "Page not found" }, { status: 200 });
  }
}
