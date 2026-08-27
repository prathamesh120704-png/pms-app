import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import { TeamPanel } from "./team-panel";

export default async function MyTeamPage() {
  const employee = await getCurrentEmployee();

  if (employee?.role !== "manager") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">My Team</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Review submitted goals from people who report to you.
      </p>
      <div className="mt-8">
        <TeamPanel managerId={employee.id} />
      </div>
    </main>
  );
}
