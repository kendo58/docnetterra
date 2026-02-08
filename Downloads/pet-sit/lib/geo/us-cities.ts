import cityTuples from "@/lib/data/us-cities.json"

export type CityResult = { city: string; state: string }

export type CityCenterCoordinates = { lat: number; lng: number }

type CityTuple = [city: string, state: string, lat: number, lng: number]
type CityIndexRecord = CityResult & { key: string }

// Source: US Census Gazetteer Places (2019), public domain.
// Generated into `lib/data/us-cities.json` as `[city, state, lat, lng]` tuples.
const DESIGNATOR_RE = /\s+(city|town|village|municipality|cdp|borough)\s*$/i
const BALANCE_RE = /\s*\(balance\)\s*$/i

function normalizeCityName(value: string): string {
  return value.trim().replace(BALANCE_RE, "").replace(DESIGNATOR_RE, "").trim()
}

const STATE_CODE_BY_NAME: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
  "washington dc": "DC",
  "washington d c": "DC",
}

function normalizeState(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  if (/^[A-Z]{2}$/.test(upper)) return upper

  const key = trimmed
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()

  return STATE_CODE_BY_NAME[key] ?? null
}

function normalizeForSearch(value: string): string {
  return normalizeCityName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const CITY_INDEX: CityIndexRecord[] = (cityTuples as CityTuple[])
  .map(([city, state]) => ({
    city,
    state,
    key: normalizeForSearch(city),
  }))
  .sort((a, b) => a.key.localeCompare(b.key) || a.state.localeCompare(b.state))

const CITY_COORDS = new Map<string, CityCenterCoordinates>(
  (cityTuples as CityTuple[]).map(([city, state, lat, lng]) => [`${normalizeForSearch(city)}|${state}`, { lat, lng }]),
)

function lowerBound(query: string) {
  let lo = 0
  let hi = CITY_INDEX.length

  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (CITY_INDEX[mid].key < query) lo = mid + 1
    else hi = mid
  }

  return lo
}

export function parseCityQuery(input: string): { cityQuery: string; state?: string } {
  const trimmed = input.trim()

  const match = trimmed.match(/^(.*?)(?:,|\s)\s*([a-zA-Z]{2})$/)
  if (match) {
    const cityQuery = match[1]?.trim() ?? ""
    const state = match[2]?.toUpperCase()
    if (cityQuery && state) return { cityQuery, state }
  }

  return { cityQuery: trimmed }
}

export function getUsCityCenterCoordinates(city: string, state: string): CityCenterCoordinates | null {
  const normalizedCity = normalizeForSearch(city)
  const normalizedState = normalizeState(state)
  if (!normalizedState) return null
  return CITY_COORDS.get(`${normalizedCity}|${normalizedState}`) ?? null
}

export function searchUsCities(
  rawQuery: string,
  options?: {
    limit?: number
    state?: string
  },
): CityResult[] {
  const limit = Math.max(1, Math.min(50, options?.limit ?? 50))
  const stateFilter = options?.state ? normalizeState(options.state) ?? undefined : undefined

  const query = normalizeForSearch(rawQuery)
  if (query.length < 2) return []

  const startIndex = lowerBound(query)
  const results: CityResult[] = []

  for (let i = startIndex; i < CITY_INDEX.length && results.length < limit; i++) {
    const item = CITY_INDEX[i]
    if (!item.key.startsWith(query)) break
    if (stateFilter && item.state !== stateFilter) continue
    results.push({ city: item.city, state: item.state })
  }

  return results
}
