/**
 * Format number as Riel currency: 12,500 ៛
 */
export function formatRiel(amount: number): string {
  return `${amount.toLocaleString()} ៛`;
}

/**
 * Format date in Khmer style: 30 កក្កដា 2025
 */
export function formatDate(date: Date | string): string {
  const khmerMonths = [
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
  ];

  const d = new Date(date);
  return `${d.getDate()} ${khmerMonths[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Get full product name with size and style
 */
export function getProductFullName(product: {
  name: string;
  size?: string | null;
  style?: string | null;
}): string {
  let full = product.name;
  if (product.size) full += ` ${product.size}`;
  if (product.style) full += ` (${product.style})`;
  return full;
}
