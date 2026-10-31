import { redirect } from "next/navigation";
import { habitWorkspaceUrl } from "@/lib/habit-workspace-routes";

export default async function TimesheetRedirect({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    timeframe?: string;
    memberId?: string;
    team?: string;
    projectId?: string;
  }>;
}) {
  const params = await searchParams;
  redirect(
    habitWorkspaceUrl("timesheet", {
      date: params.date,
      timeframe: params.timeframe,
      memberId: params.memberId,
      team: params.team,
      projectId: params.projectId,
    }),
  );
}
