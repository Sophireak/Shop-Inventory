import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    const success = await login(pin);

    if (!success) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
