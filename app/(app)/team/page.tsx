import { scopedDepartment } from "@/lib/department-scope";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui";
import { TeamPanel } from "./team-panel";

export default async function MyTeamPage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "manager") {
    redirect("/dashboard");
  }

  const department = scopedDepartment(employee.department);

  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>My Team</h1>
      <p className={pageSubtitle}>
        Review submitted and rejected goals from people in{" "}
        {department ?? "your department"}.
      </p>
      <div className="mt-8">
        <TeamPanel managerId={employee.id} department={department} />
      </div>
    </main>
  );
}
