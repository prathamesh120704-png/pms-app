import type { SupabaseClient } from "@supabase/supabase-js";

export type SeedTestOrganizationResult = {
  cycleId: string | null;
  cycleCreated: boolean;
  activeEmployees: number;
  hrAdminEmail: string | null;
};

async function ensureOpenReviewCycle(
  supabase: SupabaseClient,
  createdBy: string,
): Promise<{ cycleId: string; created: boolean }> {
  const { data: existing, error: lookupError } = await supabase
    .from("review_cycles")
    .select("id")
    .eq("status", "open")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing?.id) {
    return { cycleId: existing.id as string, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("review_cycles")
    .insert({
      name: "FY2026 H2 Performance Cycle",
      start_date: "2026-07-01",
      end_date: "2026-12-31",
      status: "open",
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "Failed to create an open review cycle.");
  }

  return { cycleId: inserted.id as string, created: true };
}

/**
 * Bootstraps a minimal environment for a single 3-user org
 * (1 manager, 1 employee, 1 HR admin) linked to real Gmail accounts.
 * Does not insert dummy users or departments.
 */
export async function seedTestOrganization(
  supabase: SupabaseClient,
): Promise<SeedTestOrganizationResult> {
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, email, role, is_active")
    .eq("is_active", true)
    .order("created_at");

  if (employeesError) {
    throw new Error(employeesError.message);
  }

  const active = employees ?? [];
  const hrAdmin = active.find((person) => person.role === "hr_admin");
  const cycleOwner = hrAdmin ?? active[0] ?? null;

  if (!cycleOwner) {
    return {
      cycleId: null,
      cycleCreated: false,
      activeEmployees: 0,
      hrAdminEmail: null,
    };
  }

  const { cycleId, created } = await ensureOpenReviewCycle(
    supabase,
    cycleOwner.id as string,
  );

  return {
    cycleId,
    cycleCreated: created,
    activeEmployees: active.length,
    hrAdminEmail: hrAdmin?.email ?? null,
  };
}
