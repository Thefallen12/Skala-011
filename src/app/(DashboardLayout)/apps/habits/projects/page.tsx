import { redirect } from "next/navigation";
import { habitWorkspaceUrl } from "@/lib/habit-workspace-routes";

export default async function ProjectsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string; view?: string }>;
}) {
  const params = await searchParams;
  const monthDate =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? `${params.month}-01`
      : undefined;
  redirect(
    habitWorkspaceUrl("calendar", {
      date: params.date ?? monthDate,
      calendarView: params.view,
    }),
  );
}
