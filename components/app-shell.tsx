import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import {
  getCurrentEmployee,
  type EmployeeRole,
} from "@/lib/get-current-employee";

export async function AppShell({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: EmployeeRole | EmployeeRole[];
}) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/not-setup");
  }

  if (requireRole) {
    const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!allowed.includes(employee.role)) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AppHeader role={employee.role} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
