import { redirect } from "next/navigation";

export default async function ProjectMapPage() {
  redirect("/apps/projects?section=surveys");
}
