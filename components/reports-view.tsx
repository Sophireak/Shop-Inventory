"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatRiel, formatDate } from "@/lib/utils-format";
import { t } from "@/lib/translations";
import {
  Download,
  Save,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  ChevronDown,
  ChevronRight,
  Printer,
  Calendar,
  Wallet,
  BarChart3,
} from "lucide-react";
import { getStyleLabel } from "@/lib/product-style";

type ReportData = {
  totals: {
    revenue: number;
    cost: number;
    profit: number;
    items: number;
    loss: number;
    cashDifference: number;
  };
  changes: {
    revenue: number | null;
    profit: number | null;
    items: number | null;
  };
  profitMargin: number;
  bestDay: {
    date: string;
    revenue: number;
    items: number;
  } | null;
  worstDay: {
    date: string;
    revenue: number;
    items: number;
  } | null;
  categoryBreakdown: Array<{
    name: string;
    value: number;
    items: number;
    color: string;
  }>;
  trend: Array<{
    date: string;
    revenue: number;
    profit: number;
    items: number;
  }>;
  productSales: Array<{
    product: {
      id: number;
      name: string;
      size: string | null;
      style: string | null;
    };
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
    debtLeft: number;
    currentStock: number;
  }>;
  losses: Array<{
    id: number;
    difference: number;
    lossValue: number;
    reason: string | null;
    createdAt: string;
    product: {
      name: string;
      size: string | null;
    };
  }>;
  dailySalesLog: Array<{
    id: number;
    date: string;
    totalItems: number;
    totalRevenue: number;
    totalProfit: number;
    cashDifference: number | null;
    note: string | null;
    items: Array<{
      id: number;
      productName: string;
      productSize: string | null;
      productStyle: string | null;
      category: string;
      quantity: number;
      sellPrice: number;
      subtotal: number;
    }>;
  }>;
  daysWithSales: number;
  cashFlow: {
    stockIn: {
      totalCost: number;
      quantity: number;
    };
    sales: {
      cost: number;
      revenue: number;
      profit: number;
      items: number;
    };
    debt: {
      atStart: number;
      atEnd: number;
      change: number;
    };
  };
  currentDebt: {
    totalDebt: number;
    totalItems: number;
    productCount: number;
    byCategory: Record<string, { debt: number; items: number }>;
  };
};

function getDateRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const format = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: format(today), to: format(today) };
    case "yesterday":
      return { from: format(yesterday), to: format(yesterday) };
    case "thisWeek": {
      const day = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - day);
      return { from: format(start), to: format(today) };
    }
    case "last7Days": {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { from: format(start), to: format(today) };
    }
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: format(start), to: format(today) };
    }
    case "last30Days": {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { from: format(start), to: format(today) };
    }
    case "lastMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: format(start), to: format(end) };
    }
    default:
      return { from: format(today), to: format(today) };
  }
}

function ChangeIndicator({ change }: { change: number | null }) {
  if (change === null) return null;
  if (change === 0)
    return <span className="text-xs text-muted-foreground">= 0%</span>;
  const isUp = change > 0;
  return (
    <span
      className={`text-xs flex items-center gap-1 ${
        isUp ? "text-green-600" : "text-red-600"
      }`}
    >
      {isUp ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isUp ? "+" : ""}
      {change}% {t.reports.vsLastPeriod}
    </span>
  );
}

export function ReportsView() {
  const [preset, setPreset] = useState("thisMonth");
  const [dateRange, setDateRange] = useState(() => getDateRange("thisMonth"));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reports?from=${dateRange.from}&to=${dateRange.to}`,
        );
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange]);

  function selectPreset(newPreset: string) {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      setDateRange(getDateRange(newPreset));
    }
  }

  function toggleDay(id: number) {
    const newSet = new Set(expandedDays);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedDays(newSet);
  }

  function handleExport() {
    // Create a hidden link and click it - works in both browser and Electron
    const link = document.createElement("a");
    link.href = `/api/export?from=${dateRange.from}&to=${dateRange.to}`;
    link.download = `shop-report-${dateRange.from}-to-${dateRange.to}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleBackup() {
    const link = document.createElement("a");
    link.href = "/api/backup";
    link.download = `shop-backup-${new Date().toISOString().split("T")[0]}.db`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrint() {
    window.print();
  }

  const avgPerDay =
    data && data.daysWithSales > 0
      ? {
          revenue: data.totals.revenue / data.daysWithSales,
          profit: data.totals.profit / data.daysWithSales,
          items: data.totals.items / data.daysWithSales,
        }
      : { revenue: 0, profit: 0, items: 0 };

  const presets = [
    { key: "today", label: t.reports.today },
    { key: "yesterday", label: t.reports.yesterday },
    { key: "last7Days", label: t.reports.last7Days },
    { key: "thisMonth", label: t.reports.thisMonth },
    { key: "last30Days", label: t.reports.last30Days },
    { key: "lastMonth", label: t.reports.lastMonth },
    { key: "custom", label: t.reports.custom },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range & Actions */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map((p) => (
              <Button
                key={p.key}
                variant={preset === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => selectPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label>{t.reports.from}</Label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, from: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t.reports.to}</Label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, to: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center pt-4 border-t gap-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(dateRange.from)} → {formatDate(dateRange.to)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!data}
              >
                <Printer className="w-4 h-4 mr-2" />
                {t.reports.print}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!data}
              >
                <Download className="w-4 h-4 mr-2" />
                {t.reports.exportExcel}
              </Button>
              <Button variant="outline" size="sm" onClick={handleBackup}>
                <Save className="w-4 h-4 mr-2" />
                {t.reports.downloadBackup}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">🏪 ហាងខ្ញុំ - របាយការណ៍</h1>
        <p className="text-sm">
          {formatDate(dateRange.from)} → {formatDate(dateRange.to)}
        </p>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.common.loading}
          </CardContent>
        </Card>
      )}

      {!loading && data && data.daysWithSales === 0 && (
        <>
          {/* Still show debt info even without sales */}
          {data.currentDebt.totalDebt > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      💳 {t.reports.totalDebt}
                    </p>
                    <p className="text-3xl font-bold text-orange-700">
                      {formatRiel(data.currentDebt.totalDebt)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.currentDebt.totalItems} ទំនិញ •{" "}
                      {data.currentDebt.productCount} ប្រភេទ
                    </p>
                  </div>
                  <Wallet className="w-12 h-12 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t.reports.noSalesInPeriod}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && data && data.daysWithSales > 0 && (
        <>
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">
                  {t.reports.totalRevenue}
                </CardTitle>
                <DollarSign className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatRiel(data.totals.revenue)}
                </div>
                <div className="mt-1 space-y-1">
                  <ChangeIndicator change={data.changes.revenue} />
                  <p className="text-xs text-muted-foreground">
                    {formatRiel(Math.round(avgPerDay.revenue))}/ថ្ងៃ
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">
                  {t.reports.totalProfit}
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatRiel(data.totals.profit)}
                </div>
                <div className="mt-1 space-y-1">
                  <ChangeIndicator change={data.changes.profit} />
                  <p className="text-xs text-muted-foreground">
                    {t.reports.profitMargin}: {data.profitMargin}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">
                  {t.reports.totalItems}
                </CardTitle>
                <Package className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totals.items}</div>
                <div className="mt-1 space-y-1">
                  <ChangeIndicator change={data.changes.items} />
                  <p className="text-xs text-muted-foreground">
                    {data.daysWithSales} {t.reports.daysWithSales}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={data.totals.loss > 0 ? "border-red-200 bg-red-50" : ""}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">{t.reports.totalLoss}</CardTitle>
                <AlertTriangle
                  className={`w-4 h-4 ${data.totals.loss > 0 ? "text-red-500" : "text-gray-400"}`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${data.totals.loss > 0 ? "text-red-600" : ""}`}
                >
                  {formatRiel(data.totals.loss)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {data.losses.length} ការត្រួតពិនិត្យ
                </p>
              </CardContent>
            </Card>
          </div>

          {/* NEW: Debt & Cash Flow Analysis */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                💳 {t.reports.cashFlow}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stock In */}
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    📥 {t.reports.debtAdded}
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    +{formatRiel(data.cashFlow.stockIn.totalCost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.cashFlow.stockIn.quantity} ទំនិញ
                  </p>
                </div>

                {/* Cost of Sold */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    📤 {t.reports.debtReduced}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    -{formatRiel(data.cashFlow.sales.cost)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.cashFlow.sales.items} ទំនិញលក់
                  </p>
                </div>

                {/* Real Profit */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    💰 {t.reports.realProfit}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatRiel(data.cashFlow.sales.profit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.cashFlow.sales.items} × 300 ៛
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.reports.debtAtStart}
                  </p>
                  <p className="text-lg font-bold">
                    {formatRiel(data.cashFlow.debt.atStart)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {t.reports.debtChange}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      data.cashFlow.debt.change > 0
                        ? "text-red-600"
                        : data.cashFlow.debt.change < 0
                          ? "text-green-600"
                          : ""
                    }`}
                  >
                    {data.cashFlow.debt.change > 0 ? "+" : ""}
                    {formatRiel(data.cashFlow.debt.change)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {t.reports.debtAtEnd}
                  </p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatRiel(data.cashFlow.debt.atEnd)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best & Worst Day */}
          {(data.bestDay || data.worstDay) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.bestDay && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-green-700">
                          {t.reports.bestDay}
                        </p>
                        <p className="text-lg font-bold">
                          {formatDate(data.bestDay.date)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {data.bestDay.items} ទំនិញ
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">
                          {formatRiel(data.bestDay.revenue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {data.worstDay && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-orange-700">
                          {t.reports.slowestDay}
                        </p>
                        <p className="text-lg font-bold">
                          {formatDate(data.worstDay.date)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {data.worstDay.items} ទំនិញ
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-orange-600">
                          {formatRiel(data.worstDay.revenue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend */}
            {data.trend.length > 1 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t.reports.salesTrend}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => formatRiel(value)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        name={t.reports.revenue}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name={t.reports.profit}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Category Pie Chart */}
            {data.categoryBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.reports.categoryBreakdown}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={(entry) => `${entry.name}`}
                      >
                        {data.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatRiel(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2">
                    {data.categoryBreakdown.map((cat) => (
                      <div
                        key={cat.name}
                        className="flex justify-between text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                        <span className="font-medium">
                          {formatRiel(cat.value)} ({cat.items} ទំនិញ)
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sales Analysis Table (with debt tracking!) */}
          {data.productSales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  📊 {t.reports.salesAnalysis}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 px-2">
                          {t.product.product}
                        </th>
                        <th className="text-center py-2 px-2">
                          {t.reports.itemsSold}
                        </th>
                        <th className="text-right py-2 px-2">
                          {t.reports.cashReceived}
                        </th>
                        <th className="text-right py-2 px-2">
                          {t.reports.costOfSold}
                        </th>
                        <th className="text-right py-2 px-2">
                          {t.reports.profit}
                        </th>
                        <th className="text-center py-2 px-2">នៅសល់</th>
                        <th className="text-right py-2 px-2">
                          {t.reports.debtLeft}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.productSales.map((item) => (
                        <tr
                          key={item.product.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {item.product.name}
                              </span>
                              {item.product.size && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.product.size}
                                </Badge>
                              )}
                              {item.product.style && (
                                <Badge variant="outline" className="text-xs">
                                  {getStyleLabel(item.product.style)}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-2 px-2 font-bold">
                            {item.quantity}
                          </td>
                          <td className="text-right py-2 px-2 text-green-600 font-medium">
                            {formatRiel(item.revenue)}
                          </td>
                          <td className="text-right py-2 px-2 text-muted-foreground">
                            {formatRiel(item.cost)}
                          </td>
                          <td className="text-right py-2 px-2 text-blue-600 font-medium">
                            {formatRiel(item.profit)}
                          </td>
                          <td className="text-center py-2 px-2 text-sm">
                            {item.currentStock}
                          </td>
                          <td className="text-right py-2 px-2 text-orange-600 font-medium">
                            {item.debtLeft > 0
                              ? formatRiel(item.debtLeft)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="border-t-2 border-black font-bold bg-gray-50">
                        <td className="py-3 px-2">សរុប / TOTAL</td>
                        <td className="text-center py-3 px-2">
                          {data.productSales.reduce(
                            (s, i) => s + i.quantity,
                            0,
                          )}
                        </td>
                        <td className="text-right py-3 px-2 text-green-600">
                          {formatRiel(
                            data.productSales.reduce(
                              (s, i) => s + i.revenue,
                              0,
                            ),
                          )}
                        </td>
                        <td className="text-right py-3 px-2">
                          {formatRiel(
                            data.productSales.reduce((s, i) => s + i.cost, 0),
                          )}
                        </td>
                        <td className="text-right py-3 px-2 text-blue-600">
                          {formatRiel(
                            data.productSales.reduce((s, i) => s + i.profit, 0),
                          )}
                        </td>
                        <td className="text-center py-3 px-2">
                          {data.productSales.reduce(
                            (s, i) => s + i.currentStock,
                            0,
                          )}
                        </td>
                        <td className="text-right py-3 px-2 text-orange-600">
                          {formatRiel(
                            data.productSales.reduce(
                              (s, i) => s + i.debtLeft,
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Sales Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t.reports.dailySalesLog}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-3">{t.common.date}</div>
                  <div className="col-span-2 text-center">
                    {t.reports.items}
                  </div>
                  <div className="col-span-2 text-right">
                    {t.reports.revenue}
                  </div>
                  <div className="col-span-2 text-right">
                    {t.reports.profit}
                  </div>
                  <div className="col-span-2 text-right">សាច់ប្រាក់</div>
                  <div className="col-span-1"></div>
                </div>

                {data.dailySalesLog.map((day) => {
                  const isExpanded = expandedDays.has(day.id);
                  const isBest = data.bestDay?.date === day.date;
                  return (
                    <div
                      key={day.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleDay(day.id)}
                        className={`w-full grid grid-cols-12 gap-2 px-3 py-3 items-center hover:bg-gray-50 text-left ${
                          isBest ? "bg-green-50" : ""
                        }`}
                      >
                        <div className="col-span-3 flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div>
                            <p className="font-medium">
                              {formatDate(day.date)}
                            </p>
                            {isBest && (
                              <p className="text-xs text-green-600">
                                🏆 លក់ដាច់បំផុត
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-medium">
                          {day.totalItems}
                        </div>
                        <div className="col-span-2 text-right font-bold text-green-600">
                          {formatRiel(day.totalRevenue)}
                        </div>
                        <div className="col-span-2 text-right font-medium text-blue-600">
                          {formatRiel(day.totalProfit)}
                        </div>
                        <div className="col-span-2 text-right text-sm">
                          {day.cashDifference === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : day.cashDifference === 0 ? (
                            <span className="text-green-600">✓</span>
                          ) : day.cashDifference > 0 ? (
                            <span className="text-orange-600">
                              +{formatRiel(day.cashDifference)}
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {formatRiel(day.cashDifference)}
                            </span>
                          )}
                        </div>
                        <div className="col-span-1 text-right text-xs text-muted-foreground">
                          {day.items.length} ប្រភេទ
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-gray-50 border-t p-3">
                          <div className="space-y-1">
                            <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                              <div className="col-span-6">
                                {t.product.product}
                              </div>
                              <div className="col-span-2 text-center">
                                {t.reports.quantity}
                              </div>
                              <div className="col-span-2 text-right">
                                {t.sales.price}
                              </div>
                              <div className="col-span-2 text-right">
                                {t.sales.subtotal}
                              </div>
                            </div>
                            {day.items.map((item) => (
                              <div
                                key={item.id}
                                className="grid grid-cols-12 gap-2 px-2 py-2 items-center bg-white rounded"
                              >
                                <div className="col-span-6">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">
                                      {item.productName}
                                    </span>
                                    {item.productSize && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {item.productSize}
                                      </Badge>
                                    )}
                                    {item.productStyle && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {getStyleLabel(item.productStyle)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="col-span-2 text-center">
                                  <span className="font-medium">
                                    {item.quantity}
                                  </span>
                                </div>
                                <div className="col-span-2 text-right text-sm">
                                  {formatRiel(item.sellPrice)}
                                </div>
                                <div className="col-span-2 text-right font-semibold">
                                  {formatRiel(item.subtotal)}
                                </div>
                              </div>
                            ))}
                          </div>
                          {day.note && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              💬 {day.note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          {data.productSales.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    {t.reports.topProducts}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.productSales.slice(0, 10).map((item, index) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div
                          className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                            index === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : index === 1
                                ? "bg-gray-100 text-gray-700"
                                : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {item.product.name}
                            </span>
                            {item.product.size && (
                              <Badge variant="secondary" className="text-xs">
                                {item.product.size}
                              </Badge>
                            )}
                            {item.product.style && (
                              <Badge variant="outline" className="text-xs">
                                {getStyleLabel(item.product.style)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{item.quantity} ⇐</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRiel(item.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.reports.topProducts} (Chart)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={data.productSales.slice(0, 10).map((item) => ({
                        name: `${item.product.name}${
                          item.product.size ? ` ${item.product.size}` : ""
                        }`,
                        quantity: item.quantity,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={140} />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Losses */}
          {data.losses.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  {t.reports.lossReport}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.losses.map((loss) => (
                    <div
                      key={loss.id}
                      className="flex justify-between items-center p-3 bg-red-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {loss.product.name}
                          {loss.product.size && ` - ${loss.product.size}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(loss.createdAt)}
                          {loss.reason && ` • ${loss.reason}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          {loss.difference} ({formatRiel(loss.lossValue)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
