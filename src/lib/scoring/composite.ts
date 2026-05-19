import type { Token } from '@prisma/client'
import type { CandleData } from '@/lib/fetchers/binance'
import { computeTechnicalScore } from './technical'
import { computeSentimentScore } from './sentiment'
import { computeFundamentalScore } from './fundamental'

export interface ScoreBreakdown {
  technicalScore: number
  sentimentScore: number
  fundamentalScore: number
  compositeScore: number
}

export function computeScores(token: Token, candles?: CandleData[]): ScoreBreakdown {
  const technicalScore = computeTechnicalScore(token, candles)
  const sentimentScore = computeSentimentScore(token)
  const fundamentalScore = computeFundamentalScore(token)
  const compositeScore = technicalScore * 0.4 + sentimentScore * 0.3 + fundamentalScore * 0.3
  return { technicalScore, sentimentScore, fundamentalScore, compositeScore }
}
