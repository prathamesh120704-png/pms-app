import { getCurrentEmployee } from "@/lib/get-current-employee";
import { GoalsPanel } from "./goals-panel";

export default async function MyGoalsPage() {
  const employee = await getCurrentEmployee();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Set draft goals for the open review cycle. Submit them when the
        weightage totals 100.
      </p>
      <div className="mt-8">
        {employee ? (
          <GoalsPanel employeeId={employee.id} />
        ) : (
          <p className="text-sm text-zinc-500">Could not load your employee record.</p>
        )}
      </div>
    </main>
  );
}
