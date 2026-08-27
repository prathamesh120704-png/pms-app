import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { ManagerReviewPanel } from "./manager-review-panel";

export default async function TeamEmployeeReviewPage({
  params,
}: {
  params: Promise<{ employee_id: string }>;
}) {
  const manager = await getCurrentEmployee();
  const { employee_id } = await params;

  if (manager?.role !== "manager") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Complete performance review
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Add your comments and ratings, then submit the final review.
      </p>
      <div className="mt-8">
        <ManagerReviewPanel employeeId={employee_id} managerId={manager.id} />
      </div>
    </main>
  );
}
