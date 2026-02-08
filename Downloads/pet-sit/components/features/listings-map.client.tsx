"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import { LatLngBounds } from "leaflet"
import { Button } from "@/components/ui/button"

export type ListingMapItem = {
  id: string
  title?: string
  listing_type?: string
  address?: {
    city?: string
    state?: string
    latitude?: number | string | null
    longitude?: number | string | null
  } | null
}

const DEFAULT_CENTER: [number, number] = [39.5, -98.35]
const BRAND_CORAL = "#ff385c"

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    const bounds = new LatLngBounds(points[0], points[0])
    for (const point of points.slice(1)) bounds.extend(point)
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
  }, [map, points])

  return null
}

export function ListingsMapClient({ listings }: { listings: ListingMapItem[] }) {
  const points = useMemo(() => {
    return listings
      .map((l) => {
        const lat = toNumber(l.address?.latitude ?? null)
        const lng = toNumber(l.address?.longitude ?? null)
        if (lat === null || lng === null) return null
        return { id: l.id, lat, lng, listing: l }
      })
      .filter((p): p is { id: string; lat: number; lng: number; listing: ListingMapItem } => Boolean(p))
  }, [listings])

  const center = points.length > 0 ? ([points[0].lat, points[0].lng] as [number, number]) : DEFAULT_CENTER

  if (points.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border bg-muted/20 p-8 text-center">
        <div>
          <div className="text-lg font-semibold">Map view unavailable</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Listings need address coordinates (latitude/longitude) to show on the map.
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            If you have existing listings without coordinates, run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">npm run backfill:geocodes</code>.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border">
      <MapContainer center={center} zoom={4} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points.map((p) => [p.lat, p.lng])} />
        {points.map(({ id, lat, lng, listing }) => (
          <CircleMarker
            key={id}
            center={[lat, lng]}
            radius={10}
            pathOptions={{ color: BRAND_CORAL, fillColor: BRAND_CORAL, fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <div className="space-y-2">
                <div className="font-semibold leading-tight">{listing.title || "Listing"}</div>
                <div className="text-xs text-muted-foreground">
                  {listing.address?.city}
                  {listing.address?.city && listing.address?.state ? ", " : ""}
                  {listing.address?.state}
                </div>
                <Button asChild size="sm" variant="brand" className="h-8">
                  <Link href={`/listings/${listing.id}`}>View</Link>
                </Button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
