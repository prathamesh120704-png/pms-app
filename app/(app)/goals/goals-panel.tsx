"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { StatusBadge, goalBadgeTone } from "@/components/status-badge";
import {
  acceptAssignedGoal,
  rejectAssignedGoal,
} from "@/app/(app)/goals/actions";
import {
  GOAL_SELECT,
  goalStatusLabel,
  isAssignedPending,
  type Goal,
  type GoalStatus,
} from "@/lib/goals";
import {
  emptyState,
  errorText,
  glassPanel,
  inputClass,
  mutedText,
  primaryBtn,
  secondaryBtn,
  tableHead,
  tableRow,
  tableWrap,
} from "@/lib/ui";

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

function sumWeightage(goals: Goal[]): number {
  return goals.reduce((sum, goal) => sum + Number(goal.weightage), 0);
}

function isExactly100(total: number): boolean {
  return Math.round(total * 100) === 10000;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function GoalsPanel({
  employeeId,
  department,
}: {
  employeeId: string;
  department: string | null;
}) {
  const [cycle, setCycle] = useState<OpenCycle | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectingGoal, setRejectingGoal] = useState<Goal | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalWeightage = useMemo(() => sumWeightage(goals), [goals]);
  const canSubmit =
    isExactly100(totalWeightage) &&
    goals.some((goal) => goal.status === "draft") &&
    !isSubmitting;

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      setIsLoading(false);
      return;
    }

    setError(null);

    const departmentName = department?.trim() || null;

    const selfQuery = supabase.from("employees").select("id").eq("id", employeeId);
    const { data: self } = departmentName
      ? await selfQuery.eq("department", departmentName).maybeSingle()
      : await selfQuery.maybeSingle();

    if (!self) {
      setError("You can only load goals for your own employee record.");
      setCycle(null);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const { data: cycleRow, error: cycleError } = await supabase
      .from("review_cycles")
      .select("id, name")
      .eq("status", "open")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cycleError) {
      setError(cycleError.message);
      setCycle(null);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    if (!cycleRow) {
      setCycle(null);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const openCycle = cycleRow as OpenCycle;
    setCycle(openCycle);

    const { data: goalRows, error: goalsError } = await supabase
      .from("goals")
      .select(GOAL_SELECT)
      .eq("employee_id", employeeId)
      .eq("cycle_id", openCycle.id)
      .order("title");

    if (goalsError) {
      setError(goalsError.message);
      setGoals([]);
    } else {
      setGoals((goalRows as Goal[] | null) ?? []);
    }

    setIsLoading(false);
  }, [department, employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cycle) return;

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const weightage = Number(formData.get("weightage"));
    const targetDate = String(formData.get("target_date") ?? "");

    if (!title || Number.isNaN(weightage) || weightage < 0 || weightage > 100) {
      setError("Enter a title and a weightage between 0 and 100.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("goals").insert({
      employee_id: employeeId,
      cycle_id: cycle.id,
      title,
      description: description || null,
      weightage,
      target_date: targetDate || null,
      status: "draft" satisfies GoalStatus,
      rejection_reason: null,
    });

    setIsSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    form.reset();
    await load();
  }

  async function handleSubmitForApproval() {
    if (!cycle || !canSubmit) return;

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("goals")
      .update({ status: "submitted" satisfies GoalStatus })
      .eq("employee_id", employeeId)
      .eq("cycle_id", cycle.id)
      .eq("status", "draft");

    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await load();
  }

  async function handleAccept(goalId: string) {
    setActingId(goalId);
    setError(null);
    const result = await acceptAssignedGoal(goalId);
    setActingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  async function handleSubmitRejection() {
    if (!rejectingGoal) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      setError("A rejection reason is required.");
      return;
    }

    setIsRejecting(true);
    setError(null);
    const result = await rejectAssignedGoal(rejectingGoal.id, reason);
    setIsRejecting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setRejectingGoal(null);
    setRejectionReason("");
    await load();
  }

  if (isLoading) {
    return <p className={`px-6 py-16 text-center ${mutedText}`}>Loading your goals…</p>;
  }

  if (!cycle) {
    return (
      <p className={emptyState}>
        There is no open review cycle right now. HR will open a cycle when it
        is time to set goals.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className={mutedText}>
        Cycle: <span className="font-medium text-zinc-900">{cycle.name}</span>
        . Assigned goals in <span className="font-medium">Pending</span> can be
        accepted or rejected.
      </p>

      <form
        onSubmit={handleAdd}
        className={`${glassPanel} grid gap-4 p-6 sm:grid-cols-2`}
      >
        <h2 className="text-base font-semibold tracking-tight sm:col-span-2">
          Add a goal
        </h2>

        <label className="block text-sm font-medium text-zinc-600 sm:col-span-2">
          Title
          <input name="title" type="text" required className={inputClass} />
        </label>

        <label className="block text-sm font-medium text-zinc-600 sm:col-span-2">
          Description
          <textarea
            name="description"
            required
            rows={3}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-zinc-600">
          Weightage
          <input
            name="weightage"
            type="number"
            required
            min={0}
            max={100}
            step={0.01}
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-zinc-600">
          Target date
          <input
            name="target_date"
            type="date"
            required
            className={inputClass}
          />
        </label>

        <div className="sm:col-span-2">
          <button type="submit" disabled={isSaving} className={primaryBtn}>
            {isSaving ? "Adding…" : "Add goal"}
          </button>
        </div>
      </form>

      <div className={`${glassPanel} flex flex-wrap items-center justify-between gap-3 p-5`}>
        <p className="text-sm text-zinc-400">
          Total weightage:{" "}
          <span
            className={
              isExactly100(totalWeightage)
                ? "font-semibold text-emerald-700"
                : "font-semibold text-amber-700"
            }
          >
            {totalWeightage.toFixed(2)} / 100
          </span>
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmitForApproval()}
          className={primaryBtn}
        >
          {isSubmitting ? "Submitting…" : "Submit Goals for Approval"}
        </button>
      </div>

      {!isExactly100(totalWeightage) ? (
        <p className={mutedText}>
          You can keep adding draft goals. Submit is available only when the
          total weightage is exactly 100.
        </p>
      ) : null}

      {error ? <p className={errorText}>{error}</p> : null}

      <div className={tableWrap}>
        {goals.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-zinc-600">
            You have not added any goals for this cycle yet. Use the form
            above to add your first draft.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Weightage</th>
                <th className="px-4 py-3 font-medium">Target date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => (
                <tr key={goal.id} className={tableRow}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{goal.title}</td>
                  <td className="max-w-xs px-4 py-3 text-zinc-600">
                    <p>{goal.description ?? "—"}</p>
                    {goal.status === "rejected" && goal.rejection_reason ? (
                      <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800">
                        Rejection reason: {goal.rejection_reason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {Number(goal.weightage).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(goal.target_date)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={goalBadgeTone(goal.status)}>
                      {goalStatusLabel[goal.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {isAssignedPending(goal.status) ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={actingId === goal.id}
                          onClick={() => void handleAccept(goal.id)}
                          className={primaryBtn}
                        >
                          {actingId === goal.id ? "Saving…" : "Accept"}
                        </button>
                        <button
                          type="button"
                          disabled={actingId === goal.id}
                          onClick={() => {
                            setError(null);
                            setRejectingGoal(goal);
                            setRejectionReason("");
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 shadow-sm transition-colors duration-150 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rejectingGoal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-goal-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2
              id="reject-goal-title"
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              Reject goal
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Tell your manager why you are rejecting{" "}
              <span className="font-medium text-zinc-900">{rejectingGoal.title}</span>
              . This reason is required and will be visible on the team view.
            </p>
            <label className="mt-4 block text-sm font-medium text-zinc-600">
              Rejection reason
              <textarea
                required
                rows={4}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                className={inputClass}
                placeholder="Explain what is unclear, unrealistic, or needs to change."
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => {
                  setRejectingGoal(null);
                  setRejectionReason("");
                }}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting || !rejectionReason.trim()}
                onClick={() => void handleSubmitRejection()}
                className="inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRejecting ? "Submitting…" : "Submit Rejection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
