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
      cycleId?: string | null;
      cycleCreated?: boolean;
      activeEmployees?: number;
      hrAdminEmail?: string | null;
    };

    setIsSeeding(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not seed the environment.");
      return;
    }

    if (!payload.cycleId) {
      setMessage(
        "No active employees found yet. Add your manager, employee, and HR admin records first, then run seed again to open a review cycle.",
      );
      return;
    }

    setMessage(
      `Environment ready. ${payload.activeEmployees ?? 0} active employee(s), open cycle ${payload.cycleCreated ? "created" : "already open"}${payload.hrAdminEmail ? ` (HR: ${payload.hrAdminEmail})` : ""}.`,
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
        {isSeeding ? "Seeding…" : "Seed Environment"}
      </button>
      {error ? <p className={errorText}>{error}</p> : null}
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
