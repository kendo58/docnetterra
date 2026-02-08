import { beforeEach, describe, expect, it, vi } from "vitest"

const createServerClientMock = vi.fn()
const createAdminClientMock = vi.fn()
const requireAdminMock = vi.fn()
const requireSuperAdminMock = vi.fn()
const revalidatePathMock = vi.fn()
const logAuditEventMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock("@/lib/admin", () => ({
  requireAdmin: requireAdminMock,
  requireSuperAdmin: requireSuperAdminMock,
}))

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock("@/lib/audit", () => ({
  logAuditEvent: logAuditEventMock,
}))

type AdminRow = {
  id: string
  role: "admin" | "super_admin" | "moderator"
  permissions?: Record<string, unknown>
}

type ProfileRow = {
  id: string
  is_admin?: boolean
}

type AuthUser = {
  id: string
  email: string
}

type AdminState = {
  profiles: Map<string, ProfileRow>
  adminUsers: Map<string, AdminRow>
  authUsers: AuthUser[]
}

function createState(overrides: Partial<AdminState> = {}): AdminState {
  return {
    profiles: new Map<string, ProfileRow>(),
    adminUsers: new Map<string, AdminRow>(),
    authUsers: [],
    ...overrides,
  }
}

function createAdminSupabaseMock(state: AdminState) {
  return {
    auth: {
      admin: {
        listUsers: vi.fn(async ({ page, perPage }: { page: number; perPage: number }) => {
          const start = (page - 1) * perPage
          const end = start + perPage
          return {
            data: { users: state.authUsers.slice(start, end) },
            error: null,
          }
        }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn((_columns: string) => ({
            eq: vi.fn((_column: string, profileId: string) => ({
              maybeSingle: vi.fn(async () => ({
                data: state.profiles.get(profileId) ?? null,
                error: null,
              })),
            })),
          })),
          update: vi.fn((patch: Partial<ProfileRow>) => ({
            eq: vi.fn(async (_column: string, profileId: string) => {
              const row = state.profiles.get(profileId)
              if (row) {
                state.profiles.set(profileId, { ...row, ...patch })
              }
              return { error: null }
            }),
          })),
        }
      }

      if (table === "admin_users") {
        return {
          select: vi.fn((_columns: string, options?: { count?: "exact"; head?: boolean }) => ({
            eq: vi.fn((column: string, value: string) => {
              if (options?.count === "exact" && options.head) {
                const count = [...state.adminUsers.values()].filter((admin) => admin[column as keyof AdminRow] === value).length
                return Promise.resolve({ count, error: null })
              }

              return {
                maybeSingle: vi.fn(async () => ({
                  data: state.adminUsers.get(value) ?? null,
                  error: null,
                })),
              }
            }),
          })),
          upsert: vi.fn(async (row: AdminRow) => {
            state.adminUsers.set(row.id, row)
            return { error: null }
          }),
          delete: vi.fn(() => ({
            eq: vi.fn(async (_column: string, adminId: string) => {
              state.adminUsers.delete(adminId)
              return { error: null }
            }),
          })),
          update: vi.fn((patch: Partial<AdminRow>) => ({
            eq: vi.fn(async (_column: string, adminId: string) => {
              const existing = state.adminUsers.get(adminId)
              if (existing) {
                state.adminUsers.set(adminId, { ...existing, ...patch })
              }
              return { error: null }
            }),
          })),
        }
      }

      return {
        select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      }
    }),
  }
}

function createServerClientWithActor() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "actor_admin", email: "actor@example.com" } },
      })),
    },
  }
}

describe("admin role management actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue(undefined)
    requireSuperAdminMock.mockResolvedValue(undefined)
    createServerClientMock.mockResolvedValue(createServerClientWithActor())
  })

  it("grants admin access by email and upserts role + permissions", async () => {
    const state = createState({
      profiles: new Map([["target_user", { id: "target_user", is_admin: false }]]),
      authUsers: [{ id: "target_user", email: "target@example.com" }],
    })
    createAdminClientMock.mockReturnValue(createAdminSupabaseMock(state))

    const { grantAdminAccessByEmail } = await import("@/app/actions/admin")
    const result = await grantAdminAccessByEmail("TARGET@EXAMPLE.COM", "admin")

    expect(result).toEqual({ success: true })
    expect(requireSuperAdminMock).toHaveBeenCalled()
    expect(state.profiles.get("target_user")?.is_admin).toBe(true)
    expect(state.adminUsers.get("target_user")?.role).toBe("admin")
    expect(logAuditEventMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/admins")
  })

  it("blocks revoke when the target is the last remaining super admin", async () => {
    const state = createState({
      profiles: new Map([["super_1", { id: "super_1", is_admin: true }]]),
      adminUsers: new Map([
        [
          "super_1",
          {
            id: "super_1",
            role: "super_admin",
          },
        ],
      ]),
    })
    createAdminClientMock.mockReturnValue(createAdminSupabaseMock(state))

    const { revokeAdminAccess } = await import("@/app/actions/admin")
    await expect(revokeAdminAccess("super_1")).rejects.toThrow("Cannot revoke access from the last remaining super admin.")

    expect(state.adminUsers.has("super_1")).toBe(true)
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it("revokes admin access when more than one super admin exists", async () => {
    const state = createState({
      profiles: new Map([
        ["super_1", { id: "super_1", is_admin: true }],
        ["super_2", { id: "super_2", is_admin: true }],
      ]),
      adminUsers: new Map([
        ["super_1", { id: "super_1", role: "super_admin" }],
        ["super_2", { id: "super_2", role: "super_admin" }],
      ]),
    })
    createAdminClientMock.mockReturnValue(createAdminSupabaseMock(state))

    const { revokeAdminAccess } = await import("@/app/actions/admin")
    const result = await revokeAdminAccess("super_1")

    expect(result).toEqual({ success: true })
    expect(state.adminUsers.has("super_1")).toBe(false)
    expect(state.profiles.get("super_1")?.is_admin).toBe(false)
    expect(logAuditEventMock).toHaveBeenCalledTimes(1)
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/admins")
  })

  it("blocks downgrading the last remaining super admin", async () => {
    const state = createState({
      adminUsers: new Map([
        ["super_1", { id: "super_1", role: "super_admin" }],
      ]),
    })
    createAdminClientMock.mockReturnValue(createAdminSupabaseMock(state))

    const { updateAdminRole } = await import("@/app/actions/admin")
    await expect(updateAdminRole("super_1", "admin")).rejects.toThrow("Cannot downgrade the last remaining super admin.")

    expect(state.adminUsers.get("super_1")?.role).toBe("super_admin")
  })
})
