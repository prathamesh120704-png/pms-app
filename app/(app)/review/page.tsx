import { getCurrentEmployee } from "@/lib/get-current-employee";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui";
import { ReviewPanel } from "./review-panel";

export default async function MyReviewPage() {
  const employee = await getCurrentEmployee();

  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>My Review</h1>
      <p className={pageSubtitle}>
        Complete your self-appraisal on manager-approved goals for the open
        cycle.
      </p>
      <div className="mt-8">
        {employee ? (
          <ReviewPanel
            employeeId={employee.id}
            employeeName={employee.full_name}
            managerId={employee.manager_id}
            department={employee.department}
          />
        ) : (
          <p className="text-sm text-zinc-600">
            Could not load your employee record.
          </p>
        )}
      </div>
    </main>
  );
}
