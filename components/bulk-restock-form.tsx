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
import { PackagePlus, Filter } from "lucide-react";
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
  minStock: number;
};

type Props = {
  products: Product[];
};

type ItemInput = {
  quantity: number;
  costPrice: number;
};

export function BulkRestockForm({ products }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("lowStock");

  // Data: productId -> { quantity, costPrice }
  const [items, setItems] = useState<Record<number, ItemInput>>(() => {
    const initial: Record<number, ItemInput> = {};
    products.forEach((p) => {
      initial[p.id] = { quantity: 0, costPrice: p.costPrice };
    });
    return initial;
  });

  function updateQuantity(productId: number, value: string) {
    const qty = Number(value) || 0;
    setItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: qty,
      },
    }));
  }

  function updateCost(productId: number, value: string) {
    const cost = Number(value) || 0;
    setItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        costPrice: cost,
      },
    }));
  }

  // Filter products
  const filtered = useMemo(() => {
    let list = products;

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }

    // Stock filter
    if (stockFilter === "lowStock") {
      list = list.filter((p) => p.currentStock <= p.minStock);
    } else if (stockFilter === "outOfStock") {
      list = list.filter((p) => p.currentStock === 0);
    }

    return list;
  }, [products, categoryFilter, stockFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalItems = 0;
    let totalCost = 0;
    let productsCount = 0;

    for (const product of products) {
      const item = items[product.id];
      if (item && item.quantity > 0) {
        totalItems += item.quantity;
        totalCost += item.quantity * item.costPrice;
        productsCount++;
      }
    }

    return { items: totalItems, cost: totalCost, products: productsCount };
  }, [items, products]);

  // Group by category
  const grouped = {
    girl: filtered.filter((p) => p.category === "girl"),
    boy: filtered.filter((p) => p.category === "boy"),
    both: filtered.filter((p) => p.category === "both"),
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (totals.items === 0) {
      alert(t.stockIn.noItemsToAdd);
      return;
    }

    if (!confirm(`បញ្ចូល ${totals.products} ផលិតផល (${totals.items} ទំនិញ)?`)) {
      return;
    }

    setLoading(true);
    try {
      // Build items array
      const itemsToSubmit = Object.entries(items)
        .filter(([, data]) => data.quantity > 0)
        .map(([productId, data]) => ({
          productId: Number(productId),
          quantity: data.quantity,
          costPrice: data.costPrice,
        }));

      const res = await fetch("/api/stock-in/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToSubmit,
          supplier,
          note,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      alert(t.stockIn.addedSuccess.replace("{count}", String(data.count)));

      // Reset form
      const resetItems: Record<number, ItemInput> = {};
      products.forEach((p) => {
        resetItems[p.id] = { quantity: 0, costPrice: p.costPrice };
      });
      setItems(resetItems);
      setSupplier("");
      setNote("");

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
      {/* Filters & Supplier Info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">
                {t.stockIn.supplier} ({t.stockIn.sameSupplier})
              </Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder={t.stockIn.supplierPlaceholder}
              />
            </div>
            <div>
              <Label htmlFor="note">{t.common.note}</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.stockIn.notePlaceholder}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4 pt-2 border-t">
            <div className="min-w-[180px]">
              <Label className="flex items-center gap-1">
                <Filter className="w-4 h-4" />
                {t.sales.filterByCategory}
              </Label>
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

            <div className="min-w-[220px]">
              <Label>ការបង្ហាញ</Label>
              <Select
                value={stockFilter}
                onValueChange={(v) => setStockFilter(v ?? "lowStock")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lowStock">
                    ⚠️ {t.stockIn.onlyLowStock}
                  </SelectItem>
                  <SelectItem value="outOfStock">
                    ❌ {t.stockIn.onlyOutOfStock}
                  </SelectItem>
                  <SelectItem value="all">
                    {t.stockIn.showAllProducts}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              បង្ហាញ: <strong>{filtered.length}</strong> ផលិតផល
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products by Category */}
      {Object.entries(grouped).map(([category, categoryProducts]) => {
        if (categoryProducts.length === 0) return null;
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
                {label} ({categoryProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-5">{t.product.product}</div>
                  <div className="col-span-1 text-center">ស្តុក</div>
                  <div className="col-span-2 text-center">
                    {t.stockIn.quantity}
                  </div>
                  <div className="col-span-2 text-right">
                    {t.stockIn.costPerUnit}
                  </div>
                  <div className="col-span-2 text-right">{t.reports.total}</div>
                </div>

                {categoryProducts.map((product) => {
                  const item = items[product.id] || {
                    quantity: 0,
                    costPrice: product.costPrice,
                  };
                  const subtotal = item.quantity * item.costPrice;
                  const isOutOfStock = product.currentStock === 0;
                  const isLowStock = product.currentStock <= product.minStock;

                  return (
                    <div
                      key={product.id}
                      className={`grid grid-cols-12 gap-2 px-3 py-2 items-center rounded ${
                        item.quantity > 0 ? "bg-blue-50" : ""
                      }`}
                    >
                      {/* Product */}
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
                        <p className="text-xs text-muted-foreground">
                          លក់: {formatRiel(product.sellPrice)}
                        </p>
                      </div>

                      {/* Current Stock */}
                      <div className="col-span-1 text-center">
                        <span
                          className={`font-medium ${
                            isOutOfStock
                              ? "text-red-600"
                              : isLowStock
                                ? "text-orange-600"
                                : ""
                          }`}
                        >
                          {product.currentStock}
                        </span>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateQuantity(product.id, e.target.value)
                          }
                          className="h-9 text-center"
                          placeholder="0"
                        />
                      </div>

                      {/* Cost Price */}
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) =>
                            updateCost(product.id, e.target.value)
                          }
                          className="h-9 text-right text-sm"
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="col-span-2 text-right font-semibold text-sm">
                        {subtotal > 0 ? formatRiel(subtotal) : "-"}
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
            {stockFilter === "lowStock" && "🎉 គ្មានផលិតផលនៅសល់តិច!"}
            {stockFilter === "outOfStock" && "🎉 គ្មានផលិតផលអស់ស្តុក!"}
            {stockFilter === "all" && t.common.noItems}
          </CardContent>
        </Card>
      )}

      {/* Summary & Submit */}
      <Card className="bg-blue-50 border-blue-200 sticky bottom-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">ផលិតផល</p>
              <p className="text-2xl font-bold">{totals.products}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.stockIn.totalItemsToAdd}
              </p>
              <p className="text-2xl font-bold text-blue-600">{totals.items}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t.stockIn.totalCostAll}
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {formatRiel(totals.cost)}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg"
            disabled={loading || totals.items === 0}
          >
            <PackagePlus className="w-5 h-5 mr-2" />
            {loading ? t.common.saving : `📥 ${t.stockIn.recordAll}`}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
