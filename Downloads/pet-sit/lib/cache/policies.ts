export const CACHE_POLICIES = {
  geocode: {
    successTtlSeconds: 60 * 60 * 24 * 30,
    missTtlSeconds: 60 * 60 * 12,
    cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
  },
  search: {
    resultTtlSeconds: 45,
    cacheControl: "private, max-age=45, stale-while-revalidate=120",
  },
} as const

