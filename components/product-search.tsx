"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { formatRiel } from "@/lib/utils-format";
import { t } from "@/lib/translations";
import { getStyleLabel } from "@/lib/product-style";

export type Product = {
  id: number;
  name: string;
  size: string | null;
  style: string | null;
  category: string;
  sellPrice: number;
  costPrice: number;
  currentStock: number;
};

type Props = {
  products: Product[];
  selected: Product | null;
  onSelect: (product: Product | null) => void;
  placeholder?: string;
};

export function ProductSearch({
  products,
  selected,
  onSelect,
  placeholder,
}: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products by search query
  const filtered = query
    ? products.filter((p) => {
        const search = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(search) ||
          p.size?.toLowerCase().includes(search) ||
          p.style?.toLowerCase().includes(search)
        );
      })
    : products;

  function handleSelect(product: Product) {
    onSelect(product);
    setQuery("");
    setIsOpen(false);
  }

  function handleClear() {
    onSelect(null);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{selected.name}</span>
              {selected.size && (
                <Badge variant="secondary" className="text-xs">
                  {t.product.size} {selected.size}
                </Badge>
              )}
              {selected.style && (
                <Badge variant="outline" className="text-xs">
                  {getStyleLabel(selected.style)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.product.sellPrice}: {formatRiel(selected.sellPrice)} |{" "}
              {t.product.stock}: {selected.currentStock}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-blue-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder || t.stockIn.searchProduct}
              className="pl-9"
            />
          </div>

          {isOpen && (
            <div className="absolute z-10 w-full mt-1 max-h-80 overflow-y-auto bg-white border rounded-lg shadow-lg">
              {filtered.length === 0 ? (
                <p className="p-3 text-center text-muted-foreground text-sm">
                  {t.common.noItems}
                </p>
              ) : (
                filtered.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{product.name}</span>
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
                        {formatRiel(product.sellPrice)} | {t.product.stock}:{" "}
                        {product.currentStock}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
