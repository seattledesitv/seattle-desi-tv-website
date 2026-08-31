import { NextResponse } from "next/server";
import {
  authenticatedUser,
  createSwirepayClassifiedCheckoutSession,
} from "../../../../lib/swirepay/server/classifiedPaymentIntentServer";
import { resolveSiteForHostname } from "../../../../lib/sites/siteResolver";

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Checkout session failed.";
}

export async function POST(request: Request) {
  try {
    const user = await authenticatedUser(request.headers.get("authorization"));
    const body = (await request.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token)
      return NextResponse.json(
        { error: "Payment token is required." },
        { status: 400 },
      );

    const site = await resolveSiteForHostname(
      request.headers.get("x-forwarded-host") || request.headers.get("host"),
    );
    if (!site.id) throw new Error("The active site could not be resolved.");
    return NextResponse.json(
      await createSwirepayClassifiedCheckoutSession(
        body.token,
        user.id,
        new URL(request.url).origin,
        site.id,
        site.primaryHostname,
      ),
    );
  } catch (cause) {
    const error = message(cause);
    return NextResponse.json(
      { error },
      { status: error === "Login required." ? 401 : 400 },
    );
  }
}
