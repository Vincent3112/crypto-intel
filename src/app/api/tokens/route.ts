import { prisma } from '@/lib/db'

export async function GET() {
  const raw = await prisma.token.findMany({
    include: { scores: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  const tokens = raw
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
      }
    })
    .filter(<T>(x: T | null): x is T => x !== null)
    .sort((a, b) => b.compositeScore - a.compositeScore)

  return Response.json({ tokens })
}
