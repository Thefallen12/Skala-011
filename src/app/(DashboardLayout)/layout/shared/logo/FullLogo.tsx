"use client";

import Image from "next/image";

const FullLogo = () => {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <Image
        src="/images/logos/icont%20logo%201.svg"
        alt="Skala Prioritas Engineering"
        width={45}
        height={40}
        priority
        className="h-10 w-[45px] shrink-0 rounded-md object-contain dark:bg-white dark:p-1"
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-bold text-primary dark:text-white">
          SKALA PRIORITAS
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">
          Engineering
        </span>
      </span>
    </div>
  );
};

export default FullLogo;
