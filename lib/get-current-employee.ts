import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

export type EmployeeRole = "employee" | "manager" | "hr_admin";

export type Employee = {
  id: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
  designation: string | null;
  department: string | null;
  date_of_joining: string | null;
  manager_id: string | null;
  role: EmployeeRole;
  is_active: boolean;
  created_at: string;
};

const employeeColumns =
  "id, clerk_user_id, full_name, email, designation, department, date_of_joining, manager_id, role, is_active, created_at";

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

function clerkUserIdNeedsLink(storedId: string | null | undefined): boolean {
  if (!storedId || storedId.trim() === "") {
    return true;
  }
  return !storedId.startsWith("user_");
}

/**
 * Resolves the signed-in Clerk user to an employees row (by email),
 * linking clerk_user_id when it is still empty / a placeholder.
 *
 * Runs on the server only: Clerk email comes from currentUser(), and
 * the update uses the service role. React cache() dedupes this within
 * one request so layouts and pages can all call it.
 */
export const getCurrentEmployee = cache(async (): Promise<Employee | null> => {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim();

  if (!user || !email) {
    return null;
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return null;
  }

  const { data: employee } = await supabase
    .from("employees")
    .select(employeeColumns)
    .ilike("email", email)
    .maybeSingle();

  if (!employee) {
    return null;
  }

  const row = employee as Employee;

  if (!clerkUserIdNeedsLink(row.clerk_user_id)) {
    return row;
  }

  const { data: updated, error } = await supabase
    .from("employees")
    .update({ clerk_user_id: user.id })
    .eq("id", row.id)
    .select(employeeColumns)
    .maybeSingle();

  if (error) {
    return { ...row, clerk_user_id: user.id };
  }

  return (updated as Employee | null) ?? { ...row, clerk_user_id: user.id };
});
