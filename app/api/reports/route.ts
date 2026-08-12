import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCashFlowAnalysis, getCurrentTotalDebt } from "@/lib/debt";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 },
      );
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Previous period
    const periodDays = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - periodDays);
    const prevToDate = new Date(fromDate);
    prevToDate.setDate(prevToDate.getDate() - 1);
    prevToDate.setHours(23, 59, 59, 999);

    // Current period sales
    const dailySales = await db.dailySale.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      include: {
        items: { include: { product: true } },
      },
      orderBy: { date: "desc" },
    });

    // Previous period sales
    const prevDailySales = await db.dailySale.findMany({
      where: { date: { gte: prevFromDate, lte: prevToDate } },
    });

    // Stock checks
    const stockChecks = await db.stockCheck.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        difference: { lt: 0 },
      },
      include: { product: true },
    });

    // Totals
    const totals = {
      revenue: 0,
      cost: 0,
      profit: 0,
      items: 0,
      loss: 0,
      cashDifference: 0,
    };

    for (const sale of dailySales) {
      totals.revenue += sale.totalRevenue;
      totals.cost += sale.totalCost;
      totals.profit += sale.totalProfit;
      totals.items += sale.totalItems;
      totals.cashDifference += sale.cashDifference ?? 0;
    }

    for (const check of stockChecks) {
      totals.loss += check.lossValue;
    }

    const prevTotals = { revenue: 0, profit: 0, items: 0 };
    for (const sale of prevDailySales) {
      prevTotals.revenue += sale.totalRevenue;
      prevTotals.profit += sale.totalProfit;
      prevTotals.items += sale.totalItems;
    }

    const changes = {
      revenue:
        prevTotals.revenue > 0
          ? Math.round(
              ((totals.revenue - prevTotals.revenue) / prevTotals.revenue) *
                100,
            )
          : null,
      profit:
        prevTotals.profit > 0
          ? Math.round(
              ((totals.profit - prevTotals.profit) / prevTotals.profit) * 100,
            )
          : null,
      items:
        prevTotals.items > 0
          ? Math.round(
              ((totals.items - prevTotals.items) / prevTotals.items) * 100,
            )
          : null,
    };

    const profitMargin =
      totals.revenue > 0
        ? Math.round((totals.profit / totals.revenue) * 100 * 10) / 10
        : 0;

    // Best/worst days
    const sortedByRevenue = [...dailySales].sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );
    const bestDay = sortedByRevenue[0] || null;
    const worstDay = sortedByRevenue[sortedByRevenue.length - 1] || null;

    // Category breakdown
    const categoryTotals = { girl: 0, boy: 0, both: 0 };
    const categoryItems = { girl: 0, boy: 0, both: 0 };

    for (const sale of dailySales) {
      for (const item of sale.items) {
        const cat = item.product.category as "girl" | "boy" | "both";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + item.subtotal;
        categoryItems[cat] = (categoryItems[cat] || 0) + item.quantity;
      }
    }

    const categoryBreakdown = [
      {
        name: "កុមារី",
        value: categoryTotals.girl,
        items: categoryItems.girl,
        color: "#ec4899",
      },
      {
        name: "កុមារា",
        value: categoryTotals.boy,
        items: categoryItems.boy,
        color: "#3b82f6",
      },
      {
        name: "ទាំងពីរ",
        value: categoryTotals.both,
        items: categoryItems.both,
        color: "#8b5cf6",
      },
    ].filter((c) => c.value > 0);

    // Product sales aggregation (NOW WITH DEBT INFO!)
    const productSalesMap = new Map<
      number,
      {
        product: (typeof dailySales)[0]["items"][0]["product"];
        quantity: number;
        revenue: number;
        cost: number;
      }
    >();

    for (const sale of dailySales) {
      for (const item of sale.items) {
        const existing = productSalesMap.get(item.productId);
        const itemCost = item.quantity * item.product.costPrice;
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
          existing.cost += itemCost;
        } else {
          productSalesMap.set(item.productId, {
            product: item.product,
            quantity: item.quantity,
            revenue: item.subtotal,
            cost: itemCost,
          });
        }
      }
    }

    // Get all products for stock debt info
    const allProducts = await db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        size: true,
        style: true,
        category: true,
        sellPrice: true,
        costPrice: true,
        currentStock: true,
      },
    });

    // Enhanced product sales with debt info
    const productSales = Array.from(productSalesMap.values())
      .map((item) => {
        const currentProduct = allProducts.find(
          (p) => p.id === item.product.id,
        );
        const debtLeft = currentProduct
          ? currentProduct.currentStock * currentProduct.costPrice
          : 0;
        const profit = item.revenue - item.cost;

        return {
          ...item,
          debtLeft,
          profit,
          currentStock: currentProduct?.currentStock ?? 0,
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    // Daily trend
    const trend = [...dailySales]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((sale) => ({
        date: sale.date.toISOString().split("T")[0],
        revenue: sale.totalRevenue,
        profit: sale.totalProfit,
        items: sale.totalItems,
      }));

    // Daily sales log
    const dailySalesLog = dailySales.map((sale) => ({
      id: sale.id,
      date: sale.date.toISOString(),
      totalItems: sale.totalItems,
      totalRevenue: sale.totalRevenue,
      totalProfit: sale.totalProfit,
      cashDifference: sale.cashDifference,
      note: sale.note,
      items: sale.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        productSize: item.product.size,
        productStyle: item.product.style,
        category: item.product.category,
        quantity: item.quantity,
        sellPrice: item.sellPrice,
        subtotal: item.subtotal,
      })),
    }));

    // NEW: Cash flow analysis with debt
    const cashFlow = await getCashFlowAnalysis(fromDate, toDate);
    const currentDebt = await getCurrentTotalDebt();

    return NextResponse.json({
      totals,
      changes,
      profitMargin,
      bestDay: bestDay
        ? {
            date: bestDay.date.toISOString(),
            revenue: bestDay.totalRevenue,
            items: bestDay.totalItems,
          }
        : null,
      worstDay:
        worstDay && dailySales.length > 1
          ? {
              date: worstDay.date.toISOString(),
              revenue: worstDay.totalRevenue,
              items: worstDay.totalItems,
            }
          : null,
      categoryBreakdown,
      trend,
      productSales,
      losses: stockChecks,
      dailySalesLog,
      daysWithSales: dailySales.length,
      periodDays,
      // NEW
      cashFlow,
      currentDebt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
