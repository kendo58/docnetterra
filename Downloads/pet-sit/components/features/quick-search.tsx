"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Briefcase, CalendarDays, Filter, Home, MapPin, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type CityResult = { city: string; state: string }

type QuickSearchDefaults = {
  q?: string
  city?: string
  state?: string
  start?: string
  end?: string
  listing_type?: string
  pet_type?: string
  task_type?: string
  verified?: string
}

type QuickSearchProps = {
  action?: string
  defaults?: QuickSearchDefaults
  hiddenFields?: Record<string, string | undefined>
  showFilters?: boolean
  showChips?: boolean
  sticky?: boolean
  collapsible?: boolean
  collapseAfter?: number
  className?: string
}

const PET_LABELS: Record<string, string> = {
  dog: "Dogs",
  cat: "Cats",
  bird: "Birds",
  rabbit: "Rabbits",
  other: "Other pets",
}

const TASK_LABELS: Record<string, string> = {
  pet_care: "Pet Care",
  gardening: "Gardening",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  cooking: "Cooking",
  lawn_care: "Lawn Care",
}

const VERIFICATION_LABELS: Record<string, string> = {
  verified: "Verified only",
  premium: "Premium verified",
}

function parseDateOnly(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatShortRange(range: DateRange | undefined) {
  if (!range?.from) return "Add dates"
  if (!range.to) return format(range.from, "MMM d")
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`
}

export function QuickSearch({
  action = "/search",
  defaults,
  hiddenFields,
  showFilters = false,
  showChips = false,
  sticky = false,
  collapsible = false,
  collapseAfter,
  className,
}: QuickSearchProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [listingType, setListingType] = useState(defaults?.listing_type ?? "")
  const [queryText, setQueryText] = useState(defaults?.q ?? "")

  const [city, setCity] = useState(defaults?.city ?? "")
  const [stateCode, setStateCode] = useState(defaults?.state ?? "")
  const [locationOpen, setLocationOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState("")
  const [cityResults, setCityResults] = useState<CityResult[]>([])
  const [cityLoading, setCityLoading] = useState(false)

  const [datesOpen, setDatesOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = parseDateOnly(defaults?.start)
    const to = parseDateOnly(defaults?.end)
    if (!from && !to) return undefined
    return { from, to }
  })

  const [petType, setPetType] = useState(defaults?.pet_type ?? "")
  const [taskType, setTaskType] = useState(defaults?.task_type ?? "")
  const [verified, setVerified] = useState(defaults?.verified ?? "")

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [pinnedOpen, setPinnedOpen] = useState(false)

  const start = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""
  const end = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""

  const locationLabel = useMemo(() => {
    if (city && stateCode) return `${city}, ${stateCode}`
    if (city) return city
    if (stateCode) return stateCode
    return "Search by city"
  }, [city, stateCode])

  useEffect(() => {
    const fetchCities = async () => {
      const q = cityQuery.trim()
      if (q.length < 2) {
        setCityResults([])
        return
      }

      setCityLoading(true)
      try {
        const res = await fetch(`/api/cities/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) return
        const data = (await res.json()) as { cities?: CityResult[] }
        setCityResults(data.cities ?? [])
      } catch (error) {
        console.error("[sitswap] City search failed:", error)
      } finally {
        setCityLoading(false)
      }
    }

    const t = setTimeout(fetchCities, 250)
    return () => clearTimeout(t)
  }, [cityQuery])

  const listingTypes = [
    { value: "", label: "All", icon: Search },
    { value: "pet_sitting", label: "Find a Sitter", icon: Home },
    { value: "stay", label: "Looking for Stay", icon: Briefcase },
  ] as const

  const selectedListingLabel = listingTypes.find((t) => t.value === listingType)?.label ?? "All"

  const submitSoon = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        formRef.current?.requestSubmit()
      })
    })
  }

  useEffect(() => {
    if (!collapsible) return

    const onScroll = () => {
      const shouldCollapse = window.scrollY > (collapseAfter ?? 140)

      if (!shouldCollapse) {
        setIsCollapsed(false)
        setPinnedOpen(false)
        return
      }

      if (!pinnedOpen) setIsCollapsed(true)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [collapsible, collapseAfter, pinnedOpen])

  const chips = useMemo(() => {
    const items: Array<{ key: string; label: string; onRemove: () => void }> = []

    if (listingType) {
      items.push({
        key: "listing_type",
        label: selectedListingLabel,
        onRemove: () => setListingType(""),
      })
    }

    if (city || stateCode) {
      items.push({
        key: "location",
        label: locationLabel,
        onRemove: () => {
          setCity("")
          setStateCode("")
          setCityQuery("")
        },
      })
    }

    if (dateRange?.from || dateRange?.to) {
      items.push({
        key: "dates",
        label: formatShortRange(dateRange),
        onRemove: () => setDateRange(undefined),
      })
    }

    const q = queryText.trim()
    if (q) {
      items.push({
        key: "q",
        label: `“${q}”`,
        onRemove: () => setQueryText(""),
      })
    }

    if (petType) {
      items.push({
        key: "pet_type",
        label: PET_LABELS[petType] ?? petType,
        onRemove: () => setPetType(""),
      })
    }

    if (taskType) {
      items.push({
        key: "task_type",
        label: TASK_LABELS[taskType] ?? taskType,
        onRemove: () => setTaskType(""),
      })
    }

    if (verified) {
      items.push({
        key: "verified",
        label: VERIFICATION_LABELS[verified] ?? verified,
        onRemove: () => setVerified(""),
      })
    }

    return items
  }, [city, stateCode, dateRange, listingType, locationLabel, petType, queryText, selectedListingLabel, taskType, verified])

  const wrapperClassName = cn(
    sticky &&
      "sticky top-2 z-40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:top-16",
    "w-full transition-all duration-200",
  )

  return (
    <form ref={formRef} action={action} method="GET" className={cn("w-full", className)}>
      {/* Hidden fields (Radix popovers/sheets portal outside form) */}
      <input type="hidden" name="listing_type" value={listingType} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="state" value={stateCode} />
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="end" value={end} />
      <input type="hidden" name="pet_type" value={petType} />
      <input type="hidden" name="task_type" value={taskType} />
      <input type="hidden" name="verified" value={verified} />
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null,
        )}

      <div className={wrapperClassName}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => {
              setPinnedOpen(true)
              setIsCollapsed(false)
            }}
            className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-full border bg-background/95 p-2 shadow-sm transition-shadow hover:shadow-md"
            aria-label="Open search"
          >
            <div className="flex min-w-0 items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <div className="truncate text-sm font-semibold">{locationLabel}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {formatShortRange(dateRange)} · {selectedListingLabel}
                </div>
              </div>
            </div>
            <div className="hidden shrink-0 pr-3 text-xs text-muted-foreground sm:block">
              {queryText.trim() ? `“${queryText.trim()}”` : "Pets, chores"}
            </div>
          </button>
        ) : (
          <>
            {/* Category tabs (Airbnb-inspired) */}
            <div className="mx-auto mb-2 flex w-full max-w-3xl justify-center">
              <div className="flex w-full items-center justify-center gap-1 overflow-x-auto rounded-full border bg-background/95 p-1 shadow-xs sm:w-auto">
                {listingTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setListingType(t.value)
                      submitSoon()
                    }}
                    className={cn(
                      "group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                      listingType === t.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-accent border-border text-foreground",
                    )}
                  >
                    <t.icon
                      className={cn("h-4 w-4", listingType === t.value ? "text-background" : "text-muted-foreground")}
                    />
                    <span className="whitespace-nowrap">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search pill */}
            <div className="mx-auto mt-2 flex w-full max-w-4xl flex-col gap-2 rounded-2xl border bg-background/90 p-2 shadow-sm backdrop-blur transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:rounded-full">
        {/* Where */}
        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center gap-3 rounded-xl px-4 py-2 text-left transition-colors hover:bg-accent sm:rounded-full",
                locationOpen && "bg-accent",
              )}
              aria-label="Choose location"
            >
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs font-semibold">Where</div>
                <div className="truncate text-sm text-muted-foreground">{locationLabel}</div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(520px,calc(100vw-2rem))] p-0">
            <div className="p-3">
              <div className="text-sm font-semibold">Search destinations</div>
              <div className="text-xs text-muted-foreground">Type a city name to get started</div>
            </div>
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search by city..." value={cityQuery} onValueChange={setCityQuery} />
              <CommandList className="max-h-80">
                {cityLoading && <CommandEmpty>Searching…</CommandEmpty>}
                {!cityLoading && cityQuery.trim().length < 2 && <CommandEmpty>Type at least 2 characters.</CommandEmpty>}
                {!cityLoading && cityQuery.trim().length >= 2 && cityResults.length === 0 && (
                  <CommandEmpty>No cities found.</CommandEmpty>
                )}
                {!cityLoading && cityResults.length > 0 && (
                  <CommandGroup heading={`${cityResults.length} results`}>
                    {cityResults.map((r, idx) => (
                      <CommandItem
                        key={`${r.city}-${r.state}-${idx}`}
                        value={`${r.city}, ${r.state}`}
                        onSelect={() => {
                          setCity(r.city)
                          setStateCode(r.state)
                          setLocationOpen(false)
                          setCityQuery("")
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{r.city}</span>
                          <span className="text-xs text-muted-foreground">{r.state}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
            {(city || stateCode) && (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setCity("")
                    setStateCode("")
                    setLocationOpen(false)
                    setCityQuery("")
                  }}
                >
                  Clear location
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="hidden h-10 w-px bg-border sm:block" />

        {/* When */}
        <Popover open={datesOpen} onOpenChange={setDatesOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center gap-3 rounded-xl px-4 py-2 text-left transition-colors hover:bg-accent sm:rounded-full",
                datesOpen && "bg-accent",
              )}
              aria-label="Choose dates"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs font-semibold">When</div>
                <div className="truncate text-sm text-muted-foreground">{formatShortRange(dateRange)}</div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Select dates</div>
                <div className="text-xs text-muted-foreground">Choose a start and end date</div>
              </div>
              {(dateRange?.from || dateRange?.to) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange(undefined)}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range)
                if (range?.from && range?.to) setDatesOpen(false)
              }}
              numberOfMonths={2}
              className="rounded-md border"
            />
          </PopoverContent>
        </Popover>

        {/* What */}
        <div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-2 sm:rounded-full">
          <Search className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">What</div>
            <input
              name="q"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Pets, chores, keywords"
              className="w-full truncate bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Filters (optional) */}
        {showFilters && (
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="bg-transparent sm:inline-flex">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 p-4 pt-0">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Pet Type</div>
                  <select
                    value={petType}
                    onChange={(e) => setPetType(e.target.value)}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All pets</option>
                    <option value="dog">Dogs</option>
                    <option value="cat">Cats</option>
                    <option value="bird">Birds</option>
                    <option value="rabbit">Rabbits</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Task Type</div>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All tasks</option>
                    <option value="pet_care">Pet Care</option>
                    <option value="gardening">Gardening</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="cooking">Cooking</option>
                    <option value="lawn_care">Lawn Care</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Verification</div>
                  <select
                    value={verified}
                    onChange={(e) => setVerified(e.target.value)}
                    className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All members</option>
                    <option value="verified">Verified only</option>
                    <option value="premium">Premium verified</option>
                  </select>
                </div>
              </div>

              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent"
                  onClick={() => {
                    setPetType("")
                    setTaskType("")
                    setVerified("")
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  onClick={() => {
                    formRef.current?.requestSubmit()
                  }}
                >
                  Show results
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}

        {/* Search */}
        <Button type="submit" variant="brand" className="h-12 w-full rounded-xl p-0 sm:w-12 sm:rounded-full">
          <Search className="h-5 w-5" />
          <span className="ml-2 text-sm font-semibold sm:hidden">Search</span>
        </Button>
      </div>

            {/* Active filter chips */}
            {showChips && chips.length > 0 && (
              <div className="mx-auto mt-2 flex w-full max-w-5xl items-center justify-center gap-2 overflow-x-auto pb-1">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm shadow-xs transition-colors hover:bg-accent"
                    onClick={() => {
                      chip.onRemove()
                      submitSoon()
                    }}
                  >
                    <span className="max-w-[18rem] truncate">{chip.label}</span>
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  onClick={() => {
                    setListingType("")
                    setQueryText("")
                    setCity("")
                    setStateCode("")
                    setCityQuery("")
                    setDateRange(undefined)
                    setPetType("")
                    setTaskType("")
                    setVerified("")
                    setLocationOpen(false)
                    setDatesOpen(false)
                    submitSoon()
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </form>
  )
}
