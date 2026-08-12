import { db } from "@/lib/db";
import { StockInForm } from "@/components/stock-in-form";
import { RecentStockIn } from "@/components/recent-stock-in";
import { t } from "@/lib/translations";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PackagePlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StockInPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.stockIn.title}</h1>
          <p className="text-muted-foreground">{t.stockIn.subtitle}</p>
        </div>

        <Link href="/stock-in/bulk">
          <Button variant="default" size="lg">
            <PackagePlus className="w-5 h-5 mr-2" />
            📦 {t.stockIn.bulkRestock}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockInForm products={products} />
        <RecentStockIn />
      </div>
    </div>
  );
}
