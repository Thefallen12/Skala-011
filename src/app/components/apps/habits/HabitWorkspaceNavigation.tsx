"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumnIncreasing,
  CheckSquare,
  Clock3,
  FolderKanban,
  Repeat2,
  Route,
} from "lucide-react";

const sections = [
  { href: "/apps/habits", label: "Habit Harian", icon: Repeat2 },
  {
    href: "/apps/habits/projects",
    label: "Project timeline",
    icon: FolderKanban,
  },
  {
    href: "/apps/habits/roadmap",
    label: "Product roadmap",
    icon: Route,
  },
  { href: "/apps/habits/tasks", label: "Tugas Harian", icon: CheckSquare },
  {
    href: "/apps/habits/schedule",
    label: "Jadwal & Rapat",
    icon: CalendarDays,
  },
  { href: "/apps/habits/timesheet", label: "Timesheet", icon: Clock3 },
  {
    href: "/apps/habits/analytics",
    label: "Ringkasan mingguan",
    icon: ChartColumnIncreasing,
  },
];

export default function HabitWorkspaceNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Modul Habit dan Produktivitas"
      className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7"
    >
      {sections.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/apps/habits" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
