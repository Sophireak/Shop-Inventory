"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Save, Calendar } from "lucide-react";
import { getStyleLabel } from "@/lib/product-style";

type Product = {
  id: number;
  name: string;
  size: string | null;
  style: string | null;
  category: string;
  sellPrice: number;
  costPrice: number;
  currentStock: number;
};

type ExistingSaleItem = {
  productId: number;
  quantity: number;
};

type Props = {
  products: Product[];
  existingItems?: ExistingSaleItem[];
  existingDate?: string;
  existingCashCounted?: number | null;
  existingNote?: string | null;
};

export function DailySalesForm({
  products,
  existingItems = [],
  existingDate,
  existingCashCounted,
  existingNote,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hideZeros, setHideZeros] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Date state (default today)
  const [date, setDate] = useState(() => {
    if (existingDate) return existingDate.split("T")[0];
    return new Date().toISOString().split("T")[0];
  });

  // Quantities: productId → quantity
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    existingItems.forEach((item) => {
      initial[item.productId] = item.quantity;
    });
    return initial;
  });

  const [cashCounted, setCashCounted] = useState(
    existingCashCounted !== null && existingCashCounted !== undefined
      ? String(existingCashCounted)
      : "",
  );
  const [note, setNote] = useState(existingNote || "");

  // Load date's data when date changes
  useEffect(() => {
    async function loadDateData() {
      try {
        const res = await fetch(`/api/sales?date=${date}`);
        const data = await res.json();

        if (data && data.items) {
          const newQty: Record<number, number> = {};
          data.items.forEach(
            (item: { productId: number; quantity: number }) => {
              newQty[item.productId] = item.quantity;
            },
          );
          setQuantities(newQty);
          setCashCounted(data.cashCounted ? String(data.cashCounted) : "");
          setNote(data.note || "");
        } else {
          setQuantities({});
          setCashCounted("");
          setNote("");
        }
      } catch (error) {
        console.error(error);
      }
    }
    loadDateData();
  }, [date]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    if (hideZeros) {
      list = list.filter((p) => (quantities[p.id] || 0) > 0);
    }
    return list;
  }, [products, categoryFilter, hideZeros, quantities]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalItems = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    for (const product of products) {
      const qty = quantities[product.id] || 0;
      totalItems += qty;
      totalRevenue += qty * product.sellPrice;
      totalCost += qty * product.costPrice;
    }

    return {
      items: totalItems,
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalRevenue - totalCost,
    };
  }, [products, quantities]);

  // Cash difference
  const cashDiff = useMemo(() => {
    if (!cashCounted) return null;
    return Number(cashCounted) - totals.revenue;
  }, [cashCounted, totals.revenue]);

  function updateQuantity(productId: number, value: string) {
    const qty = Number(value);
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty > 0) {
        next[productId] = qty;
      } else {
        delete next[productId];
      }
      return next;
    });
  }

  function clearAll() {
    if (confirm("សម្អាតទាំងអស់?")) {
      setQuantities({});
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (totals.items === 0) {
      alert("សូមបញ្ចូលចំនួនយ៉ាងហោចណាស់មួយ");
      return;
    }

    if (!confirm(t.sales.confirmSave)) return;

    setLoading(true);
    try {
      const items = Object.entries(quantities).map(([productId, quantity]) => ({
        productId: Number(productId),
        quantity,
      }));

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          items,
          cashCounted: cashCounted ? Number(cashCounted) : null,
          note,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      alert(t.sales.savedSuccessfully);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(t.common.failed);
    } finally {
      setLoading(false);
    }
  }

  const setToday = () => setDate(new Date().toISOString().split("T")[0]);
  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  };

  // Group by category
  const grouped = {
    girl: filteredProducts.filter((p) => p.category === "girl"),
    boy: filteredProducts.filter((p) => p.category === "boy"),
    both: filteredProducts.filter((p) => p.category === "both"),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="date" className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {t.sales.selectDate}
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <Button type="button" variant="outline" onClick={setToday}>
              {t.sales.today}
            </Button>
            <Button type="button" variant="outline" onClick={setYesterday}>
              {t.sales.yesterday}
            </Button>

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
              variant={hideZeros ? "default" : "outline"}
              onClick={() => setHideZeros(!hideZeros)}
            >
              {hideZeros ? t.sales.showAll : t.sales.hideZeros}
            </Button>

            <Button type="button" variant="outline" onClick={clearAll}>
              {t.sales.clearAll}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
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
                  <div className="col-span-5">{t.product.product}</div>
                  <div className="col-span-2 text-right">{t.sales.price}</div>
                  <div className="col-span-1 text-center">
                    {t.product.stock}
                  </div>
                  <div className="col-span-2 text-center">
                    {t.sales.quantity}
                  </div>
                  <div className="col-span-2 text-right">
                    {t.sales.subtotal}
                  </div>
                </div>

                {/* Rows */}
                {items.map((product) => {
                  const qty = quantities[product.id] || 0;
                  const subtotal = qty * product.sellPrice;
                  const insufficient = qty > product.currentStock;

                  return (
                    <div
                      key={product.id}
                      className={`grid grid-cols-12 gap-2 px-3 py-2 items-center rounded ${
                        qty > 0 ? "bg-blue-50" : ""
                      } ${insufficient ? "bg-red-50" : ""}`}
                    >
                      {/* Product info */}
                      <div className="col-span-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {product.name}
                          </span>
                          {product.size && (
                            <Badge variant="secondary" className="text-xs">
                              {product.size}
                            </Badge>
                          )}
                          {product.style && (
                            <Badge variant="outline" className="text-xs">
                              {getStyleLabel(product.style)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="col-span-2 text-right text-sm">
                        {formatRiel(product.sellPrice)}
                      </div>

                      {/* Current Stock */}
                      <div
                        className={`col-span-1 text-center text-sm font-medium ${
                          product.currentStock === 0
                            ? "text-red-600"
                            : product.currentStock <= 5
                              ? "text-orange-600"
                              : ""
                        }`}
                      >
                        {product.currentStock}
                      </div>

                      {/* Quantity input */}
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          value={qty || ""}
                          onChange={(e) =>
                            updateQuantity(product.id, e.target.value)
                          }
                          className="h-9 text-center"
                          placeholder="0"
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="col-span-2 text-right font-semibold">
                        {qty > 0 ? formatRiel(subtotal) : "-"}
                        {insufficient && (
                          <p className="text-xs text-red-600 font-normal">
                            {t.sales.insufficientStock}
                          </p>
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

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.common.noItems}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-blue-50 border-blue-200 sticky bottom-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t.sales.totalItems}
              </p>
              <p className="text-2xl font-bold">{totals.items}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.sales.totalRevenue}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatRiel(totals.revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.sales.totalCost}
              </p>
              <p className="text-2xl font-bold text-gray-600">
                {formatRiel(totals.cost)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.sales.totalProfit}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {formatRiel(totals.profit)}
              </p>
            </div>
          </div>

          {/* Cash Check */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-blue-200">
            <div>
              <Label htmlFor="cash">{t.sales.cashCounted} (៛)</Label>
              <Input
                id="cash"
                type="number"
                min="0"
                value={cashCounted}
                onChange={(e) => setCashCounted(e.target.value)}
                placeholder="ស្រេចចិត្ត"
              />
            </div>
            <div>
              <Label>{t.sales.cashDifference}</Label>
              <div className="h-10 flex items-center">
                {cashDiff === null ? (
                  <span className="text-muted-foreground">-</span>
                ) : cashDiff === 0 ? (
                  <span className="text-green-600 font-bold">
                    {t.sales.cashMatch}
                  </span>
                ) : cashDiff > 0 ? (
                  <span className="text-orange-600 font-bold">
                    {t.sales.cashOver} {formatRiel(cashDiff)}
                  </span>
                ) : (
                  <span className="text-red-600 font-bold">
                    {t.sales.cashShort} {formatRiel(Math.abs(cashDiff))}
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="note">{t.common.note}</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ស្រេចចិត្ត"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg mt-4"
            disabled={loading || totals.items === 0}
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? t.common.saving : t.sales.saveDailySales}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
