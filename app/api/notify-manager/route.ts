import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { sendManagerNotification } from "@/lib/notify-manager";

type NotifyManagerBody = {
  managerEmail?: unknown;
  employeeName?: unknown;
  cycleName?: unknown;
  reviewId?: unknown;
  reviewUrl?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    let body: NotifyManagerBody;
    try {
      body = (await request.json()) as NotifyManagerBody;
    } catch {
      return Response.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const managerEmail = asNonEmptyString(body.managerEmail);
    const employeeName = asNonEmptyString(body.employeeName);
    const cycleName = asNonEmptyString(body.cycleName);

    if (!managerEmail || !employeeName || !cycleName) {
      return Response.json(
        {
          ok: false,
          error: "managerEmail, employeeName, and cycleName are required.",
        },
        { status: 400 },
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      request.nextUrl.origin;
    const reviewId = asNonEmptyString(body.reviewId);
    const reviewUrl =
      asNonEmptyString(body.reviewUrl) ||
      (reviewId ? `${origin}/team/reviews/${reviewId}` : `${origin}/team`);

    const result = await sendManagerNotification({
      managerEmail,
      employeeName,
      cycleName,
      reviewUrl,
    });

    return Response.json(result);
  } catch (error) {
    console.error("[notify-manager] route failed", error);
    return Response.json(
      { ok: false, error: "Could not send notification." },
      { status: 200 },
    );
  }
}
