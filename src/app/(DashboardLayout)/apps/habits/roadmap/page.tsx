import { redirect } from "next/navigation";
import { habitWorkspaceUrl } from "@/lib/habit-workspace-routes";

export default async function RoadmapRedirect({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; projectId?: string }>;
}) {
  const params = await searchParams;
  redirect(
    habitWorkspaceUrl("calendar", {
      date: params.date,
      projectId: params.projectId,
    }),
  );
}
