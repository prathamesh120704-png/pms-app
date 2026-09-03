"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { assignGoalToEmployee } from "@/app/(app)/team/actions";
import { StatusBadge, goalBadgeTone } from "@/components/status-badge";
import {
  GOAL_SELECT,
  goalStatusLabel,
  type Goal,
  type GoalStatus,
} from "@/lib/goals";
import {
  emptyState,
  errorText,
  glassCard,
  glassPanel,
  inputClass,
  mutedText,
  primaryBtn,
  secondaryBtn,
} from "@/lib/ui";

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
  const [assigningTo, setAssigningTo] = useState<DirectReport | null>(null);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDescription, setAssignDescription] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

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
      .select(GOAL_SELECT)
      .eq("cycle_id", openCycle.id)
      .in("status", ["submitted", "rejected", "pending"])
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

  const submittedByEmployee = useMemo(() => {
    const grouped = new Map<string, Goal[]>();
    for (const goal of goals) {
      if (goal.status !== "submitted") continue;
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

  const pendingByEmployee = useMemo(() => {
    const grouped = new Map<string, Goal[]>();
    for (const goal of goals) {
      if (goal.status !== "pending") continue;
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

  const rejectedByEmployee = useMemo(() => {
    const grouped = new Map<string, Goal[]>();
    for (const goal of goals) {
      if (goal.status !== "rejected") continue;
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

  async function handleAssignGoal() {
    if (!assigningTo || !cycle) return;

    const title = assignTitle.trim();
    const description = assignDescription.trim();
    const dueDate = assignDueDate.trim();

    if (!title || !description || !dueDate) {
      setError("Title, description, and due date are all required.");
      return;
    }

    setIsAssigning(true);
    setError(null);

    const result = await assignGoalToEmployee({
      employeeId: assigningTo.id,
      cycleId: cycle.id,
      title,
      description,
      dueDate,
    });

    setIsAssigning(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setAssigningTo(null);
    setAssignTitle("");
    setAssignDescription("");
    setAssignDueDate("");
    await load();
  }

  if (isLoading) {
    return (
      <p className={`px-6 py-16 text-center ${mutedText}`}>
        Loading your team’s submitted and rejected goals…
      </p>
    );
  }

  if (!cycle) {
    return (
      <p className={emptyState}>There is no open review cycle right now.</p>
    );
  }

  if (reports.length === 0) {
    return (
      <p className={emptyState}>
        No direct reports assigned to you yet, so there is nothing to approve.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className={mutedText}>
        Open cycle: <span className="font-medium text-zinc-900">{cycle.name}</span>
        . Assign goals to direct reports, approve submitted goals, and review
        rejections.
      </p>

      {error ? <p className={errorText}>{error}</p> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Direct Reports</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {reports.map((report) => (
            <li key={report.id} className={`${glassCard} flex flex-col justify-between p-5`}>
              <div>
                <p className="font-medium text-zinc-900">{report.full_name}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {report.designation ?? "No designation"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">{report.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAssigningTo(report);
                  setAssignTitle("");
                  setAssignDescription("");
                  setAssignDueDate("");
                }}
                className={`${primaryBtn} mt-4 w-fit`}
              >
                Assign Goal
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Assigned Goals Awaiting Response
        </h2>
        {pendingByEmployee.length === 0 ? (
          <p className={emptyState}>
            No assigned goals are waiting for an employee to accept or reject.
          </p>
        ) : (
          pendingByEmployee.map(({ report, goals: employeeGoals }) => (
            <section key={report.id} className={`overflow-hidden ${glassPanel}`}>
              <div className="border-b border-zinc-200/80 px-4 py-3">
                <h2 className="text-base font-semibold tracking-tight">
                  {report.full_name}
                </h2>
                <p className="text-sm text-zinc-400">
                  {report.designation ?? "No designation"}
                </p>
              </div>
              <ul className="divide-y divide-zinc-200">
                {employeeGoals.map((goal) => (
                  <li key={goal.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900">{goal.title}</p>
                      <StatusBadge tone={goalBadgeTone(goal.status)}>
                        {goalStatusLabel[goal.status]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">
                      {goal.description ?? "—"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      Due {formatDate(goal.target_date)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Goals Awaiting Approval
        </h2>
        {submittedByEmployee.length === 0 ? (
          <p className={emptyState}>
            No submitted goals waiting for your approval.
          </p>
        ) : (
          submittedByEmployee.map(({ report, goals: employeeGoals }) => (
            <section key={report.id} className={`overflow-hidden ${glassPanel}`}>
              <div className="border-b border-zinc-200/80 px-4 py-3">
                <h2 className="text-base font-semibold tracking-tight">
                  {report.full_name}
                </h2>
                <p className="text-sm text-zinc-400">
                  {report.designation ?? "No designation"}
                </p>
              </div>
              <ul className="divide-y divide-zinc-200">
                {employeeGoals.map((goal) => (
                  <li key={goal.id} className="px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-900">{goal.title}</p>
                          <StatusBadge tone={goalBadgeTone(goal.status)}>
                            {goalStatusLabel[goal.status]}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-zinc-600">
                          {goal.description ?? "—"}
                        </p>
                        <p className="mt-2 text-xs text-zinc-400">
                          Weightage {Number(goal.weightage).toFixed(2)} · Target{" "}
                          {formatDate(goal.target_date)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={actingId === goal.id}
                          onClick={() => void handleApprove(goal.id)}
                          className={primaryBtn}
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
                          className={secondaryBtn}
                        >
                          Send Back
                        </button>
                      </div>
                    </div>
                    {sendBackFor === goal.id ? (
                      <div className="mt-3 max-w-lg rounded-lg border border-rose-200 bg-rose-50 p-3">
                        <label className="block text-sm font-medium text-zinc-600">
                          Comment (required)
                          <textarea
                            value={sendBackComment}
                            onChange={(event) =>
                              setSendBackComment(event.target.value)
                            }
                            rows={3}
                            className={inputClass}
                            placeholder="Tell them what to change."
                          />
                        </label>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={actingId === goal.id}
                            onClick={() => void handleSendBack(goal.id)}
                            className={primaryBtn}
                          >
                            Confirm send back
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSendBackFor(null);
                              setSendBackComment("");
                            }}
                            className={secondaryBtn}
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
        <h2 className="text-lg font-semibold tracking-tight">Rejected Goals</h2>
        {rejectedByEmployee.length === 0 ? (
          <p className={emptyState}>No assigned goals have been rejected.</p>
        ) : (
          rejectedByEmployee.map(({ report, goals: employeeGoals }) => (
            <section
              key={report.id}
              className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50/70 shadow-sm"
            >
              <div className="border-b border-rose-200/80 bg-rose-50 px-4 py-3">
                <h2 className="text-base font-semibold tracking-tight text-rose-950">
                  {report.full_name}
                </h2>
                <p className="text-sm text-rose-800/80">
                  {report.designation ?? "No designation"}
                </p>
              </div>
              <ul className="divide-y divide-rose-200/80">
                {employeeGoals.map((goal) => (
                  <li key={goal.id} className="bg-white/70 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900">{goal.title}</p>
                      <StatusBadge tone={goalBadgeTone(goal.status)}>
                        {goalStatusLabel[goal.status]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">
                      {goal.description ?? "—"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      Weightage {Number(goal.weightage).toFixed(2)} · Target{" "}
                      {formatDate(goal.target_date)}
                    </p>
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-rose-800">
                        Rejection reason
                      </p>
                      <p className="mt-1 text-sm text-rose-950">
                        {goal.rejection_reason?.trim()
                          ? goal.rejection_reason
                          : "No reason was recorded."}
                      </p>
                    </div>
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
          <p className={emptyState}>
            No team members have submitted their self-appraisals yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {pendingAppraisals.map((appraisal) => (
              <li
                key={appraisal.reviewId}
                className={`${glassCard} flex flex-col justify-between p-5`}
              >
                <div>
                  <p className="font-medium text-zinc-900">{appraisal.fullName}</p>
                  <p className="mt-1 text-sm text-zinc-400">{appraisal.email}</p>
                </div>
                <Link
                  href={`/team/review/${appraisal.employeeId}`}
                  className={`${primaryBtn} mt-4 w-fit`}
                >
                  Review Employee
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {assigningTo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-goal-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2
              id="assign-goal-title"
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              Assign goal
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Create a goal for{" "}
              <span className="font-medium text-zinc-900">
                {assigningTo.full_name}
              </span>
              . They must accept or reject it on their goals page.
            </p>
            <label className="mt-4 block text-sm font-medium text-zinc-600">
              Title
              <input
                type="text"
                required
                value={assignTitle}
                onChange={(event) => setAssignTitle(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-600">
              Description
              <textarea
                required
                rows={4}
                value={assignDescription}
                onChange={(event) => setAssignDescription(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-zinc-600">
              Due date
              <input
                type="date"
                required
                value={assignDueDate}
                onChange={(event) => setAssignDueDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isAssigning}
                onClick={() => {
                  setAssigningTo(null);
                  setAssignTitle("");
                  setAssignDescription("");
                  setAssignDueDate("");
                }}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isAssigning ||
                  !assignTitle.trim() ||
                  !assignDescription.trim() ||
                  !assignDueDate
                }
                onClick={() => void handleAssignGoal()}
                className={primaryBtn}
              >
                {isAssigning ? "Assigning…" : "Assign Goal"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
