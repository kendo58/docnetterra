"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Home,
  Search,
  MapPin,
  CheckCircle,
  ArrowRight,
  Briefcase,
  X,
  ArrowLeft,
} from "lucide-react"
import { geocodeLocation } from "@/lib/utils/geocoding"
import { findAndNotifyPotentialMatches } from "@/app/actions/match-notifications"
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload"
import { isMissingColumnError } from "@/lib/utils/supabase-errors"
import type { PostgrestError } from "@supabase/supabase-js"

interface ListingFormProps {
  userId: string
  listing?: {
    id: string
    user_id: string
    address_id?: string | null
    photos?: string[] | null
    title?: string | null
    description?: string | null
    property_type?: string | null
    bedrooms?: number | null
    bathrooms?: number | null
    search_radius?: number | null
    services_offered?: string[] | null
    house_rules?: string | null
    amenities?: string[] | null
    address?: {
      city?: string | null
      state?: string | null
      postal_code?: string | null
      street_address?: string | null
    } | null
    pets?: Pet[] | null
    tasks?: Task[] | null
  } | null
  onSuccess?: (listingId: string) => void
}

interface Pet {
  name: string
  species: string
  breed: string
  age: string
  temperament: string
  care_instructions: string
  photos: string[]
}

interface Task {
  task_type: string
  description: string
  frequency: string
  is_required: boolean
}

const US_STATES = [
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
  { value: "DC", label: "Washington D.C." },
]

export function ListingForm({ userId, listing, onSuccess }: ListingFormProps) {
  const supabase = createBrowserClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ id: string; title: string; isStay: boolean } | null>(null)

  const [listingPhotos, setListingPhotos] = useState<string[]>(listing?.photos || [])

  const [listingPurpose, setListingPurpose] = useState<"find_sitter" | "looking_for_stay">("find_sitter")

  // Form state
  const [title, setTitle] = useState(listing?.title || "")
  const [description, setDescription] = useState(listing?.description || "")
  const [propertyType, setPropertyType] = useState(listing?.property_type || "")
  const [bedrooms, setBedrooms] = useState(listing?.bedrooms?.toString() || "")
  const [bathrooms, setBathrooms] = useState(listing?.bathrooms?.toString() || "")
  const [city, setCity] = useState(listing?.address?.city || "")
  const [state, setState] = useState(listing?.address?.state || "")
  const [postalCode, setPostalCode] = useState(listing?.address?.postal_code || "")
  const [streetAddress, setStreetAddress] = useState(listing?.address?.street_address || "")
  const [houseRules, setHouseRules] = useState(listing?.house_rules || "")
  const [amenities, setAmenities] = useState<string[]>(listing?.amenities || [])

  const [hasSecondaryLocation, setHasSecondaryLocation] = useState(false)
  const [secondaryCity, setSecondaryCity] = useState("")
  const [secondaryState, setSecondaryState] = useState("")

  const [pets, setPets] = useState<Pet[]>(listing?.pets || [])

  const [tasks, setTasks] = useState<Task[]>(
    listing?.tasks || [{ task_type: "", description: "", frequency: "", is_required: true }],
  )

  const [searchRadius, setSearchRadius] = useState(listing?.search_radius || 25)

  const [servicesOffered, setServicesOffered] = useState<string[]>(listing?.services_offered || [])

  const amenitiesList = [
    "wifi",
    "parking",
    "washer",
    "dryer",
    "air_conditioning",
    "heating",
    "kitchen",
    "workspace",
    "tv",
    "garden",
    "gym",
    "pool",
  ]

  const availableServices = [
    { id: "pet_sitting", label: "Pet Sitting", description: "Care for pets while hosts are away" },
    { id: "dog_walking", label: "Dog Walking", description: "Daily dog walking services" },
    { id: "gardening", label: "Gardening", description: "Garden maintenance and care" },
    { id: "cleaning", label: "House Cleaning", description: "General cleaning and tidying" },
    { id: "cooking", label: "Cooking", description: "Meal preparation" },
    { id: "handyman", label: "Handyman Work", description: "Minor repairs and maintenance" },
    { id: "childcare", label: "Childcare", description: "Babysitting or childcare assistance" },
    { id: "eldercare", label: "Elder Care", description: "Assistance with elderly family members" },
    { id: "lawn_care", label: "Lawn Care", description: "Mowing, trimming, and yard work" },
    { id: "pool_maintenance", label: "Pool Maintenance", description: "Pool cleaning and care" },
    { id: "house_sitting", label: "House Sitting", description: "Security and general home monitoring" },
    { id: "errands", label: "Running Errands", description: "Shopping, deliveries, etc." },
  ]

  const addPet = () => {
    setPets([
      ...pets,
      { name: "", species: "", breed: "", age: "", temperament: "", care_instructions: "", photos: [] },
    ])
  }

  const removePet = (index: number) => {
    setPets(pets.filter((_, i) => i !== index))
  }

  const updatePet = (index: number, field: keyof Pet, value: string | string[]) => {
    const newPets = [...pets]
    newPets[index][field] = value as never
    setPets(newPets)
  }

  const addTask = () => {
    setTasks([...tasks, { task_type: "", description: "", frequency: "", is_required: true }])
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const updateTask = (index: number, field: keyof Task, value: string | boolean) => {
    const newTasks = [...tasks]
    newTasks[index][field] = value as never
    setTasks(newTasks)
  }

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]))
  }

  const toggleService = (serviceId: string) => {
    setServicesOffered((prev) =>
      prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId],
    )
  }

  useEffect(() => {
    async function loadSecondaryAddress() {
      if (!listing?.id) return

      const supabase = createBrowserClient()
      const { data: addresses } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", listing.user_id)
        .eq("is_primary", false)
        .limit(1)
        .single()

      if (addresses) {
        setHasSecondaryLocation(true)
        setSecondaryCity(addresses.city || "")
        setSecondaryState(addresses.state || "")
      }
    }
    loadSecondaryAddress()
  }, [listing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Geocode the location to get coordinates
      let coordinates = { lat: 0, lng: 0 }
      if (city && state) {
        const geocodeResult = await geocodeLocation(city, state)
        if (geocodeResult.coordinates) {
          coordinates = geocodeResult.coordinates
        }
      }

      // Create or update address with coordinates
      const addressData = {
        user_id: userId,
        street_address: streetAddress,
        city,
        state,
        postal_code: postalCode,
        country: "US",
        is_primary: true,
        latitude: coordinates.lat || null,
        longitude: coordinates.lng || null,
      }

      const { data: address, error: addressError } = listing?.address_id
        ? await supabase.from("addresses").update(addressData).eq("id", listing.address_id).select().single()
        : await supabase.from("addresses").insert(addressData).select().single()

      if (addressError) throw addressError

      const createListingData = (supportsListingType: boolean) => ({
        user_id: userId,
        title,
        description,
        ...(supportsListingType ? { listing_type: listingPurpose === "find_sitter" ? "pet_sitting" : "stay" } : {}),
        property_type: listingPurpose === "find_sitter" ? propertyType : "looking_for_stay",
        is_active: true,
        address_id: address.id,
        photos: listingPhotos.length > 0 ? listingPhotos : null,
        search_radius: listingPurpose === "looking_for_stay" ? searchRadius : null,
        services_offered: listingPurpose === "looking_for_stay" && servicesOffered.length > 0 ? servicesOffered : null,
      })

      let listingId = listing?.id

      let listingError: PostgrestError | null = null
      let createdListingId: string | null = null

      const upsertListing = async (supportsListingType: boolean) => {
        const listingData = createListingData(supportsListingType)

        if (listing?.id) {
          const { error } = await supabase.from("listings").update(listingData).eq("id", listing.id)
          listingError = error
          return
        }

        const { data: newListing, error } = await supabase.from("listings").insert(listingData).select("id").single()
        const insertedListing = newListing as { id?: string } | null
        createdListingId = insertedListing?.id ?? null
        listingError = error
      }

      await upsertListing(true)

      if (listingError && isMissingColumnError(listingError, "listing_type")) {
        console.warn(
          "[sitswap] Database schema missing listings.listing_type. Falling back to legacy listing writes; run scripts/016_add_listing_type_columns.sql.",
        )
        listingError = null
        await upsertListing(false)
      }

      if (listingError) throw listingError
      if (!listingId && createdListingId) listingId = createdListingId

      // Only handle pets if this is a "find_sitter" listing and there are pets
      if (listingPurpose === "find_sitter" && pets.length > 0) {
        // Delete existing pets for this listing if updating
        if (listing?.id) {
          await supabase.from("pets").delete().eq("listing_id", listing.id)
        }

        // Insert new pets
        const petsToInsert = pets
          .filter((pet) => pet.name && pet.species)
          .map((pet) => ({
            listing_id: listingId,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            age: Number.parseInt(pet.age) || null,
            temperament: pet.temperament,
            care_instructions: pet.care_instructions,
            photos: pet.photos,
            is_active: true,
          }))

        if (petsToInsert.length > 0) {
          const { error: petsError } = await supabase.from("pets").insert(petsToInsert)
          if (petsError) throw petsError
        }
      }

      // Handle tasks if this is a "find_sitter" listing
      if (listingPurpose === "find_sitter") {
        // Delete existing tasks for this listing if updating
        if (listing?.id) {
          await supabase.from("tasks").delete().eq("listing_id", listing.id)
        }

        // Insert new tasks
        const tasksToInsert = tasks
          .filter((task) => task.task_type && task.description)
          .map((task) => ({
            listing_id: listingId,
            task_type: task.task_type,
            description: task.description,
            frequency: task.frequency,
            is_required: task.is_required,
          }))

        if (tasksToInsert.length > 0) {
          const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert)
          if (tasksError) throw tasksError
        }
      }

      if (listingPurpose === "looking_for_stay" && hasSecondaryLocation && secondaryCity && secondaryState) {
        // Check if secondary address exists
        const { data: existingSecondary } = await supabase
          .from("addresses")
          .select("id")
          .eq("user_id", userId)
          .eq("is_primary", false)
          .limit(1)
          .single()

        const secondaryAddressData = {
          user_id: userId,
          city: secondaryCity,
          state: secondaryState,
          country: "US",
          is_primary: false,
        }

        if (existingSecondary) {
          await supabase.from("addresses").update(secondaryAddressData).eq("id", existingSecondary.id)
        } else {
          await supabase.from("addresses").insert(secondaryAddressData)
        }
      }

      if (!listing?.id && listingId) {
        // Only for new listings, not updates
        try {
          const { notified } = await findAndNotifyPotentialMatches(listingId)
          console.log(`[sitswap] Notified ${notified} users about potential match`)
        } catch (err) {
          console.error("[sitswap] Error notifying potential matches:", err)
          // Don't fail the listing creation if notifications fail
        }
      }

      if (!listingId) {
        throw new Error("Failed to determine listing ID after save.")
      }

      // Show success page instead of redirecting
      setSuccessData({
        id: listingId,
        title: title,
        isStay: listingPurpose === "looking_for_stay",
      })

      if (onSuccess) {
        onSuccess(listingId)
      }
    } catch (err: unknown) {
      console.error("Error creating listing:", err)
      setError(err instanceof Error ? err.message : "Failed to create listing. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (successData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <CheckCircle className="h-16 w-16 text-primary" />
        <h2 className="text-2xl font-bold">Listing Created Successfully!</h2>
        <p className="text-sm text-muted-foreground">Your listing "{successData.title}" has been created.</p>
        <Button variant="default" onClick={() => (window.location.href = `/listings/${successData.id}`)}>
          View Listing
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-muted-foreground">Creating your listing...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-0 bg-card">
        <CardHeader>
          <CardTitle>What are you looking for?</CardTitle>
          <CardDescription>This helps us tailor the form for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div
              className={`cursor-pointer rounded-xl border-2 p-5 transition-all hover:shadow-md ${
                listingPurpose === "find_sitter"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setListingPurpose("find_sitter")}
            >
              <div className="flex items-center gap-4">
                <div className={`rounded-full p-3 ${listingPurpose === "find_sitter" ? "bg-primary/10" : "bg-muted"}`}>
                  <Home
                    className={`h-6 w-6 ${listingPurpose === "find_sitter" ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold">Find a Sitter</h3>
                  <p className="text-sm text-muted-foreground">Pet sitting or chores for free stay</p>
                </div>
              </div>
            </div>

            <div
              className={`cursor-pointer rounded-xl border-2 p-5 transition-all hover:shadow-md ${
                listingPurpose === "looking_for_stay"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setListingPurpose("looking_for_stay")}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-full p-3 ${listingPurpose === "looking_for_stay" ? "bg-primary/10" : "bg-muted"}`}
                >
                  <Search
                    className={`h-6 w-6 ${listingPurpose === "looking_for_stay" ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold">Looking for Stay</h3>
                  <p className="text-sm text-muted-foreground">Find a place to stay</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-0 bg-card">
        <CardHeader>
          <CardTitle>{listingPurpose === "looking_for_stay" ? "About You" : "Basic Information"}</CardTitle>
          <CardDescription>
            {listingPurpose === "looking_for_stay"
              ? "Tell hosts about yourself and what you can offer"
              : "Describe your home and what you're looking for"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">
              {listingPurpose === "looking_for_stay" ? "Title for your request *" : "Listing Title *"}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                listingPurpose === "looking_for_stay"
                  ? "Looking for a place to stay - can pet sit!"
                  : "Beautiful home with friendly dog"
              }
              required
              className="text-base"
            />
          </div>

          <div>
            <Label htmlFor="description">
              {listingPurpose === "looking_for_stay" ? "Tell hosts about yourself *" : "Description *"}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                listingPurpose === "looking_for_stay"
                  ? "Introduce yourself, your experience with pets or household tasks, why you're traveling..."
                  : "Describe your home and what you're looking for in a sitter..."
              }
              rows={4}
              required
              className="text-base"
            />
          </div>
        </CardContent>
      </Card>

      {listingPurpose === "find_sitter" && (
        <Card className="shadow-sm border-0 bg-card">
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>Tell us about your property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="farm">Farm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="text-base"
                />
              </div>

              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  step="0.5"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="text-base"
                />
              </div>
            </div>

            <div>
              <Label className="text-base">Amenities</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {amenitiesList.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Badge
                      variant={amenities.includes(amenity) ? "default" : "outline"}
                      onClick={() => toggleAmenity(amenity)}
                    >
                      {amenity.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-0 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {listingPurpose === "looking_for_stay" ? "Preferred Location" : "Property Location"}
          </CardTitle>
          <CardDescription>
            {listingPurpose === "looking_for_stay"
              ? "Where are you looking to stay? Set a search radius to find nearby opportunities."
              : "Where is your property located?"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {listingPurpose === "find_sitter" && (
            <div>
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input
                id="streetAddress"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="123 Main St"
                className="text-base"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary Location *</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="city" className="text-xs text-muted-foreground">
                  City
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin"
                  required
                  className="text-base"
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-xs text-muted-foreground">
                  State
                </Label>
                <Select value={state} onValueChange={setState} required>
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label} ({s.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="postalCode" className="text-xs text-muted-foreground">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="78701"
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {listingPurpose === "looking_for_stay" && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Search Radius</Label>
                    <p className="text-xs text-muted-foreground">
                      How far from {city || "your location"} are you willing to stay?
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                    <Badge variant="secondary" className="h-3 w-3 fill-primary text-primary">
                      {searchRadius} miles
                    </Badge>
                  </div>
                </div>

                <div className="px-2">
                  <Slider
                    value={[searchRadius]}
                    onValueChange={(value) => setSearchRadius(value[0])}
                    min={5}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5 mi</span>
                    <span>25 mi</span>
                    <span>50 mi</span>
                    <span>75 mi</span>
                    <span>100 mi</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Searching within {searchRadius} miles of {city || "your location"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {searchRadius <= 15
                          ? "Great for local opportunities in the immediate area"
                          : searchRadius <= 35
                            ? "Good balance of proximity and variety"
                            : searchRadius <= 60
                              ? "Wide search area - more options available"
                              : "Maximum coverage - includes nearby cities and towns"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label htmlFor="secondary-location" className="text-sm font-medium">
                    Add Secondary Location
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Increase your chances by adding another preferred city
                  </p>
                </div>
                <Button
                  id="secondary-location"
                  variant="outline"
                  size="sm"
                  onClick={() => setHasSecondaryLocation(!hasSecondaryLocation)}
                >
                  {hasSecondaryLocation ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>

              {hasSecondaryLocation && (
                <div className="grid gap-4 sm:grid-cols-2 animate-fade-in">
                  <div>
                    <Label htmlFor="secondaryCity" className="text-xs text-muted-foreground">
                      Secondary City
                    </Label>
                    <Input
                      id="secondaryCity"
                      value={secondaryCity}
                      onChange={(e) => setSecondaryCity(e.target.value)}
                      placeholder="Denver"
                      className="text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="secondaryState" className="text-xs text-muted-foreground">
                      Secondary State
                    </Label>
                    <Select value={secondaryState} onValueChange={setSecondaryState}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label} ({s.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {listingPurpose === "find_sitter" && (
        <Card className="shadow-sm border-0 bg-card">
          <CardHeader>
            <CardTitle>Pets (Optional)</CardTitle>
            <CardDescription>Add information about your pets if you have any</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {pets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pets added yet. Click the button below to add a pet.</p>
            ) : (
              pets.map((pet, index) => (
                <div key={index} className="space-y-4 rounded-xl border p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Pet {index + 1}</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removePet(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={pet.name}
                        onChange={(e) => updatePet(index, "name", e.target.value)}
                        placeholder="Buddy"
                        className="text-base"
                      />
                    </div>
                    <div>
                      <Label>Species *</Label>
                      <Select value={pet.species} onValueChange={(v) => updatePet(index, "species", v)}>
                        <SelectTrigger className="text-base">
                          <SelectValue placeholder="Select species" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dog">Dog</SelectItem>
                          <SelectItem value="cat">Cat</SelectItem>
                          <SelectItem value="bird">Bird</SelectItem>
                          <SelectItem value="fish">Fish</SelectItem>
                          <SelectItem value="rabbit">Rabbit</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Breed</Label>
                      <Input
                        value={pet.breed}
                        onChange={(e) => updatePet(index, "breed", e.target.value)}
                        placeholder="Golden Retriever"
                        className="text-base"
                      />
                    </div>
                    <div>
                      <Label>Age (years)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={pet.age}
                        onChange={(e) => updatePet(index, "age", e.target.value)}
                        className="text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Temperament</Label>
                    <Input
                      value={pet.temperament}
                      onChange={(e) => updatePet(index, "temperament", e.target.value)}
                      placeholder="Friendly, energetic, loves walks"
                      className="text-base"
                    />
                  </div>

                  <div>
                    <Label>Care Instructions</Label>
                    <Textarea
                      value={pet.care_instructions}
                      onChange={(e) => updatePet(index, "care_instructions", e.target.value)}
                      placeholder="Feeding schedule, medications, special needs..."
                      rows={3}
                      className="text-base"
                    />
                  </div>
                </div>
              ))
            )}

            <Button type="button" variant="outline" onClick={addPet} className="w-full gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              Add Pet
            </Button>
          </CardContent>
        </Card>
      )}

      {listingPurpose === "find_sitter" && (
        <Card className="shadow-sm border-0 bg-card">
          <CardHeader>
            <CardTitle>Tasks & Responsibilities</CardTitle>
            <CardDescription>What would you like the sitter to help with?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tasks.map((task, index) => (
              <div key={index} className="space-y-4 rounded-xl border p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Task {index + 1}</h4>
                  {tasks.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Task Type</Label>
                    <Select value={task.task_type} onValueChange={(v) => updateTask(index, "task_type", v)}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pet_care">Pet Care</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="gardening">Gardening</SelectItem>
                        <SelectItem value="mail">Mail Collection</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select value={task.frequency} onValueChange={(v) => updateTask(index, "frequency", v)}>
                      <SelectTrigger className="text-base">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="twice_daily">Twice Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="as_needed">As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={task.description}
                    onChange={(e) => updateTask(index, "description", e.target.value)}
                    placeholder="Describe what needs to be done..."
                    rows={2}
                    className="text-base"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Badge
                    variant={task.is_required ? "default" : "outline"}
                    onClick={() => updateTask(index, "is_required", !task.is_required)}
                  >
                    Required
                  </Badge>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addTask} className="w-full gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </CardContent>
        </Card>
      )}

      {listingPurpose === "looking_for_stay" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Services You Can Offer
            </CardTitle>
            <CardDescription>
              Select the services you're willing to provide in exchange for accommodation. This helps match you with
              hosts who need these specific services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableServices.map((service) => {
                const isChecked = servicesOffered?.includes(service.id) ?? false
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all text-left w-full
                      ${
                        isChecked
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                          mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors
                          ${isChecked ? "bg-primary border-primary" : "border-input"}
                        `}
                      >
                        {isChecked && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3 text-primary-foreground"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{service.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {servicesOffered.length === 0 && (
              <p className="text-sm text-amber-600 mt-4 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                Select at least one service to improve your match chances
              </p>
            )}
            {servicesOffered.length > 0 && (
              <p className="text-sm text-green-600 mt-4 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                {servicesOffered.length} service{servicesOffered.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-0 bg-card">
        <CardHeader>
          <CardTitle>{listingPurpose === "looking_for_stay" ? "Your Photos" : "Property Photos"}</CardTitle>
          <CardDescription>
            {listingPurpose === "looking_for_stay"
              ? "Add photos of yourself to help hosts get to know you"
              : "Add photos of your property to attract potential sitters"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Upload className="h-16 w-16 text-primary" />
          </div>
          <MultipleImageUpload value={listingPhotos} onChange={setListingPhotos} maxImages={10} folder="listings" />
        </CardContent>
      </Card>

      {listingPurpose === "find_sitter" && (
        <Card className="shadow-sm border-0 bg-card">
          <CardHeader>
            <CardTitle>House Rules</CardTitle>
            <CardDescription>Any rules or guidelines for your guests</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
              placeholder="No smoking, quiet hours after 10pm, etc."
              rows={4}
              className="text-base"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 bg-transparent"
          onClick={() => (window.location.href = "/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" className="flex-1 gap-2" size="lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create Listing
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
