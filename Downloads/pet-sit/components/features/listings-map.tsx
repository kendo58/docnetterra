"use client"

import dynamic from "next/dynamic"
import type { ListingMapItem } from "@/components/features/listings-map.client"

const ListingsMapClient = dynamic(
  () => import("@/components/features/listings-map.client").then((mod) => mod.ListingsMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border bg-muted/20 p-8 text-center">
        <div className="text-sm text-muted-foreground">Loading map…</div>
      </div>
    ),
  },
)

export type { ListingMapItem }

export function ListingsMap({ listings }: { listings: ListingMapItem[] }) {
  return <ListingsMapClient listings={listings} />
}

