import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET recent stock-ins
export async function GET() {
  try {
    const stockIns = await db.stockIn.findMany({
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20, // last 20 entries
    });

    return NextResponse.json(stockIns);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST create new stock-in
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, quantity, costPrice, supplier, note } = body;

    if (!productId || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const qty = Number(quantity);
    const cost = Number(costPrice);
    const totalCost = qty * cost;

    // Use transaction: create stock-in AND update product stock together
    const result = await db.$transaction(async (tx) => {
      // 1. Create stock-in record
      const stockIn = await tx.stockIn.create({
        data: {
          productId: Number(productId),
          quantity: qty,
          costPrice: cost,
          totalCost: totalCost,
          supplier: supplier || null,
          note: note || null,
        },
        include: {
          product: true,
        },
      });

      // 2. Add quantity to product's current stock
      await tx.product.update({
        where: { id: Number(productId) },
        data: {
          currentStock: {
            increment: qty,
          },
        },
      });

      return stockIn;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to record stock in" },
      { status: 500 },
    );
  }
}
