"use server";

import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { UserRole } from "@/generated/prisma/enums";
import { canManageUsers } from "@/lib/user-access";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../auth";

export type RegisterState = {
  status: "idle" | "error" | "success";
  message: string;
};

function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).some((role) => role === value);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createAccount(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const session = await auth();
  if (!session?.user || !canManageUsers(session.user.role)) {
    return {
      status: "error",
      message: "Hanya administrator atau Direktur yang dapat membuat akun.",
    };
  }

  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const role = formData.get("role");
  const phoneValue = formData.get("phone");

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string"
  ) {
    return { status: "error", message: "Data formulir tidak valid." };
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedName.length < 2 || normalizedName.length > 120) {
    return {
      status: "error",
      message: "Nama harus terdiri dari 2 sampai 120 karakter.",
    };
  }

  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return { status: "error", message: "Masukkan alamat email yang valid." };
  }

  if (password.length < 12 || password.length > 128) {
    return {
      status: "error",
      message: "Password harus terdiri dari 12 sampai 128 karakter.",
    };
  }

  if (!isUserRole(role)) {
    return { status: "error", message: "Role yang dipilih tidak valid." };
  }
  const phone =
    typeof phoneValue === "string" ? phoneValue.trim() : "";
  if (
    phone.length > 32 ||
    (phone.length > 0 && !/^[+()\d\s.-]+$/.test(phone))
  ) {
    return { status: "error", message: "Nomor telepon tidak valid." };
  }

  try {
    await prisma.user.create({
      data: {
        id: randomUUID(),
        name: normalizedName,
        email: normalizedEmail,
        phone: phone || null,
        passwordHash: await hash(password, 12),
        role,
        isActive: formData.get("isActive") === "false" ? false : true,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        message: "Email tersebut sudah terdaftar.",
      };
    }

    console.error("Account creation failed:", error);
    return {
      status: "error",
      message: "Akun gagal dibuat. Silakan coba lagi.",
    };
  }

  revalidatePath("/auth/register");
  revalidatePath("/apps/users");
  return {
    status: "success",
    message: `Akun ${normalizedEmail} berhasil dibuat dengan role ${role}.`,
  };
}
