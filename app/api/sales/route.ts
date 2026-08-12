import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET sales for a specific date
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      // Return last 7 days summary
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const sales = await db.dailySale.findMany({
        where: {
          date: { gte: sevenDaysAgo },
        },
        orderBy: { date: "desc" },
      });

      return NextResponse.json(sales);
    }

    // Parse date and get that day's sale
    const date = new Date(dateParam);
    date.setHours(0, 0, 0, 0);

    const sale = await db.dailySale.findUnique({
      where: { date },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST create or update daily sales
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, items, cashCounted, note } = body;

    if (!date || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Filter out items with 0 quantity
    const validItems = items.filter(
      (item: { quantity: number }) => item.quantity > 0,
    );

    if (validItems.length === 0) {
      return NextResponse.json({ error: "No items to save" }, { status: 400 });
    }

    const saleDate = new Date(date);
    saleDate.setHours(0, 0, 0, 0);

    // Calculate totals
    let totalItems = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    // Get all products at once
    const productIds = validItems.map(
      (i: { productId: number }) => i.productId,
    );
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of validItems) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      totalItems += item.quantity;
      totalRevenue += item.quantity * product.sellPrice;
      totalCost += item.quantity * product.costPrice;
    }

    const totalProfit = totalRevenue - totalCost;
    const cashDifference =
      cashCounted !== null && cashCounted !== undefined
        ? Number(cashCounted) - totalRevenue
        : null;

    // Use transaction
    const result = await db.$transaction(async (tx) => {
      // Check if sale already exists for this date
      const existing = await tx.dailySale.findUnique({
        where: { date: saleDate },
        include: { items: true },
      });

      let dailySale;

      if (existing) {
        // UPDATE: First, restore old stock
        for (const oldItem of existing.items) {
          await tx.product.update({
            where: { id: oldItem.productId },
            data: {
              currentStock: { increment: oldItem.quantity },
            },
          });
        }

        // Delete old items
        await tx.saleItem.deleteMany({
          where: { dailySaleId: existing.id },
        });

        // Update daily sale
        dailySale = await tx.dailySale.update({
          where: { id: existing.id },
          data: {
            totalItems,
            totalRevenue,
            totalCost,
            totalProfit,
            cashCounted:
              cashCounted !== null && cashCounted !== undefined
                ? Number(cashCounted)
                : null,
            cashDifference,
            note: note || null,
          },
        });
      } else {
        // CREATE
        dailySale = await tx.dailySale.create({
          data: {
            date: saleDate,
            totalItems,
            totalRevenue,
            totalCost,
            totalProfit,
            cashCounted:
              cashCounted !== null && cashCounted !== undefined
                ? Number(cashCounted)
                : null,
            cashDifference,
            note: note || null,
          },
        });
      }

      // Create new sale items and deduct stock
      for (const item of validItems) {
        const product = productMap.get(item.productId);
        if (!product) continue;

        await tx.saleItem.create({
          data: {
            dailySaleId: dailySale.id,
            productId: item.productId,
            quantity: item.quantity,
            sellPrice: product.sellPrice,
            subtotal: item.quantity * product.sellPrice,
          },
        });

        // Deduct from product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { decrement: item.quantity },
          },
        });
      }

      return dailySale;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save sales" },
      { status: 500 },
    );
  }
}
