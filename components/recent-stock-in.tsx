import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRiel, formatDate } from "@/lib/utils-format";
import { t } from "@/lib/translations";
import { db } from "@/lib/db";
import { getStyleLabel } from "@/lib/product-style";

export async function RecentStockIn() {
  const stockIns = await db.stockIn.findMany({
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.stockIn.recentStockIn}</CardTitle>
      </CardHeader>
      <CardContent>
        {stockIns.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t.stockIn.noRecentStockIn}
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              <div className="col-span-4">{t.stockIn.productLabel}</div>
              <div className="col-span-2 text-center">{t.stockIn.qtyLabel}</div>
              <div className="col-span-2 text-right">{t.stockIn.costLabel}</div>
              <div className="col-span-2 text-right">
                {t.stockIn.totalLabel}
              </div>
              <div className="col-span-2 text-right">{t.stockIn.dateLabel}</div>
            </div>

            {/* Rows */}
            {stockIns.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-12 gap-2 p-3 rounded-lg hover:bg-gray-50 items-center"
              >
                {/* Product */}
                <div className="col-span-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {entry.product.name}
                    </span>
                    {entry.product.size && (
                      <Badge variant="secondary" className="text-xs">
                        {entry.product.size}
                      </Badge>
                    )}
                    {entry.product.style && (
                      <Badge variant="outline" className="text-xs">
                        {getStyleLabel(entry.product.style)}
                      </Badge>
                    )}
                  </div>
                  {(entry.supplier || entry.note) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.supplier && <span>📦 {entry.supplier}</span>}
                      {entry.supplier && entry.note && " • "}
                      {entry.note && <span>💬 {entry.note}</span>}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div className="col-span-2 text-center">
                  <span className="font-bold text-green-600">
                    +{entry.quantity}
                  </span>
                </div>

                {/* Cost per unit */}
                <div className="col-span-2 text-right text-sm">
                  {formatRiel(entry.costPrice)}
                </div>

                {/* Total */}
                <div className="col-span-2 text-right font-semibold">
                  {formatRiel(entry.totalCost)}
                </div>

                {/* Date */}
                <div className="col-span-2 text-right text-xs text-muted-foreground">
                  {formatDate(entry.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
