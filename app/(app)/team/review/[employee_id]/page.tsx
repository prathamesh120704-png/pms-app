import { scopedDepartment } from "@/lib/department-scope";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { pageMain, pageSubtitle, pageTitle } from "@/lib/ui";
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
    <main className={pageMain}>
      <h1 className={pageTitle}>Complete performance review</h1>
      <p className={pageSubtitle}>
        Add your comments and ratings, then submit the final review.
      </p>
      <div className="mt-8">
        <ManagerReviewPanel
          employeeId={employee_id}
          managerId={manager.id}
          department={scopedDepartment(manager.department)}
        />
      </div>
    </main>
  );
}
