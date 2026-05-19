import { syncSentiment } from '@/lib/jobs/syncSentiment'

export async function POST() {
  try {
    const result = await syncSentiment()
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error('[sync-sentiment] failed:', error)
    return Response.json({ error: 'Sentiment sync failed' }, { status: 500 })
  }
}
