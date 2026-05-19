import pLimit from 'p-limit'
import { prisma } from '@/lib/db'
import { computeSentimentScore } from '@/lib/scoring/sentiment'

export interface SyncSentimentResult {
  total: number
}

export async function syncSentiment(): Promise<SyncSentimentResult> {
  const tokens = await prisma.token.findMany()

  const allScores = await prisma.tokenScore.findMany({ orderBy: { createdAt: 'desc' } })
  const latestScoreMap = new Map<string, typeof allScores[0]>()
  for (const score of allScores) {
    if (!latestScoreMap.has(score.tokenId)) latestScoreMap.set(score.tokenId, score)
  }

  const limit = pLimit(20)
  let total = 0

  await Promise.all(
    tokens.map(t =>
      limit(async () => {
        const latestScore = latestScoreMap.get(t.id)
        if (!latestScore) return

        const sentimentScore = computeSentimentScore(t)
        const compositeScore =
          (latestScore.technicalScore ?? 0) * 0.4 +
          sentimentScore * 0.3 +
          (latestScore.fundamentalScore ?? 0) * 0.3

        await prisma.tokenScore.update({
          where: { id: latestScore.id },
          data: { sentimentScore, compositeScore },
        })
        total++
      }),
    ),
  )

  return { total }
}
