"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { calculateSuggestedPricing, formatPrice } from "@/lib/utils/pricing"
import { TrendingUp, TrendingDown, DollarSign, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PricingCalculatorProps {
  location: { city: string; state: string }
  experience_years?: number
  averageRating?: number
  numberOfReviews?: number
  verificationTier?: string
  onPriceUpdate?: (prices: { hourly: number; daily: number; weekly: number }) => void
}

export function PricingCalculator({
  location,
  experience_years = 0,
  averageRating = 0,
  numberOfReviews = 0,
  verificationTier = "basic",
  onPriceUpdate,
}: PricingCalculatorProps) {
  const suggestedPrices = calculateSuggestedPricing({
    location,
    experience_years,
    averageRating,
    numberOfReviews,
    verificationTier,
    taskComplexity: "medium",
  })

  const [hourlyRate, setHourlyRate] = useState(suggestedPrices.hourly.suggested)
  const [dailyRate, setDailyRate] = useState(suggestedPrices.daily.suggested)
  const [weeklyRate, setWeeklyRate] = useState(suggestedPrices.weekly.suggested)

  useEffect(() => {
    if (onPriceUpdate) {
      onPriceUpdate({ hourly: hourlyRate, daily: dailyRate, weekly: weeklyRate })
    }
  }, [hourlyRate, dailyRate, weeklyRate, onPriceUpdate])

  const getComparisonIndicator = (value: number, suggested: number) => {
    const diff = ((value - suggested) / suggested) * 100
    if (Math.abs(diff) < 5) return null

    return diff > 0 ? (
      <div className="flex items-center gap-1 text-xs text-orange-600">
        <TrendingUp className="h-3 w-3" />
        <span>{Math.abs(diff).toFixed(0)}% above market</span>
      </div>
    ) : (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <TrendingDown className="h-3 w-3" />
        <span>{Math.abs(diff).toFixed(0)}% below market</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Set Your Rates
        </CardTitle>
        <CardDescription>We suggest competitive rates based on your profile and location</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hourly Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="hourly-rate" className="flex items-center gap-2">
              Hourly Rate
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      Suggested: {formatPrice(suggestedPrices.hourly.suggested)}/hour
                      <br />
                      Market range: {formatPrice(suggestedPrices.hourly.min)} -{" "}
                      {formatPrice(suggestedPrices.hourly.max)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="text-right">
              <Input
                id="hourly-rate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-24 text-right"
                min={suggestedPrices.hourly.min}
                max={suggestedPrices.hourly.max * 2}
              />
              {getComparisonIndicator(hourlyRate, suggestedPrices.hourly.suggested)}
            </div>
          </div>
          <Slider
            value={[hourlyRate]}
            onValueChange={([value]) => setHourlyRate(value)}
            min={suggestedPrices.hourly.min}
            max={suggestedPrices.hourly.max * 2}
            step={1}
            className="w-full"
          />
        </div>

        {/* Daily Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="daily-rate" className="flex items-center gap-2">
              Daily Rate
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      Suggested: {formatPrice(suggestedPrices.daily.suggested)}/day
                      <br />
                      Market range: {formatPrice(suggestedPrices.daily.min)} - {formatPrice(suggestedPrices.daily.max)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="text-right">
              <Input
                id="daily-rate"
                type="number"
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value))}
                className="w-24 text-right"
                min={suggestedPrices.daily.min}
                max={suggestedPrices.daily.max * 2}
              />
              {getComparisonIndicator(dailyRate, suggestedPrices.daily.suggested)}
            </div>
          </div>
          <Slider
            value={[dailyRate]}
            onValueChange={([value]) => setDailyRate(value)}
            min={suggestedPrices.daily.min}
            max={suggestedPrices.daily.max * 2}
            step={5}
            className="w-full"
          />
        </div>

        {/* Weekly Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="weekly-rate" className="flex items-center gap-2">
              Weekly Rate
              <Badge variant="secondary" className="ml-2">
                Save {Math.round((1 - weeklyRate / (dailyRate * 7)) * 100)}%
              </Badge>
            </Label>
            <div className="text-right">
              <Input
                id="weekly-rate"
                type="number"
                value={weeklyRate}
                onChange={(e) => setWeeklyRate(Number(e.target.value))}
                className="w-24 text-right"
                min={suggestedPrices.weekly.min}
                max={suggestedPrices.weekly.max * 2}
              />
              {getComparisonIndicator(weeklyRate, suggestedPrices.weekly.suggested)}
            </div>
          </div>
          <Slider
            value={[weeklyRate]}
            onValueChange={([value]) => setWeeklyRate(value)}
            min={suggestedPrices.weekly.min}
            max={suggestedPrices.weekly.max * 2}
            step={10}
            className="w-full"
          />
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium">Pricing Factors:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              • Location: {location.city} (+{Math.round((suggestedPrices.factors.locationMultiplier - 1) * 100)}%)
            </li>
            <li>
              • Experience: {experience_years} years (+
              {Math.round(suggestedPrices.factors.experienceBonus * 100)}%)
            </li>
            {verificationTier !== "basic" && <li>• Verification tier: {verificationTier}</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
