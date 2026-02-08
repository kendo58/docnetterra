export function sanitizeSearchFallbackTerm(rawQuery: string): string {
  return rawQuery
    .replace(/[%_]/g, " ")
    .replace(/[(),]/g, " ")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}
