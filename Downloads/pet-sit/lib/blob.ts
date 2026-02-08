// Storage utilities for image uploads

export async function uploadImage(file: File, folder = "uploads"): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    let message = "Failed to upload image"
    try {
      const data = await response.json()
      if (data?.error) {
        message = data.error
      }
    } catch {
      // Ignore JSON parsing errors.
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.url
}

export async function uploadMultipleImages(files: File[], folder = "uploads"): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImage(file, folder))
  return Promise.all(uploadPromises)
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "File must be JPEG, PNG, or WebP" }
  }

  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 5MB" }
  }

  return { valid: true }
}

export function getImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}
