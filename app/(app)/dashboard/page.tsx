import {
  BarChart3,
  ClipboardCheck,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { glassCard, gradientText, iconWell, pageMain, pageSubtitle, pageTitle } from "@/lib/ui";

const roleCopy = {
  employee: "employee",
  manager: "people manager",
  hr_admin: "HR admin",
} as const;

export default async function DashboardPage() {
  const employee = await getCurrentEmployee();
  const role = employee?.role ?? "employee";

  const cards = [
    {
      href: "/goals",
      title: "My Goals",
      body: "Build weighted SMART goals, accept or reject assigned goals, and submit when the total is exactly 100%.",
      icon: Target,
    },
    {
      href: "/review",
      title: "My Review",
      body: "Complete your self-appraisal once your manager has approved your goals.",
      icon: ClipboardCheck,
    },
  ];

  if (role === "manager") {
    cards.push({
      href: "/team",
      title: "My Team",
      body: "Approve submitted goals, review rejections, and finish side-by-side appraisals.",
      icon: Users,
    });
  }

  if (role === "hr_admin") {
    cards.push({
      href: "/admin",
      title: "Admin",
      body: "Track cycle completion, manage the directory, and open or close cycles.",
      icon: BarChart3,
    });
  }

  return (
    <main className={pageMain}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
        Workspace
      </p>
      <h1 className={pageTitle}>
        Welcome back
        {employee ? (
          <>
            {", "}
            <span className={gradientText}>{employee.full_name}</span>
          </>
        ) : null}
      </h1>
      <p className={pageSubtitle}>
        Your role is {roleCopy[role]}. Pick up the next step in the appraisal
        cycle from here.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className={`${glassCard} block p-6`}>
              <span className={iconWell}>
                <card.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-zinc-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{card.body}</p>
            </Link>
          </li>
        ))}
        <li className={`${glassCard} p-6`}>
          <span className={iconWell}>
            <ShieldCheck className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900">Access locked to your role</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Clerk and AlignPMS role guardrails keep reviews and HR tools on the
            right desks.
          </p>
        </li>
      </ul>
    </main>
  );
}
