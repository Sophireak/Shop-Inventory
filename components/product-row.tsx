"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Pencil, Check, X } from "lucide-react";
import { formatRiel } from "@/lib/utils-format";
import { t } from "@/lib/translations";

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
function getStyleBadge(style: string) {
  const styles: Record<string, { label: string; className: string }> = {
    pocket: { label: "🧵 មានហោប៉ៅ", className: "text-blue-600" },
    "no-pocket": { label: "⭕ គ្មានហោប៉ៅ", className: "text-purple-600" },
    blue: { label: "🔵 ខៀវ (ទី១-២)", className: "text-blue-600" },
    orange: { label: "🟠 ទឹកក្រូច (ទី៣-៤)", className: "text-orange-600" },
    green: { label: "🟢 បៃតង (ទី៥-៦)", className: "text-green-600" },
  };
  const config = styles[style] || { label: style, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

export function ProductRow({ product }: { product: Product }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    sellPrice: product.sellPrice,
    costPrice: product.costPrice,
    minStock: product.minStock,
  });

  const isLowStock = product.currentStock <= product.minStock;
  const isOutOfStock = product.currentStock === 0;

  async function updateStock(delta: number) {
    const newStock = Math.max(0, product.currentStock + delta);
    setLoading(true);
    try {
      await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: newStock }),
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(t.common.failed);
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    setLoading(true);
    try {
      await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(t.common.failed);
    } finally {
      setLoading(false);
    }
  }

  function cancelEdit() {
    setEditData({
      sellPrice: product.sellPrice,
      costPrice: product.costPrice,
      minStock: product.minStock,
    });
    setIsEditing(false);
  }

  return (
    <div
      className={`
        flex items-center gap-4 p-3 rounded-lg border
        ${isOutOfStock ? "bg-red-50 border-red-200" : ""}
        ${isLowStock && !isOutOfStock ? "bg-orange-50 border-orange-200" : ""}
        ${!isLowStock ? "bg-white" : ""}
      `}
    >
      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{product.name}</span>
          {product.size && (
            <Badge variant="secondary" className="text-xs">
              {t.product.size} {product.size}
            </Badge>
          )}
          {product.style && getStyleBadge(product.style)}
        </div>
      </div>

      {/* Prices & Debt */}
      <div className="hidden md:block text-right w-40">
        {isEditing ? (
          <div className="space-y-1">
            <Input
              type="number"
              value={editData.sellPrice}
              onChange={(e) =>
                setEditData({ ...editData, sellPrice: Number(e.target.value) })
              }
              className="h-8 text-right"
              placeholder={t.product.sellPrice}
            />
            <Input
              type="number"
              value={editData.costPrice}
              onChange={(e) =>
                setEditData({ ...editData, costPrice: Number(e.target.value) })
              }
              className="h-8 text-right text-xs"
              placeholder={t.product.costPrice}
            />
          </div>
        ) : (
          <div>
            <p className="font-semibold">{formatRiel(product.sellPrice)}</p>
            <p className="text-xs text-muted-foreground">
              {t.product.cost}: {formatRiel(product.costPrice)}
            </p>
            {product.currentStock > 0 && (
              <p className="text-xs font-medium text-orange-600 mt-1">
                💳 {formatRiel(product.currentStock * product.costPrice)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stock Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateStock(-1)}
          disabled={loading || product.currentStock === 0}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <div className="text-center min-w-[60px]">
          <p
            className={`text-lg font-bold ${
              isOutOfStock
                ? "text-red-600"
                : isLowStock
                  ? "text-orange-600"
                  : ""
            }`}
          >
            {product.currentStock}
          </p>
          {isEditing ? (
            <Input
              type="number"
              value={editData.minStock}
              onChange={(e) =>
                setEditData({ ...editData, minStock: Number(e.target.value) })
              }
              className="h-6 text-xs text-center mt-1"
              placeholder={t.product.min}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {t.product.min}: {product.minStock}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateStock(1)}
          disabled={loading}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Edit Buttons */}
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8"
              onClick={saveEdit}
              disabled={loading}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={cancelEdit}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
