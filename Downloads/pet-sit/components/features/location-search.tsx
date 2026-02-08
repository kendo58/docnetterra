"use client"

import { useState, useEffect } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MapPin, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

// US States
const US_STATES = [
  { value: "DC", label: "District of Columbia" },
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
]

interface LocationSearchProps {
  defaultState?: string
  defaultCity?: string
  onLocationChange?: (state: string, city: string) => void
}

export function LocationSearch({ defaultState = "", defaultCity = "", onLocationChange }: LocationSearchProps) {
  const [stateOpen, setStateOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [selectedState, setSelectedState] = useState(defaultState)
  const [selectedCity, setSelectedCity] = useState(defaultCity)
  const [citySearch, setCitySearch] = useState("")
  const [cities, setCities] = useState<{ city: string; state: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch cities from database when user types
  useEffect(() => {
    const fetchCities = async () => {
      if (citySearch.length < 2) {
        setCities([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/cities/search?q=${encodeURIComponent(citySearch)}`)
        if (response.ok) {
          const data = await response.json()
          setCities(data.cities || [])
        }
      } catch (error) {
        console.error("Failed to fetch cities:", error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchCities, 300)
    return () => clearTimeout(debounce)
  }, [citySearch])

  const handleStateSelect = (state: string) => {
    setSelectedState(state)
    setStateOpen(false)
    if (onLocationChange) {
      onLocationChange(state, selectedCity)
    }
  }

  const handleCitySelect = (city: string, state: string) => {
    setSelectedCity(city)
    setSelectedState(state)
    setCityOpen(false)
    if (onLocationChange) {
      onLocationChange(state, city)
    }
  }

  const clearLocation = () => {
    setSelectedState("")
    setSelectedCity("")
    if (onLocationChange) {
      onLocationChange("", "")
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* State Selector */}
      <div className="space-y-2">
        <Label>State</Label>
        <Popover open={stateOpen} onOpenChange={setStateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={stateOpen}
              className="w-full justify-between bg-background"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {selectedState ? US_STATES.find((state) => state.value === selectedState)?.label : "Select state..."}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search state..." />
              <CommandList>
                <CommandEmpty>No state found.</CommandEmpty>
                <CommandGroup>
                  {US_STATES.map((state) => (
                    <CommandItem key={state.value} value={state.label} onSelect={() => handleStateSelect(state.value)}>
                      <Check
                        className={cn("mr-2 h-4 w-4", selectedState === state.value ? "opacity-100" : "opacity-0")}
                      />
                      {state.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input type="hidden" name="state" value={selectedState} />
      </div>

      {/* City Selector with Autocomplete */}
      <div className="space-y-2">
        <Label>City</Label>
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="w-full justify-between bg-background"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {selectedCity ? (
                  <span className="truncate">
                    {selectedCity}
                    {selectedState && `, ${selectedState}`}
                  </span>
                ) : (
                  "Type to search city..."
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Type city name..." value={citySearch} onValueChange={setCitySearch} />
              <CommandList>
                {loading && <CommandEmpty>Searching cities...</CommandEmpty>}
                {!loading && citySearch.length < 2 && (
                  <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
                )}
                {!loading && citySearch.length >= 2 && cities.length === 0 && (
                  <CommandEmpty>No cities found matching &quot;{citySearch}&quot;</CommandEmpty>
                )}
                {!loading && cities.length > 0 && (
                  <CommandGroup heading={`${cities.length} cities found`}>
                    {cities.map((city, idx) => (
                      <CommandItem
                        key={`${city.city}-${city.state}-${idx}`}
                        value={`${city.city}, ${city.state}`}
                        onSelect={() => handleCitySelect(city.city, city.state)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCity === city.city && selectedState === city.state ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{city.city}</span>
                          <span className="text-xs text-muted-foreground">
                            {US_STATES.find((s) => s.value === city.state)?.label || city.state}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input type="hidden" name="city" value={selectedCity} />
      </div>

      {/* Clear button */}
      {(selectedState || selectedCity) && (
        <div className="md:col-span-2">
          <Button type="button" variant="ghost" size="sm" onClick={clearLocation} className="h-8">
            Clear location
          </Button>
        </div>
      )}
    </div>
  )
}
