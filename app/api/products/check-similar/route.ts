import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ similar: [] });
    }

    // Find products with same name (any size/style)
    const similar = await db.product.findMany({
      where: {
        name: name.trim(),
        isActive: true,
      },
      orderBy: [{ size: "asc" }, { style: "asc" }],
    });

    return NextResponse.json({ similar });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ similar: [] });
  }
}
