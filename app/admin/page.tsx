import { SeedTestOrganizationButton } from "@/components/seed-test-organization-button";
import { scopedDepartment } from "@/lib/department-scope";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui";
import { HrDashboard } from "./hr-dashboard";

export default async function AdminHomePage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  const department = scopedDepartment(employee.department);

  return (
    <main className={pageMain}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>HR dashboard</h1>
          <p className={pageSubtitle}>
            {department
              ? `Cycle progress for ${department} only. Other departments are hidden.`
              : "Your employee record has no department, so directory data is locked."}
          </p>
        </div>
        <SeedTestOrganizationButton />
      </div>
      <div className="mt-8">
        <HrDashboard department={department} />
      </div>
    </main>
  );
}
