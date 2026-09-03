import { SeedTestOrganizationButton } from "@/components/seed-test-organization-button";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui";
import { HrDashboard } from "./hr-dashboard";

export default async function AdminHomePage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  return (
    <main className={pageMain}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>HR dashboard</h1>
          <p className={pageSubtitle}>
            Track cycle progress across all active employees in your organization.
          </p>
        </div>
        <SeedTestOrganizationButton />
      </div>
      <div className="mt-8">
        <HrDashboard />
      </div>
    </main>
  );
}
