import type { Token } from '@prisma/client'
import type { CandleData } from '@/lib/fetchers/binance'
import { computeAccumulationScore } from './accumulation'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// Sweet spot: -70% to -30% below ATH
function athDistanceScore(athChangePercent: number | null): number {
  if (athChangePercent === null) return 50
  const v = athChangePercent
  if (v >= -70 && v <= -30) return 100
  if (v >= -80 && v <= -20) return 60
  return 20
}

// Higher daily volume relative to market cap = more interest
function volumeRatioScore(volume24h: number, marketCap: number): number {
  if (marketCap === 0) return 0
  return Math.min(100, (volume24h / marketCap) * 1000)
}

// RSI-like fallback when no candle data is available
function rsiLikeScore(change24h: number, change7d: number): number {
  const weighted = 0.6 * change24h + 0.4 * change7d
  return clamp(50 - weighted, 10, 90)
}

export function computeTechnicalScore(token: Token, candles?: CandleData[]): number {
  const ath = athDistanceScore(token.athChangePercent)
  const vol = volumeRatioScore(token.volume24h, token.marketCap)

  if (candles && candles.length >= 2) {
    const { accumulationScore } = computeAccumulationScore(candles)
    return clamp(accumulationScore * 0.5 + ath * 0.25 + vol * 0.25, 0, 100)
  }

  // Fallback: substitute RSI-like signal for accumulation score
  const rsi = rsiLikeScore(token.priceChange24h, token.priceChange7d ?? 0)
  return clamp(rsi * 0.5 + ath * 0.25 + vol * 0.25, 0, 100)
}
