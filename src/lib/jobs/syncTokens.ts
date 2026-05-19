import pLimit from 'p-limit'
import { prisma } from '@/lib/db'
import { fetchTop200Tokens, type CoinGeckoToken } from '@/lib/fetchers/coingecko'

// Stablecoins and pegged assets are excluded: their price never meaningfully
// deviates from $1 (or a commodity peg), so scoring them would pollute the
// leaderboard with artificially high fundamental scores and zero volatility signals.
const BLACKLIST = new Set([
  'tether',
  'usd-coin',
  'dai',
  'first-digital-usd',
  'ripple-usd',
  'usds',
  'true-usd',
  'tusd',
  'gemini-dollar',
  'pax-dollar',
  'husd',
  'neutrino',
  'ethena-usde',
  'paypal-usd',
  'tether-gold',
  'frax',
])

function tokenUpsertArgs(t: CoinGeckoToken) {
  const shared = {
    symbol: t.symbol,
    name: t.name,
    rank: t.market_cap_rank ?? 0,
    price: t.current_price,
    marketCap: t.market_cap,
    volume24h: t.total_volume,
    priceChange24h: t.price_change_percentage_24h ?? 0,
    priceChange7d: t.price_change_percentage_7d_in_currency,
    ath: t.ath,
    athChangePercent: t.ath_change_percentage,
    circulatingSupply: t.circulating_supply,
    totalSupply: t.total_supply,
  }
  return {
    where: { id: t.id },
    update: shared,
    create: { id: t.id, ...shared },
  }
}

export async function syncTokens(): Promise<number> {
  const all = await fetchTop200Tokens()
  const tokens = all.filter(t => !BLACKLIST.has(t.id))
  const limit = pLimit(10)

  await Promise.all(
    tokens.map(t => limit(() => prisma.token.upsert(tokenUpsertArgs(t))))
  )

  await prisma.priceSnapshot.createMany({
    data: tokens.map(t => ({
      tokenId: t.id,
      price: t.current_price,
      volume: t.total_volume,
      marketCap: t.market_cap,
    })),
  })

  return tokens.length
}
