"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

export type GoalStatus = "draft" | "submitted" | "approved" | "sent_back";

export type Goal = {
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

const statusLabel: Record<GoalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  sent_back: "Sent back",
};

export function GoalsPanel({ employeeId }: { employeeId: string }) {
  const [cycle, setCycle] = useState<OpenCycle | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      .select(
        "id, employee_id, cycle_id, title, description, weightage, target_date, status, manager_comment",
      )
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
  }, [employeeId]);

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
      status: "draft",
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
      .update({ status: "submitted" })
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

  if (isLoading) {
    return (
      <p className="px-6 py-16 text-center text-sm text-zinc-500">
        Loading your goals…
      </p>
    );
  }

  if (!cycle) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        There is no open review cycle right now. HR will open a cycle when it
        is time to set goals.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Cycle: <span className="font-medium text-zinc-900 dark:text-zinc-50">{cycle.name}</span>
      </p>

      <form
        onSubmit={handleAdd}
        className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2"
      >
        <h2 className="text-base font-semibold tracking-tight sm:col-span-2">
          Add a goal
        </h2>

        <label className="block text-sm font-medium sm:col-span-2">
          Title
          <input name="title" type="text" required className={inputClassName} />
        </label>

        <label className="block text-sm font-medium sm:col-span-2">
          Description
          <textarea
            name="description"
            required
            rows={3}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm font-medium">
          Weightage
          <input
            name="weightage"
            type="number"
            required
            min={0}
            max={100}
            step={0.01}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm font-medium">
          Target date
          <input
            name="target_date"
            type="date"
            required
            className={inputClassName}
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSaving ? "Adding…" : "Add goal"}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          Total weightage:{" "}
          <span
            className={
              isExactly100(totalWeightage)
                ? "font-semibold text-zinc-900 dark:text-zinc-50"
                : "font-semibold text-zinc-600 dark:text-zinc-400"
            }
          >
            {totalWeightage.toFixed(2)} / 100
          </span>
        </p>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmitForApproval()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Submitting…" : "Submit Goals for Approval"}
        </button>
      </div>

      {!isExactly100(totalWeightage) ? (
        <p className="text-sm text-zinc-500">
          You can keep adding draft goals. Submit is available only when the
          total weightage is exactly 100.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {goals.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-zinc-500">
            You have not added any goals for this cycle yet. Use the form
            above to add your first draft.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Weightage</th>
                <th className="px-4 py-3 font-medium">Target date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {goals.map((goal) => (
                <tr key={goal.id}>
                  <td className="px-4 py-3 font-medium">{goal.title}</td>
                  <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {goal.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {Number(goal.weightage).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDate(goal.target_date)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {statusLabel[goal.status]}
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
