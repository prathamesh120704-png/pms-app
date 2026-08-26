import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";

export default async function NotSetupPage() {
  const employee = await getCurrentEmployee();

  if (employee) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Your account is not yet set up. Please contact HR.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Sign-in worked, but this email is not in the employee directory. Ask HR
        to add you, then sign in again.
      </p>
    </div>
  );
}
