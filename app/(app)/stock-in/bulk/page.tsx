import { db } from "@/lib/db";
import { BulkRestockForm } from "@/components/bulk-restock-form";
import { t } from "@/lib/translations";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BulkRestockPage() {
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
      minStock: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/stock-in">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ត្រឡប់ក្រោយ
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            📦 {t.stockIn.bulkRestockTitle}
          </h1>
          <p className="text-muted-foreground">
            {t.stockIn.bulkRestockSubtitle}
          </p>
        </div>
      </div>

      <BulkRestockForm products={products} />
    </div>
  );
}
