export type GoalStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "sent_back"
  | "pending"
  | "accepted"
  | "rejected"
  | "completed";

export type Goal = {
  id: string;
  employee_id: string;
  cycle_id: string;
  title: string;
  description: string | null;
  weightage: number;
  target_date: string | null;
  status: GoalStatus;
  manager_comment: string | null;
  rejection_reason: string | null;
};

export const GOAL_SELECT =
  "id, employee_id, cycle_id, title, description, weightage, target_date, status, manager_comment, rejection_reason";

export const goalStatusLabel: Record<GoalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  sent_back: "Sent back",
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
};

export function isAssignedPending(status: GoalStatus): boolean {
  return status === "pending";
}

export function isManagerApprovedForReview(status: GoalStatus): boolean {
  return status === "approved" || status === "accepted";
}
