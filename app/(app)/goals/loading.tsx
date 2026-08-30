import { pageMain, pageTitle } from "@/lib/ui";

export default function GoalsLoading() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>My Goals</h1>
      <p className="mt-8 text-sm text-zinc-600">Loading your goals…</p>
    </main>
  );
}
