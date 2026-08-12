"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertTriangle, Info } from "lucide-react";
import { t } from "@/lib/translations";
import { formatRiel } from "@/lib/utils-format";
import { getStyleLabel } from "@/lib/product-style";

type SimilarProduct = {
  id: number;
  name: string;
  size: string | null;
  style: string | null;
  category: string;
  sellPrice: number;
  costPrice: number;
  currentStock: number;
};

export function AddProductDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    size: "",
    style: "",
    category: "girl",
    sellPrice: "",
    costPrice: "",
    minStock: "5",
  });

  // Check for similar products when name changes
  useEffect(() => {
    if (!form.name || form.name.trim().length < 2) {
      setSimilarProducts([]);
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products/check-similar?name=${encodeURIComponent(form.name.trim())}`,
        );
        const data = await res.json();
        setSimilarProducts(data.similar || []);

        // Check if EXACT duplicate
        const exactMatch = data.similar.find(
          (p: SimilarProduct) =>
            p.name === form.name.trim() &&
            (p.size ?? "") === (form.size.trim() || "") &&
            (p.style ?? "") === (form.style.trim() || ""),
        );

        if (exactMatch) {
          setDuplicateWarning(`⚠️ ផលិតផលនេះមានរួចហើយ! (លេខ ${exactMatch.id})`);
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error(error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.name, form.size, form.style]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (duplicateWarning) {
      alert(duplicateWarning);
      return;
    }

    setLoading(true);

    try {
      const sellPrice = Number(form.sellPrice);
      const costPrice = form.costPrice
        ? Number(form.costPrice)
        : sellPrice - 300;

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sellPrice,
          costPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "DUPLICATE") {
          alert(
            `⚠️ ${data.message}\n\nផលិតផលនេះមានរួចហើយ។ សូមកែប្រែផលិតផលដែលមាន ឬបន្ថែមទំហំ/ម៉ូដខុសគ្នា។`,
          );
        } else if (data.error === "MISSING_FIELDS") {
          alert(`⚠️ ${data.message}`);
        } else {
          alert(`❌ ${data.message || t.common.failed}`);
        }
        return;
      }

      // Success!
      setOpen(false);
      setForm({
        name: "",
        size: "",
        style: "",
        category: "girl",
        sellPrice: "",
        costPrice: "",
        minStock: "5",
      });
      setSimilarProducts([]);
      setDuplicateWarning(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(t.common.failed);
    } finally {
      setLoading(false);
    }
  }

  function handleSellPriceChange(value: string) {
    setForm({
      ...form,
      sellPrice: value,
      costPrice: value ? String(Number(value) - 300) : "",
    });
  }

  function resetForm() {
    setForm({
      name: "",
      size: "",
      style: "",
      category: "girl",
      sellPrice: "",
      costPrice: "",
      minStock: "5",
    });
    setSimilarProducts([]);
    setDuplicateWarning(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t.product.addProduct}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.product.addNewProduct}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t.product.productName} *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ឧ. អាវស្រី"
              required
              autoComplete="off"
            />
          </div>

          {/* Show similar products */}
          {similarProducts.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">
                  ផលិតផលដែលមានឈ្មោះស្រដៀងគ្នា ({similarProducts.length})
                </p>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {similarProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm bg-white p-2 rounded"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.name}</span>
                      {p.size && (
                        <Badge variant="secondary" className="text-xs">
                          {p.size}
                        </Badge>
                      )}
                      {p.style && (
                        <Badge variant="outline" className="text-xs">
                          {getStyleLabel(p.style)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">
                        {formatRiel(p.sellPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ស្តុក: {p.currentStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                💡 សូមប្រាកដថាទំហំ ឬម៉ូដខុសពីខាងលើ
              </p>
            </div>
          )}

          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800">
                  {duplicateWarning}
                </p>
              </div>
              <p className="text-xs text-red-600 mt-1">
                មិនអាចបន្ថែមផលិតផលស្ទួនបានទេ! សូមផ្លាស់ប្តូរទំហំ ឬម៉ូដ។
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="size">{t.product.size}</Label>
              <Input
                id="size"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder={`ឧ. L-XL ${t.common.optional}`}
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="style">{t.product.style}</Label>
              <Input
                id="style"
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
                placeholder={`ឧ. pocket ${t.common.optional}`}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">{t.product.category} *</Label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm({ ...form, category: value ?? "girl" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="girl">👧 កុមារី</SelectItem>
                <SelectItem value="boy">👦 កុមារា</SelectItem>
                <SelectItem value="both">👦👧 ទាំងពីរ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sellPrice">{t.product.sellPrice} * (៛)</Label>
              <Input
                id="sellPrice"
                type="number"
                value={form.sellPrice}
                onChange={(e) => handleSellPriceChange(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="costPrice">{t.product.costPrice} (៛)</Label>
              <Input
                id="costPrice"
                type="number"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
                placeholder={t.product.autoCalculated}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="minStock">{t.product.minStock}</Label>
            <Input
              id="minStock"
              type="number"
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
              placeholder="5"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading || !!duplicateWarning}>
              {loading ? t.common.adding : t.product.addProduct}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
