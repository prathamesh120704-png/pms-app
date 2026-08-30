import { scopedDepartment } from "@/lib/department-scope";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { NewEmployeeForm } from "./new-employee-form";

export default async function NewEmployeePage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  return (
    <NewEmployeeForm department={scopedDepartment(employee.department)} />
  );
}
