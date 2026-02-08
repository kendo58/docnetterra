import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin"

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.suspended"
  | "user.reactivated"
  | "user.deleted"
  | "user.login"
  | "user.logout"
  | "user.verification_updated"
  | "user.admin_status_changed"
  | "listing.created"
  | "listing.updated"
  | "listing.deleted"
  | "listing.activated"
  | "listing.deactivated"
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.completed"
  | "message.sent"
  | "message.contact_blocked"
  | "match.created"
  | "match.swiped"
  | "report.created"
  | "report.resolved"
  | "report.dismissed"
  | "admin.login"
  | "admin.action"
  | "admin.granted"
  | "admin.revoked"
  | "payment.initiated"
  | "payment.completed"
  | "payment.failed"

export type AuditCategory = "auth" | "listing" | "booking" | "message" | "matching" | "admin" | "payment" | "report"

export type AuditSeverity = "info" | "warning" | "critical"

export interface AuditLogEntry {
  actorId?: string
  actorEmail?: string
  actorType?: "user" | "admin" | "system"
  action: AuditAction
  actionCategory: AuditCategory
  resourceType?: string
  resourceId?: string
  description: string
  metadata?: Record<string, unknown>
  severity?: AuditSeverity
  ipAddress?: string
  userAgent?: string
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<string | null> {
  try {
    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from("audit_logs")
      .insert({
        actor_id: entry.actorId || null,
        actor_email: entry.actorEmail || null,
        actor_type: entry.actorType || "system",
        action: entry.action,
        action_category: entry.actionCategory,
        resource_type: entry.resourceType || null,
        resource_id: entry.resourceId || null,
        description: entry.description,
        metadata: entry.metadata || {},
        severity: entry.severity || "info",
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[Audit] Failed to log event:", error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error("[Audit] Error logging event:", error)
    return null
  }
}

export async function getAuditLogs(options: {
  page?: number
  limit?: number
  category?: AuditCategory
  severity?: AuditSeverity
  actorId?: string
  resourceType?: string
  resourceId?: string
  startDate?: string
  endDate?: string
  search?: string
}) {
  await requireAdmin()
  const supabase = await createServerClient()

  const {
    page = 1,
    limit = 50,
    category,
    severity,
    actorId,
    resourceType,
    resourceId,
    startDate,
    endDate,
    search,
  } = options

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (category) {
    query = query.eq("action_category", category)
  }

  if (severity) {
    query = query.eq("severity", severity)
  }

  if (actorId) {
    query = query.eq("actor_id", actorId)
  }

  if (resourceType) {
    query = query.eq("resource_type", resourceType)
  }

  if (resourceId) {
    query = query.eq("resource_id", resourceId)
  }

  if (startDate) {
    query = query.gte("created_at", startDate)
  }

  if (endDate) {
    query = query.lte("created_at", endDate)
  }

  if (search) {
    query = query.or(`description.ilike.%${search}%,actor_email.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error("[Audit] Failed to fetch logs:", error)
    throw error
  }

  return {
    logs: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

export async function getAuditStats() {
  await requireAdmin()
  const supabase = await createServerClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalLogs },
    { count: todayLogs },
    { count: weekLogs },
    { count: criticalLogs },
    { count: warningLogs },
  ] = await Promise.all([
    supabase.from("audit_logs").select("*", { count: "exact", head: true }),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).eq("severity", "critical"),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).eq("severity", "warning"),
  ])

  return {
    totalLogs: totalLogs || 0,
    todayLogs: todayLogs || 0,
    weekLogs: weekLogs || 0,
    criticalLogs: criticalLogs || 0,
    warningLogs: warningLogs || 0,
  }
}
