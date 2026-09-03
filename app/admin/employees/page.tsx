import { EmployeesDirectory } from "./employees-directory";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";

export default async function AdminEmployeesPage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  return <EmployeesDirectory />;
}
