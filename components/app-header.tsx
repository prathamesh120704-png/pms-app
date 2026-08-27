"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EmployeeRole } from "@/lib/get-current-employee";

type NavLink = {
  href: string;
  label: string;
  match: "exact" | "prefix";
};

function linksForRole(role: EmployeeRole): NavLink[] {
  const shared: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", match: "exact" },
    { href: "/goals", label: "My Goals", match: "prefix" },
    { href: "/review", label: "My Review", match: "prefix" },
  ];

  if (role === "manager") {
    shared.push({ href: "/team", label: "My Team", match: "prefix" });
  }

  if (role === "hr_admin") {
    shared.push(
      { href: "/admin", label: "HR Dashboard", match: "exact" },
      { href: "/admin/employees", label: "Employees", match: "prefix" },
      { href: "/admin/cycles", label: "Cycles", match: "prefix" },
    );
  }

  return shared;
}

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({ role }: { role: EmployeeRole }) {
  const pathname = usePathname();
  const links = linksForRole(role);

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-10">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          PMS
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active = isActive(pathname, link.href, link.match);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
