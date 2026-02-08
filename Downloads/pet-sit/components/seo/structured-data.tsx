import Script from "next/script"

interface ListingStructuredDataProps {
  listing: {
    id: string
    title: string
    description: string
    photos?: string[]
    address?: {
      city: string
      state: string
      country: string
    }
    bedrooms?: number
    bathrooms?: number
  }
}

export function ListingStructuredData({ listing }: ListingStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: listing.title,
    description: listing.description,
    image: listing.photos?.[0] || "/placeholder.svg?height=400&width=600",
    address: listing.address
      ? {
          "@type": "PostalAddress",
          addressLocality: listing.address.city,
          addressRegion: listing.address.state,
          addressCountry: listing.address.country,
        }
      : undefined,
    numberOfRooms: listing.bedrooms,
    numberOfBathroomsTotal: listing.bathrooms,
    url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/listings/${listing.id}`,
  }

  return (
    <Script
      id={`listing-${listing.id}-structured-data`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

interface ProfileStructuredDataProps {
  profile: {
    id: string
    full_name: string
    bio?: string
    profile_photo_url?: string
  }
}

export function ProfileStructuredData({ profile }: ProfileStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.full_name,
    description: profile.bio,
    image: profile.profile_photo_url,
    url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/users/${profile.id}`,
  }

  return (
    <Script
      id={`profile-${profile.id}-structured-data`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function OrganizationStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SitSwap",
    description:
      "Find trusted sitters and enjoy free stays in exchange for pet care and agreed-upon home chores.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://sitswap.app",
    logo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/icon.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@sitswap.app",
    },
  }

  return (
    <Script
      id="organization-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function WebsiteStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SitSwap",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://sitswap.app",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || ""}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <Script
      id="website-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
