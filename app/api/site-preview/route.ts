import { NextRequest, NextResponse } from "next/server";
import { previewSiteOverrideAllowed, resolveSiteForCode } from "../../lib/sites/siteResolver";

export const dynamic = "force-dynamic";

function safeReturnPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/studio";
}

export async function GET(request: NextRequest) {
  const hostname = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  if (!previewSiteOverrideAllowed(hostname)) {
    return NextResponse.json({ error: "Market preview switching is available only on Vercel preview deployments." }, { status: 404 });
  }

  const code = String(request.nextUrl.searchParams.get("site") || "").trim().toLowerCase();
  const destination = safeReturnPath(request.nextUrl.searchParams.get("return"));
  const redirectUrl = new URL(destination, request.url);
  const response = NextResponse.redirect(redirectUrl);

  if (!code || code === "clear") {
    response.cookies.delete("sdtv_preview_site");
    return response;
  }
  if (!/^[a-z0-9_]+$/.test(code)) {
    return NextResponse.json({ error: "Invalid site code." }, { status: 400 });
  }

  const site = await resolveSiteForCode(code, hostname);
  if (!site.id || site.code !== code || site.source !== "preview") {
    return NextResponse.json({ error: "Site is unavailable for preview." }, { status: 404 });
  }

  response.cookies.set("sdtv_preview_site", code, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
