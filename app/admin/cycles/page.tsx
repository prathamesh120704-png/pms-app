import { CyclesPanel } from "./cycles-panel";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";

export default async function AdminCyclesPage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  return <CyclesPanel hrAdminId={employee.id} />;
}
