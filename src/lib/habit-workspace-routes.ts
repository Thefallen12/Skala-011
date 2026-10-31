export type HabitWorkspaceTab = "calendar" | "tasks" | "habits" | "timesheet";

export function habitWorkspaceUrl(
  tab: HabitWorkspaceTab,
  parameters: Record<string, string | undefined>,
) {
  const search = new URLSearchParams({ tab });
  for (const [key, value] of Object.entries(parameters)) {
    if (value) search.set(key, value);
  }
  return `/apps/habits?${search.toString()}`;
}
