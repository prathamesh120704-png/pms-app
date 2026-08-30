import { pageMain, pageTitle } from "@/lib/ui";

export default function ManagerReviewLoading() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>Complete performance review</h1>
      <p className="mt-8 text-sm text-zinc-600">Loading this review…</p>
    </main>
  );
}
