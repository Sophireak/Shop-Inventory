import { db } from "@/lib/db";
import { StockCheckForm } from "@/components/stock-check-form";
import { RecentStockChecks } from "@/components/recent-stock-checks";
import { t } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function StockCheckPage() {
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
      currentStock: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.stockCheck.title}</h1>
        <p className="text-muted-foreground">{t.stockCheck.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <StockCheckForm products={products} />
        </div>
        <div className="lg:col-span-1">
          <RecentStockChecks />
        </div>
      </div>
    </div>
  );
}
