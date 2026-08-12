import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json(
        { error: "Database not found" },
        { status: 404 },
      );
    }

    const buffer = fs.readFileSync(dbPath);
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="shop-backup-${date}.db"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to backup" }, { status: 500 });
  }
}
