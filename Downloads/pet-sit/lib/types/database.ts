// Database types for TypeScript

export interface Profile {
  id: string
  email: string
  full_name?: string
  phone?: string
  date_of_birth?: string
  profile_photo_url?: string
  bio?: string
  user_type: "homeowner" | "sitter" | "both"
  verification_status: string
  verification_tier: string
  stripe_customer_id?: string
  stripe_connect_id?: string
  created_at: string
  updated_at: string
  last_active_at?: string
  is_active: boolean
}

export interface Address {
  id: string
  user_id: string
  street_address: string
  apartment?: string
  city: string
  state: string
  postal_code: string
  country: string
  latitude?: number
  longitude?: number
  is_primary: boolean
  created_at: string
}

export interface Listing {
  id: string
  user_id: string
  address_id?: string
  listing_type?: string
  title: string
  description: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  square_feet?: number
  amenities?: string[]
  house_rules?: string
  photos?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Pet {
  id: string
  listing_id: string
  name: string
  species?: string
  breed?: string
  age?: number
  weight?: number
  temperament?: string
  medical_conditions?: string
  dietary_requirements?: string
  care_instructions?: string
  photos?: string[]
  is_active: boolean
  created_at: string
}

export interface Task {
  id: string
  listing_id: string
  task_type?: string
  description: string
  frequency?: string
  estimated_hours_per_week?: number
  is_required: boolean
  created_at: string
}

export interface Availability {
  id: string
  listing_id: string
  start_date: string
  end_date: string
  is_booked: boolean
  created_at: string
}

export interface SitterProfile {
  id: string
  user_id: string
  experience_years?: number
  pet_experience?: Record<string, boolean>
  skills?: string[]
  languages?: string[]
  smoking?: boolean
  about_me?: string
  why_sitting?: string
  photos?: string[]
  certifications?: Array<{ type: string; issuer: string; expires?: string }>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  listing_id: string
  sitter_id: string
  homeowner_swipe?: "like" | "pass" | "super_like"
  sitter_swipe?: "like" | "pass" | "super_like"
  is_match: boolean
  matched_at?: string
  created_at: string
}

export interface Booking {
  id: string
  listing_id: string
  sitter_id: string
  requested_by?: string
  match_id?: string
  start_date: string
  end_date: string
  status: "pending" | "confirmed" | "accepted" | "declined" | "cancelled" | "completed" | "refunded"
  cancellation_reason?: string
  cancelled_by?: string
  cancelled_at?: string
  insurance_selected: boolean
  insurance_plan_type?: string
  insurance_cost?: number
  service_fee_per_night?: number
  cleaning_fee?: number
  service_fee_total?: number
  total_fee?: number
  points_applied?: number
  cash_due?: number
  payment_status?: "unpaid" | "paid" | "refunded"
  paid_at?: string
  payment_method?: string
  refunded_at?: string
  points_awarded?: number
  stripe_payment_intent_id?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  read_at?: string
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  booking_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  accuracy_rating?: number
  communication_rating?: number
  cleanliness_rating?: number
  responsibility_rating?: number
  review_text?: string
  would_recommend?: boolean
  response_text?: string
  is_flagged: boolean
  flagged_reason?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface SafetyReport {
  id: string
  reporter_id: string
  reported_user_id: string
  report_type: string
  description: string
  evidence?: string[]
  status: "pending" | "investigating" | "resolved" | "dismissed"
  assigned_to?: string
  resolution_notes?: string
  resolved_at?: string
  created_at: string
}
