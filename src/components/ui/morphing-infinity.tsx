import { useId } from "react";
import { cn } from "@/lib/utils";

type MorphingInfinityProps = {
  size?: number;
  className?: string;
};

export function MorphingInfinity({
  size = 48,
  className,
}: MorphingInfinityProps) {
  const gradientId = `infinity-gradient-${useId().replaceAll(":", "")}`;

  return (
    <svg
      aria-hidden="true"
      className={cn("morphing-infinity", className)}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="5" y1="10" x2="43" y2="38">
          <stop className="morphing-infinity-start" offset="0%" />
          <stop className="morphing-infinity-end" offset="100%" />
        </linearGradient>
      </defs>
      <path
        className="morphing-infinity-path"
        d="M8 24c0-5.1 4.1-9.2 9.2-9.2 7.5 0 13.1 18.4 20.6 18.4a9.2 9.2 0 0 0 0-18.4C30.3 14.8 24.7 33.2 17.2 33.2A9.2 9.2 0 0 1 8 24Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
