"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { EmployeeRole } from "@/lib/get-current-employee";

type NavLink = {
  href: string;
  label: string;
  match: "exact" | "prefix";
};

const roleLabel: Record<EmployeeRole, string> = {
  employee: "Employee",
  manager: "People Manager",
  hr_admin: "HR Admin",
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
      { href: "/admin", label: "Admin", match: "exact" },
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

export function AppHeader({
  role,
  fullName,
}: {
  role: EmployeeRole;
  fullName: string;
}) {
  const pathname = usePathname();
  const links = linksForRole(role);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
            <Sparkles className="size-4 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            AlignPMS
          </span>
        </Link>

        <nav className="hidden flex-1 flex-wrap items-center justify-center gap-1 lg:flex">
          {links.map((link) => {
            const active = isActive(pathname, link.href, link.match);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900"
                    : "rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="max-w-[10rem] truncate text-xs text-zinc-600">
            {fullName}
          </span>
          <span className="rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700">
            {roleLabel[role]}
          </span>
          <Show when="signed-in">
            <UserButton
              appearance={{
                elements: { avatarBox: "size-8 ring-1 ring-zinc-200" },
              }}
            />
          </Show>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 lg:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href, link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={
                    active
                      ? "rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
                      : "rounded-lg px-3 py-2 text-sm font-medium text-zinc-600"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">{fullName}</p>
              <p className="text-xs text-zinc-500">{roleLabel[role]}</p>
            </div>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </div>
      ) : null}
    </header>
  );
}
