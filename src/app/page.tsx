import { prisma } from '@/lib/db'
import Dashboard, { type TokenRow, type CandidateRow } from '@/components/Dashboard'

async function getTokens(): Promise<TokenRow[]> {
  const raw = await prisma.token.findMany({
    include: { scores: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  return raw
    .map(t => {
      const s = t.scores[0]
      if (!s) return null
      return {
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        rank: t.rank,
        price: t.price,
        marketCap: t.marketCap,
        volume24h: t.volume24h,
        priceChange24h: t.priceChange24h,
        priceChange7d: t.priceChange7d,
        athChangePercent: t.athChangePercent,
        compositeScore: s.compositeScore,
        technicalScore: s.technicalScore ?? 0,
        sentimentScore: s.sentimentScore ?? 0,
        fundamentalScore: s.fundamentalScore ?? 0,
        updatedAt: t.updatedAt.toISOString(),
      } satisfies TokenRow
    })
    .filter((t): t is TokenRow => t !== null)
    .sort((a, b) => b.compositeScore - a.compositeScore)
}

async function getCandidates(): Promise<CandidateRow[]> {
  const raw = await prisma.tradeCandidate.findMany({
    where: { status: 'pending' },
    include: { token: { select: { name: true, symbol: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return raw.map(c => ({
    id: c.id,
    tokenId: c.tokenId,
    name: c.token.name,
    symbol: c.token.symbol,
    priceAtSignal: c.priceAtSignal,
    target1: c.target1,
    target2: c.target2,
    compositeScore: c.compositeScore,
    createdAt: c.createdAt.toISOString(),
  }))
}

export default async function Page() {
  const [tokens, candidates] = await Promise.all([getTokens(), getCandidates()])
  return <Dashboard tokens={tokens} candidates={candidates} />
}
