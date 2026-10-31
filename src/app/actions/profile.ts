"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "../../../auth";
import { prisma } from "@/lib/prisma";
import {
  ProfilePhotoValidationError,
  removeUserProfilePhoto,
  saveUserProfilePhoto,
  type SavedUserProfilePhoto,
} from "@/lib/user-profile-photos";

export type ProfileActionResult = {
  success: boolean;
  message: string;
};

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateMyProfile(
  formData: FormData,
): Promise<ProfileActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Silakan masuk untuk mengubah profil." };
  }
  if (!(formData instanceof FormData)) {
    return { success: false, message: "Data profil tidak valid." };
  }

  const name = field(formData, "name");
  const phone = field(formData, "phone");
  const bankName = field(formData, "bankName");
  const bankAccountName = field(formData, "bankAccountName");
  const bankAccountNumber = field(formData, "bankAccountNumber");

  if (name.length < 2 || name.length > 120) {
    return { success: false, message: "Nama harus terdiri dari 2–120 karakter." };
  }
  if (phone.length > 32 || (phone && !/^[+()\d\s.-]+$/.test(phone))) {
    return { success: false, message: "Format nomor telepon tidak valid." };
  }
  if (bankName.length > 80 || bankAccountName.length > 120) {
    return { success: false, message: "Informasi rekening melebihi batas karakter." };
  }
  if (
    bankAccountNumber &&
    !/^\d{6,30}$/.test(bankAccountNumber.replace(/\s/g, ""))
  ) {
    return {
      success: false,
      message: "Nomor rekening harus berisi 6–30 digit angka.",
    };
  }
  if (
    (bankName || bankAccountName || bankAccountNumber) &&
    (!bankName || !bankAccountName || !bankAccountNumber)
  ) {
    return {
      success: false,
      message: "Isi nama bank, nama pemilik, dan nomor rekening secara lengkap.",
    };
  }

  const fileValue = formData.get("profilePhoto");
  if (fileValue !== null && !(fileValue instanceof File)) {
    return { success: false, message: "File foto profil tidak valid." };
  }
  const photoFile = fileValue instanceof File && fileValue.size > 0
    ? fileValue
    : null;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isActive: true, profilePhotoUrl: true },
  });
  if (!currentUser?.isActive) {
    return { success: false, message: "Akun tidak aktif atau tidak ditemukan." };
  }

  let newPhoto: SavedUserProfilePhoto | null = null;
  try {
    if (photoFile) newPhoto = await saveUserProfilePhoto(photoFile);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name,
        phone: phone || null,
        bankName: bankName || null,
        bankAccountName: bankAccountName || null,
        bankAccountNumber: bankAccountNumber.replace(/\s/g, "") || null,
        ...(newPhoto ? { profilePhotoUrl: newPhoto.url } : {}),
      },
    });
  } catch (error) {
    if (newPhoto) {
      try {
        await removeUserProfilePhoto(newPhoto.url, newPhoto.sourceUrl);
      } catch (cleanupError) {
        console.error("Removing unused profile photo failed:", cleanupError);
      }
    }
    if (error instanceof ProfilePhotoValidationError) {
      return { success: false, message: error.message };
    }
    console.error("Updating current user profile failed:", error);
    return {
      success: false,
      message: "Profil gagal disimpan. Silakan coba kembali.",
    };
  }

  let message = "Profil berhasil diperbarui.";
  if (newPhoto && currentUser.profilePhotoUrl) {
    try {
      await removeUserProfilePhoto(currentUser.profilePhotoUrl);
    } catch (error) {
      console.error("Removing previous profile photo failed:", error);
      message = "Profil diperbarui, tetapi foto lama gagal dibersihkan.";
    }
  }

  revalidatePath("/user-profile");
  revalidatePath("/(DashboardLayout)", "layout");
  return { success: true, message };
}

export async function changeMyPassword(
  formData: FormData,
): Promise<ProfileActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Silakan masuk untuk mengubah kata sandi." };
  }
  if (!(formData instanceof FormData)) {
    return { success: false, message: "Data kata sandi tidak valid." };
  }

  const currentPassword = field(formData, "currentPassword");
  const newPassword = field(formData, "newPassword");
  const confirmPassword = field(formData, "confirmPassword");
  if (newPassword.length < 6 || newPassword.length > 72) {
    return {
      success: false,
      message: "Kata sandi baru harus terdiri dari 6–72 karakter.",
    };
  }
  if (
    !/[a-z]/.test(newPassword) ||
    !/[A-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword) ||
    !/[^A-Za-z0-9]/.test(newPassword)
  ) {
    return {
      success: false,
      message: "Gunakan huruf besar, huruf kecil, angka, dan simbol.",
    };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: "Konfirmasi kata sandi tidak cocok." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, isActive: true },
  });
  if (!user?.isActive) {
    return { success: false, message: "Akun tidak aktif atau tidak ditemukan." };
  }

  try {
    if (!(await compare(currentPassword, user.passwordHash))) {
      return { success: false, message: "Kata sandi saat ini tidak benar." };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hash(newPassword, 12) },
    });
  } catch (error) {
    console.error("Changing current user password failed:", error);
    return {
      success: false,
      message: "Kata sandi gagal diubah. Silakan coba kembali.",
    };
  }

  revalidatePath("/user-profile");
  return { success: true, message: "Kata sandi berhasil diperbarui." };
}
