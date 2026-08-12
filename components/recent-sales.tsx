import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatRiel, formatDate } from "@/lib/utils-format";
import { t } from "@/lib/translations";
import { TrendingUp, TrendingDown } from "lucide-react";

export async function RecentSales() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentSales = await db.dailySale.findMany({
    where: {
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: "desc" },
  });

  if (recentSales.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.sales.recentDays}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {t.sales.noSalesRecorded}
          </p>
        </CardContent>
      </Card>
    );
  }

  const weekTotal = {
    revenue: recentSales.reduce((sum, s) => sum + s.totalRevenue, 0),
    profit: recentSales.reduce((sum, s) => sum + s.totalProfit, 0),
    items: recentSales.reduce((sum, s) => sum + s.totalItems, 0),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t.sales.recentDays}</span>
          <span className="text-sm font-normal text-muted-foreground">
            សរុប: {formatRiel(weekTotal.revenue)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentSales.map((sale) => {
            const isCashOk =
              sale.cashDifference === 0 || sale.cashDifference === null;
            const cashDiff = sale.cashDifference;

            return (
              <div
                key={sale.id}
                className="p-3 rounded-lg border hover:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{formatDate(sale.date)}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.totalItems} {t.sales.items}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatRiel(sale.totalRevenue)}
                    </p>
                    <p className="text-xs text-blue-600">
                      {t.sales.profit}: {formatRiel(sale.totalProfit)}
                    </p>
                  </div>
                </div>

                {cashDiff !== null && !isCashOk && (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    {cashDiff < 0 ? (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-orange-500" />
                    )}
                    <span
                      className={
                        cashDiff < 0 ? "text-red-600" : "text-orange-600"
                      }
                    >
                      សាច់ប្រាក់: {cashDiff > 0 ? "+" : ""}
                      {formatRiel(cashDiff)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
