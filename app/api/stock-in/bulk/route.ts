import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, supplier, note } = body;
    // items: [{ productId, quantity, costPrice }, ...]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items to add" }, { status: 400 });
    }

    // Filter valid items (quantity > 0)
    const validItems = items.filter(
      (item: { quantity: number }) => item.quantity > 0,
    );

    if (validItems.length === 0) {
      return NextResponse.json({ error: "No valid items" }, { status: 400 });
    }

    // Get all products at once
    const productIds = validItems.map(
      (i: { productId: number }) => i.productId,
    );
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Execute all in a transaction
    const results = await db.$transaction(async (tx) => {
      const created = [];

      for (const item of validItems) {
        const product = productMap.get(item.productId);
        if (!product) continue;

        const qty = Number(item.quantity);
        const cost = Number(item.costPrice ?? product.costPrice);
        const totalCost = qty * cost;

        // Create stock-in record
        const stockIn = await tx.stockIn.create({
          data: {
            productId: product.id,
            quantity: qty,
            costPrice: cost,
            totalCost: totalCost,
            supplier: supplier || null,
            note: note || null,
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: product.id },
          data: {
            currentStock: { increment: qty },
          },
        });

        created.push(stockIn);
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      count: results.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to bulk restock" },
      { status: 500 },
    );
  }
}
