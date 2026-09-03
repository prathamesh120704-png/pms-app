import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui";
import { TeamPanel } from "./team-panel";

export default async function MyTeamPage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "manager") {
    redirect("/dashboard");
  }

  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>My Team</h1>
      <p className={pageSubtitle}>
        Assign goals to direct reports, review submitted goals, and follow up on rejections.
      </p>
      <div className="mt-8">
        <TeamPanel managerId={employee.id} />
      </div>
    </main>
  );
}
