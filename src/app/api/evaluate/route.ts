import { evaluateCandidates } from '@/lib/jobs/evaluateCandidates'

export async function POST() {
  try {
    const result = await evaluateCandidates()
    return Response.json(result)
  } catch (error) {
    console.error('[evaluate] failed:', error)
    return Response.json({ error: 'Evaluation failed' }, { status: 500 })
  }
}
