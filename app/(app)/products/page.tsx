import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductRow } from "@/components/product-row";
import { AddProductDialog } from "@/components/add-product-dialog";
import { t, getCategoryLabel } from "@/lib/translations";
import { formatRiel } from "@/lib/utils-format";
import { getCurrentTotalDebt } from "@/lib/debt";
import { CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const allProducts = await db.product.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { sellPrice: "asc" }],
  });

  const girls = allProducts.filter((p) => p.category === "girl");
  const boys = allProducts.filter((p) => p.category === "boy");
  const both = allProducts.filter((p) => p.category === "both");

  const lowStockCount = allProducts.filter(
    (p) => p.currentStock <= p.minStock,
  ).length;

  const debtInfo = await getCurrentTotalDebt();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t.product.products}</h1>
          <p className="text-muted-foreground">
            {allProducts.length} {t.product.productsTotal}
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                ⚠️ {lowStockCount} {t.product.lowStock}
              </Badge>
            )}
          </p>
        </div>
        <AddProductDialog />
      </div>

      {/* Debt Summary Card */}
      {debtInfo.totalDebt > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    💳 {t.reports.totalDebt}
                  </p>
                  <p className="text-xl font-bold text-orange-700">
                    {formatRiel(debtInfo.totalDebt)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">👧 កុមារី</p>
                <p className="text-lg font-semibold text-pink-600">
                  {formatRiel(debtInfo.byCategory.girl.debt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {debtInfo.byCategory.girl.items} ទំនិញ
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">👦 កុមារា</p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatRiel(debtInfo.byCategory.boy.debt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {debtInfo.byCategory.boy.items} ទំនិញ
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">👦👧 ទាំងពីរ</p>
                <p className="text-lg font-semibold text-purple-600">
                  {formatRiel(debtInfo.byCategory.both.debt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {debtInfo.byCategory.both.items} ទំនិញ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {girls.length > 0 && (
        <ProductCategoryCard
          title={getCategoryLabel("girl")}
          products={girls}
        />
      )}

      {boys.length > 0 && (
        <ProductCategoryCard title={getCategoryLabel("boy")} products={boys} />
      )}

      {both.length > 0 && (
        <ProductCategoryCard title={getCategoryLabel("both")} products={both} />
      )}

      {allProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.common.noItems}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component to show category with debt subtotal
function ProductCategoryCard({
  title,
  products,
}: {
  title: string;
  products: Array<{
    id: number;
    name: string;
    size: string | null;
    style: string | null;
    category: string;
    sellPrice: number;
    costPrice: number;
    currentStock: number;
    minStock: number;
  }>;
}) {
  const categoryDebt = products.reduce(
    (sum, p) => sum + p.currentStock * p.costPrice,
    0,
  );
  const categoryItems = products.reduce((sum, p) => sum + p.currentStock, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>
            {title} ({products.length})
          </span>
          <div className="text-right text-sm font-normal">
            <p className="text-orange-600 font-bold">
              💳 {formatRiel(categoryDebt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {categoryItems} ទំនិញ
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </CardContent>
    </Card>
  );
}
