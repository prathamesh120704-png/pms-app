"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type GoalStatus = "draft" | "submitted" | "approved" | "sent_back";

type Goal = {
  id: string;
  employee_id: string;
  cycle_id: string;
  title: string;
  description: string | null;
  weightage: number;
  target_date: string | null;
  status: GoalStatus;
  manager_comment: string | null;
};

type DirectReport = {
  id: string;
  full_name: string;
  designation: string | null;
  email: string;
};

type PendingAppraisal = {
  reviewId: string;
  employeeId: string;
  fullName: string;
  email: string;
};

type OpenCycle = {
  id: string;
  name: string;
};

const inputClassName =
  "mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function TeamPanel({ managerId }: { managerId: string }) {
  const [cycle, setCycle] = useState<OpenCycle | null>(null);
  const [reports, setReports] = useState<DirectReport[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pendingAppraisals, setPendingAppraisals] = useState<PendingAppraisal[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [sendBackFor, setSendBackFor] = useState<string | null>(null);
  const [sendBackComment, setSendBackComment] = useState("");

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

    const { data: reportRows, error: reportError } = await supabase
      .from("employees")
      .select("id, full_name, designation, email")
      .eq("manager_id", managerId)
      .eq("is_active", true)
      .order("full_name");

    if (reportError) {
      setError(reportError.message);
      setIsLoading(false);
      return;
    }

    const team = (reportRows as DirectReport[] | null) ?? [];
    setReports(team);
    setCycle((cycleRow as OpenCycle | null) ?? null);

    if (!cycleRow || team.length === 0) {
      setGoals([]);
      setPendingAppraisals([]);
      setIsLoading(false);
      return;
    }

    const reportIds = team.map((report) => report.id);
    const openCycle = cycleRow as OpenCycle;

    const { data: goalRows, error: goalsError } = await supabase
      .from("goals")
      .select(
        "id, employee_id, cycle_id, title, description, weightage, target_date, status, manager_comment",
      )
      .eq("cycle_id", openCycle.id)
      .eq("status", "submitted")
      .in("employee_id", reportIds)
      .order("title");

    if (goalsError) {
      setError(goalsError.message);
      setGoals([]);
    } else {
      setGoals((goalRows as Goal[] | null) ?? []);
    }

    const { data: reviewRows, error: reviewError } = await supabase
      .from("reviews")
      .select("id, employee_id")
      .eq("cycle_id", openCycle.id)
      .eq("status", "self_submitted")
      .eq("manager_id", managerId)
      .in("employee_id", reportIds);

    if (reviewError) {
      setError(reviewError.message);
      setPendingAppraisals([]);
    } else {
      const byId = new Map(team.map((report) => [report.id, report]));
      setPendingAppraisals(
        ((reviewRows as { id: string; employee_id: string }[] | null) ?? [])
          .map((row) => {
            const report = byId.get(row.employee_id);
            if (!report) return null;
            return {
              reviewId: row.id,
              employeeId: report.id,
              fullName: report.full_name,
              email: report.email,
            };
          })
          .filter((row): row is PendingAppraisal => row !== null),
      );
    }

    setIsLoading(false);
  }, [managerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const goalsByEmployee = useMemo(() => {
    const grouped = new Map<string, Goal[]>();
    for (const goal of goals) {
      const list = grouped.get(goal.employee_id) ?? [];
      list.push(goal);
      grouped.set(goal.employee_id, list);
    }
    return reports
      .map((report) => ({
        report,
        goals: grouped.get(report.id) ?? [],
      }))
      .filter((group) => group.goals.length > 0);
  }, [goals, reports]);

  async function updateGoal(
    goalId: string,
    patch: { status: GoalStatus; manager_comment?: string },
  ) {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const previous = goals;
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
    setActingId(goalId);
    setError(null);

    const { error: updateError } = await supabase
      .from("goals")
      .update(patch)
      .eq("id", goalId)
      .eq("status", "submitted");

    setActingId(null);

    if (updateError) {
      setGoals(previous);
      setError(updateError.message);
    }
  }

  async function handleApprove(goalId: string) {
    setSendBackFor(null);
    await updateGoal(goalId, { status: "approved" });
  }

  async function handleSendBack(goalId: string) {
    const comment = sendBackComment.trim();
    if (!comment) {
      setError("A comment is required when sending a goal back.");
      return;
    }

    await updateGoal(goalId, {
      status: "sent_back",
      manager_comment: comment,
    });
    setSendBackFor(null);
    setSendBackComment("");
  }

  if (isLoading) {
    return (
      <p className="px-6 py-16 text-center text-sm text-zinc-500">
        Loading your team’s submitted goals…
      </p>
    );
  }

  if (!cycle) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        There is no open review cycle right now.
      </p>
    );
  }

  if (reports.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No one reports to you yet, so there is nothing to approve.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Open cycle:{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {cycle.name}
        </span>
        . Only submitted goals appear here.
      </p>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Goals Awaiting Approval
        </h2>
      {goalsByEmployee.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          No submitted goals waiting for your approval.
        </p>
      ) : (
        goalsByEmployee.map(({ report, goals: employeeGoals }) => (
          <section
            key={report.id}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-base font-semibold tracking-tight">
                {report.full_name}
              </h2>
              <p className="text-sm text-zinc-500">
                {report.designation ?? "No designation"}
              </p>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {employeeGoals.map((goal) => (
                <li key={goal.id} className="px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {goal.description ?? "—"}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Weightage {Number(goal.weightage).toFixed(2)} · Target{" "}
                        {formatDate(goal.target_date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={actingId === goal.id}
                        onClick={() => void handleApprove(goal.id)}
                        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actingId === goal.id}
                        onClick={() => {
                          setError(null);
                          setSendBackFor(goal.id);
                          setSendBackComment("");
                        }}
                        className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        Send Back
                      </button>
                    </div>
                  </div>
                  {sendBackFor === goal.id ? (
                    <div className="mt-3 max-w-lg">
                      <label className="block text-sm font-medium">
                        Comment (required)
                        <textarea
                          value={sendBackComment}
                          onChange={(event) =>
                            setSendBackComment(event.target.value)
                          }
                          rows={3}
                          className={inputClassName}
                          placeholder="Tell them what to change."
                        />
                      </label>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={actingId === goal.id}
                          onClick={() => void handleSendBack(goal.id)}
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Confirm send back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSendBackFor(null);
                            setSendBackComment("");
                          }}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Team Appraisals to Complete
        </h2>
        {pendingAppraisals.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            No team members have submitted their self-appraisals yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {pendingAppraisals.map((appraisal) => (
              <li
                key={appraisal.reviewId}
                className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium">{appraisal.fullName}</p>
                  <p className="mt-1 text-sm text-zinc-500">{appraisal.email}</p>
                </div>
                <Link
                  href={`/team/review/${appraisal.employeeId}`}
                  className="mt-4 inline-flex w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Review Employee
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
