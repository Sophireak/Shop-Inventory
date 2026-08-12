export function getStyleLabel(style: string | null): string {
  if (!style) return "";
  const labels: Record<string, string> = {
    pocket: "🧵 មានហោប៉ៅ",
    "no-pocket": "⭕ គ្មានហោប៉ៅ",
    blue: "🔵 ខៀវ (ទី១-២)",
    orange: "🟠 ទឹកក្រូច (ទី៣-៤)",
    green: "🟢 បៃតង (ទី៥-៦)",
  };
  return labels[style] || style;
}

export function getStyleClassName(style: string | null): string {
  if (!style) return "";
  const classes: Record<string, string> = {
    pocket: "text-blue-600",
    "no-pocket": "text-purple-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };
  return classes[style] || "";
}
