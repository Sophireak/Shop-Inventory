import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  PackagePlus,
} from "lucide-react";
import { t } from "@/lib/translations";
import { formatRiel } from "@/lib/utils-format";
import { getCurrentTotalDebt } from "@/lib/debt";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const totalProducts = await db.product.count();

  // Get ALL low stock items (per-product comparison)
  const allProducts = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      currentStock: true,
      minStock: true,
    },
  });

  const lowStockCount = allProducts.filter(
    (p) => p.currentStock <= p.minStock,
  ).length;

  // Get first 10 with full details (sorted by lowest stock first)
  const lowStockProducts = await db.product.findMany({
    where: {
      currentStock: { lte: 5 },
      isActive: true,
    },
    orderBy: { currentStock: "asc" },
    take: 10,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySale = await db.dailySale.findFirst({
    where: { date: today },
  });

  // Get current debt info
  const debtInfo = await getCurrentTotalDebt();

  // Get this month's losses
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthLosses = await db.stockCheck.aggregate({
    where: {
      createdAt: { gte: startOfMonth },
    },
    _sum: {
      lossValue: true,
    },
  });

  const monthLossValue = monthLosses._sum.lossValue ?? 0;

  // This month's sales for real profit
  const monthSales = await db.dailySale.aggregate({
    where: { date: { gte: startOfMonth } },
    _sum: {
      totalItems: true,
      totalRevenue: true,
      totalProfit: true,
    },
  });

  const monthItems = monthSales._sum.totalItems ?? 0;
  const monthRevenue = monthSales._sum.totalRevenue ?? 0;
  const monthProfit = monthSales._sum.totalProfit ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.overview}</p>
      </div>

      {/* DEBT WARNING BANNER */}
      {debtInfo.totalDebt > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    💳 {t.reports.totalDebt} (តម្លៃស្តុកនៅសល់)
                  </p>
                  <p className="text-3xl font-bold text-orange-700">
                    {formatRiel(debtInfo.totalDebt)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    {debtInfo.totalItems} ទំនិញ • {debtInfo.productCount} ប្រភេទ
                  </p>
                </div>
              </div>

              {/* By category */}
              <div className="hidden md:flex gap-4">
                {debtInfo.byCategory.girl.debt > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">👧 កុមារី</p>
                    <p className="font-bold text-pink-600">
                      {formatRiel(debtInfo.byCategory.girl.debt)}
                    </p>
                  </div>
                )}
                {debtInfo.byCategory.boy.debt > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">👦 កុមារា</p>
                    <p className="font-bold text-blue-600">
                      {formatRiel(debtInfo.byCategory.boy.debt)}
                    </p>
                  </div>
                )}
                {debtInfo.byCategory.both.debt > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      👦👧 ទាំងពីរ
                    </p>
                    <p className="font-bold text-purple-600">
                      {formatRiel(debtInfo.byCategory.both.debt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t.dashboard.todaySales}
            </CardTitle>
            <DollarSign className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRiel(todaySale?.totalRevenue ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {todaySale?.totalItems ?? 0} {t.dashboard.itemsSold}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ចំណេញខែនេះ</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatRiel(monthProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthItems} ទំនិញ • {formatRiel(monthRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t.dashboard.lowStockItems}
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {t.product.needAttention}
            </p>
          </CardContent>
        </Card>

        <Card className={monthLossValue > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              ការខាតបង់ខែនេះ
            </CardTitle>
            <AlertTriangle
              className={`w-4 h-4 ${
                monthLossValue > 0 ? "text-red-500" : "text-gray-400"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                monthLossValue > 0 ? "text-red-600" : ""
              }`}
            >
              {formatRiel(monthLossValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthLossValue > 0 ? "ត្រូវត្រួតពិនិត្យ" : "គ្មានការខាតបង់"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            📊 សេចក្តីសង្ខេបខែនេះ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-muted-foreground">💵 សាច់ប្រាក់ទទួល</p>
              <p className="text-lg font-bold text-green-600">
                {formatRiel(monthRevenue)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💰 ចំណេញ (300៛/ទំនិញ)
              </p>
              <p className="text-lg font-bold text-blue-600">
                {formatRiel(monthProfit)}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-muted-foreground">📦 ស្តុកនៅសល់</p>
              <p className="text-lg font-bold text-orange-600">
                {debtInfo.totalItems} ទំនិញ
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-muted-foreground">💳 ជំពាក់សរុប</p>
              <p className="text-lg font-bold text-red-600">
                {formatRiel(debtInfo.totalDebt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {t.product.lowStockAlert}
            </span>
            {lowStockCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                បង្ហាញ {lowStockProducts.length}/{lowStockCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockCount === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {t.dashboard.noLowStock}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center p-3 bg-orange-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {product.name}
                        {product.size && ` - ${t.product.size} ${product.size}`}
                        {product.style &&
                          ` (${
                            product.style === "pocket"
                              ? "មានហោប៉ៅ"
                              : "គ្មានហោប៉ៅ"
                          })`}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {product.category === "girl"
                          ? "កុមារី"
                          : product.category === "boy"
                            ? "កុមារា"
                            : "ទាំងពីរ"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          product.currentStock === 0
                            ? "text-red-600"
                            : "text-orange-600"
                        }`}
                      >
                        {product.currentStock} {t.product.inStock}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.product.min}: {product.minStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-2 justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {lowStockCount > lowStockProducts.length &&
                    `មានទំនិញនៅសល់តិច ${
                      lowStockCount - lowStockProducts.length
                    } បន្ថែម`}
                </span>
                <div className="flex gap-2">
                  <Link href="/products">
                    <Button variant="outline" size="sm">
                      មើលទាំងអស់
                    </Button>
                  </Link>
                  <Link href="/stock-in/bulk">
                    <Button size="sm">
                      <PackagePlus className="w-4 h-4 mr-1" />
                      បញ្ចូលទំនិញច្រើន
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
