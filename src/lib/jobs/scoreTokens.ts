import pLimit from 'p-limit'
import { prisma } from '@/lib/db'
import { computeScores } from '@/lib/scoring/composite'
import type { CandleData } from '@/lib/fetchers/binance'

async function loadCandleMap(): Promise<Map<string, CandleData[]>> {
  const rows = await prisma.candle.findMany({ orderBy: { openTime: 'asc' } })

  const map = new Map<string, CandleData[]>()
  for (const row of rows) {
    const arr = map.get(row.tokenId) ?? []
    arr.push({
      openTime: row.openTime,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
      closeTime: row.closeTime,
    })
    map.set(row.tokenId, arr)
  }

  // Keep only the most recent 30 candles per token
  for (const [id, arr] of map) {
    if (arr.length > 30) map.set(id, arr.slice(-30))
  }

  return map
}

export async function scoreTokens(): Promise<number> {
  const [tokens, candleMap] = await Promise.all([
    prisma.token.findMany(),
    loadCandleMap(),
  ])

  const limit = pLimit(10)

  await Promise.all(
    tokens.map(t =>
      limit(async () => {
        const candles = candleMap.get(t.id)
        const scores = computeScores(t, candles)
        await prisma.tokenScore.create({
          data: { tokenId: t.id, ...scores },
        })
      }),
    ),
  )

  return tokens.length
}
