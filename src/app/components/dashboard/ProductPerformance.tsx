import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import CardBox from "../shared/CardBox";
import { Badge } from "@/components/ui/badge";

type DashboardProject = {
  id: string;
  code: string;
  name: string;
  statusLabel: string;
  progress: number;
  budget: string;
  fieldPic: { name: string } | null;
};

export const ProductPerformance = ({
  projects,
  averageProgress,
}: {
  projects: DashboardProject[];
  averageProgress: number;
}) => (
  <CardBox className="w-full">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h5 className="card-title">Proyek Terbaru</h5>
        <p className="text-sm font-normal text-muted-foreground">
          Rata-rata progres proyek terbaru: {averageProgress}%
        </p>
      </div>
      <Link href="/apps/project" className="text-sm text-primary hover:underline">
        Semua proyek
      </Link>
    </div>
    <div className="flex flex-col">
      <div className="-m-1.5 overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-semibold">Kode</TableHead>
                  <TableHead className="min-w-[190px] text-sm font-semibold">
                    Proyek
                  </TableHead>
                  <TableHead className="text-sm font-semibold">PIC</TableHead>
                  <TableHead className="text-sm font-semibold">Status</TableHead>
                  <TableHead className="min-w-[130px] text-sm font-semibold">
                    Progres
                  </TableHead>
                  <TableHead className="text-sm font-semibold">Anggaran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length ? (
                  projects.map((project) => (
                    <TableRow key={project.id} className="border-b border-border">
                      <TableCell className="text-xs text-muted-foreground">
                        {project.code}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold">{project.name}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {project.fieldPic?.name ?? "Belum ditentukan"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="gray">{project.statusLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={project.progress}
                            className="h-1.5 w-20"
                            aria-label={`Progres ${project.name}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(project.progress)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {project.budget}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Belum ada proyek.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  </CardBox>
);
