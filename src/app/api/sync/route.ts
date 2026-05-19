import { syncTokens } from '@/lib/jobs/syncTokens'

export async function POST() {
  try {
    const synced = await syncTokens()
    return Response.json({ synced })
  } catch (error) {
    console.error('[sync] failed:', error)
    return Response.json({ error: 'Sync failed' }, { status: 500 })
  }
}
