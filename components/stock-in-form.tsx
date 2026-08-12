'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PackagePlus } from 'lucide-react'
import { ProductSearch, type Product } from '@/components/product-search'
import { formatRiel } from '@/lib/utils-format'
import { t } from '@/lib/translations'

type Props = {
  products: Product[]
}

export function StockInForm({ products }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // When product is selected, auto-fill cost price
  function handleSelectProduct(product: Product | null) {
    setSelected(product)
    if (product) {
      setCostPrice(String(product.costPrice))
    } else {
      setCostPrice('')
    }
  }

  const totalCost = (Number(quantity) || 0) * (Number(costPrice) || 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selected) {
      alert(t.stockIn.pleaseSelectProduct)
      return
    }
    if (!quantity || Number(quantity) <= 0) {
      alert(t.stockIn.pleaseEnterQuantity)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selected.id,
          quantity: Number(quantity),
          costPrice: Number(costPrice),
          supplier,
          note,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      // Reset form
      setSelected(null)
      setQuantity('')
      setCostPrice('')
      setSupplier('')
      setNote('')

      router.refresh()
    } catch (error) {
      console.error(error)
      alert(t.common.failed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackagePlus className="w-5 h-5" />
          {t.stockIn.recordStockIn}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div>
            <Label>{t.stockIn.selectProduct} *</Label>
            <ProductSearch
              products={products}
              selected={selected}
              onSelect={handleSelectProduct}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">{t.stockIn.quantity} *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            {/* Cost Price */}
            <div>
              <Label htmlFor="costPrice">{t.stockIn.costPerUnit} (៛)</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Total Cost Display */}
          {totalCost > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg flex justify-between items-center">
              <span className="font-medium">{t.stockIn.totalCost}:</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatRiel(totalCost)}
              </span>
            </div>
          )}

          {/* Supplier */}
          <div>
            <Label htmlFor="supplier">{t.stockIn.supplier}</Label>
            <Input
              id="supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder={t.stockIn.supplierPlaceholder}
            />
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note">{t.common.note}</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.stockIn.notePlaceholder}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={loading || !selected || !quantity}
          >
            {loading ? t.common.saving : `📥 ${t.stockIn.recordStockIn}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}