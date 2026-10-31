"use client";

import CardBox from "@/app/components/shared/CardBox";
import type { ProjectDashboardRow } from "@/app/(DashboardLayout)/types/project";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const priorityLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

const priorityVariants = {
  LOW: "lightSuccess",
  MEDIUM: "lightInfo",
  HIGH: "lightWarning",
  URGENT: "lightError",
} as const;

export default function VendorProjectTable({
  projects,
}: {
  projects: ProjectDashboardRow[];
}) {
  const vendorProjects = projects.filter((project) => project.vendor);

  return (
    <CardBox className="h-full">
      <h3 className="mb-4 text-xl font-semibold">Project Vendor</h3>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Judul Project</TableHead>
              <TableHead>Progres</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioritas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorProjects.length ? (
              vendorProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="min-w-40 font-medium">
                    {project.vendor}
                  </TableCell>
                  <TableCell className="min-w-48">{project.title}</TableCell>
                  <TableCell className="min-w-40">
                    <div className="flex items-center gap-2">
                      <Progress
                        className="h-2"
                        value={Math.max(0, Math.min(100, project.progress))}
                      />
                      <span className="w-10 text-right text-xs text-muted-foreground">
                        {project.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        project.status === "DONE" ||
                        project.status === "COMPLETED"
                          ? "lightSuccess"
                          : project.status === "TERHAMBAT" ||
                              project.status === "ON_HOLD"
                            ? "lightError"
                            : project.status === "ON_PROGRESS" ||
                                project.status === "ACTIVE"
                              ? "lightInfo"
                              : "lightWarning"
                      }
                    >
                      {project.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariants[project.priority]}>
                      {priorityLabels[project.priority]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Belum ada project dengan vendor.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardBox>
  );
}
