"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

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

const inputClassName =
  "mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500";

export default function NewEmployeePage() {
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

    const supabase = createClient(url, anonKey);

    void supabase
      .from("employees")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => {
        setManagers((data as ManagerOption[] | null) ?? []);
      });
  }, []);

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

    const form = new FormData(event.currentTarget);
    const managerId = String(form.get("manager_id") ?? "");
    const supabase = createClient(url, anonKey);

    const { error: insertError } = await supabase.from("employees").insert({
      clerk_user_id: crypto.randomUUID(),
      full_name: String(form.get("full_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      designation: String(form.get("designation") ?? "").trim() || null,
      department: String(form.get("department") ?? "").trim() || null,
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
    <div className="min-h-full bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">Add employee</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create a record for someone who will use the performance cycle.{" "}
          <Link
            href="/admin/employees"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Back to employees
          </Link>
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <label className="block text-sm font-medium">
            Full name
            <input
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-medium">
            Designation
            <input name="designation" type="text" className={inputClassName} />
          </label>

          <label className="block text-sm font-medium">
            Department
            <input name="department" type="text" className={inputClassName} />
          </label>

          <label className="block text-sm font-medium">
            Date of joining
            <input
              name="date_of_joining"
              type="date"
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-medium">
            Role
            <select name="role" defaultValue="employee" className={inputClassName}>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Manager
            <select name="manager_id" defaultValue="" className={inputClassName}>
              <option value="">No manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Saving…" : "Add employee"}
          </button>
        </form>
      </div>
    </div>
  );
}
