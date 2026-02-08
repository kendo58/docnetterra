"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Phone, MapPin } from "lucide-react"

type EmergencyInfoData = {
  emergency_contact_name?: string
  emergency_contact_phone?: string
  vet_name?: string
  vet_phone?: string
  vet_address?: string
  allergies?: string
  special_needs?: string
}

interface EmergencyInfoFormProps {
  petId?: string
  initialData?: EmergencyInfoData
  onSave?: (data: EmergencyInfoData) => void
}

export function EmergencyInfoForm({ initialData, onSave }: EmergencyInfoFormProps) {
  const [formData, setFormData] = useState<EmergencyInfoData>(initialData || {})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave?.(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Emergency Information
        </CardTitle>
        <CardDescription>Critical contact information and medical details for your pet</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Emergency Contact */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Emergency Contact
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Contact Name *</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name || ""}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Phone Number *</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone || ""}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
            </div>
          </div>

          {/* Veterinarian Information */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Veterinarian Information
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vet_name">Vet Clinic Name *</Label>
                <Input
                  id="vet_name"
                  value={formData.vet_name || ""}
                  onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                  placeholder="Happy Paws Veterinary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vet_phone">Vet Phone Number *</Label>
                <Input
                  id="vet_phone"
                  type="tel"
                  value={formData.vet_phone || ""}
                  onChange={(e) => setFormData({ ...formData, vet_phone: e.target.value })}
                  placeholder="(555) 987-6543"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vet_address">Vet Address</Label>
              <Input
                id="vet_address"
                value={formData.vet_address || ""}
                onChange={(e) => setFormData({ ...formData, vet_address: e.target.value })}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h4 className="font-medium">Medical Information</h4>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies || ""}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="List any known allergies (food, medication, environmental)..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="special_needs">Special Needs</Label>
              <Textarea
                id="special_needs"
                value={formData.special_needs || ""}
                onChange={(e) => setFormData({ ...formData, special_needs: e.target.value })}
                placeholder="Any special medical needs, mobility issues, or ongoing treatments..."
                rows={3}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Save Emergency Information
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
