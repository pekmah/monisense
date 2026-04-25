export function normalizeMerchantKey(input: string | null | undefined) {
  if (!input) return null;

  const normalized = input
    .toLowerCase()
    .replace(/\b[a-z0-9]{8,16}\b/g, " ")
    .replace(/\b(?:\+254|254|0)?7\d{8}\b/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 0 ? normalized : null;
}
