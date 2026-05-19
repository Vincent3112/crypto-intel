import { prisma } from '@/lib/db'
import { fetchAllCandles, toBinanceSymbol } from '@/lib/fetchers/binance'

export interface SyncCandlesResult {
  synced: number
  total: number
}

export async function syncCandles(): Promise<SyncCandlesResult> {
  const tokens = await prisma.token.findMany({ select: { id: true, symbol: true } })
  const candleMap = await fetchAllCandles(tokens)

  const tokenById = new Map(tokens.map(t => [t.id, t]))
  let total = 0

  for (const [tokenId, candles] of candleMap) {
    const token = tokenById.get(tokenId)!
    const result = await prisma.candle.createMany({
      data: candles.map(c => ({
        tokenId,
        symbol: toBinanceSymbol(token.symbol),
        openTime: c.openTime,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        closeTime: c.closeTime,
      })),
      skipDuplicates: true,
    })
    total += result.count
  }

  return { synced: candleMap.size, total }
}
