import { NextResponse } from "next/server";
import { HttpError } from "@/lib/auth/guards";

export function jsonError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
