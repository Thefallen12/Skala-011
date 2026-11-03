"use server";

import { revalidatePath } from "next/cache";
import { auth } from "../../../auth";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { isFinanceCashflowProofUrl } from "@/lib/finance-cashflow";

const expenseTypes = ["SALARY", "ADVANCE", "REIMBURSEMENT"] as const;
const paymentMethods = ["CASH", "TRANSFER"] as const;

export type OfficeExpenseInput = {
  expenseType: (typeof expenseTypes)[number];
  description: string;
  amount: number;
  recipientId: string;
  accountId: string;
  paymentMethod: (typeof paymentMethods)[number];
  proofUrls: string[];
};

export type OfficeExpenseActionResult = {
  success: boolean;
  message: string;
};

class OfficeExpenseError extends Error {}

function isFinanceOperator(role: UserRole): boolean {
  return role === UserRole.FINANCE || role === UserRole.ADMINISTRATIONS;
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maximum
  );
}

export async function recordOfficeExpense(
  input: OfficeExpenseInput,
): Promise<OfficeExpenseActionResult> {
  const session = await auth();
  if (!session?.user || !isFinanceOperator(session.user.role)) {
    return { success: false, message: "Hanya Keuangan yang dapat mencatat pengeluaran internal." };
  }
  if (
    !input ||
    !expenseTypes.includes(input.expenseType) ||
    !paymentMethods.includes(input.paymentMethod) ||
    !isBoundedText(input.description, 1000) ||
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount > 1_000_000_000_000_000 ||
    Math.abs(input.amount * 100 - Math.round(input.amount * 100)) >= 1e-8 ||
    !isBoundedText(input.recipientId, 100) ||
    !isBoundedText(input.accountId, 100) ||
    !Array.isArray(input.proofUrls) ||
    input.proofUrls.length > 5 ||
    input.proofUrls.length <
      (input.expenseType === "REIMBURSEMENT" ? 2 : 1) ||
    input.proofUrls.some(
      (url) =>
        typeof url !== "string" ||
        url.length > 2048 ||
        !isFinanceCashflowProofUrl(url),
    ) ||
    new Set(input.proofUrls).size !== input.proofUrls.length
  ) {
    return {
      success: false,
      message: "Data pengeluaran atau bukti transaksi tidak valid.",
    };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const recipient = await transaction.user.findFirst({
        where: { id: input.recipientId, isActive: true },
        select: { id: true },
      });
      if (!recipient) {
        throw new OfficeExpenseError("Penerima tidak ditemukan atau tidak aktif.");
      }

      const debit = await transaction.financeAccount.updateMany({
        where: {
          id: input.accountId,
          balance: { gte: input.amount },
        },
        data: { balance: { decrement: input.amount } },
      });
      if (debit.count !== 1) {
        const account = await transaction.financeAccount.findUnique({
          where: { id: input.accountId },
          select: { id: true },
        });
        throw new OfficeExpenseError(
          account
            ? "Saldo di akun kas/bank ini tidak mencukupi!"
            : "Akun kas/bank sumber dana tidak ditemukan.",
        );
      }

      const cashflow = await transaction.cashflow.create({
        data: {
          type: "OUT",
          amount: input.amount,
          sourceDesc: `[${input.expenseType}] ${input.description.trim()}`,
          paymentMethod: input.paymentMethod,
          proofUrl: input.proofUrls[0],
          accountId: input.accountId,
          recordedBy: session.user.id,
        },
        select: { id: true },
      });

      await transaction.officeExpense.create({
        data: {
          expenseType: input.expenseType,
          description: input.description.trim(),
          amount: input.amount,
          recipientId: input.recipientId,
          accountId: input.accountId,
          paymentMethod: input.paymentMethod,
          proofUrls: input.proofUrls,
          recordedBy: session.user.id,
          cashflowId: cashflow.id,
        },
      });
    });

    revalidatePath("/apps/finance");
    return { success: true, message: "Pengeluaran internal berhasil dicatat." };
  } catch (error) {
    if (error instanceof OfficeExpenseError) {
      return { success: false, message: error.message };
    }
    console.error("Recording office expense failed:", error);
    return {
      success: false,
      message: "Pengeluaran internal gagal dicatat. Silakan coba kembali.",
    };
  }
}
