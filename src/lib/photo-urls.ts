function localApiUrl(url: string): URL | null {
  try {
    const origin =
      typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const parsed = new URL(url, origin);
    if (parsed.origin !== origin || !parsed.pathname.startsWith("/api/")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isPrivateCloudinaryPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      segments[1] === "raw" &&
      segments[2] === "authenticated" &&
      /\.pdf$/i.test(segments.at(-1) ?? "")
    );
  } catch {
    return false;
  }
}

function privatePdfRouteUrl(url: string, preview: boolean): string {
  const query = new URLSearchParams({ url });
  if (preview) query.set("preview", "1");
  return `/api/tickets/receipts/cloudinary?${query.toString()}`;
}

export function photoDownloadHref(url: string): string {
  return isPrivateCloudinaryPdfUrl(url)
    ? privatePdfRouteUrl(url, false)
    : url;
}

export function withLocalPhotoPreview(url: string): string {
  if (isPrivateCloudinaryPdfUrl(url)) {
    return privatePdfRouteUrl(url, true);
  }
  const parsed = localApiUrl(url);
  if (!parsed) return url;
  parsed.searchParams.set("preview", "1");
  return url.startsWith("/")
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : parsed.toString();
}

export function photoDownloadLinkProps(url: string) {
  if (isPrivateCloudinaryPdfUrl(url)) {
    return { target: "_blank" as const, rel: "noreferrer" };
  }
  if (localApiUrl(url)) return { download: true as const };
  return { target: "_blank" as const, rel: "noreferrer" };
}

export function photoDownloadLabel(url: string): string {
  if (/\.pdf(?:[?#]|$)/i.test(url)) {
    return localApiUrl(url) || isPrivateCloudinaryPdfUrl(url)
      ? "Unduh PDF"
      : "Buka / simpan PDF";
  }
  return localApiUrl(url) ? "Unduh foto" : "Buka / simpan foto";
}
