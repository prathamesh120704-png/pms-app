"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { StatusBadge, cycleBadgeTone } from "@/components/status-badge";
import {
  errorText,
  glassPanel,
  inputClass,
  pageMain,
  pageSubtitle,
  pageTitle,
  primaryBtn,
  secondaryBtn,
  tableHead,
  tableRow,
  tableWrap,
} from "@/lib/ui";

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

export function CyclesPanel({
  hrAdminId,
}: {
  hrAdminId: string;
}) {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
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
  }, [loadCycles]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    if (!hrAdminId) {
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
      created_by: hrAdminId,
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
    <div className={pageMain}>
      <div className="mx-auto max-w-5xl">
        <h1 className={pageTitle}>Review cycles</h1>
        <p className={pageSubtitle}>
          Open a cycle for goal setting and reviews, then close it when the
          period ends.
        </p>

        <form
          onSubmit={handleCreate}
          className={`${glassPanel} mt-8 grid gap-4 p-6 sm:grid-cols-3`}
        >
          <label className="block text-sm font-medium text-zinc-600 sm:col-span-3">
            Name
            <input
              name="name"
              type="text"
              required
              placeholder="FY2026 H1"
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            Start date
            <input
              name="start_date"
              type="date"
              required
              className={inputClass}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-600">
            End date
            <input
              name="end_date"
              type="date"
              required
              className={inputClass}
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${primaryBtn} w-full`}
            >
              {isSubmitting ? "Creating…" : "Create cycle"}
            </button>
          </div>
        </form>

        {error ? <p className={`mt-4 ${errorText}`}>{error}</p> : null}

        <div className={`mt-8 ${tableWrap}`}>
          {isLoading ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-600">
              Loading cycles…
            </p>
          ) : cycles.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-600">
              No review cycles yet. Create one to start a performance period.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">End</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Toggle status</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className={tableRow}>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {cycle.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDate(cycle.start_date)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatDate(cycle.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={cycleBadgeTone(cycle.status)}>
                        {cycle.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={updatingId === cycle.id}
                        onClick={() => void handleStatusUpdate(cycle)}
                        className={secondaryBtn}
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
