function parsePublicOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const isWildcardBindAddress = hostname === "0.0.0.0" || hostname === "::";
    const isLocalHost =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "::1" ||
      /^127(?:\.\d{1,3}){3}$/.test(hostname);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      isWildcardBindAddress ||
      isLocalHost
    ) {
      return null;
    }

    return new URL(url.origin);
  } catch {
    return null;
  }
}

export function resolvePublicAppUrl(): URL | null {
  if (process.env.NODE_ENV !== "production") {
    return new URL("http://localhost:3000");
  }

  const configuredOrigin = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
  ].find((value) => Boolean(value?.trim()));

  if (configuredOrigin) {
    return parsePublicOrigin(configuredOrigin.trim());
  }

  return null;
}
