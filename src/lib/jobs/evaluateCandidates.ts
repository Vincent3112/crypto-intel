import type { TradeCandidate } from '@prisma/client'
import { prisma } from '@/lib/db'
import { runSafetyFilters } from '@/lib/filters/safetyFilters'

export interface EvaluateResult {
  evaluated: number
  passed: number
  candidates: TradeCandidate[]
}

export async function evaluateCandidates(): Promise<EvaluateResult> {
  await prisma.tradeCandidate.deleteMany({ where: { status: 'pending' } })
  await prisma.safetyLog.deleteMany()

  const tokens = await prisma.token.findMany({
    include: { scores: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  const scored = tokens.filter(t => t.scores.length > 0)
  const newCandidates: TradeCandidate[] = []
  let passed = 0

  for (const token of scored) {
    const { passed: ok } = await runSafetyFilters(token)
    if (!ok) continue

    passed++

    const score = token.scores[0]
    const candidate = await prisma.tradeCandidate.create({
      data: {
        tokenId: token.id,
        compositeScore: score.compositeScore,
        technicalScore: score.technicalScore ?? 0,
        fundamentalScore: score.fundamentalScore ?? 0,
        priceAtSignal: token.price,
        target1: token.price * 1.5,
        target2: token.price * 2.0,
        status: 'pending',
      },
    })

    newCandidates.push(candidate)
  }

  return { evaluated: scored.length, passed, candidates: newCandidates }
}
