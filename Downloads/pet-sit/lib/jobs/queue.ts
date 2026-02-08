import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export type JobPayload = Record<string, unknown>

export type EnqueueJobOptions = {
  runAt?: Date
  maxAttempts?: number
}

export async function enqueueJob(task: string, payload: JobPayload, options?: EnqueueJobOptions) {
  const supabase = createAdminClient()
  const runAt = options?.runAt ? options.runAt.toISOString() : new Date().toISOString()
  const maxAttempts = options?.maxAttempts ?? 5

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      task,
      payload,
      run_at: runAt,
      max_attempts: maxAttempts,
      status: "queued",
    })
    .select("id")
    .single()

  if (error) throw error
  return data.id as string
}

export async function enqueueEmailNotification(payload: {
  to: string
  type: string
  data: Record<string, unknown>
  subject?: string
  html?: string
  previewText?: string
}) {
  return enqueueJob("email.notification", payload, { maxAttempts: 3 })
}
