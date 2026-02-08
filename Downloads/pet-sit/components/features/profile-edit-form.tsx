"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ImageUpload } from "@/components/ui/image-upload"

type ProfileEditData = {
  profile_photo_url?: string | null
  full_name?: string | null
  phone?: string | null
  date_of_birth?: string | null
  bio?: string | null
  user_type?: "sitter" | "homeowner" | "both" | null
  pet_experience?: {
    dogs?: boolean
    cats?: boolean
    birds?: boolean
    rabbits?: boolean
    other?: boolean
  } | null
  skills?: {
    gardening?: boolean
    cleaning?: boolean
    maintenance?: boolean
    cooking?: boolean
    laundry?: boolean
    lawn_care?: boolean
  } | null
  experience_years?: number | null
  about_me?: string | null
  why_sitting?: string | null
}

interface ProfileEditFormProps {
  profile: ProfileEditData | null
  userId: string
}

export function ProfileEditForm({ profile, userId }: ProfileEditFormProps) {
  type UserType = "sitter" | "homeowner" | "both"
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [profilePhoto, setProfilePhoto] = useState(profile?.profile_photo_url || "")

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [phone, setPhone] = useState(profile?.phone || "")
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [userType, setUserType] = useState<UserType>(() => {
    if (profile?.user_type === "sitter" || profile?.user_type === "homeowner" || profile?.user_type === "both") {
      return profile.user_type
    }
    return "sitter"
  })

  const [petExperience, setPetExperience] = useState({
    dogs: profile?.pet_experience?.dogs || false,
    cats: profile?.pet_experience?.cats || false,
    birds: profile?.pet_experience?.birds || false,
    rabbits: profile?.pet_experience?.rabbits || false,
    other: profile?.pet_experience?.other || false,
  })

  const [choreSkills, setChoreSkills] = useState({
    gardening: profile?.skills?.gardening || false,
    cleaning: profile?.skills?.cleaning || false,
    maintenance: profile?.skills?.maintenance || false,
    cooking: profile?.skills?.cooking || false,
    laundry: profile?.skills?.laundry || false,
    lawn_care: profile?.skills?.lawn_care || false,
  })

  const [experienceYears, setExperienceYears] = useState(profile?.experience_years?.toString() || "")
  const [aboutMe, setAboutMe] = useState(profile?.about_me || "")
  const [whySitting, setWhySitting] = useState(profile?.why_sitting || "")

  const togglePetExperience = (pet: string) => {
    setPetExperience((prev) => ({ ...prev, [pet]: !prev[pet as keyof typeof prev] }))
  }

  const toggleChoreSkill = (skill: string) => {
    setChoreSkills((prev) => ({ ...prev, [skill]: !prev[skill as keyof typeof prev] }))
  }

  const handleUserTypeChange = (value: string) => {
    if (value === "sitter" || value === "homeowner" || value === "both") {
      setUserType(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          profile_photo_url: profilePhoto || null,
          full_name: fullName,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          bio: bio || null,
          user_type: userType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (updateError) throw updateError

      const isSitter = userType === "sitter" || userType === "both"

      if (isSitter) {
        const { data: existingSitterProfile } = await supabase
          .from("sitter_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle()

        const sitterData = {
          user_id: userId,
          experience_years: experienceYears ? Number.parseInt(experienceYears) : null,
          pet_experience: petExperience,
          skills: choreSkills,
          about_me: aboutMe || null,
          why_sitting: whySitting || null,
          updated_at: new Date().toISOString(),
        }

        if (existingSitterProfile) {
          const { error: sitterError } = await supabase.from("sitter_profiles").update(sitterData).eq("user_id", userId)

          if (sitterError) throw sitterError
        } else {
          const { error: sitterError } = await supabase
            .from("sitter_profiles")
            .insert({ ...sitterData, is_active: true })

          if (sitterError) throw sitterError
        }
      }

      router.push("/profile")
    } catch (err: unknown) {
      console.error("[sitswap] Error updating profile:", err)
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" />
  }

  const isSitter = userType === "sitter" || userType === "both"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload value={profilePhoto} onChange={setProfilePhoto} label="Upload Profile Photo" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="userType">I am a *</Label>
            <Select value={userType} onValueChange={handleUserTypeChange}>
              <SelectTrigger id="userType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sitter">Sitter (looking for places to stay)</SelectItem>
                <SelectItem value="homeowner">Homeowner (need sitters for my pets/home)</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Me</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about yourself, your experience with pets, and what you're looking for..."
            rows={5}
          />
        </CardContent>
      </Card>

      {isSitter && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sitter Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="3"
                />
              </div>

              <div>
                <Label htmlFor="aboutMe">About My Sitting Experience</Label>
                <Textarea
                  id="aboutMe"
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  placeholder="Tell homeowners about your experience with pets and home care..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="whySitting">Why I Want to House Sit</Label>
                <Textarea
                  id="whySitting"
                  value={whySitting}
                  onChange={(e) => setWhySitting(e.target.value)}
                  placeholder="Share your motivations for house/pet sitting..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pet Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Select the types of pets you have experience with:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.keys(petExperience).map((pet) => (
                    <div key={pet} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pet-${pet}`}
                        checked={petExperience[pet as keyof typeof petExperience]}
                        onCheckedChange={() => togglePetExperience(pet)}
                      />
                      <Label htmlFor={`pet-${pet}`} className="cursor-pointer font-normal capitalize">
                        {pet}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chore Skills & Abilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select the types of chores and tasks you're comfortable doing:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.keys(choreSkills).map((skill) => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={`skill-${skill}`}
                        checked={choreSkills[skill as keyof typeof choreSkills]}
                        onCheckedChange={() => toggleChoreSkill(skill)}
                      />
                      <Label htmlFor={`skill-${skill}`} className="cursor-pointer font-normal capitalize">
                        {skill.replace("_", " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} className="bg-transparent">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
