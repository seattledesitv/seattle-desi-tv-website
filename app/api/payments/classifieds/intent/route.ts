import { NextResponse } from "next/server";
import {
  authenticatedUser,
  createClassifiedPaymentIntent,
  getClassifiedPaymentIntent,
} from "../../../../lib/swirepay/server/classifiedPaymentIntentServer";

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
    const intent = await createClassifiedPaymentIntent(
      body.classifiedId,
      user.id,
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
    return NextResponse.json(
      await getClassifiedPaymentIntent(token, user.id),
    );
  } catch (cause) {
    const error = message(cause);
    return NextResponse.json(
      { error },
      { status: error === "Login required." ? 401 : 400 },
    );
  }
}
