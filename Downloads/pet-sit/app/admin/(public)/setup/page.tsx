"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle2, AlertCircle, Loader2, Database, FileCode } from "lucide-react"
import { initializeDatabase, createFirstAdmin } from "@/lib/admin/actions"
import { useRouter } from "next/navigation"

type SetupStep = "database" | "admin" | "complete"

export default function AdminSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<SetupStep>("database")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [dbChecking, setDbChecking] = useState(false)
  const [dbProgress, setDbProgress] = useState<string[]>([])
  const [scriptsNeeded, setScriptsNeeded] = useState<string[]>([])

  const handleDatabaseCheck = async () => {
    setError("")
    setDbChecking(true)
    setDbProgress([])
    setScriptsNeeded([])

    try {
      const result = await initializeDatabase()

      setDbProgress(result.steps)

      if (result.success && !result.needsSetup) {
        // Database is ready, proceed to admin creation
        setTimeout(() => {
          setStep("admin")
        }, 1500)
      } else if (result.needsSetup) {
        let scripts = result.scripts || []

        // If profiles table exists but is_admin column is missing, add migration script
        const missingColumn = result.steps?.some((s) => s.includes("is_admin column not found"))
        if (missingColumn && !scripts.includes("scripts/007_add_is_admin_column.sql")) {
          scripts = ["scripts/007_add_is_admin_column.sql", ...scripts]
        }

        setScriptsNeeded(scripts)
        setError(result.error || "Database setup required")
      } else {
        setError(result.error || "Database check failed")
      }
    } catch {
      setError("An unexpected error occurred during database check")
    } finally {
      setDbChecking(false)
    }
  }

  const handleAdminCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const result = await createFirstAdmin(email, password)

      if (result.success) {
        setStep("complete")
      } else {
        setError(result.error || "Failed to create admin account")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold text-white">Setup Complete!</h3>
              <p className="text-slate-400">Your admin account has been created successfully.</p>
              <Button
                onClick={() => router.push("/admin/login")}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-4"
              >
                Go to Admin Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Create Admin Account</CardTitle>
            <CardDescription className="text-slate-400">Set up your administrator credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminCreation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sitswap.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-200">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Admin Account...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
              <Database className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">SitSwap Setup</CardTitle>
          <CardDescription className="text-slate-400">
            {scriptsNeeded.length > 0 ? "Run the required database scripts" : "Check your database status"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scriptsNeeded.length > 0 ? (
            <>
              <Alert className="mb-6 bg-orange-950/20 border-orange-900 text-orange-200">
                <FileCode className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <p className="font-semibold mb-2">Database setup required</p>
                  <p className="text-xs">
                    Please run these SQL scripts from the scripts folder in your Supabase SQL Editor.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2 mb-6">
                <p className="text-sm font-medium text-slate-300">Scripts to run:</p>
                <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                  {scriptsNeeded.map((script, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm font-mono text-slate-300">
                      <FileCode className="w-4 h-4 text-orange-500" />
                      {script}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleDatabaseCheck}
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                Check Again
              </Button>
            </>
          ) : (
            <>
              <Alert className="mb-6 bg-blue-950/20 border-blue-900 text-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This will check if your database is properly set up with all required tables and security policies.
                </AlertDescription>
              </Alert>

              {dbProgress.length > 0 && (
                <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="space-y-1 text-sm font-mono">
                    {dbProgress.map((msg, idx) => (
                      <div key={idx} className="text-slate-300">
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleDatabaseCheck}
                disabled={dbChecking}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {dbChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Database...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Check Database Status
                  </>
                )}
              </Button>
            </>
          )}

          <div className="mt-6 text-center text-sm text-slate-400">
            <p>Need help? Check the SETUP.md guide in your project.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
