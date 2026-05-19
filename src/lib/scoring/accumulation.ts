import type { CandleData } from '@/lib/fetchers/binance'

export interface AccumulationSignals {
  flatness: number
  volumeTrend: number
  exhaustion: number
  support: number
}

export interface AccumulationResult {
  accumulationScore: number
  signals: AccumulationSignals
}

export function computeAccumulationScore(candles: CandleData[]): AccumulationResult {
  const zero: AccumulationResult = {
    accumulationScore: 0,
    signals: { flatness: 0, volumeTrend: 0, exhaustion: 0, support: 0 },
  }
  if (candles.length < 2) return zero

  const closes = candles.map(c => c.close)
  const maxClose = Math.max(...closes)
  const minClose = Math.min(...closes)

  // 1. Price flatness (30 pts max)
  const range = (maxClose - minClose) / minClose
  const flatness = range < 0.10 ? 30 : range < 0.20 ? 20 : range < 0.35 ? 10 : 0

  // 2. Volume trend while price flat (40 pts max)
  const mid = Math.floor(candles.length / 2)
  const avgVol = (slice: CandleData[]) =>
    slice.reduce((s, c) => s + c.volume, 0) / slice.length
  const earlyVol = avgVol(candles.slice(0, mid))
  const recentVol = avgVol(candles.slice(mid))
  const volRatio = earlyVol > 0 ? (recentVol - earlyVol) / earlyVol : 0
  const volumeTrend = volRatio >= 0.5 ? 40 : volRatio >= 0.2 ? 25 : volRatio > 0 ? 10 : 0

  // 3. Downtrend exhaustion (20 pts max)
  const greenDays = candles.filter(c => c.close > c.open).length
  const exhaustion = greenDays >= 17 ? 20 : greenDays >= 15 ? 10 : 0

  // 4. Price holding support (10 pts max)
  const lastClose = candles[candles.length - 1].close
  const low30 = Math.min(...candles.map(c => c.low))
  const support = lastClose > low30 * 1.05 ? 10 : 0

  return {
    accumulationScore: flatness + volumeTrend + exhaustion + support,
    signals: { flatness, volumeTrend, exhaustion, support },
  }
}
