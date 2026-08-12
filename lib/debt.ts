import { db } from "@/lib/db";

/**
 * Calculate current total debt
 * Debt = SUM(currentStock × costPrice) for all active products
 */
export async function getCurrentTotalDebt() {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      currentStock: true,
      costPrice: true,
      category: true,
    },
  });

  let totalDebt = 0;
  let totalItems = 0;
  const byCategory: Record<string, { debt: number; items: number }> = {
    girl: { debt: 0, items: 0 },
    boy: { debt: 0, items: 0 },
    both: { debt: 0, items: 0 },
  };

  for (const p of products) {
    const debt = p.currentStock * p.costPrice;
    totalDebt += debt;
    totalItems += p.currentStock;

    if (byCategory[p.category]) {
      byCategory[p.category].debt += debt;
      byCategory[p.category].items += p.currentStock;
    }
  }

  return {
    totalDebt,
    totalItems,
    productCount: products.length,
    byCategory,
  };
}

/**
 * Calculate debt at a specific point in time
 * = All Stock IN before date - Cost of items sold before date
 */
export async function getDebtAtDate(date: Date) {
  // Total stock IN cost before date
  const stockInAgg = await db.stockIn.aggregate({
    where: { createdAt: { lt: date } },
    _sum: { totalCost: true },
  });

  // Total cost of items sold before date
  const salesBefore = await db.dailySale.findMany({
    where: { date: { lt: date } },
    select: { totalCost: true },
  });

  const totalStockInCost = stockInAgg._sum.totalCost ?? 0;
  const totalCostOfSold = salesBefore.reduce((sum, s) => sum + s.totalCost, 0);

  // Also subtract losses (they reduce stock too)
  const lossesBefore = await db.stockCheck.findMany({
    where: {
      createdAt: { lt: date },
      difference: { lt: 0 },
    },
    include: {
      product: { select: { costPrice: true } },
    },
  });

  const totalLossCost = lossesBefore.reduce(
    (sum, l) => sum + Math.abs(l.difference) * l.product.costPrice,
    0,
  );

  return totalStockInCost - totalCostOfSold - totalLossCost;
}

/**
 * Get cash flow analysis for a date range
 */
export async function getCashFlowAnalysis(from: Date, to: Date) {
  // Stock IN in period
  const stockInAgg = await db.stockIn.aggregate({
    where: { createdAt: { gte: from, lte: to } },
    _sum: { totalCost: true, quantity: true },
  });

  // Sales in period
  const salesInPeriod = await db.dailySale.findMany({
    where: { date: { gte: from, lte: to } },
    select: {
      totalCost: true,
      totalRevenue: true,
      totalProfit: true,
      totalItems: true,
    },
  });

  const totals = salesInPeriod.reduce(
    (acc, s) => ({
      cost: acc.cost + s.totalCost,
      revenue: acc.revenue + s.totalRevenue,
      profit: acc.profit + s.totalProfit,
      items: acc.items + s.totalItems,
    }),
    { cost: 0, revenue: 0, profit: 0, items: 0 },
  );

  const debtAtStart = await getDebtAtDate(from);
  const debtAtEnd = await getDebtAtDate(new Date(to.getTime() + 1));

  return {
    stockIn: {
      totalCost: stockInAgg._sum.totalCost ?? 0,
      quantity: stockInAgg._sum.quantity ?? 0,
    },
    sales: totals,
    debt: {
      atStart: debtAtStart,
      atEnd: debtAtEnd,
      change: debtAtEnd - debtAtStart,
    },
  };
}
