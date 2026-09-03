"use client";

import { inputClass } from "@/lib/ui";

const ratingOptions = [1, 2, 3, 4, 5] as const;

type GoalEvaluationFieldsProps = {
  goalTitle: string;
  goalDescription: string | null;
  weightage: number;
  selfComment: string;
  selfRating: string;
  canEditSelf: boolean;
  onSelfCommentChange: (value: string) => void;
  onSelfRatingChange: (value: string) => void;
  managerComment?: string;
  managerRating?: string;
  showManagerFeedback?: boolean;
};

export function GoalEvaluationFields({
  goalTitle,
  goalDescription,
  weightage,
  selfComment,
  selfRating,
  canEditSelf,
  onSelfCommentChange,
  onSelfRatingChange,
  managerComment,
  managerRating,
  showManagerFeedback = false,
}: GoalEvaluationFieldsProps) {
  const selfFieldsLocked = !canEditSelf;

  return (
    <fieldset className="space-y-3 border-b border-zinc-200/80 pb-6 last:border-b-0 last:pb-0">
      <legend className="text-base font-semibold tracking-tight text-zinc-900">
        {goalTitle}
      </legend>
      <p className="text-sm text-zinc-600">{goalDescription ?? "—"}</p>
      <p className="text-xs text-zinc-400">
        Weightage {Number(weightage).toFixed(2)}
      </p>

      <label className="block text-sm font-medium text-zinc-600">
        Self comment
        <textarea
          rows={3}
          value={selfComment}
          disabled={selfFieldsLocked}
          readOnly={selfFieldsLocked}
          onChange={(event) => onSelfCommentChange(event.target.value)}
          className={inputClass}
          placeholder={
            canEditSelf ? "Describe your progress on this goal." : undefined
          }
        />
      </label>

      <label className="block text-sm font-medium text-zinc-600">
        Self rating
        <select
          value={selfRating}
          disabled={selfFieldsLocked}
          onChange={(event) => onSelfRatingChange(event.target.value)}
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

      {showManagerFeedback ? (
        <div className="rounded-lg border border-zinc-200/60 bg-zinc-100/70 p-4 text-sm">
          <p className="font-medium text-zinc-900">Manager feedback</p>
          <p className="mt-2 text-zinc-600">{managerComment?.trim() || "—"}</p>
          <p className="mt-2 text-zinc-600">
            Manager rating: {managerRating?.trim() || "—"}
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
