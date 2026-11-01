"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  icon?: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  overlayClassName?: string;
  footerNote?: string;
  hideHeader?: boolean;
}

export function GlobalModal({
  isOpen,
  onClose,
  title,
  icon,
  description,
  children,
  footer,
  className,
  bodyClassName,
  overlayClassName,
  footerNote = "* Pastikan data yang dimasukkan telah sesuai.",
  hideHeader = false,
}: GlobalModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        overlayClassName={cn(
          "bg-[#070d19]/85 backdrop-blur-sm",
          overlayClassName,
        )}
        className={cn(
          "flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#131b2e] p-0 text-slate-100 shadow-2xl",
          "[&>button:last-child]:right-4 [&>button:last-child]:top-4 [&>button:last-child]:rounded-lg [&>button:last-child]:bg-slate-800 [&>button:last-child]:p-2 [&>button:last-child]:text-slate-400 [&>button:last-child]:hover:bg-slate-700 [&>button:last-child]:hover:text-white",
          className,
        )}
      >
        <DialogHeader className={cn(
          "shrink-0 flex-row items-start justify-between gap-4 space-y-0 border-b border-slate-800 bg-[#162035] px-6 py-5 pr-16",
          hideHeader && "hidden",
        )}>
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
              {icon ?? <FolderOpen aria-hidden="true" className="size-5" />}
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-xs leading-relaxed text-slate-400">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto space-y-5 p-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 flex flex-col items-center justify-between gap-4 border-t border-slate-800 bg-[#162035] px-6 py-5 sm:flex-row">
            {footerNote ? (
              <span className="text-center text-[10px] font-medium leading-normal text-slate-400 sm:text-left">
                {footerNote}
              </span>
            ) : null}
            <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
              {footer}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
