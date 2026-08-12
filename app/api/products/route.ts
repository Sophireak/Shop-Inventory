import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all products
export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }, { sellPrice: "asc" }],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// POST create new product
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, size, style, category, sellPrice, costPrice, minStock } =
      body;

    if (!name || !category || !sellPrice) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "សូមបំពេញព័ត៌មានទាំងអស់" },
        { status: 400 },
      );
    }

    // Check for duplicate BEFORE creating
    const existing = await db.product.findFirst({
      where: {
        name,
        size: size || null,
        style: style || null,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "DUPLICATE",
          message: "ផលិតផលនេះមានរួចហើយ",
          existingProduct: existing,
        },
        { status: 409 },
      );
    }

    const product = await db.product.create({
      data: {
        name,
        size: size || null,
        style: style || null,
        category,
        sellPrice: Number(sellPrice),
        costPrice: Number(costPrice ?? sellPrice - 300),
        minStock: Number(minStock ?? 5),
        currentStock: 0,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        {
          error: "DUPLICATE",
          message: "ផលិតផលនេះមានរួចហើយ",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "UNKNOWN", message: "មានបញ្ហាកើតឡើង" },
      { status: 500 },
    );
  }
}
