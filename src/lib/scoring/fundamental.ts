import type { Token } from '@prisma/client'

// Higher circulating/total ratio = less future inflation risk
function supplyRatioScore(circulating: number | null, total: number | null): number {
  if (circulating === null || total === null || total === 0) return 50
  return Math.min(circulating / total, 1) * 100
}

// Ranks 50–150 score highest: large enough to be real, small enough to have upside
function rankScore(rank: number): number {
  if (rank <= 10) return 30
  if (rank <= 50) return 50
  if (rank <= 150) return 80
  return 70
}

export function computeFundamentalScore(token: Token): number {
  const supply = supplyRatioScore(token.circulatingSupply, token.totalSupply)
  const rank = rankScore(token.rank)
  return (supply + rank) / 2
}
