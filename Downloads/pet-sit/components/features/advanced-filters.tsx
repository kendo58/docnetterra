"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Filter, Dog, Cat, Bird, Rabbit, Home, Bed, Sparkles, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterState {
  listingTypes: string[]
  petTypes: string[]
  amenities: string[]
  taskTypes: string[]
  priceRange: [number, number]
  verified: boolean
  instantBook: boolean
}

interface AdvancedFiltersProps {
  onApply: (filters: FilterState) => void
  initialFilters?: Partial<FilterState>
}

const listingTypeOptions = [
  { id: "pet_sitting", label: "Find a Sitter", icon: Home },
  { id: "stay", label: "Looking for Stay", icon: Bed },
]

const petTypeOptions = [
  { id: "dog", label: "Dogs", icon: Dog },
  { id: "cat", label: "Cats", icon: Cat },
  { id: "bird", label: "Birds", icon: Bird },
  { id: "rabbit", label: "Rabbits", icon: Rabbit },
]

const amenityOptions = ["WiFi", "Parking", "Kitchen", "Washer/Dryer", "Air Conditioning", "Pool", "Garden", "Workspace"]

const taskTypeOptions = [
  { id: "pet_care", label: "Pet Care" },
  { id: "gardening", label: "Gardening" },
  { id: "cleaning", label: "Cleaning" },
  { id: "maintenance", label: "Maintenance" },
  { id: "cooking", label: "Cooking" },
  { id: "lawn_care", label: "Lawn Care" },
]

export function AdvancedFilters({ onApply, initialFilters }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    listingTypes: initialFilters?.listingTypes || [],
    petTypes: initialFilters?.petTypes || [],
    amenities: initialFilters?.amenities || [],
    taskTypes: initialFilters?.taskTypes || [],
    priceRange: initialFilters?.priceRange || [0, 100],
    verified: initialFilters?.verified || false,
    instantBook: initialFilters?.instantBook || false,
  })

  const activeFilterCount =
    filters.listingTypes.length +
    filters.petTypes.length +
    filters.amenities.length +
    filters.taskTypes.length +
    (filters.verified ? 1 : 0) +
    (filters.instantBook ? 1 : 0)

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const array = filters[key] as string[]
    setFilters({
      ...filters,
      [key]: array.includes(value) ? array.filter((v) => v !== value) : [...array, value],
    })
  }

  const clearFilters = () => {
    setFilters({
      listingTypes: [],
      petTypes: [],
      amenities: [],
      taskTypes: [],
      priceRange: [0, 100],
      verified: false,
      instantBook: false,
    })
  }

  const handleApply = () => {
    onApply(filters)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative bg-transparent">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <Accordion type="multiple" defaultValue={["listing-type", "pets"]} className="w-full">
            {/* Listing Type */}
            <AccordionItem value="listing-type">
              <AccordionTrigger>Listing Type</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-2">
                  {listingTypeOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant={filters.listingTypes.includes(option.id) ? "default" : "outline"}
                      className={cn("justify-start", !filters.listingTypes.includes(option.id) && "bg-transparent")}
                      onClick={() => toggleArrayFilter("listingTypes", option.id)}
                    >
                      <option.icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Pet Types */}
            <AccordionItem value="pets">
              <AccordionTrigger>Pet Types</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {petTypeOptions.map((option) => (
                    <Badge
                      key={option.id}
                      variant={filters.petTypes.includes(option.id) ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3"
                      onClick={() => toggleArrayFilter("petTypes", option.id)}
                    >
                      <option.icon className="h-3 w-3 mr-1" />
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Task Types */}
            <AccordionItem value="tasks">
              <AccordionTrigger>Tasks Required</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {taskTypeOptions.map((option) => (
                    <Badge
                      key={option.id}
                      variant={filters.taskTypes.includes(option.id) ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3"
                      onClick={() => toggleArrayFilter("taskTypes", option.id)}
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Amenities */}
            <AccordionItem value="amenities">
              <AccordionTrigger>Amenities</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {amenityOptions.map((amenity) => (
                    <Badge
                      key={amenity}
                      variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3"
                      onClick={() => toggleArrayFilter("amenities", amenity)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Toggle Switches */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Verified Hosts Only</Label>
                <p className="text-xs text-muted-foreground">Show only verified profiles</p>
              </div>
              <Switch checked={filters.verified} onCheckedChange={(v) => setFilters({ ...filters, verified: v })} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Instant Confirm</Label>
                <p className="text-xs text-muted-foreground">Confirm without waiting for approval</p>
              </div>
              <Switch
                checked={filters.instantBook}
                onCheckedChange={(v) => setFilters({ ...filters, instantBook: v })}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Show Results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
