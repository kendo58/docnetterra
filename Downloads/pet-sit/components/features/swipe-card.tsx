"use client"

import { useState } from "react"
import Image from "next/image"
import { motion, useMotionValue, useTransform } from "framer-motion"
import type { PanInfo } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BadgeIcon } from "@/components/ui/badge-icon"
import { MapPin, Calendar, Dog, Cat, Info, Wrench, Sparkles } from "lucide-react"
import type { Listing, Pet } from "@/lib/types/database"

interface SwipeCardProps {
  listing: Listing & {
    address?: { city: string; state: string }
    pets?: Pet[]
    tasks?: Array<{ task_type: string; description: string }>
    user?: { full_name?: string; verification_tier?: string }
  }
  onSwipe: (direction: "left" | "right") => void
  onInfoClick: () => void
}

export function SwipeCard({ listing, onSwipe, onInfoClick }: SwipeCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const motionValue = useMotionValue(0)
  const rotateValue = useTransform(motionValue, [-200, 200], [-30, 30])
  const opacityValue = useTransform(motionValue, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])

  const photos = listing.photos && listing.photos.length > 0 ? listing.photos : ["/modern-home.png"]

  const petIcons = {
    dog: Dog,
    cat: Cat,
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(info.offset.x > 0 ? "right" : "left")
    }
  }

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const uniqueTaskTypes = listing.tasks
    ? Array.from(new Set(listing.tasks.map((t) => t.task_type).filter(Boolean)))
    : []
  // </CHANGE>

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x: motionValue, rotate: rotateValue, opacity: opacityValue }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <Card className="h-full overflow-hidden shadow-2xl">
        <div className="relative h-full">
          {/* Image */}
          <div className="relative h-3/5">
            <Image
              src={photos[currentPhotoIndex] || "/placeholder.svg"}
              alt={listing.title}
              fill
              className="object-cover"
              priority
            />

            {/* Verification Badge */}
            {listing.user?.verification_tier === "premium" && (
              <div className="absolute top-4 left-4">
                <BadgeIcon type="premium" />
              </div>
            )}

            {/* Info Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onInfoClick()
              }}
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
            >
              <Info className="h-5 w-5" />
            </button>

            {/* Photo Navigation */}
            {photos.length > 1 && (
              <>
                <div className="absolute top-1/2 left-4 -translate-y-1/2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      prevPhoto()
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                  >
                    ←
                  </button>
                </div>
                <div className="absolute top-1/2 right-4 -translate-y-1/2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      nextPhoto()
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                  >
                    →
                  </button>
                </div>

                {/* Photo Indicators */}
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1">
                  {photos.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentPhotoIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <CardContent className="h-2/5 space-y-3 overflow-y-auto p-6">
            <div>
              <h2 className="text-2xl font-bold leading-tight">{listing.title}</h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {listing.address?.city}, {listing.address?.state}
                </span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{listing.description}</p>

            {/* Pets */}
            {listing.pets && listing.pets.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Pets to care for</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listing.pets.map((pet) => {
                    const Icon = petIcons[pet.species as keyof typeof petIcons] || Dog
                    return (
                      <Badge key={pet.id} variant="secondary" className="gap-1">
                        <Icon className="h-3 w-3" />
                        <span>{pet.name}</span>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tasks/Chores */}
            {uniqueTaskTypes.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Chores needed</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueTaskTypes.map((taskType) => (
                    <Badge key={taskType} variant="outline" className="capitalize">
                      {taskType.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {/* </CHANGE> */}

            {/* Property Details */}
            <div className="flex flex-wrap gap-2">
              {listing.property_type && (
                <Badge variant="outline" className="capitalize">
                  {listing.property_type}
                </Badge>
              )}
              {listing.bedrooms && <Badge variant="outline">{listing.bedrooms} beds</Badge>}
              {listing.bathrooms && <Badge variant="outline">{listing.bathrooms} baths</Badge>}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Available now</span>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  )
}
