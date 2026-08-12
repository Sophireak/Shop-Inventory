import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatRiel, formatDate } from "@/lib/utils-format";
import { t } from "@/lib/translations";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { getStyleLabel } from "@/lib/product-style";

const reasonLabels: Record<string, string> = {
  damaged: "💥 ខូច",
  expired: "📅 ផុតកំណត់",
  lost: "❓ បាត់",
  stolen: "🚨 លួច",
  miscount: "🔢 រាប់ខុសពីមុន",
  other: "📝 ផ្សេងៗ",
};

export async function RecentStockChecks() {
  // Last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const checks = await db.stockCheck.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  const monthLoss = checks.reduce((sum, c) => sum + c.lossValue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t.stockCheck.recentChecks}</span>
        </CardTitle>
        {monthLoss > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-muted-foreground">
              {t.stockCheck.totalLossThisMonth}:
            </span>
            <span className="font-bold text-red-600">
              {formatRiel(monthLoss)}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {checks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t.stockCheck.noRecentChecks}
          </p>
        ) : (
          <div className="space-y-2">
            {checks.map((check) => {
              const isLoss = check.difference < 0;

              return (
                <div
                  key={check.id}
                  className={`p-3 rounded-lg border ${
                    isLoss
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {check.product.name}
                        </span>
                        {check.product.size && (
                          <Badge variant="secondary" className="text-xs">
                            {check.product.size}
                          </Badge>
                        )}
                        {check.product.style && (
                          <Badge variant="outline" className="text-xs">
                            {getStyleLabel(check.product.style)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(check.createdAt)}
                        {check.reason &&
                          ` • ${reasonLabels[check.reason] || check.reason}`}
                      </p>
                    </div>

                    <div className="text-right ml-3">
                      <div className="flex items-center gap-1 justify-end">
                        {isLoss ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        <span
                          className={`font-bold text-sm ${
                            isLoss ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {check.difference > 0 ? "+" : ""}
                          {check.difference}
                        </span>
                      </div>
                      <p className="text-xs">
                        {check.expectedStock} → {check.actualStock}
                      </p>
                      {isLoss && (
                        <p className="text-xs font-semibold text-red-600 mt-1">
                          {formatRiel(check.lossValue)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
