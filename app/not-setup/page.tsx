import { getCurrentEmployee } from "@/lib/get-current-employee";
import { glassPanel } from "@/lib/ui";
import { redirect } from "next/navigation";

export default async function NotSetupPage() {
  const employee = await getCurrentEmployee();

  if (employee) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className={`${glassPanel} max-w-md p-8`}>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Your account is not yet set up. Please contact HR.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Sign-in worked, but this email is not in the employee directory. Ask HR
          to add you, then sign in again.
        </p>
      </div>
    </div>
  );
}
