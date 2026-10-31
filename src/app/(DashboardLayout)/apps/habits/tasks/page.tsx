import { redirect } from "next/navigation";
import { habitWorkspaceUrl } from "@/lib/habit-workspace-routes";

export default async function TasksRedirect({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    projectId?: string;
    view?: string;
    taskView?: string;
  }>;
}) {
  const params = await searchParams;
  redirect(
    habitWorkspaceUrl("tasks", {
      date: params.date,
      projectId: params.projectId,
      taskView: params.taskView ?? params.view,
    }),
  );
}
