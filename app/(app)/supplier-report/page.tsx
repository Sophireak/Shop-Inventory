import { SupplierReport } from "@/components/supplier-report";
import { t } from "@/lib/translations";

export default function SupplierReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📤 {t.supplier.title}</h1>
        <p className="text-muted-foreground">{t.supplier.subtitle}</p>
      </div>

      <SupplierReport />
    </div>
  );
}
