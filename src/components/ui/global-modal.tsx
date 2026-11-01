"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  overlayClassName?: string;
  footerNote?: string;
}

export function GlobalModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  overlayClassName,
  footerNote = "* Pastikan data yang dimasukkan telah sesuai.",
}: GlobalModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn(
          "max-h-[90vh] max-w-2xl overflow-y-auto border-slate-700 bg-[#0F172A] text-slate-200",
          className,
        )}
      >
        <DialogHeader className="mb-1 border-b border-slate-700 pb-4 pr-8">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-slate-400">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="py-2">{children}</div>
        {footer ? (
          <div className="mt-1 flex flex-col gap-3 border-t border-slate-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {footerNote ? (
              <span className="text-xs text-slate-500">{footerNote}</span>
            ) : null}
            <div className="flex w-full justify-end gap-2 sm:w-auto">{footer}</div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
