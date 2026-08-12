import { ReportsView } from "@/components/reports-view";
import { t } from "@/lib/translations";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.reports.title}</h1>
        <p className="text-muted-foreground">{t.reports.subtitle}</p>
      </div>

      <ReportsView />
    </div>
  );
}
