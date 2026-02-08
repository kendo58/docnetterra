"use client"

type ConfettiPreset = "match" | "success"

const BRAND_COLORS = ["#ff385c", "#F59E0B", "#10B981", "#60A5FA"]

export async function launchConfetti(preset: ConfettiPreset = "success") {
  const { default: confetti } = await import("canvas-confetti")

  const colors =
    preset === "match"
      ? ["#ff385c", "#F59E0B"]
      : BRAND_COLORS

  const base = {
    colors,
    zIndex: 9999,
    origin: { y: 0.7 },
  }

  confetti({ ...base, particleCount: 36, spread: 70, startVelocity: 35, scalar: 1.0 })
  confetti({ ...base, particleCount: 24, spread: 110, startVelocity: 25, scalar: 0.9 })
  confetti({ ...base, particleCount: 18, spread: 90, startVelocity: 20, scalar: 0.8 })
}
