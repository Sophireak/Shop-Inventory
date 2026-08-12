import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "Missing dates" }, { status: 400 });
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Get all sales in period
    const dailySales = await db.dailySale.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { date: "asc" },
    });

    // Aggregate by product
    const productMap = new Map<
      number,
      {
        product: {
          name: string;
          size: string | null;
          style: string | null;
          category: string;
          costPrice: number;
        };
        quantity: number;
        totalCost: number;
      }
    >();

    for (const sale of dailySales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productId);
        const itemCost = item.quantity * item.product.costPrice;

        if (existing) {
          existing.quantity += item.quantity;
          existing.totalCost += itemCost;
        } else {
          productMap.set(item.productId, {
            product: {
              name: item.product.name,
              size: item.product.size,
              style: item.product.style,
              category: item.product.category,
              costPrice: item.product.costPrice,
            },
            quantity: item.quantity,
            totalCost: itemCost,
          });
        }
      }
    }

    // Sort by category, then by name
    const items = Array.from(productMap.values()).sort((a, b) => {
      // Sort by category first
      const catOrder = { girl: 1, boy: 2, both: 3 };
      const catA = catOrder[a.product.category as keyof typeof catOrder] || 4;
      const catB = catOrder[b.product.category as keyof typeof catOrder] || 4;
      if (catA !== catB) return catA - catB;

      // Then by name
      return a.product.name.localeCompare(b.product.name);
    });

    // Calculate totals
    const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = items.reduce((s, i) => s + i.totalCost, 0);

    return NextResponse.json({
      period: { from, to },
      items,
      totals: {
        quantity: totalQuantity,
        amount: totalAmount,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
