"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type CycleStatus = "draft" | "open" | "closed";

type ReviewCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  created_by: string;
};

const nextStatus: Record<CycleStatus, CycleStatus> = {
  draft: "open",
  open: "closed",
  closed: "draft",
};

const toggleLabel: Record<CycleStatus, string> = {
  draft: "Open",
  open: "Close",
  closed: "Set to draft",
};

const inputClassName =
  "mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500";

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function AdminCyclesPage() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCycles = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setCycles([]);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("review_cycles")
      .select("id, name, start_date, end_date, status, created_by")
      .order("start_date", { ascending: false });

    setCycles((data as ReviewCycle[] | null) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    void loadCycles();

    void supabase
      .from("employees")
      .select("id, role")
      .eq("is_active", true)
      .then(({ data }) => {
        const rows = (data as { id: string; role: string }[] | null) ?? [];
        const hrAdmin = rows.find((row) => row.role === "hr_admin");
        setCreatedBy(hrAdmin?.id ?? rows[0]?.id ?? null);
      });
  }, [loadCycles]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    if (!createdBy) {
      setError("Add at least one employee before creating a cycle.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const startDate = String(formData.get("start_date") ?? "");
    const endDate = String(formData.get("end_date") ?? "");

    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    setIsSubmitting(true);

    const { error: insertError } = await supabase.from("review_cycles").insert({
      name,
      start_date: startDate,
      end_date: endDate,
      status: "draft",
      created_by: createdBy,
    });

    setIsSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    form.reset();
    await loadCycles();
  }

  async function handleStatusUpdate(cycle: ReviewCycle) {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setError(null);
    setUpdatingId(cycle.id);

    const { error: updateError } = await supabase
      .from("review_cycles")
      .update({ status: nextStatus[cycle.status] })
      .eq("id", cycle.id);

    setUpdatingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadCycles();
  }

  return (
    <div className="min-h-full bg-zinc-50 px-6 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Review cycles</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Open a cycle for goal setting and reviews, then close it when the
          period ends.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-8 grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-3"
        >
          <label className="block text-sm font-medium sm:col-span-3">
            Name
            <input
              name="name"
              type="text"
              required
              placeholder="FY2026 H1"
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-medium">
            Start date
            <input
              name="start_date"
              type="date"
              required
              className={inputClassName}
            />
          </label>

          <label className="block text-sm font-medium">
            End date
            <input
              name="end_date"
              type="date"
              required
              className={inputClassName}
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isSubmitting ? "Creating…" : "Create cycle"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {isLoading ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-500">
              Loading cycles…
            </p>
          ) : cycles.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-500">
              No review cycles yet. Create one to start a performance period.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">End</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Toggle status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cycles.map((cycle) => (
                  <tr key={cycle.id}>
                    <td className="px-4 py-3 font-medium">{cycle.name}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDate(cycle.start_date)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatDate(cycle.end_date)}
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-400">
                      {cycle.status}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={updatingId === cycle.id}
                        onClick={() => void handleStatusUpdate(cycle)}
                        className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        {updatingId === cycle.id
                          ? "Saving…"
                          : toggleLabel[cycle.status]}
                      </button>
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
