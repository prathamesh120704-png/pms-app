"use server";

import { revalidatePath } from "next/cache";
import { bypassesGoalApproval } from "@/lib/goals";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { getSupabaseServiceClient } from "@/lib/supabase-clients";

export type GoalActionResult = { ok: true } | { ok: false; error: string };

type CreateGoalInput = {
  cycleId: string;
  title: string;
  description: string;
  weightage: number;
  targetDate: string;
};

function isExactly100(total: number): boolean {
  return Math.round(total * 100) === 10000;
}

function selfApprovesGoals(
  employee: NonNullable<Awaited<ReturnType<typeof getCurrentEmployee>>>,
): boolean {
  return bypassesGoalApproval(employee.role, employee.manager_id);
}

export async function createGoal(
  input: CreateGoalInput,
): Promise<GoalActionResult> {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return { ok: false, error: "You must be signed in to add a goal." };
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const targetDate = input.targetDate.trim();

  if (!title || Number.isNaN(input.weightage) || input.weightage < 0 || input.weightage > 100) {
    return { ok: false, error: "Enter a title and a weightage between 0 and 100." };
  }

  if (!targetDate) {
    return { ok: false, error: "A target date is required." };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const status = selfApprovesGoals(employee) ? "accepted" : "draft";

  const { error } = await supabase.from("goals").insert({
    employee_id: employee.id,
    cycle_id: input.cycleId,
    title,
    description: description || null,
    weightage: input.weightage,
    target_date: targetDate,
    status,
    rejection_reason: null,
    manager_comment: null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/team");
  revalidatePath("/review");
  return { ok: true };
}

export async function submitDraftGoals(
  cycleId: string,
): Promise<GoalActionResult> {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return { ok: false, error: "You must be signed in to submit goals." };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data: goalRows, error: goalsError } = await supabase
    .from("goals")
    .select("weightage, status")
    .eq("employee_id", employee.id)
    .eq("cycle_id", cycleId);

  if (goalsError) {
    return { ok: false, error: goalsError.message };
  }

  const goals = goalRows ?? [];
  const totalWeightage = goals.reduce(
    (sum, goal) => sum + Number(goal.weightage),
    0,
  );

  if (!isExactly100(totalWeightage)) {
    return {
      ok: false,
      error: "Total weightage must be exactly 100 before submitting.",
    };
  }

  if (!goals.some((goal) => goal.status === "draft")) {
    return { ok: false, error: "There are no draft goals to submit." };
  }

  const nextStatus = selfApprovesGoals(employee) ? "accepted" : "submitted";

  const { error } = await supabase
    .from("goals")
    .update({ status: nextStatus })
    .eq("employee_id", employee.id)
    .eq("cycle_id", cycleId)
    .eq("status", "draft");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/team");
  revalidatePath("/review");
  return { ok: true };
}

type GoalRow = {
  id: string;
  employee_id: string;
  status: string;
};

async function loadOwnedPendingGoal(
  goalId: string,
): Promise<
  | { ok: true; goalId: string; employeeId: string }
  | { ok: false; error: string }
> {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return { ok: false, error: "You must be signed in to update a goal." };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("goals")
    .select("id, employee_id, status")
    .eq("id", goalId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = data as GoalRow | null;
  if (!row) {
    return { ok: false, error: "That goal was not found." };
  }

  if (row.employee_id !== employee.id) {
    return { ok: false, error: "You can only accept or reject your own goals." };
  }

  if (row.status !== "pending") {
    return {
      ok: false,
      error: "Only pending assigned goals can be accepted or rejected.",
    };
  }

  return { ok: true, goalId: row.id, employeeId: employee.id };
}

export async function acceptAssignedGoal(
  goalId: string,
): Promise<GoalActionResult> {
  const loaded = await loadOwnedPendingGoal(goalId);
  if (!loaded.ok) return loaded;

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { error } = await supabase
    .from("goals")
    .update({
      status: "accepted",
      rejection_reason: null,
    })
    .eq("id", loaded.goalId)
    .eq("employee_id", loaded.employeeId)
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/team");
  return { ok: true };
}

export async function rejectAssignedGoal(
  goalId: string,
  rejectionReason: string,
): Promise<GoalActionResult> {
  const reason = rejectionReason.trim();
  if (!reason) {
    return { ok: false, error: "A rejection reason is required." };
  }

  const loaded = await loadOwnedPendingGoal(goalId);
  if (!loaded.ok) return loaded;

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { error } = await supabase
    .from("goals")
    .update({
      status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", loaded.goalId)
    .eq("employee_id", loaded.employeeId)
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/team");
  return { ok: true };
}

async function loadOwnedCompletedGoal(
  goalId: string,
): Promise<
  | { ok: true; goalId: string; employeeId: string }
  | { ok: false; error: string }
> {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return { ok: false, error: "You must be signed in to delete a goal." };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("goals")
    .select("id, employee_id, status")
    .eq("id", goalId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = data as GoalRow | null;
  if (!row) {
    return { ok: false, error: "That goal was not found." };
  }

  if (row.employee_id !== employee.id) {
    return { ok: false, error: "You can only delete your own goals." };
  }

  if (row.status !== "completed") {
    return {
      ok: false,
      error: "Only completed goals can be deleted.",
    };
  }

  return { ok: true, goalId: row.id, employeeId: employee.id };
}

export async function deleteCompletedGoal(
  goalId: string,
): Promise<GoalActionResult> {
  const loaded = await loadOwnedCompletedGoal(goalId);
  if (!loaded.ok) return loaded;

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { error: ratingsError } = await supabase
    .from("goal_ratings")
    .delete()
    .eq("goal_id", loaded.goalId);

  if (ratingsError) {
    return { ok: false, error: ratingsError.message };
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", loaded.goalId)
    .eq("employee_id", loaded.employeeId)
    .eq("status", "completed");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/goals");
  revalidatePath("/review");
  revalidatePath("/team");
  return { ok: true };
}
