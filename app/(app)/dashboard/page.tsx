import { getCurrentEmployee } from "@/lib/get-current-employee";

export default async function DashboardPage() {
  const employee = await getCurrentEmployee();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Welcome{employee ? `, ${employee.full_name}` : ""}. Your role is{" "}
        {employee?.role.replace("_", " ")}.
      </p>
    </main>
  );
}
