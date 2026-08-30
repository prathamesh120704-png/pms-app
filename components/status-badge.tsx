import type { ReactNode } from "react";

export type BadgeTone = "draft" | "pending" | "success" | "danger";

const toneClass: Record<BadgeTone, string> = {
  draft: "bg-zinc-100 text-zinc-700 border-zinc-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
};

export function StatusBadge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

export function goalBadgeTone(
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "sent_back"
    | "pending"
    | "accepted"
    | "rejected"
    | "completed",
): BadgeTone {
  if (status === "approved" || status === "accepted" || status === "completed") {
    return "success";
  }
  if (status === "submitted" || status === "pending") return "pending";
  if (status === "sent_back" || status === "rejected") return "danger";
  return "draft";
}

export function reviewBadgeTone(
  status: "draft" | "self_submitted" | "reviewed" | "completed",
): BadgeTone {
  if (status === "completed") return "success";
  if (status === "self_submitted" || status === "reviewed") return "pending";
  return "draft";
}

export function cycleBadgeTone(status: "draft" | "open" | "closed"): BadgeTone {
  if (status === "open") return "pending";
  if (status === "closed") return "success";
  return "draft";
}
