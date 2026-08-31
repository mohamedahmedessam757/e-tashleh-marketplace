/** Match backend order-create-rules.util normalizeComparableText / normalizePartName. */
export function normalizePartName(input: string): string {
  return String(input ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase('ar');
}

export function hasDuplicatePartNames(names: string[]): boolean {
  const seen = new Set<string>();
  for (const name of names) {
    const key = normalizePartName(name);
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export function isDuplicatePartNameAmong(
  candidate: string,
  existingNames: string[],
  ignoreIndex?: number,
): boolean {
  const key = normalizePartName(candidate);
  if (!key) return false;
  return existingNames.some((name, i) => {
    if (ignoreIndex !== undefined && i === ignoreIndex) return false;
    return normalizePartName(name) === key;
  });
}
