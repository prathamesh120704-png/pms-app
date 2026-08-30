"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  errorText,
  glassPanel,
  inputClass,
  pageMain,
  pageSubtitle,
  pageTitle,
  primaryBtn,
} from "@/lib/ui";

type EmployeeRole = "employee" | "manager" | "hr_admin";

type ManagerOption = {
  id: string;
  full_name: string;
};

const roles: { value: EmployeeRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "hr_admin", label: "HR Admin" },
];

export function NewEmployeeForm({
  department,
}: {
  department: string | null;
}) {
  const router = useRouter();
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return;
    }

    if (!department) {
      return;
    }

    const supabase = createClient(url, anonKey);

    void supabase
      .from("employees")
      .select("id, full_name")
      .eq("department", department)
      .eq("role", "manager")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => {
        setManagers((data as ManagerOption[] | null) ?? []);
      });
  }, [department]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      setError("Supabase is not configured.");
      setIsSubmitting(false);
      return;
    }

    if (!department) {
      setError("Your employee record has no department, so you cannot add people.");
      setIsSubmitting(false);
      return;
    }

    const form = new FormData(event.currentTarget);
    const managerId = String(form.get("manager_id") ?? "");
    const supabase = createClient(url, anonKey);

    const { error: insertError } = await supabase.from("employees").insert({
      clerk_user_id: crypto.randomUUID(),
      full_name: String(form.get("full_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      designation: String(form.get("designation") ?? "").trim() || null,
      department,
      date_of_joining: String(form.get("date_of_joining") ?? "") || null,
      role: String(form.get("role") ?? "employee") as EmployeeRole,
      manager_id: managerId || null,
    });

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/employees");
  }

  return (
    <div className={pageMain}>
      <div className="mx-auto max-w-xl">
        <h1 className={pageTitle}>Add employee</h1>
        <p className={pageSubtitle}>
          Create a record for someone who will use the performance cycle.{" "}
          <Link
            href="/admin/employees"
            className="font-medium text-indigo-600 underline underline-offset-2"
          >
            Back to employees
          </Link>
        </p>

        <form
          onSubmit={handleSubmit}
          className={`${glassPanel} mt-8 space-y-5 p-6`}
        >
          <label className="block text-sm font-medium text-zinc-600">
            Full name
            <input
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            Designation
            <input name="designation" type="text" className={inputClass} />
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            Department
            <input
              name="department"
              type="text"
              readOnly
              value={department ?? ""}
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            Date of joining
            <input
              name="date_of_joining"
              type="date"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            Role
            <select name="role" defaultValue="employee" className={inputClass}>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            Manager
            <select name="manager_id" defaultValue="" className={inputClass}>
              <option value="">No manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className={errorText}>{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || !department}
            className={primaryBtn}
          >
            {isSubmitting ? "Saving…" : "Add employee"}
          </button>
        </form>
      </div>
    </div>
  );
}
