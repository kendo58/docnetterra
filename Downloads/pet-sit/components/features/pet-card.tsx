import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dog, Cat, Bird } from "lucide-react"
import type { Pet } from "@/lib/types/database"

interface PetCardProps {
  pet: Pet
}

export function PetCard({ pet }: PetCardProps) {
  const petIcons = {
    dog: Dog,
    cat: Cat,
    bird: Bird,
  }

  const Icon = petIcons[pet.species as keyof typeof petIcons] || Dog
  const photo = pet.photos?.[0] || `/placeholder.svg?height=200&width=200&query=${pet.species}+pet`

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image src={photo || "/placeholder.svg"} alt={pet.name} fill className="object-cover" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold">{pet.name}</h4>
            </div>

            <div className="flex flex-wrap gap-2">
              {pet.breed && <Badge variant="secondary">{pet.breed}</Badge>}
              {pet.age && <Badge variant="outline">{pet.age} years old</Badge>}
            </div>

            {pet.temperament && <p className="text-sm text-muted-foreground line-clamp-2">{pet.temperament}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
