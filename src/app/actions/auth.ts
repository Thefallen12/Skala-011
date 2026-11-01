"use server";

import { z } from "zod";
import { signIn, signOut } from "../../../auth";
import { prisma } from "@/lib/prisma";
import { getRoleHomePath } from "@/lib/role-home";

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

const databaseConnectionErrorCodes = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1010",
  "P1011",
  "P1012",
  "P1013",
  "P1017",
  "P2024",
]);

function isDatabaseConnectionError(
  error: unknown,
  visited = new Set<object>(),
): boolean {
  if (typeof error !== "object" || error === null || visited.has(error)) {
    return false;
  }
  visited.add(error);

  if (
    "code" in error &&
    typeof error.code === "string" &&
    databaseConnectionErrorCodes.has(error.code)
  ) {
    return true;
  }

  return ["cause", "err", "originalError"].some(
    (key) =>
      key in error &&
      isDatabaseConnectionError(Reflect.get(error, key), visited),
  );
}

export async function logout() {
  await signOut({ redirectTo: "/auth/login" });
}

export async function loginWithCredentials(email: string, password: string) {
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { success: false, error: "Email atau password tidak valid." };
  }

  try {
    const redirectUrl = await signIn("credentials", {
      identifier: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    if (new URL(redirectUrl).searchParams.has("error")) {
      return { success: false, error: "Email atau password tidak valid." };
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { role: true, isActive: true },
    });
    if (!user?.isActive) {
      return { success: false, error: "Email atau password tidak valid." };
    }

    return {
      success: true,
      redirectTo: getRoleHomePath(user.role),
    };
  } catch (error) {
    console.error("Password login failed:", error);
    if (isDatabaseConnectionError(error)) {
      return {
        success: false,
        error:
          "Layanan login sedang mengalami gangguan koneksi database. Silakan coba lagi nanti atau hubungi administrator.",
      };
    }
    return {
      success: false,
      error: "Login gagal. Periksa email dan password lalu coba kembali.",
    };
  }
}
