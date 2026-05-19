import { syncCandles } from '@/lib/jobs/syncCandles'

export async function POST() {
  try {
    const result = await syncCandles()
    return Response.json(result)
  } catch (error) {
    console.error('[sync-candles] failed:', error)
    return Response.json({ error: 'Candle sync failed' }, { status: 500 })
  }
}
