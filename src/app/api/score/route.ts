import { scoreTokens } from '@/lib/jobs/scoreTokens'

export async function POST() {
  try {
    const scored = await scoreTokens()
    return Response.json({ scored })
  } catch (error) {
    console.error('[score] failed:', error)
    return Response.json({ error: 'Scoring failed' }, { status: 500 })
  }
}
