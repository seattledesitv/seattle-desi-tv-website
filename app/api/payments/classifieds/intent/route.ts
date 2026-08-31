import { NextResponse } from "next/server";
import {
  authenticatedUser,
  createClassifiedPaymentIntent,
  getClassifiedPaymentIntent,
} from "../../../../lib/swirepay/server/classifiedPaymentIntentServer";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Payment request failed.";
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser(request.headers.get("authorization"));
    const body = (await request.json()) as { classifiedId?: unknown };
    if (typeof body.classifiedId !== "string" || !body.classifiedId)
      return NextResponse.json(
        { error: "Classified ID is required." },
        { status: 400 },
      );
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id) throw new Error("The active site could not be resolved.");
    const intent = await createClassifiedPaymentIntent(
      body.classifiedId,
      user.id,
      site.id,
    );
    return NextResponse.json(intent);
  } catch (cause) {
    const error = message(cause);
    return NextResponse.json(
      { error },
      { status: error === "Login required." ? 401 : 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const user = await authenticatedUser(request.headers.get("authorization"));
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!token)
      return NextResponse.json(
        { error: "Payment token is required." },
        { status: 400 },
      );
    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id) throw new Error("The active site could not be resolved.");
    return NextResponse.json(
      await getClassifiedPaymentIntent(token, user.id, site.id),
    );
  } catch (cause) {
    const error = message(cause);
    return NextResponse.json(
      { error },
      { status: error === "Login required." ? 401 : 400 },
    );
  }
}
