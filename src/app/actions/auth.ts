"use server";

import { z } from "zod";
import { signIn, signOut } from "../../../auth";
import { prisma } from "@/lib/prisma";
import { getRoleHomePath } from "@/lib/role-home";

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

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
    return {
      success: false,
      error: "Login gagal. Periksa email dan password lalu coba kembali.",
    };
  }
}
