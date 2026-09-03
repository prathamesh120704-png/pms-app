"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { GoalEvaluationFields } from "@/components/goal-evaluation-fields";
import { StatusBadge, reviewBadgeTone } from "@/components/status-badge";
import type { EmployeeRole } from "@/lib/get-current-employee";
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
  manager_summary: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

type ApprovedGoal = {
  id: string;
  title: string;
  description: string | null;
  weightage: number;
};

type GoalRating = {
  id: string;
  review_id: string;
  goal_id: string;
  self_comment: string | null;
  self_rating: number | null;
  manager_comment: string | null;
  manager_rating: number | null;
};

type OpenCycle = {
  id: string;
  name: string;
};

type GoalRatingState = {
  comment: string;
  rating: string;
  managerComment: string;
  managerRating: string;
};

const reviewColumns =
  "id, employee_id, manager_id, cycle_id, status, overall_self_rating, overall_manager_rating, manager_summary, submitted_at, reviewed_at";

const ratingOptions = [1, 2, 3, 4, 5] as const;

const statusLabel: Record<ReviewStatus, string> = {
  draft: "Not Started",
  self_submitted: "Self-Appraisal Submitted",
  reviewed: "Reviewed",
  completed: "Completed",
};

function emptyRatingState(): GoalRatingState {
  return {
    comment: "",
    rating: "",
    managerComment: "",
    managerRating: "",
  };
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export function ReviewPanel({
  employeeId,
  employeeName,
  managerId,
  role,
}: {
  employeeId: string;
  employeeName: string;
  managerId: string | null;
  role: EmployeeRole;
}) {
  const [cycle, setCycle] = useState<OpenCycle | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [goals, setGoals] = useState<ApprovedGoal[]>([]);
  const [ratings, setRatings] = useState<Record<string, GoalRatingState>>({});
  const [overallSelfRating, setOverallSelfRating] = useState("");
  const [managerEmail, setManagerEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const updateGoalRating = useCallback(
    (goalId: string, patch: Partial<Pick<GoalRatingState, "comment" | "rating">>) => {
      setRatings((current) => ({
        ...current,
        [goalId]: {
          ...emptyRatingState(),
          ...current[goalId],
          ...patch,
        },
      }));
    },
    [],
  );

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      setIsLoading(false);
      return;
    }

    setError(null);

    const { data: self } = await supabase
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .maybeSingle();

    if (!self) {
      setError("You can only load a review for your own employee record.");
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
      setIsLoading(false);
      return;
    }

    if (!cycleRow) {
      setCycle(null);
      setReview(null);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const openCycle = cycleRow as OpenCycle;
    setCycle(openCycle);

    if (managerId) {
      const { data: manager } = await supabase
        .from("employees")
        .select("email")
        .eq("id", managerId)
        .maybeSingle();
      setManagerEmail(
        typeof manager?.email === "string" ? manager.email : null,
      );
    }

    let { data: reviewRow, error: reviewError } = await supabase
      .from("reviews")
      .select(reviewColumns)
      .eq("employee_id", employeeId)
      .eq("cycle_id", openCycle.id)
      .maybeSingle();

    if (reviewError) {
      setError(reviewError.message);
      setIsLoading(false);
      return;
    }

    if (!reviewRow) {
      if (!managerId) {
        setError(
          "You need a manager assigned before a review can be created. Contact HR.",
        );
        setIsLoading(false);
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("reviews")
        .insert({
          employee_id: employeeId,
          manager_id: managerId,
          cycle_id: openCycle.id,
          status: "draft",
        })
        .select(reviewColumns)
        .single();

      if (createError) {
        const { data: existing } = await supabase
          .from("reviews")
          .select(reviewColumns)
          .eq("employee_id", employeeId)
          .eq("cycle_id", openCycle.id)
          .maybeSingle();
        reviewRow = existing;
        if (!reviewRow) {
          setError(createError.message);
          setIsLoading(false);
          return;
        }
      } else {
        reviewRow = created;
      }
    }

    const currentReview = reviewRow as Review;
    setReview(currentReview);
    setOverallSelfRating(
      currentReview.overall_self_rating != null
        ? String(currentReview.overall_self_rating)
        : "",
    );

    const { data: goalRows, error: goalsError } = await supabase
      .from("goals")
      .select("id, title, description, weightage")
      .eq("employee_id", employeeId)
      .eq("cycle_id", openCycle.id)
      .in("status", ["approved", "accepted"])
      .order("title");

    if (goalsError) {
      setError(goalsError.message);
      setGoals([]);
      setIsLoading(false);
      return;
    }

    const approved = (goalRows as ApprovedGoal[] | null) ?? [];
    setGoals(approved);

    const { data: ratingRows } = await supabase
      .from("goal_ratings")
      .select(
        "id, review_id, goal_id, self_comment, self_rating, manager_comment, manager_rating",
      )
      .eq("review_id", currentReview.id);

    const nextRatings: Record<string, GoalRatingState> = {};
    for (const goal of approved) {
      nextRatings[goal.id] = emptyRatingState();
    }
    for (const row of (ratingRows as GoalRating[] | null) ?? []) {
      nextRatings[row.goal_id] = {
        comment: row.self_comment ?? "",
        rating: row.self_rating != null ? String(row.self_rating) : "",
        managerComment: row.manager_comment ?? "",
        managerRating:
          row.manager_rating != null ? String(row.manager_rating) : "",
      };
    }
    setRatings(nextRatings);
    setIsLoading(false);
  }, [employeeId, managerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review || !cycle) return;

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const overall = Number(overallSelfRating);
    if (!Number.isInteger(overall) || overall < 1 || overall > 5) {
      setError("Choose an overall self-rating from 1 to 5.");
      return;
    }

    const ratingRows = [];
    for (const goal of goals) {
      const entry = ratings[goal.id] ?? emptyRatingState();
      const rating = Number(entry.rating);
      const comment = entry.comment.trim();
      if (!comment || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        setError("Add a comment and a 1–5 rating for every active goal.");
        return;
      }
      ratingRows.push({
        review_id: review.id,
        goal_id: goal.id,
        self_comment: comment,
        self_rating: rating,
      });
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    const { error: ratingsError } = await supabase.from("goal_ratings").upsert(
      ratingRows,
      { onConflict: "review_id,goal_id" },
    );

    if (ratingsError) {
      setIsSubmitting(false);
      setError(ratingsError.message);
      return;
    }

    const submittedAt = new Date().toISOString();
    const { error: reviewError } = await supabase
      .from("reviews")
      .update({
        status: "self_submitted",
        overall_self_rating: overall,
        submitted_at: submittedAt,
      })
      .eq("id", review.id);

    if (reviewError) {
      setIsSubmitting(false);
      setError(reviewError.message);
      return;
    }

    setReview({
      ...review,
      status: "self_submitted",
      overall_self_rating: overall,
      submitted_at: submittedAt,
    });

    try {
      if (managerEmail) {
        const response = await fetch("/api/notify-manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            managerEmail,
            employeeName,
            cycleName: cycle.name,
            reviewId: review.id,
            employeeId,
          }),
        });
        const result = (await response.json()) as { ok?: boolean };
        if (!result.ok) {
          setNotice(
            "Self-appraisal saved. The manager email could not be sent.",
          );
        }
      } else {
        setNotice(
          "Self-appraisal saved. No manager email was found to notify.",
        );
      }
    } catch (notifyError) {
      console.error("[review] notify-manager failed", notifyError);
      setNotice("Self-appraisal saved. The manager email could not be sent.");
    }

    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <p className={`px-6 py-16 text-center ${mutedText}`}>
        Loading your self-appraisal…
      </p>
    );
  }

  if (!cycle) {
    return (
      <p className={emptyState}>There is no open review cycle right now.</p>
    );
  }

  if (goals.length === 0) {
    return (
      <p className={emptyState}>
        Your goals must be approved or accepted first before you can start
        a self-appraisal.
      </p>
    );
  }

  const alreadySubmitted =
    review?.status === "self_submitted" ||
    review?.status === "reviewed" ||
    review?.status === "completed";
  const isCompleted = review?.status === "completed";
  const canEditSelfFields = role === "employee" && !alreadySubmitted;

  return (
    <div className="space-y-6">
      <p className={mutedText}>
        Cycle: <span className="font-medium text-zinc-900">{cycle.name}</span>
        {review ? (
          <>
            {" "}
            · Status:{" "}
            <StatusBadge tone={reviewBadgeTone(review.status)}>
              {statusLabel[review.status]}
            </StatusBadge>
          </>
        ) : null}
      </p>

      {error ? <p className={errorText}>{error}</p> : null}
      {notice ? <p className="text-sm text-indigo-700">{notice}</p> : null}

      <form onSubmit={handleSubmit} className={`${glassPanel} space-y-6 p-6`}>
        {goals.map((goal) => {
          const entry = ratings[goal.id] ?? emptyRatingState();
          return (
            <GoalEvaluationFields
              key={goal.id}
              goalTitle={goal.title}
              goalDescription={goal.description}
              weightage={Number(goal.weightage)}
              selfComment={entry.comment}
              selfRating={entry.rating}
              canEditSelf={canEditSelfFields}
              onSelfCommentChange={(value) =>
                updateGoalRating(goal.id, { comment: value })
              }
              onSelfRatingChange={(value) =>
                updateGoalRating(goal.id, { rating: value })
              }
              managerComment={entry.managerComment}
              managerRating={entry.managerRating}
              showManagerFeedback={isCompleted}
            />
          );
        })}

        <label className="block text-sm font-medium text-zinc-600">
          Overall self rating
          <select
            required
            disabled={!canEditSelfFields}
            value={overallSelfRating}
            onChange={(event) => setOverallSelfRating(event.target.value)}
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

        {isCompleted ? (
          <div className={`${contrastPanel} p-4 text-sm`}>
            <p className="font-medium text-zinc-900">Overall manager rating</p>
            <p className="mt-1 text-zinc-600">
              {review?.overall_manager_rating ?? "—"}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !canEditSelfFields}
          className={primaryBtn}
        >
          {isCompleted
            ? "Review completed"
            : alreadySubmitted
              ? "Self-appraisal submitted"
              : isSubmitting
                ? "Submitting…"
                : "Submit Self-Appraisal"}
        </button>
      </form>
    </div>
  );
}
