import { Resend } from "resend";

type NotifyManagerPayload = {
  managerEmail: string;
  employeeName: string;
  cycleName: string;
  reviewUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function managerNotificationHtml(payload: NotifyManagerPayload): string {
  const name = escapeHtml(payload.employeeName);
  const cycle = escapeHtml(payload.cycleName);
  const url = escapeHtml(payload.reviewUrl);

  return `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #18181b;">
      <h1 style="font-size: 18px; font-weight: 600;">Self-appraisal submitted</h1>
      <p><strong>${name}</strong> has submitted their self-appraisal for <strong>${cycle}</strong>.</p>
      <p>
        <a href="${url}" style="display: inline-block; padding: 10px 14px; background: #18181b; color: #fff; text-decoration: none; border-radius: 6px;">
          Open manager review
        </a>
      </p>
      <p style="font-size: 13px; color: #52525b;">If the button does not work, open this link:<br />${url}</p>
    </div>
  `;
}

export type SendManagerNotificationResult = {
  ok: boolean;
  error?: string;
};

/**
 * Sends the manager email via Resend. Never throws — failures are logged
 * so a self-appraisal submit can continue.
 */
export async function sendManagerNotification(
  payload: NotifyManagerPayload,
): Promise<SendManagerNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "PMS <beth.t@example.com>";

  if (!apiKey) {
    console.error("[notify-manager] RESEND_API_KEY is not set");
    return { ok: false, error: "Email is not configured." };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: payload.managerEmail,
      subject: `${payload.employeeName} submitted a self-appraisal (${payload.cycleName})`,
      html: managerNotificationHtml(payload),
    });

    if (error) {
      console.error("[notify-manager] Resend error", error);
      return {
        ok: false,
        error:
          "message" in error && typeof error.message === "string"
            ? error.message
            : "Resend rejected the email.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("[notify-manager] unexpected failure", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send email.",
    };
  }
}

/** Safe wrapper for server actions: logs failures and does not throw. */
export async function notifyManagerOfSelfAppraisal(
  payload: NotifyManagerPayload,
): Promise<void> {
  const result = await sendManagerNotification(payload);
  if (!result.ok) {
    console.error("[notify-manager] skipped or failed", result.error);
  }
}
