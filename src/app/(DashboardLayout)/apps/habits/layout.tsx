import type { ReactNode } from "react";

export default function HabitWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="px-3 py-4 sm:px-5 sm:py-5">{children}</div>;
}
