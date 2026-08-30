import { pageMain, pageTitle } from "@/lib/ui";

export default function ReviewLoading() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>My Review</h1>
      <p className="mt-8 text-sm text-zinc-600">Loading your self-appraisal…</p>
    </main>
  );
}
