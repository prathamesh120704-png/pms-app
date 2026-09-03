"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  pageMain,
  pageSubtitle,
  pageTitle,
  primaryBtn,
  tableHead,
  tableRow,
  tableWrap,
} from "@/lib/ui";

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

export function EmployeesDirectory() {
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
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => {
        setEmployees((data as EmployeeListRow[] | null) ?? []);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className={`${pageMain} min-h-full`}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={pageTitle}>Employees</h1>
            <p className={pageSubtitle}>
              All active employees and who they report to.
            </p>
          </div>
          <Link href="/admin/employees/new" className={primaryBtn}>
            Add employee
          </Link>
        </div>

        <div className={`mt-8 ${tableWrap}`}>
          {isLoading ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-600">
              Loading employees…
            </p>
          ) : employees.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-600">
              No active employees yet. Add people to see them here.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className={tableRow}>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {employee.full_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {employee.designation ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {employee.department ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {managerFullName(employee.manager)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {roleLabels[employee.role]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={employee.is_active ? "success" : "draft"}>
                        {employee.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
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
