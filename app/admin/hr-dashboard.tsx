"use client";

import { createClient } from "@supabase/supabase-js";
import { CheckCircle2, Clock, Users, UserX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import {
  emptyState,
  errorText,
  glassCard,
  gradientText,
  mutedText,
  tableHead,
  tableRow,
  tableWrap,
} from "@/lib/ui";

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
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "sent_back"
    | "pending"
    | "accepted"
    | "rejected"
    | "completed";
};

type OpenCycle = {
  id: string;
  name: string;
};

export type PipelineStatus =
  | "Drafting Goals"
  | "Goal Rejected"
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
  if (goals.some((goal) => goal.status === "rejected")) {
    return "Goal Rejected";
  }
  if (goals.some((goal) => goal.status === "submitted" || goal.status === "pending")) {
    return "Pending Manager Approval";
  }
  if (
    goals.length > 0 &&
    goals.every(
      (goal) =>
        goal.status === "approved" ||
        goal.status === "accepted" ||
        goal.status === "completed",
    )
  ) {
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

const badgeTone: Record<PipelineStatus, BadgeTone> = {
  "Drafting Goals": "draft",
  "Goal Rejected": "danger",
  "Pending Self-Appraisal": "pending",
  "Pending Manager Approval": "pending",
  "Self-Appraisal Submitted": "pending",
  Completed: "success",
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
    const employeeIds = tracked.map((person) => person.id);

    const [{ data: reviewRows }, { data: goalRows }] = await Promise.all([
      employeeIds.length === 0
        ? Promise.resolve({ data: [] })
        : supabase
            .from("reviews")
            .select("employee_id, status, submitted_at, reviewed_at")
            .eq("cycle_id", openCycle.id)
            .in("employee_id", employeeIds),
      employeeIds.length === 0
        ? Promise.resolve({ data: [] })
        : supabase
            .from("goals")
            .select("employee_id, status")
            .eq("cycle_id", openCycle.id)
            .in("employee_id", employeeIds),
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
        row.status === "Self-Appraisal Submitted" ||
        row.status === "Goal Rejected",
    ).length;
    return { total, completed, pendingSelf, pendingManager };
  }, [rows]);

  if (isLoading) {
    return (
      <p className={`px-6 py-16 text-center ${mutedText}`}>
        Loading the cycle overview…
      </p>
    );
  }

  if (!cycle) {
    return (
      <p className={emptyState}>
        There is no open review cycle. Open a cycle when the team is ready —
        people do their best work when they have time to prepare.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className={`max-w-3xl leading-6 ${mutedText}`}>
        Open cycle: <span className="font-medium text-zinc-900">{cycle.name}</span>
        . This view is for support, not surveillance. Amber badges show where a
        manager may need a kind reminder so nobody is left waiting.
      </p>

      {error ? <p className={errorText}>{error}</p> : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li className={`${glassCard} p-5`}>
          <Users className="size-5 text-indigo-600" />
          <p className="mt-3 text-sm text-zinc-600">Total employees</p>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${gradientText}`}>
            {metrics.total}
          </p>
        </li>
        <li className={`${glassCard} p-5`}>
          <CheckCircle2 className="size-5 text-emerald-600" />
          <p className="mt-3 text-sm text-zinc-600">Reviews completed</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">
            {metrics.completed}
          </p>
        </li>
        <li className={`${glassCard} p-5`}>
          <Clock className="size-5 text-indigo-600" />
          <p className="mt-3 text-sm text-zinc-600">Pending self-appraisal</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-indigo-700">
            {metrics.pendingSelf}
          </p>
        </li>
        <li className={`${glassCard} border-amber-200/80 p-5`}>
          <UserX className="size-5 text-amber-600" />
          <p className="mt-3 text-sm text-amber-800">Pending manager action</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-800">
            {metrics.pendingManager}
          </p>
        </li>
      </ul>

      <div className={tableWrap}>
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-zinc-600">
            No active employees to track for this cycle yet.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="px-4 py-3 font-medium">Employee name</th>
                <th className="px-4 py-3 font-medium">Manager name</th>
                <th className="px-4 py-3 font-medium">Current status</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={tableRow}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{row.managerName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={badgeTone[row.status]}>
                      {row.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
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
