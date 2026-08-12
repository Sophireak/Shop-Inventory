"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRiel, formatDate } from "@/lib/utils-format";
import { t } from "@/lib/translations";
import { getStyleLabel } from "@/lib/product-style";
import { Printer, FileText, Calendar, Building2 } from "lucide-react";

type ReportData = {
  period: { from: string; to: string };
  items: Array<{
    product: {
      name: string;
      size: string | null;
      style: string | null;
      category: string;
      costPrice: number;
    };
    quantity: number;
    totalCost: number;
  }>;
  totals: {
    quantity: number;
    amount: number;
  };
};

function getDateRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { from: format(today), to: format(today) };
    case "last7Days": {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { from: format(start), to: format(today) };
    }
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
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

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `SR-${year}${month}${day}-${random}`;
}

export function SupplierReport() {
  const [dateRange, setDateRange] = useState(() => getDateRange("thisMonth"));
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(() =>
    generateInvoiceNumber(),
  );
  const [notes, setNotes] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/supplier-report?from=${dateRange.from}&to=${dateRange.to}`,
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

  function selectPreset(preset: string) {
    setDateRange(getDateRange(preset));
  }

  // Save as PDF (uses Electron API if available)
  async function handleSavePdf() {
    if (!data || data.items.length === 0) {
      alert(t.supplier.noDataInPeriod);
      return;
    }

    // Check if running in Electron
    if (typeof window !== "undefined" && window.electron?.isElectron) {
      // Electron: clean PDF, no browser headers!
      const filename = `Supplier-Report-${invoiceNumber}.pdf`;
      await window.electron.saveAsPdf({ filename });
    } else {
      // Browser fallback: show tip
      const tipShown = localStorage.getItem("printTipShown");

      if (!tipShown) {
        const proceed = confirm(
          "💡 របៀបរក្សាទុកជា PDF៖\n\n" +
            '1. ជ្រើសរើស "Save as PDF"\n' +
            '2. ចុច "More settings"\n' +
            '3. ដោះធីក "Headers and footers"\n' +
            '4. ចុច "Save"\n\n' +
            "ចុច OK ដើម្បីបន្ត។",
        );

        if (!proceed) return;
        localStorage.setItem("printTipShown", "true");
      }

      window.print();
    }
  }

  // Print directly
  async function handlePrint() {
    if (!data || data.items.length === 0) {
      alert(t.supplier.noDataInPeriod);
      return;
    }

    if (typeof window !== "undefined" && window.electron?.isElectron) {
      // Electron: clean print
      await window.electron.printPage();
    } else {
      // Browser: standard print
      window.print();
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>{t.supplier.createReport}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              {t.supplier.selectPeriod}
            </Label>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectPreset("today")}
              >
                {t.reports.today}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectPreset("last7Days")}
              >
                {t.reports.last7Days}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectPreset("thisMonth")}
              >
                {t.reports.thisMonth}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectPreset("lastMonth")}
              >
                {t.reports.lastMonth}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t.reports.from}</Label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, from: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">{t.reports.to}</Label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, to: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t.supplier.supplierName}
              </Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder={t.supplier.supplierNamePlaceholder}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t.supplier.invoiceNumber}
              </Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{t.supplier.notes}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.supplier.notesPlaceholder}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSavePdf}
                className="h-14 text-lg"
                disabled={!data || data.items.length === 0}
              >
                <FileText className="w-5 h-5 mr-2" />
                📄 រក្សាទុក PDF
              </Button>

              <Button
                variant="outline"
                onClick={handlePrint}
                className="h-14 text-lg"
                disabled={!data || data.items.length === 0}
              >
                <Printer className="w-5 h-5 mr-2" />
                🖨️ បោះពុម្ព
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              💡 PDF: រក្សាទុកជាឯកសារ | បោះពុម្ព: ផ្ទាល់ទៅម៉ាស៊ីនបោះពុម្ព
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.common.loading}
          </CardContent>
        </Card>
      )}

      {!loading && data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t.supplier.noDataInPeriod}
          </CardContent>
        </Card>
      )}

      {!loading && data && data.items.length > 0 && (
        <Card className="print:shadow-none print:border-0 print:m-0 print:p-0">
          <CardContent className="pt-6">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b">
              <div>
                <h1 className="text-3xl font-bold">🏪 {t.supplier.shopName}</h1>
                <p className="text-sm text-muted-foreground">
                  {t.supplier.shopNameEn}
                </p>
              </div>
              <div className="border-2 border-blue-600 p-3 rounded">
                <p className="font-bold text-blue-600">
                  {t.supplier.invoiceTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.supplier.invoiceTitleEn}
                </p>
                <div className="mt-2 text-xs space-y-1">
                  <p>លេខ: {invoiceNumber}</p>
                  <p>ថ្ងៃ: {formatDate(new Date())}</p>
                </div>
              </div>
            </div>

            {/* Period & Supplier */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.supplier.reportPeriod}:
                </p>
                <p className="font-medium">
                  {formatDate(dateRange.from)} → {formatDate(dateRange.to)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.supplier.to} / TO:
                </p>
                <p className="font-medium">
                  {supplierName || "_____________________"}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border p-2 text-center w-12">
                      {t.supplier.no}
                    </th>
                    <th className="border p-2 text-left">
                      {t.supplier.product}
                    </th>
                    <th className="border p-2 text-center w-20">
                      {t.supplier.quantity}
                    </th>
                    <th className="border p-2 text-right w-28">
                      {t.supplier.unitCost}
                    </th>
                    <th className="border p-2 text-right w-32">
                      {t.supplier.total}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-gray-50" : ""}
                    >
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2">
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
                      <td className="border p-2 text-center font-medium">
                        {item.quantity}
                      </td>
                      <td className="border p-2 text-right">
                        {formatRiel(item.product.costPrice)}
                      </td>
                      <td className="border p-2 text-right font-semibold">
                        {formatRiel(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Box */}
            <div className="flex justify-end mb-8">
              <div className="border-2 border-blue-600 p-4 rounded min-w-[300px]">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{t.supplier.totalItems}:</span>
                  <span className="font-bold">{data.totals.quantity}</span>
                </div>
                <div className="border-t-2 border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-blue-600">
                      {t.supplier.totalAmount}:
                    </span>
                    <span className="font-bold text-blue-600 text-xl">
                      {formatRiel(data.totals.amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {notes && (
              <div className="mb-6">
                <p className="font-medium mb-1">{t.supplier.notes}:</p>
                <p className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded">
                  💬 {notes}
                </p>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-12 pt-8 signatures-section">
              <div className="text-center">
                <div className="border-t border-black mb-2 mx-8" />
                <p className="text-sm">{t.supplier.shopSignature}</p>
              </div>
              <div className="text-center">
                <div className="border-t border-black mb-2 mx-8" />
                <p className="text-sm">{t.supplier.supplierSignature}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
