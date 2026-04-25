export function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export class CategoryGovernorService {
  matchExistingCategory(existingCategories: string[], candidate: string | null | undefined) {
    if (!candidate) return null;
    const normalizedCandidate = normalizeCategoryName(candidate);
    return (
      existingCategories.find(
        (category) => normalizeCategoryName(category) === normalizedCandidate,
      ) ?? null
    );
  }
}
