"use client";

import { Show, UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { contrastPanel, glassCard, iconWell, primaryBtn, secondaryBtn } from "@/lib/ui";

const navLinks = [
  { href: "#overview", label: "Overview" },
  { href: "#workflow", label: "Workflow" },
  { href: "#roles", label: "Role Access" },
  { href: "#metrics", label: "Metrics" },
] as const;

const timeline = [
  { label: "Draft", className: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  { label: "Submitted", className: "bg-amber-50 text-amber-800 border-amber-200" },
  { label: "Approved", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { label: "Self-Appraisal", className: "bg-amber-50 text-amber-800 border-amber-200" },
  { label: "Manager Review", className: "bg-amber-50 text-amber-800 border-amber-200" },
  { label: "Completed", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
] as const;

const workflowSteps = [
  {
    step: "01",
    icon: Target,
    title: "SMART Goal Setting",
    body: "Employees build weighted target lists capped at 100% total weightage—clear, measurable, and ready for review.",
  },
  {
    step: "02",
    icon: ClipboardCheck,
    title: "Manager Approval",
    body: "One-click review and validation loop for active cycles, with send-back comments when goals need refinement.",
  },
  {
    step: "03",
    icon: CheckCircle2,
    title: "Self-Appraisal",
    body: "Structured achievement reflections and objective ratings so employees tell the story of their year with evidence.",
  },
  {
    step: "04",
    icon: Users,
    title: "360° Manager Assessment & Completion",
    body: "Side-by-side comparison, feedback scoring, and automated cycle closure once the manager submits the final review.",
  },
] as const;

const roles = [
  {
    title: "Employee",
    icon: Target,
    points: [
      "Custom SMART goal setting with live weightage totals",
      "Real-time submission tracking across the cycle",
      "Structured self-ratings and achievement notes",
      "Historical score visibility after cycle close",
    ],
  },
  {
    title: "People Manager",
    icon: Users,
    points: [
      "Direct-report goal approvals and send-back loops",
      "Side-by-side appraisal forms vs. self-ratings",
      "Team bottleneck visibility for pending reviews",
      "Guided scoring that keeps feedback consistent",
    ],
  },
  {
    title: "HR Admin",
    icon: BarChart3,
    points: [
      "Company-wide completion analytics at a glance",
      "Review cycle creation, open, and closure controls",
      "Full organization directory governance",
      "Audit-ready status tracking across every employee",
    ],
  },
] as const;

const highlights = [
  {
    icon: Zap,
    title: "Real-time Transactional Notifications",
    body: "Instant manager alerts on review submissions via Resend—so appraisals never stall in an inbox vacuum.",
  },
  {
    icon: ShieldCheck,
    title: "Strict Access Control",
    body: "Clerk-authenticated role guardrails prevent unauthorized review access across employee, manager, and HR surfaces.",
  },
  {
    icon: Scale,
    title: "Total Weightage Validation Engine",
    body: "Zero submission errors with 100% mathematical integrity checks before goals can leave draft.",
  },
] as const;

function LaunchCta({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <Link href="/sign-in" className={className}>
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("scroll-smooth");
    return () => document.documentElement.classList.remove("scroll-smooth");
  }, []);

  const ctaClass = `${primaryBtn} gap-2`;

  return (
    <div className="min-h-full overflow-x-hidden bg-zinc-50 font-sans text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <Sparkles className="size-4 text-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              AlignPMS
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-zinc-900"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
              >
                Dashboard
              </Link>
              <UserButton />
            </Show>
            <LaunchCta className={ctaClass}>Launch App</LaunchCta>
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 text-sm">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mx-auto mt-3 flex max-w-6xl items-center gap-3">
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-zinc-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <UserButton />
              </Show>
              <LaunchCta className={`${ctaClass} w-full`}>Launch App</LaunchCta>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section
          id="overview"
          className="mx-auto grid max-w-6xl scroll-mt-24 gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:pt-20"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Performance Management System • FY 2026-27 Active Cycle
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Performance Appraisals Reimagined with Clarity & Empathy.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
              From weighted SMART goal planning to side-by-side manager
              appraisals and HR cycle governance—all in one auditable platform.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <LaunchCta className={`${ctaClass} px-5 py-2.5`}>Get Started</LaunchCta>
              <a href="#workflow" className={`${secondaryBtn} gap-2 px-5 py-2.5`}>
                <Workflow className="size-4" />
                View Workflow
              </a>
            </div>
          </div>

          <div className={`${glassCard} p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Active appraisal
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  FY 2026-27 Cycle
                </p>
              </div>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                In progress
              </span>
            </div>

            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-zinc-400">
              Workflow status
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {timeline.map((stage, index) => (
                <span
                  key={stage.label}
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium ${stage.className} ${index === 3 ? "ring-1 ring-indigo-500 ring-offset-1" : ""}`}
                >
                  {stage.label}
                </span>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              {[
                { name: "Q1 delivery excellence", weight: "40%" },
                { name: "Client NPS & retention", weight: "35%" },
                { name: "Capability building", weight: "25%" },
              ].map((goal) => (
                <div
                  key={goal.name}
                  className={`flex items-center justify-between px-4 py-3 ${contrastPanel}`}
                >
                  <span className="text-sm text-zinc-600">{goal.name}</span>
                  <span className="text-xs font-semibold text-indigo-600">
                    {goal.weight}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-right text-xs text-zinc-400">
              Total weightage{" "}
              <span className="font-semibold text-emerald-800">100%</span>
            </p>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Pipeline
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              The End-to-End Appraisal Lifecycle
            </h2>
            <p className="mt-3 text-zinc-600">
              A fully synchronized workflow ensuring total transparency between
              employees, managers, and HR.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((item) => (
              <li key={item.step} className={`${glassCard} p-5`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-600">
                    {item.step}
                  </span>
                  <item.icon className="size-5 text-zinc-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="roles" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Role access
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              Built for every seat in the cycle
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {roles.map((role) => (
              <article key={role.title} className={`${glassCard} p-6`}>
                <span className={iconWell}>
                  <role.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-xl font-semibold text-zinc-900">
                  {role.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {role.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2 text-sm leading-6 text-zinc-600"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-indigo-600" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="metrics" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Enterprise features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              System highlights ready for evaluation
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className={`${glassCard} p-6`}>
                <item.icon className="size-6 text-indigo-600" />
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">AlignPMS</p>
            <p className="mt-1 text-xs text-zinc-400">
              © {new Date().getFullYear()} AlignPMS. Performance management for
              growing teams.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600">
            <a href="#overview" className="hover:text-zinc-900">
              Overview
            </a>
            <a href="#workflow" className="hover:text-zinc-900">
              Workflow
            </a>
            <Link href="/sign-in" className="hover:text-zinc-900">
              Sign In
            </Link>
            <span className="inline-flex items-center gap-2 text-xs text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-600" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
