import { db } from "@/lib/db";
import { DailySalesForm } from "@/components/daily-sales-form";
import { RecentSales } from "@/components/recent-sales";
import { t } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { sellPrice: "asc" }],
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

  // Get today's sale if exists
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySale = await db.dailySale.findUnique({
    where: { date: today },
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.sales.title}</h1>
        <p className="text-muted-foreground">{t.sales.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DailySalesForm
            products={products}
            existingItems={todaySale?.items ?? []}
            existingDate={todaySale?.date.toISOString()}
            existingCashCounted={todaySale?.cashCounted}
            existingNote={todaySale?.note}
          />
        </div>

        <div className="lg:col-span-1">
          <RecentSales />
        </div>
      </div>
    </div>
  );
}
