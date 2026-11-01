import { NextRequest, NextResponse } from "next/server";
import { isValidPublicCode } from "@/lib/documents/random-code";

export async function GET(request: NextRequest) {
  const publicCode = request.nextUrl.searchParams.get("publicCode") ?? "";
  if (!isValidPublicCode(publicCode)) {
    return NextResponse.json(
      { message: "Kode Delivery Order tidak valid." },
      { status: 400 },
    );
  }

  const destination = new URL("/api/documents/transactions", request.url);
  destination.searchParams.set("kind", "DO");
  destination.searchParams.set("publicCode", publicCode);
  return NextResponse.redirect(destination, 307);
}
