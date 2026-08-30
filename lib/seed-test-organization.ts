import type { SupabaseClient } from "@supabase/supabase-js";

type EmployeeRole = "employee" | "manager" | "hr_admin";

export const TEST_DEPARTMENTS = [
  { name: "Engineering", slug: "eng", employeeCount: 5 },
  { name: "Sales", slug: "sales", employeeCount: 5 },
  { name: "Marketing", slug: "mkt", employeeCount: 5 },
  { name: "Operations", slug: "ops", employeeCount: 10 },
] as const;

export type SeededPerson = {
  email: string;
  fullName: string;
  role: EmployeeRole;
  department: string;
};

export type SeedTestOrganizationResult = {
  departments: { name: string; managerId: string; emails: string[] }[];
  inserted: number;
  updated: number;
  goalsInserted: number;
  cycleId: string | null;
};

type EmployeeInsert = {
  clerk_user_id: string;
  full_name: string;
  email: string;
  designation: string;
  department: string;
  role: EmployeeRole;
  is_active: boolean;
  manager_id?: string | null;
};

type SampleAssignedGoal = {
  employeeEmail: string;
  title: string;
  description: string;
  weightage: number;
  targetDate: string;
};

const OPERATIONS_PENDING_GOALS: SampleAssignedGoal[] = [
  {
    employeeEmail: "emp1_ops@test.com",
    title: "Clear the incident backlog",
    description:
      "Reduce open P2/P3 incidents by 40% and keep mean time to resolve under four hours for the rest of the cycle.",
    weightage: 50,
    targetDate: "2026-12-15",
  },
  {
    employeeEmail: "emp1_ops@test.com",
    title: "Publish on-call runbooks",
    description:
      "Write and review runbooks for the top ten production alerts so any Operations specialist can follow them without a handover call.",
    weightage: 50,
    targetDate: "2026-11-30",
  },
  {
    employeeEmail: "emp2_ops@test.com",
    title: "Quarterly capacity plan",
    description:
      "Deliver a capacity plan covering staffing, vendor SLAs, and weekend coverage for the next two quarters.",
    weightage: 100,
    targetDate: "2026-10-31",
  },
];

async function upsertEmployee(
  supabase: SupabaseClient,
  row: EmployeeInsert,
): Promise<{ id: string; created: boolean }> {
  const { data: existing, error: lookupError } = await supabase
    .from("employees")
    .select("id")
    .eq("email", row.email)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("employees")
      .update({
        full_name: row.full_name,
        designation: row.designation,
        department: row.department,
        role: row.role,
        is_active: row.is_active,
        manager_id: row.manager_id ?? null,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return { id: existing.id as string, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("employees")
    .insert(row)
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(insertError?.message ?? "Failed to insert employee.");
  }

  return { id: inserted.id as string, created: true };
}

function peopleForDepartment(
  name: string,
  slug: string,
  employeeCount: number,
): SeededPerson[] {
  const employees: SeededPerson[] = Array.from(
    { length: employeeCount },
    (_, index) => {
      const n = index + 1;
      return {
        email: `emp${n}_${slug}@test.com`,
        fullName: `${name} Employee ${n}`,
        role: "employee" as const,
        department: name,
      };
    },
  );

  return [
    {
      email: `manager_${slug}@test.com`,
      fullName: `${name} Manager`,
      role: "manager",
      department: name,
    },
    {
      email: `hr_${slug}@test.com`,
      fullName: `${name} HR Admin`,
      role: "hr_admin",
      department: name,
    },
    ...employees,
  ];
}

async function ensureOpenReviewCycle(
  supabase: SupabaseClient,
  createdBy: string,
): Promise<string> {
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
    return existing.id as string;
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

  return inserted.id as string;
}

async function seedOperationsPendingGoals(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<number> {
  let inserted = 0;

  for (const goal of OPERATIONS_PENDING_GOALS) {
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("email", goal.employeeEmail)
      .maybeSingle();

    if (employeeError) {
      throw new Error(employeeError.message);
    }

    if (!employee?.id) {
      throw new Error(`Missing Operations employee ${goal.employeeEmail}.`);
    }

    const { data: existing, error: existingError } = await supabase
      .from("goals")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("cycle_id", cycleId)
      .eq("title", goal.title)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("goals")
        .update({
          description: goal.description,
          weightage: goal.weightage,
          target_date: goal.targetDate,
          status: "pending",
          rejection_reason: null,
          manager_comment: null,
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      continue;
    }

    const { error: insertError } = await supabase.from("goals").insert({
      employee_id: employee.id,
      cycle_id: cycleId,
      title: goal.title,
      description: goal.description,
      weightage: goal.weightage,
      target_date: goal.targetDate,
      status: "pending",
      rejection_reason: null,
      manager_comment: null,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    inserted += 1;
  }

  return inserted;
}

/**
 * Creates isolated departments. Each group shares one `department`
 * string; HR and employees report to that department's manager.
 * Operations includes 10 dummy employees and sample pending assigned goals.
 */
export async function seedTestOrganization(
  supabase: SupabaseClient,
): Promise<SeedTestOrganizationResult> {
  let inserted = 0;
  let updated = 0;
  const departments: SeedTestOrganizationResult["departments"] = [];
  let opsHrId: string | null = null;

  for (const dept of TEST_DEPARTMENTS) {
    const people = peopleForDepartment(
      dept.name,
      dept.slug,
      dept.employeeCount,
    );
    const managerPerson = people.find((person) => person.role === "manager");
    if (!managerPerson) {
      throw new Error(`Missing manager for ${dept.name}`);
    }

    const managerResult = await upsertEmployee(supabase, {
      clerk_user_id: `seed_manager_${dept.slug}`,
      full_name: managerPerson.fullName,
      email: managerPerson.email,
      designation: `${dept.name} Manager`,
      department: dept.name,
      role: "manager",
      is_active: true,
      manager_id: null,
    });
    if (managerResult.created) inserted += 1;
    else updated += 1;

    const emails = [managerPerson.email];

    for (const person of people.filter((row) => row.role !== "manager")) {
      const slugPart = person.email.split("@")[0];
      const result = await upsertEmployee(supabase, {
        clerk_user_id: `seed_${slugPart}`,
        full_name: person.fullName,
        email: person.email,
        designation:
          person.role === "hr_admin"
            ? `${dept.name} HR Business Partner`
            : `${dept.name} Specialist`,
        department: dept.name,
        role: person.role,
        is_active: true,
        manager_id: managerResult.id,
      });
      if (result.created) inserted += 1;
      else updated += 1;
      emails.push(person.email);

      if (dept.slug === "ops" && person.role === "hr_admin") {
        opsHrId = result.id;
      }
    }

    departments.push({
      name: dept.name,
      managerId: managerResult.id,
      emails,
    });
  }

  const createdBy =
    opsHrId ??
    departments[0]?.managerId ??
    null;

  if (!createdBy) {
    throw new Error("Could not resolve an employee to own the review cycle.");
  }

  const cycleId = await ensureOpenReviewCycle(supabase, createdBy);
  const goalsInserted = await seedOperationsPendingGoals(supabase, cycleId);

  return { departments, inserted, updated, goalsInserted, cycleId };
}
