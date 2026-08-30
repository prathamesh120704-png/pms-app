import { pageMain, pageTitle } from "@/lib/ui";

export default function TeamLoading() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>My Team</h1>
      <p className="mt-8 text-sm text-zinc-600">Loading your team…</p>
    </main>
  );
}
