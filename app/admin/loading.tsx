import { pageMain, pageTitle } from "@/lib/ui";

export default function AdminDashboardLoading() {
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>HR dashboard</h1>
      <p className="mt-8 text-sm text-zinc-600">Loading the cycle overview…</p>
    </main>
  );
}
