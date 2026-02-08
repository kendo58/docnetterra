// Re-export client and server utilities from their respective files
// This file provides a unified import path for Supabase utilities

export { createClient, createBrowserClient } from "./supabase/client"
export { createClient as createServerClient } from "./supabase/server"
