import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { HrDashboard } from "./hr-dashboard";

export default async function AdminHomePage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">HR dashboard</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        See how the cycle is going so you can help people through it — not to
        rank or pressure anyone.
      </p>
      <div className="mt-8">
        <HrDashboard />
      </div>
    </main>
  );
}
