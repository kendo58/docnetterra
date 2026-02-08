"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { validateImageFile, getImagePreviewUrl, uploadImage } from "@/lib/blob"
import { cn } from "@/lib/utils"

interface MultipleImageUploadProps {
  value?: string[]
  images?: string[]
  onChange?: (urls: string[]) => void
  onImagesChange?: (urls: string[]) => void
  className?: string
  maxImages?: number
  label?: string
  folder?: string
}

export function MultipleImageUpload({
  value,
  images,
  onChange,
  onImagesChange,
  className,
  maxImages = 5,
  label = "Upload Images",
  folder = "listings",
}: MultipleImageUploadProps) {
  const currentImages = value ?? images ?? []
  const handleChange = onChange ?? onImagesChange

  const [isUploading, setIsUploading] = useState(false)
  const [previews, setPreviews] = useState<Array<{ url: string; isUploaded: boolean }>>(
    currentImages.map((url) => ({ url, isUploaded: true })),
  )
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!handleChange) {
      console.error("[sitswap] Upload error: onChange is not a function")
      setError("Upload handler not configured")
      return
    }

    setError(null)

    // Check max images limit
    if (previews.length + files.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error || "Invalid file")
        return
      }
    }

    // Add previews immediately
    const newPreviews = files.map((file) => ({
      url: getImagePreviewUrl(file),
      isUploaded: false,
    }))
    setPreviews((prev) => [...prev, ...newPreviews])

    // Upload files
    setIsUploading(true)
    try {
      const uploadedUrls: string[] = []

      for (const file of files) {
        const url = await uploadImage(file, folder)
        uploadedUrls.push(url)
      }

      // Update with uploaded URLs
      const allUrls = [...currentImages, ...uploadedUrls]
      handleChange(allUrls)

      setPreviews((prev) =>
        prev.map((p, i) =>
          i >= currentImages.length ? { url: uploadedUrls[i - currentImages.length], isUploaded: true } : p,
        ),
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload images"
      console.error("[sitswap] Upload error:", message)
      setError(message)
      // Remove failed uploads from preview
      setPreviews((prev) => prev.filter((p) => p.isUploaded))
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const handleRemove = (index: number) => {
    if (!handleChange) return
    const newUrls = currentImages.filter((_, i) => i !== index)
    handleChange(newUrls)
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className={cn("space-y-4", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading || previews.length >= maxImages}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {previews.map((preview, index) => (
          <div key={index} className="relative aspect-square overflow-hidden rounded-lg border-2 border-border">
            <Image
              src={preview.url || "/placeholder.svg"}
              alt={`Preview ${index + 1}`}
              fill
              unoptimized
              className="object-cover"
            />
            {!preview.isUploaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6"
              onClick={() => handleRemove(index)}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {previews.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isUploading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <p className="mt-1 text-xs font-medium">{label}</p>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {previews.length} / {maxImages} images • PNG, JPG, WebP (max 5MB each)
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
