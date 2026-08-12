import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET recent stock checks
export async function GET() {
  try {
    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const checks = await db.stockCheck.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(checks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST batch save stock check
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { checks } = body; // Array of { productId, actualStock, reason, note }

    if (!checks || !Array.isArray(checks) || checks.length === 0) {
      return NextResponse.json({ error: "No checks to save" }, { status: 400 });
    }

    // Get all products at once
    const productIds = checks.map((c: { productId: number }) => c.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const results = await db.$transaction(async (tx) => {
      const saved = [];

      for (const check of checks) {
        const product = productMap.get(check.productId);
        if (!product) continue;

        const expectedStock = product.currentStock;
        const actualStock = Number(check.actualStock);
        const difference = actualStock - expectedStock;

        // Skip if no difference
        if (difference === 0) continue;

        // Loss value = negative difference (missing items)
        // If difference is negative, it's a loss
        const lossValue =
          difference < 0 ? Math.abs(difference) * product.sellPrice : 0;

        // Create stock check record
        const stockCheck = await tx.stockCheck.create({
          data: {
            productId: product.id,
            expectedStock,
            actualStock,
            difference,
            lossValue,
            reason: check.reason || null,
            note: check.note || null,
          },
        });

        // Update product stock to actual count
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: actualStock },
        });

        saved.push(stockCheck);
      }

      return saved;
    });

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save stock check" },
      { status: 500 },
    );
  }
}
