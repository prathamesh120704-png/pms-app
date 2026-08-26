"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

type EmployeeRole = "employee" | "manager" | "hr_admin";

type EmployeeRow = {
  id: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
  designation: string | null;
  department: string | null;
  date_of_joining: string | null;
  manager_id: string | null;
  role: EmployeeRole;
  is_active: boolean;
  created_at: string;
};

type ManagerEmbed = { full_name: string } | { full_name: string }[] | null;

type EmployeeListRow = Pick<
  EmployeeRow,
  "id" | "full_name" | "designation" | "department" | "role" | "is_active"
> & {
  manager: ManagerEmbed;
};

const roleLabels: Record<EmployeeRole, string> = {
  employee: "Employee",
  manager: "Manager",
  hr_admin: "HR Admin",
};

function managerFullName(manager: ManagerEmbed): string {
  if (!manager) return "—";
  if (Array.isArray(manager)) return manager[0]?.full_name ?? "—";
  return manager.full_name || "—";
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    const supabase = createClient(url, anonKey);

    void supabase
      .from("employees")
      .select(
        "id, full_name, designation, department, role, is_active, manager:manager_id(full_name)",
      )
      .order("full_name")
      .then(({ data }) => {
        setEmployees((data as EmployeeListRow[] | null) ?? []);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-full bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Everyone in the organization and who they report to.
            </p>
          </div>
          <Link
            href="/admin/employees/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add employee
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {isLoading ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-500">
              Loading employees…
            </p>
          ) : employees.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-500">
              No employees yet. Add people to the employees table to see them
              here.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-4 py-3 font-medium">
                      {employee.full_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {employee.designation ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {employee.department ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {managerFullName(employee.manager)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {roleLabels[employee.role]}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {employee.is_active ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
