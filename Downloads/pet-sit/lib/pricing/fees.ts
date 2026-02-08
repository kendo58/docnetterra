export const SERVICE_FEE_PER_NIGHT = 50
export const CLEANING_FEE = 200

export function calculateNights(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays)
}

export function calculateBookingFees(options: {
  startDate: string
  endDate: string
  serviceFeePerNight?: number
  cleaningFee?: number
  insuranceCost?: number
}) {
  const serviceFeePerNight = options.serviceFeePerNight ?? SERVICE_FEE_PER_NIGHT
  const cleaningFee = options.cleaningFee ?? CLEANING_FEE
  const insuranceCost = options.insuranceCost ?? 0
  const nights = calculateNights(options.startDate, options.endDate)
  const serviceFeeTotal = nights * serviceFeePerNight
  const totalFee = serviceFeeTotal + cleaningFee + insuranceCost

  return {
    nights,
    serviceFeePerNight,
    cleaningFee,
    insuranceCost,
    serviceFeeTotal,
    totalFee,
  }
}

export function clampPoints(options: { requested: number; balance: number; nights: number }) {
  const requested = Number.isFinite(options.requested) ? Math.max(0, Math.floor(options.requested)) : 0
  const maxPoints = Math.min(options.balance, options.nights)
  return Math.min(requested, maxPoints)
}
