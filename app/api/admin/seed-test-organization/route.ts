import { NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { seedTestOrganization } from "@/lib/seed-test-organization";
import { getSupabaseServiceClient } from "@/lib/supabase-clients";

export async function POST() {
  const employee = await getCurrentEmployee();
  if (employee?.role !== "hr_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  try {
    const result = await seedTestOrganization(supabase);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to seed the test organization.",
      },
      { status: 500 },
    );
  }
}
