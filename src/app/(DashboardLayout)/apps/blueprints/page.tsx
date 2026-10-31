import { redirect } from "next/navigation";

export default function BlueprintsPage() {
  redirect("/apps/projects?view=drawings");
}
