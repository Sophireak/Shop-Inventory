"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRiel } from "@/lib/utils-format";
import { t } from "@/lib/translations";
import { Search, TrendingDown, TrendingUp, Save } from "lucide-react";
import { getStyleLabel } from "@/lib/product-style";

type Product = {
  id: number;
  name: string;
  size: string | null;
  style: string | null;
  category: string;
  sellPrice: number;
  currentStock: number;
};

type CheckData = {
  actualStock: number | null;
  reason: string;
  note: string;
};

type Props = {
  products: Product[];
};

const reasonOptions = [
  { value: "damaged", label: "💥" },
  { value: "expired", label: "📅" },
  { value: "lost", label: "❓" },
  { value: "stolen", label: "🚨" },
  { value: "miscount", label: "🔢" },
  { value: "other", label: "📝" },
];

export function StockCheckForm({ products }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [onlyDifferent, setOnlyDifferent] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [bulkReason, setBulkReason] = useState<string>("");

  // Data: productId -> { actualStock, reason, note }
  const [data, setData] = useState<Record<number, CheckData>>({});

  function updateActual(productId: number, value: string) {
    const num = value === "" ? null : Number(value);
    setData((prev) => ({
      ...prev,
      [productId]: {
        actualStock: num,
        reason: prev[productId]?.reason || "",
        note: prev[productId]?.note || "",
      },
    }));
  }

  function updateReason(productId: number, reason: string) {
    setData((prev) => ({
      ...prev,
      [productId]: {
        actualStock: prev[productId]?.actualStock ?? null,
        reason,
        note: prev[productId]?.note || "",
      },
    }));
  }

  function applyBulkReason() {
    if (!bulkReason) return;
    const newData = { ...data };
    for (const productId in newData) {
      const item = newData[Number(productId)];
      if (
        item.actualStock !== null &&
        item.actualStock !==
          (products.find((p) => p.id === Number(productId))?.currentStock ?? 0)
      ) {
        newData[Number(productId)] = { ...item, reason: bulkReason };
      }
    }
    setData(newData);
  }

  // Calculate differences and totals
  const withDifferences = useMemo(() => {
    return products.map((product) => {
      const checkData = data[product.id];
      const actualStock = checkData?.actualStock;
      const difference =
        actualStock !== null && actualStock !== undefined
          ? actualStock - product.currentStock
          : null;
      const lossValue =
        difference !== null && difference < 0
          ? Math.abs(difference) * product.sellPrice
          : 0;
      const gainValue =
        difference !== null && difference > 0
          ? difference * product.sellPrice
          : 0;

      return {
        product,
        actualStock,
        difference,
        lossValue,
        gainValue,
        reason: checkData?.reason || "",
      };
    });
  }, [products, data]);

  const totals = useMemo(() => {
    let totalLoss = 0;
    let totalGain = 0;
    let itemsMissing = 0;
    let itemsExtra = 0;
    let changedCount = 0;

    for (const item of withDifferences) {
      if (item.difference !== null && item.difference !== 0) {
        changedCount++;
        if (item.difference < 0) {
          itemsMissing += Math.abs(item.difference);
          totalLoss += item.lossValue;
        } else {
          itemsExtra += item.difference;
          totalGain += item.gainValue;
        }
      }
    }

    return { totalLoss, totalGain, itemsMissing, itemsExtra, changedCount };
  }, [withDifferences]);

  // Filter
  const filtered = useMemo(() => {
    let list = withDifferences;
    if (categoryFilter !== "all") {
      list = list.filter((item) => item.product.category === categoryFilter);
    }
    if (onlyDifferent) {
      list = list.filter(
        (item) => item.difference !== null && item.difference !== 0,
      );
    }
    return list;
  }, [withDifferences, categoryFilter, onlyDifferent]);

  // Group by category
  const grouped = {
    girl: filtered.filter((i) => i.product.category === "girl"),
    boy: filtered.filter((i) => i.product.category === "boy"),
    both: filtered.filter((i) => i.product.category === "both"),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build checks array (only items with actual stock entered and different)
    const checks = withDifferences
      .filter(
        (item) =>
          item.actualStock !== null &&
          item.actualStock !== undefined &&
          item.difference !== null &&
          item.difference !== 0,
      )
      .map((item) => ({
        productId: item.product.id,
        actualStock: item.actualStock,
        reason: item.reason,
        note: "",
      }));

    if (checks.length === 0) {
      alert(t.stockCheck.noChanges);
      return;
    }

    if (!confirm(t.stockCheck.confirmSave)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/stock-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checks }),
      });

      if (!res.ok) throw new Error("Failed");

      alert(t.stockCheck.saved);
      setData({});
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(t.common.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <Label>{t.sales.filterByCategory}</Label>
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v ?? "all")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.all}</SelectItem>
                  <SelectItem value="girl">👧 កុមារី</SelectItem>
                  <SelectItem value="boy">👦 កុមារា</SelectItem>
                  <SelectItem value="both">👦👧 ទាំងពីរ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant={onlyDifferent ? "default" : "outline"}
              onClick={() => setOnlyDifferent(!onlyDifferent)}
            >
              {onlyDifferent
                ? t.stockCheck.showAll
                : t.stockCheck.onlyShowDifferent}
            </Button>

            {totals.changedCount > 0 && (
              <div className="flex items-end gap-2 ml-auto">
                <div className="min-w-[180px]">
                  <Label>{t.stockCheck.applyReasonToAll}</Label>
                  <Select
                    value={bulkReason}
                    onValueChange={(v) => setBulkReason(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.stockCheck.selectReason} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damaged">
                        💥 {t.stockCheck.reasonDamaged}
                      </SelectItem>
                      <SelectItem value="expired">
                        📅 {t.stockCheck.reasonExpired}
                      </SelectItem>
                      <SelectItem value="lost">
                        ❓ {t.stockCheck.reasonLost}
                      </SelectItem>
                      <SelectItem value="stolen">
                        🚨 {t.stockCheck.reasonStolen}
                      </SelectItem>
                      <SelectItem value="miscount">
                        🔢 {t.stockCheck.reasonMiscount}
                      </SelectItem>
                      <SelectItem value="other">
                        📝 {t.stockCheck.reasonOther}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={applyBulkReason}
                >
                  អនុវត្ត
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <p className="text-sm">
            💡 <strong>{t.stockCheck.instructions}</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            📌 ទុកចោលទទេប្រសិនបើអ្នកមិនចង់ផ្លាស់ប្តូរ | ✏️ បញ្ចូលលេខ ០
            ប្រសិនបើអស់ស្តុក
          </p>
        </CardContent>
      </Card>

      {/* Products by Category */}
      {Object.entries(grouped).map(([category, items]) => {
        if (items.length === 0) return null;
        const label =
          category === "girl"
            ? "👧 កុមារី"
            : category === "boy"
              ? "👦 កុមារា"
              : "👦👧 ទាំងពីរ";

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>
                {label} ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-4">{t.product.product}</div>
                  <div className="col-span-1 text-center">
                    {t.stockCheck.expectedStock}
                  </div>
                  <div className="col-span-2 text-center">
                    {t.stockCheck.actualStock}
                  </div>
                  <div className="col-span-1 text-center">
                    {t.stockCheck.difference}
                  </div>
                  <div className="col-span-2 text-right">
                    {t.stockCheck.lossValue}
                  </div>
                  <div className="col-span-2">{t.stockCheck.reason}</div>
                </div>

                {items.map((item) => {
                  const hasChange =
                    item.difference !== null && item.difference !== 0;
                  const isLoss = hasChange && item.difference! < 0;
                  const isGain = hasChange && item.difference! > 0;

                  return (
                    <div
                      key={item.product.id}
                      className={`grid grid-cols-12 gap-2 px-3 py-2 items-center rounded ${
                        isLoss ? "bg-red-50" : ""
                      } ${isGain ? "bg-green-50" : ""}`}
                    >
                      {/* Product */}
                      <div className="col-span-4">
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
                        <p className="text-xs text-muted-foreground">
                          {formatRiel(item.product.sellPrice)}
                        </p>
                      </div>

                      {/* Expected */}
                      <div className="col-span-1 text-center font-medium">
                        {item.product.currentStock}
                      </div>

                      {/* Actual Input */}
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.actualStock ?? ""}
                          onChange={(e) =>
                            updateActual(item.product.id, e.target.value)
                          }
                          className="h-9 text-center"
                          placeholder="—"
                        />
                      </div>

                      {/* Difference */}
                      <div className="col-span-1 text-center">
                        {item.difference === null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : item.difference === 0 ? (
                          <span className="text-green-600">✓</span>
                        ) : item.difference < 0 ? (
                          <span className="text-red-600 font-bold flex items-center justify-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {item.difference}
                          </span>
                        ) : (
                          <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                            <TrendingUp className="w-3 h-3" />+{item.difference}
                          </span>
                        )}
                      </div>

                      {/* Loss Value */}
                      <div className="col-span-2 text-right">
                        {isLoss ? (
                          <span className="text-red-600 font-semibold">
                            -{formatRiel(item.lossValue)}
                          </span>
                        ) : isGain ? (
                          <span className="text-green-600 font-semibold">
                            +{formatRiel(item.gainValue)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>

                      {/* Reason (only if there's a difference) */}
                      <div className="col-span-2">
                        {hasChange && (
                          <Select
                            value={item.reason}
                            onValueChange={(v) =>
                              updateReason(item.product.id, v ?? "")
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="មូលហេតុ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="damaged">
                                💥 {t.stockCheck.reasonDamaged}
                              </SelectItem>
                              <SelectItem value="expired">
                                📅 {t.stockCheck.reasonExpired}
                              </SelectItem>
                              <SelectItem value="lost">
                                ❓ {t.stockCheck.reasonLost}
                              </SelectItem>
                              <SelectItem value="stolen">
                                🚨 {t.stockCheck.reasonStolen}
                              </SelectItem>
                              <SelectItem value="miscount">
                                🔢 {t.stockCheck.reasonMiscount}
                              </SelectItem>
                              <SelectItem value="other">
                                📝 {t.stockCheck.reasonOther}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {onlyDifferent ? t.stockCheck.noChanges : t.common.noItems}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-blue-50 border-blue-200 sticky bottom-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t.stockCheck.totalDifferences}
              </p>
              <p className="text-2xl font-bold">{totals.changedCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.stockCheck.itemsMissing}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {totals.itemsMissing}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.stockCheck.totalLossValue}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatRiel(totals.totalLoss)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.stockCheck.totalGainValue}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatRiel(totals.totalGain)}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg"
            disabled={loading || totals.changedCount === 0}
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? t.common.saving : t.stockCheck.saveCheck}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
