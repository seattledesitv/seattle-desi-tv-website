import { NextResponse } from "next/server";

function esc(value: any) {
  return String(value || "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char));
}

function renderItem(item: any) {
  const imageFit = item?.imageFit === "contain" ? "contain" : "cover";
  const imageBackground = imageFit === "contain" ? "background:#ffffff;padding:12px;box-sizing:border-box;" : "background:#e2e8f0;";
  return `<div style="border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin:14px 0;background:#f8fafc;">${item.image ? `<div style="position:relative;${imageBackground}"><img src="${esc(item.image)}" alt="${esc(item.title)}" style="width:100%;height:240px;object-fit:${imageFit};display:block;" />${item.badge ? `<span style="position:absolute;left:14px;top:14px;background:#fbbf24;color:#422006;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">${esc(item.badge)}</span>` : ""}</div>` : ""}<div style="padding:16px;">${item.meta ? `<div style="color:#db2777;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${esc(item.meta)}</div>` : ""}<h3 style="margin:6px 0;font-size:20px;line-height:1.3;">${esc(item.title)}</h3>${item.text ? `<p style="color:#475569;line-height:1.6;margin:8px 0 14px;">${esc(item.text)}</p>` : ""}${item.url ? `<a href="${esc(item.url)}" style="display:inline-block;background:#db2777;color:#fff;text-decoration:none;border-radius:10px;padding:10px 14px;font-weight:800;">${esc(item.cta || "View more")}</a>` : ""}</div></div>`;
}

function renderHtml(draft: any) {
  const sections = Array.isArray(draft?.sections) ? draft.sections : [];
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;background:#050b18;font-family:Arial,sans-serif;color:#0f172a;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(draft?.preheader || "")}</div><div style="max-width:760px;margin:0 auto;background:#ffffff;"><div style="background:#050b18;color:#fff;padding:36px 28px;text-align:center;"><img src="https://www.seattledesitv.com/sdtv-logo.png" alt="Seattle Desi TV" style="height:64px;width:auto;margin:0 auto 14px;display:block;" /><div style="color:#f9a8d4;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">Seattle Desi TV</div><h1 style="margin:12px 0 8px;font-size:34px;line-height:1.1;">${esc(draft?.subject || "Seattle Desi TV Community Update")}</h1><p style="margin:0;color:#cbd5e1;line-height:1.6;">${esc(draft?.preheader || "")}</p></div><div style="padding:24px;">${sections.map((section: any) => `<section style="border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;margin-bottom:24px;"><div style="background:#831843;color:#fff;padding:16px 20px;"><h2 style="margin:0;font-size:24px;">${esc(section.title)}</h2></div><div style="padding:20px;">${section.body ? `<p style="font-size:15px;line-height:1.7;color:#334155;">${esc(section.body)}</p>` : ""}${Array.isArray(section.items) ? section.items.map(renderItem).join("") : ""}</div></section>`).join("")}</div><div style="background:#f1f5f9;color:#475569;text-align:center;padding:22px;font-size:13px;line-height:1.6;">Seattle Desi TV · Community media, events, businesses, organizations, and culture.<br/>You are receiving this because you subscribed to hear from Seattle Desi TV.</div></div></body></html>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const to = String(body.to || "").trim();
    const draft = body.draft || {};
    if (!to || !to.includes("@")) return NextResponse.json({ ok: false, error: "Enter a valid preview email address." }, { status: 200 });
    const apiKey = process.env.RESEND_API_KEY || "";
    const from = process.env.NEWSLETTER_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "Seattle Desi TV <onboarding@resend.dev>";
    if (!apiKey) return NextResponse.json({ ok: false, error: "Preview email is not configured. Add RESEND_API_KEY and NEWSLETTER_FROM_EMAIL or RESEND_FROM_EMAIL in Vercel." }, { status: 200 });
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject: draft.subject || "Seattle Desi TV Community Update", html: renderHtml(draft) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ ok: false, error: result?.message || "Could not send preview email." }, { status: 200 });
    return NextResponse.json({ ok: true, message: "Preview email sent." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not send preview email." }, { status: 200 });
  }
}
