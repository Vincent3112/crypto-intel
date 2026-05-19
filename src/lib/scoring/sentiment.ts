import type { Token } from '@prisma/client'

export function computeSentimentScore(token: Pick<Token, 'priceChange24h' | 'priceChange7d' | 'volume24h' | 'marketCap' | 'athChangePercent' | 'rank'>): number {
  // 1. Short-term momentum (25 pts)
  const p24 = token.priceChange24h
  let short: number
  if (p24 > 0 && p24 <= 3) short = 25
  else if (p24 > 3 && p24 <= 8) short = 18
  else if (p24 > -3 && p24 <= 0) short = 20
  else if (p24 > 8 && p24 <= 15) short = 10
  else if (p24 > -8 && p24 <= -3) short = 10
  else short = 0

  // 2. Weekly momentum (25 pts)
  const p7 = token.priceChange7d
  let weekly: number
  if (p7 === null) {
    weekly = 15
  } else if (p7 > 0 && p7 <= 10) {
    weekly = 25
  } else if (p7 > 10 && p7 <= 25) {
    weekly = 18
  } else if (p7 > -10 && p7 <= 0) {
    weekly = 20
  } else if (p7 > 25 && p7 <= 40) {
    weekly = 8
  } else if (p7 > -25 && p7 <= -10) {
    weekly = 8
  } else {
    weekly = 0
  }

  // 3. Volume / market cap ratio (25 pts)
  const ratio = token.volume24h / token.marketCap
  let vol: number
  if (ratio >= 0.15) vol = 25
  else if (ratio >= 0.08) vol = 20
  else if (ratio >= 0.04) vol = 14
  else if (ratio >= 0.02) vol = 8
  else vol = 0

  // 4. ATH distance sweet spot (25 pts)
  const ath = token.athChangePercent
  let athPts: number
  if (ath === null) {
    athPts = 0
  } else if (ath <= -25 && ath >= -60) {
    athPts = 25
  } else if (ath <= -15 && ath > -25) {
    athPts = 18
  } else if (ath <= -60 && ath > -80) {
    athPts = 12
  } else if (ath > -15) {
    athPts = 5
  } else {
    athPts = 0
  }

  return Math.min(100, short + weekly + vol + athPts)
}
