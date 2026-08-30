"use server";

import { revalidatePath } from "next/cache";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { scopedDepartment } from "@/lib/department-scope";
import { getSupabaseServiceClient } from "@/lib/supabase-clients";

export type GoalActionResult = { ok: true } | { ok: false; error: string };

type GoalRow = {
  id: string;
  employee_id: string;
  status: string;
  employees:
    | { id: string; department: string | null }
    | { id: string; department: string | null }[]
    | null;
};

function employeeEmbed(
  value: GoalRow["employees"],
): { id: string; department: string | null } | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

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
    .select("id, employee_id, status, employees!inner(id, department)")
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

  const owner = employeeEmbed(row.employees);
  const department = scopedDepartment(employee.department);
  if (department) {
    const ownerDepartment = scopedDepartment(owner?.department);
    if (ownerDepartment !== department) {
      return {
        ok: false,
        error: "You cannot update a goal outside your department.",
      };
    }
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
