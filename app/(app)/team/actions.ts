"use server";

import { revalidatePath } from "next/cache";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { getSupabaseServiceClient } from "@/lib/supabase-clients";

export type TeamActionResult = { ok: true } | { ok: false; error: string };

type AssignGoalInput = {
  employeeId: string;
  cycleId: string;
  title: string;
  description: string;
  dueDate: string;
};

export async function assignGoalToEmployee(
  input: AssignGoalInput,
): Promise<TeamActionResult> {
  const manager = await getCurrentEmployee();
  if (!manager) {
    return { ok: false, error: "You must be signed in to assign a goal." };
  }

  if (manager.role !== "manager") {
    return { ok: false, error: "Only managers can assign goals to their team." };
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const dueDate = input.dueDate.trim();

  if (!title) {
    return { ok: false, error: "A goal title is required." };
  }

  if (!description) {
    return { ok: false, error: "A goal description is required." };
  }

  if (!dueDate) {
    return { ok: false, error: "A due date is required." };
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data: report, error: reportError } = await supabase
    .from("employees")
    .select("id, manager_id, is_active")
    .eq("id", input.employeeId)
    .maybeSingle();

  if (reportError) {
    return { ok: false, error: reportError.message };
  }

  if (!report || report.manager_id !== manager.id || !report.is_active) {
    return {
      ok: false,
      error: "You can only assign goals to your active direct reports.",
    };
  }

  const { data: cycle, error: cycleError } = await supabase
    .from("review_cycles")
    .select("id")
    .eq("id", input.cycleId)
    .eq("status", "open")
    .maybeSingle();

  if (cycleError) {
    return { ok: false, error: cycleError.message };
  }

  if (!cycle) {
    return { ok: false, error: "There is no open review cycle to assign goals in." };
  }

  const { error: insertError } = await supabase.from("goals").insert({
    employee_id: input.employeeId,
    cycle_id: input.cycleId,
    title,
    description,
    weightage: 0,
    target_date: dueDate,
    status: "pending",
    rejection_reason: null,
    manager_comment: null,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/team");
  revalidatePath("/goals");
  return { ok: true };
}
