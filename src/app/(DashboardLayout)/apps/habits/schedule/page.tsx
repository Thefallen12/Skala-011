import { redirect } from "next/navigation";
import { habitWorkspaceUrl } from "@/lib/habit-workspace-routes";

export default async function ScheduleRedirect({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams;
  redirect(
    habitWorkspaceUrl("calendar", {
      date: params.date,
      calendarView: params.view,
    }),
  );
}
