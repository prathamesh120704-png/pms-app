import { getCurrentEmployee } from "@/lib/get-current-employee";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui";
import { GoalsPanel } from "./goals-panel";

export default async function MyGoalsPage() {
  const employee = await getCurrentEmployee();

  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>My Goals</h1>
      <p className={pageSubtitle}>
        Set draft goals for the open review cycle, or accept or reject goals
        your manager assigned. Submit drafts when the weightage totals 100.
      </p>
      <div className="mt-8">
        {employee ? (
          <GoalsPanel
            employeeId={employee.id}
            department={employee.department}
          />
        ) : (
          <p className="text-sm text-zinc-600">Could not load your employee record.</p>
        )}
      </div>
    </main>
  );
}
