"use client";

import Image from "next/image";
import { useState } from "react";

const localLogoUrl = "/images/logos/logo-notag-full-color.svg";

function BrandLogoImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [hasFailed, setHasFailed] = useState(false);

  return (
    <Image
      src={hasFailed ? localLogoUrl : src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasFailed(true)}
    />
  );
}

export function BrandLogo({
  src = localLogoUrl,
  alt = "Skala Prioritas Engineering",
  width,
  height,
  className,
}: {
  src?: string;
  alt?: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <BrandLogoImage
      key={src}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
