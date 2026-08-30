"use client";

import { useState } from "react";
import { errorText, secondaryBtn } from "@/lib/ui";

export function SeedTestOrganizationButton() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSeed() {
    setIsSeeding(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/seed-test-organization", {
      method: "POST",
    });
    const payload = (await response.json()) as {
      error?: string;
      inserted?: number;
      updated?: number;
      goalsInserted?: number;
    };

    setIsSeeding(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not seed the test organization.");
      return;
    }

    setMessage(
      `Seeded Engineering, Sales, Marketing, and Operations (inserted ${payload.inserted ?? 0}, updated ${payload.updated ?? 0}, pending goals ${payload.goalsInserted ?? 0}). Sign in with a department email such as manager_ops@test.com.`,
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isSeeding}
        onClick={() => void handleSeed()}
        className={secondaryBtn}
      >
        {isSeeding ? "Seeding…" : "Seed Test Organization"}
      </button>
      {error ? <p className={errorText}>{error}</p> : null}
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
