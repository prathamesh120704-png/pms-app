import { getCurrentEmployee } from "@/lib/get-current-employee";
import { ReviewPanel } from "./review-panel";

export default async function MyReviewPage() {
  const employee = await getCurrentEmployee();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">My Review</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Complete your self-appraisal on manager-approved goals for the open
        cycle.
      </p>
      <div className="mt-8">
        {employee ? (
          <ReviewPanel
            employeeId={employee.id}
            employeeName={employee.full_name}
            managerId={employee.manager_id}
          />
        ) : (
          <p className="text-sm text-zinc-500">
            Could not load your employee record.
          </p>
        )}
      </div>
    </main>
  );
}
