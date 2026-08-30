"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  emptyState,
  errorText,
  contrastPanel,
  glassPanel,
  inputClass,
  mutedText,
  primaryBtn,
} from "@/lib/ui";

type ReviewStatus = "draft" | "self_submitted" | "reviewed" | "completed";

type Review = {
  id: string;
  employee_id: string;
  manager_id: string;
  cycle_id: string;
  status: ReviewStatus;
  overall_self_rating: number | null;
  overall_manager_rating: number | null;
  submitted_at: string | null;
};

type GoalEmbed = {
  title: string;
  weightage: number;
  description: string | null;
};

type GoalRatingRow = {
  id: string;
  review_id: string;
  goal_id: string;
  self_comment: string | null;
  self_rating: number | null;
  manager_comment: string | null;
  manager_rating: number | null;
  goal: GoalEmbed | GoalEmbed[] | null;
};

type OpenCycle = {
  id: string;
  name: string;
};

const ratingOptions = [1, 2, 3, 4, 5] as const;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

function goalFromEmbed(goal: GoalEmbed | GoalEmbed[] | null): GoalEmbed | null {
  if (!goal) return null;
  if (Array.isArray(goal)) return goal[0] ?? null;
  return goal;
}

export function ManagerReviewPanel({
  employeeId,
  managerId,
  department,
}: {
  employeeId: string;
  managerId: string;
  department: string | null;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<OpenCycle | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [employeeName, setEmployeeName] = useState("Team member");
  const [rows, setRows] = useState<GoalRatingRow[]>([]);
  const [managerInputs, setManagerInputs] = useState<
    Record<string, { comment: string; rating: string }>
  >({});
  const [overallManagerRating, setOverallManagerRating] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      setIsLoading(false);
      return;
    }

    setError(null);

    if (!department) {
      setError("Your employee record has no department, so this review is locked.");
      setIsLoading(false);
      return;
    }

    const { data: employeeRow } = await supabase
      .from("employees")
      .select("full_name, manager_id")
      .eq("id", employeeId)
      .eq("department", department)
      .maybeSingle();

    if (!employeeRow || employeeRow.manager_id !== managerId) {
      setError("This person is not on your team.");
      setIsLoading(false);
      return;
    }

    setEmployeeName(
      typeof employeeRow.full_name === "string"
        ? employeeRow.full_name
        : "Team member",
    );

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
      setIsLoading(false);
      return;
    }

    const openCycle = cycleRow as OpenCycle;
    setCycle(openCycle);

    const { data: reviewRow, error: reviewError } = await supabase
      .from("reviews")
      .select(
        "id, employee_id, manager_id, cycle_id, status, overall_self_rating, overall_manager_rating, submitted_at",
      )
      .eq("employee_id", employeeId)
      .eq("cycle_id", openCycle.id)
      .eq("manager_id", managerId)
      .maybeSingle();

    if (reviewError) {
      setError(reviewError.message);
      setIsLoading(false);
      return;
    }

    if (!reviewRow) {
      setReview(null);
      setRows([]);
      setIsLoading(false);
      return;
    }

    const currentReview = reviewRow as Review;
    setReview(currentReview);
    setOverallManagerRating(
      currentReview.overall_manager_rating != null
        ? String(currentReview.overall_manager_rating)
        : "",
    );

    const { data: ratingRows, error: ratingsError } = await supabase
      .from("goal_ratings")
      .select(
        "id, review_id, goal_id, self_comment, self_rating, manager_comment, manager_rating, goal:goals(title, weightage, description)",
      )
      .eq("review_id", currentReview.id);

    if (ratingsError) {
      setError(ratingsError.message);
      setRows([]);
      setIsLoading(false);
      return;
    }

    const list = (ratingRows as GoalRatingRow[] | null) ?? [];
    setRows(list);

    const inputs: Record<string, { comment: string; rating: string }> = {};
    for (const row of list) {
      inputs[row.id] = {
        comment: row.manager_comment ?? "",
        rating: row.manager_rating != null ? String(row.manager_rating) : "",
      };
    }
    setManagerInputs(inputs);
    setIsLoading(false);
  }, [department, employeeId, managerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) return;

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const overall = Number(overallManagerRating);
    if (!Number.isInteger(overall) || overall < 1 || overall > 5) {
      setError("Choose an overall manager rating from 1 to 5.");
      return;
    }

    const updates = [];
    for (const row of rows) {
      const entry = managerInputs[row.id];
      const rating = Number(entry?.rating);
      const comment = entry?.comment.trim() ?? "";
      if (!comment || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        setError("Add a comment and a 1–5 rating for every goal.");
        return;
      }
      updates.push({
        id: row.id,
        manager_comment: comment,
        manager_rating: rating,
      });
    }

    setIsSubmitting(true);
    setError(null);

    for (const update of updates) {
      const { error: ratingError } = await supabase
        .from("goal_ratings")
        .update({
          manager_comment: update.manager_comment,
          manager_rating: update.manager_rating,
        })
        .eq("id", update.id);

      if (ratingError) {
        setIsSubmitting(false);
        setError(ratingError.message);
        return;
      }
    }

    const { error: reviewError } = await supabase
      .from("reviews")
      .update({
        status: "completed",
        overall_manager_rating: overall,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", review.id);

    setIsSubmitting(false);

    if (reviewError) {
      setError(reviewError.message);
      return;
    }

    router.push("/team");
  }

  if (isLoading) {
    return (
      <p className={`px-6 py-16 text-center ${mutedText}`}>Loading this review…</p>
    );
  }

  if (!cycle) {
    return (
      <p className={emptyState}>
        There is no open review cycle right now.
      </p>
    );
  }

  if (!review) {
    return (
      <p className={emptyState}>
        No self-appraisal was found for this person in the open cycle.
      </p>
    );
  }

  if (review.status !== "self_submitted") {
    return (
      <p className={emptyState}>
        {review.status === "completed"
          ? "This review is already completed."
          : "This employee has not submitted their self-appraisal yet."}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className={emptyState}>
        There are no goal ratings on this self-appraisal yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className={mutedText}>
        Completing the review for{" "}
        <span className="font-medium text-zinc-900">{employeeName}</span> ·{" "}
        {cycle.name}
      </p>

      {error ? <p className={errorText}>{error}</p> : null}

      <form onSubmit={handleSubmit} className={`${glassPanel} space-y-6 p-6`}>
        {rows.map((row) => {
          const goal = goalFromEmbed(row.goal);
          const entry = managerInputs[row.id] ?? { comment: "", rating: "" };
          return (
            <fieldset
              key={row.id}
              className="space-y-3 border-b border-zinc-200/80 pb-6 last:border-b-0 last:pb-0"
            >
              <legend className="text-base font-semibold tracking-tight text-zinc-900">
                {goal?.title ?? "Goal"}
              </legend>
              <p className="text-xs text-zinc-400">
                Weightage {goal ? Number(goal.weightage).toFixed(2) : "—"}
              </p>
              {goal?.description ? (
                <p className={mutedText}>{goal.description}</p>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className={`${contrastPanel} p-4 text-sm`}>
                  <p className="font-medium text-zinc-900">Employee self-appraisal</p>
                  <p className="mt-2 text-zinc-600">{row.self_comment || "—"}</p>
                  <p className="mt-2 text-zinc-400">
                    Self rating: {row.self_rating ?? "—"}
                  </p>
                </div>
                <div className={`space-y-3 p-4 ${contrastPanel}`}>
                  <label className="block text-sm font-medium text-zinc-700">
                    Manager comment
                    <textarea
                      required
                      rows={3}
                      value={entry.comment}
                      onChange={(event) =>
                        setManagerInputs((current) => ({
                          ...current,
                          [row.id]: { ...entry, comment: event.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm font-medium text-zinc-700">
                    Manager rating
                    <select
                      required
                      value={entry.rating}
                      onChange={(event) =>
                        setManagerInputs((current) => ({
                          ...current,
                          [row.id]: { ...entry, rating: event.target.value },
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">Select 1–5</option>
                      {ratingOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </fieldset>
          );
        })}

        <div className={`${contrastPanel} p-4 text-sm`}>
          <p className="font-medium text-zinc-900">Overall self rating</p>
          <p className="mt-1 text-zinc-600">
            {review.overall_self_rating ?? "—"}
          </p>
        </div>

        <label className="block text-sm font-medium text-zinc-600">
          Overall manager rating
          <select
            required
            value={overallManagerRating}
            onChange={(event) => setOverallManagerRating(event.target.value)}
            className={inputClass}
          >
            <option value="">Select 1–5</option>
            {ratingOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={isSubmitting} className={primaryBtn}>
          {isSubmitting ? "Submitting…" : "Submit Final Review"}
        </button>
      </form>
    </div>
  );
}
