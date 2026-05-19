import axios from 'axios'
import pLimit from 'p-limit'

const BASE_URL = 'https://api.binance.com/api/v3'

export interface CandleData {
  openTime: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: Date
}

export function toBinanceSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  return upper.endsWith('USDT') ? upper : `${upper}USDT`
}

export async function fetchCandles(symbol: string): Promise<CandleData[]> {
  try {
    const { data } = await axios.get<unknown[][]>(`${BASE_URL}/klines`, {
      params: { symbol: toBinanceSymbol(symbol), interval: '1d', limit: 30 },
      timeout: 10_000,
    })
    return data.map(k => ({
      openTime: new Date(k[0] as number),
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
      closeTime: new Date(k[6] as number),
    }))
  } catch {
    // Symbol doesn't exist on Binance or request failed — skip silently
    return []
  }
}

export async function fetchAllCandles(
  tokens: { id: string; symbol: string }[],
): Promise<Map<string, CandleData[]>> {
  const limit = pLimit(5)
  const map = new Map<string, CandleData[]>()

  await Promise.all(
    tokens.map(t =>
      limit(async () => {
        const candles = await fetchCandles(t.symbol)
        if (candles.length > 0) map.set(t.id, candles)
      }),
    ),
  )

  return map
}
