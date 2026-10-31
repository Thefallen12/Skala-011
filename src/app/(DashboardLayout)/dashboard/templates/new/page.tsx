import { redirect } from "next/navigation";

export default async function LegacyTemplateEditorRedirect({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  redirect(
    id
      ? `/apps/templates?edit=${encodeURIComponent(id)}`
      : "/apps/templates",
  );
}
