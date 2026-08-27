"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

type EmployeeRole = "employee" | "manager" | "hr_admin";

type EmployeeRow = {
  id: string;
  full_name: string;
  email: string;
  manager_id: string | null;
  role: EmployeeRole;
  is_active: boolean;
  created_at: string;
};

type ReviewRow = {
  employee_id: string;
  status: "draft" | "self_submitted" | "reviewed" | "completed";
  submitted_at: string | null;
  reviewed_at: string | null;
};

type GoalRow = {
  employee_id: string;
  status: "draft" | "submitted" | "approved" | "sent_back";
};

type OpenCycle = {
  id: string;
  name: string;
};

export type PipelineStatus =
  | "Drafting Goals"
  | "Pending Manager Approval"
  | "Pending Self-Appraisal"
  | "Self-Appraisal Submitted"
  | "Completed";

type TrackingRow = {
  id: string;
  name: string;
  managerName: string;
  status: PipelineStatus;
  lastUpdated: string | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function deriveStatus(goals: GoalRow[], review: ReviewRow | undefined): PipelineStatus {
  if (review?.status === "completed") return "Completed";
  if (review?.status === "self_submitted") return "Self-Appraisal Submitted";
  if (goals.some((goal) => goal.status === "submitted")) {
    return "Pending Manager Approval";
  }
  if (goals.length > 0 && goals.every((goal) => goal.status === "approved")) {
    return "Pending Self-Appraisal";
  }
  return "Drafting Goals";
}

function lastUpdated(review: ReviewRow | undefined): string | null {
  return review?.reviewed_at ?? review?.submitted_at ?? null;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

const badgeClass: Record<PipelineStatus, string> = {
  "Drafting Goals":
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  "Pending Self-Appraisal":
    "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  "Pending Manager Approval":
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "Self-Appraisal Submitted":
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  Completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

export function HrDashboard() {
  const [cycle, setCycle] = useState<OpenCycle | null>(null);
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      setIsLoading(false);
      return;
    }

    setError(null);

    const { data: cycleRow, error: cycleError } = await supabase
      .from("review_cycles")
      .select("id, name")
      .eq("status", "open")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cycleError) {
      setError(cycleError.message);
      setIsLoading(false);
      return;
    }

    if (!cycleRow) {
      setCycle(null);
      setRows([]);
      setIsLoading(false);
      return;
    }

    const openCycle = cycleRow as OpenCycle;
    setCycle(openCycle);

    const { data: employeeRows, error: employeeError } = await supabase
      .from("employees")
      .select("id, full_name, email, manager_id, role, is_active, created_at")
      .eq("is_active", true)
      .order("full_name");

    if (employeeError) {
      setError(employeeError.message);
      setIsLoading(false);
      return;
    }

    const everyone = (employeeRows as EmployeeRow[] | null) ?? [];
    const tracked = everyone.filter((person) => person.role !== "hr_admin");
    const names = new Map(everyone.map((person) => [person.id, person.full_name]));

    const [{ data: reviewRows }, { data: goalRows }] = await Promise.all([
      supabase
        .from("reviews")
        .select("employee_id, status, submitted_at, reviewed_at")
        .eq("cycle_id", openCycle.id),
      supabase
        .from("goals")
        .select("employee_id, status")
        .eq("cycle_id", openCycle.id),
    ]);

    const reviewsByEmployee = new Map(
      ((reviewRows as ReviewRow[] | null) ?? []).map((row) => [
        row.employee_id,
        row,
      ]),
    );
    const goalsByEmployee = new Map<string, GoalRow[]>();
    for (const goal of (goalRows as GoalRow[] | null) ?? []) {
      const list = goalsByEmployee.get(goal.employee_id) ?? [];
      list.push(goal);
      goalsByEmployee.set(goal.employee_id, list);
    }

    setRows(
      tracked.map((person) => {
        const review = reviewsByEmployee.get(person.id);
        const goals = goalsByEmployee.get(person.id) ?? [];
        return {
          id: person.id,
          name: person.full_name,
          managerName: person.manager_id
            ? (names.get(person.manager_id) ?? "—")
            : "—",
          status: deriveStatus(goals, review),
          lastUpdated: lastUpdated(review),
        };
      }),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((row) => row.status === "Completed").length;
    const pendingSelf = rows.filter(
      (row) => row.status === "Pending Self-Appraisal",
    ).length;
    const pendingManager = rows.filter(
      (row) =>
        row.status === "Pending Manager Approval" ||
        row.status === "Self-Appraisal Submitted",
    ).length;
    return { total, completed, pendingSelf, pendingManager };
  }, [rows]);

  if (isLoading) {
    return (
      <p className="px-6 py-16 text-center text-sm text-zinc-500">
        Loading the cycle overview…
      </p>
    );
  }

  if (!cycle) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        There is no open review cycle. Open a cycle when the team is ready —
        people do their best work when they have time to prepare.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Open cycle:{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {cycle.name}
        </span>
        . This view is for support, not surveillance. Amber badges show where a
        manager may need a kind reminder so nobody is left waiting.
      </p>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Total employees</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {metrics.total}
          </p>
        </li>
        <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Reviews completed</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {metrics.completed}
          </p>
        </li>
        <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Pending self-appraisal</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {metrics.pendingSelf}
          </p>
        </li>
        <li className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Pending manager action
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 dark:text-amber-100">
            {metrics.pendingManager}
          </p>
        </li>
      </ul>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-zinc-500">
            No employees to track for this cycle yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Employee name</th>
                <th className="px-4 py-3 font-medium">Manager name</th>
                <th className="px-4 py-3 font-medium">Current status</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.managerName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatTimestamp(row.lastUpdated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
