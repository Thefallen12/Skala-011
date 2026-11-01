import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import GISWorkspace from "@/app/components/apps/gis/GISWorkspace";
import type {
  FieldSurveySummary,
  SurveyProjectOption,
} from "@/app/components/apps/gis/SurveySidebar";

export const metadata: Metadata = {
  title: "Lokasi Proyek & Survei Lapangan",
};

const surveyRoles: UserRole[] = [
  UserRole.ADMINISTRATIONS,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.KOORDINATOR,
  UserRole.FIELD_TEAM,
  UserRole.DRAFTER,
];

const assignedProjectRoles: UserRole[] = [UserRole.KOORDINATOR, UserRole.FIELD_TEAM];

export default async function ProjectMapPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!user?.isActive || !surveyRoles.includes(user.role)) redirect("/");

  const projectWhere = {
    isDeleted: false,
    ...(assignedProjectRoles.includes(user.role) ? { fieldPicId: user.id } : {}),
  };
  const projects = await prisma.project.findMany({
    where: projectWhere,
    orderBy: { title: "asc" },
    select: { id: true, title: true, name: true },
  });
  const projectIds = projects.map((project) => project.id);
  const savedSurveys = projectIds.length
    ? await prisma.fieldSurvey.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          projectId: true,
          projectName: true,
          locationName: true,
          responsibleName: true,
          surveyor: { select: { name: true } },
          areaSqm: true,
          lengthM: true,
          perimeterM: true,
          notes: true,
          createdAt: true,
        },
      })
    : [];

  const projectOptions: SurveyProjectOption[] = projects.map((project) => ({
    id: project.id,
    title: project.title || project.name,
  }));
  const surveySummaries: FieldSurveySummary[] = savedSurveys.map((survey) => ({
    id: survey.id,
    projectId: survey.projectId,
    projectName: survey.projectName,
    locationName: survey.locationName,
    responsibleName: survey.responsibleName,
    surveyorName: survey.surveyor.name,
    areaSqm: survey.areaSqm,
    lengthM: survey.lengthM,
    perimeterM: survey.perimeterM,
    notes: survey.notes,
    createdAt: survey.createdAt.toISOString(),
  }));

  return (
    <GISWorkspace
      projects={projectOptions}
      surveys={surveySummaries}
      surveyorName={user.name}
    />
  );
}
