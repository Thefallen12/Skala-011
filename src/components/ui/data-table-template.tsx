"use client";

import { useState, type ReactNode } from "react";
import { Table, TablePaginationControls } from "@/components/ui/table";

type DataTableTemplateProps<T> = {
  data: T[];
  itemLabel: string;
  pageSize?: number;
  tableClassName?: string;
  children: (pageData: T[]) => ReactNode;
};

export function DataTableTemplate<T>({
  data,
  itemLabel,
  pageSize = 5,
  tableClassName,
  children,
}: DataTableTemplateProps<T>) {
  const [page, setPage] = useState(1);
  const safePageSize = Number.isFinite(pageSize)
    ? Math.max(1, Math.floor(pageSize))
    : 5;
  const pageCount = Math.max(1, Math.ceil(data.length / safePageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = data.length === 0 ? 0 : (currentPage - 1) * safePageSize;
  const pageData = data.slice(startIndex, startIndex + safePageSize);

  return (
    <div className="space-y-3">
      <Table pagination={false} className={tableClassName}>
        {children(pageData)}
      </Table>
      <TablePaginationControls
        count={data.length}
        pageSize={safePageSize}
        page={currentPage}
        itemLabel={itemLabel}
        onPageChange={setPage}
      />
    </div>
  );
}
