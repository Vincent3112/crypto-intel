import type { Token, TokenScore } from '@prisma/client'
import { prisma } from '@/lib/db'

type ScoredToken = Token & { scores: TokenScore[] }

interface CheckResult {
  ok: boolean
  reason: string
}

const CHECKS: Array<{ name: string; run: (t: ScoredToken) => CheckResult }> = [
  {
    name: 'compositeScore',
    run: t => {
      const v = t.scores[0].compositeScore
      const ok = v >= 60
      return { ok, reason: ok ? `${v.toFixed(1)} ≥ 60` : `${v.toFixed(1)} < 60` }
    },
  },
  {
    name: 'volume24h',
    run: t => {
      const v = t.volume24h
      const ok = v >= 5_000_000
      return { ok, reason: ok ? `$${(v / 1e6).toFixed(1)}M ≥ $5M` : `$${(v / 1e6).toFixed(1)}M < $5M` }
    },
  },
  {
    name: 'min_marketcap',
    run: t => {
      const v = t.marketCap
      const ok = v >= 100_000_000
      return { ok, reason: ok ? `$${(v / 1e6).toFixed(0)}M ≥ $100M` : `$${(v / 1e6).toFixed(0)}M < $100M` }
    },
  },
  {
    name: 'priceChange24h_floor',
    run: t => {
      const v = t.priceChange24h
      const ok = v > -15
      return { ok, reason: ok ? `${v.toFixed(2)}% > -15%` : `${v.toFixed(2)}% ≤ -15% — crashing` }
    },
  },
  {
    name: 'priceChange24h_ceiling',
    run: t => {
      const v = t.priceChange24h
      const ok = v < 30
      return { ok, reason: ok ? `${v.toFixed(2)}% < 30%` : `${v.toFixed(2)}% ≥ 30% — already pumped` }
    },
  },
  {
    name: 'min_price',
    run: t => {
      const v = t.price
      const ok = v >= 0.001
      return { ok, reason: ok ? `$${v} ≥ $0.001` : `$${v} < $0.001 — micro-cap dust` }
    },
  },
  {
    name: 'priceChange7d',
    run: t => {
      const v = t.priceChange7d
      if (v === null) return { ok: true, reason: '7d change unavailable — skipped' }
      const ok = v < 40
      return { ok, reason: ok ? `${v.toFixed(2)}% < 40%` : `${v.toFixed(2)}% ≥ 40% — weekly pump` }
    },
  },
  {
    name: 'athChangePercent_floor',
    run: t => {
      const v = t.athChangePercent
      if (v === null) return { ok: false, reason: 'ATH data unavailable' }
      const ok = v < -20
      return { ok, reason: ok ? `${v.toFixed(1)}% < -20% (below ATH)` : `${v.toFixed(1)}% ≥ -20% — near ATH peak` }
    },
  },
  {
    name: 'athChangePercent_ceiling',
    run: t => {
      const v = t.athChangePercent
      if (v === null) return { ok: false, reason: 'ATH data unavailable' }
      const ok = v > -90
      return { ok, reason: ok ? `${v.toFixed(1)}% > -90%` : `${v.toFixed(1)}% ≤ -90% — possibly dead` }
    },
  },
  {
    name: 'rank',
    run: t => {
      const v = t.rank
      const ok = v >= 50
      return { ok, reason: ok ? `rank ${v} ≥ 50` : `rank ${v} < 50 — market cap too large` }
    },
  },
]

export interface SafetyResult {
  passed: boolean
  failures: string[]
}

export async function runSafetyFilters(token: ScoredToken): Promise<SafetyResult> {
  const results = CHECKS.map(c => ({ ...c.run(token), filter: c.name }))
  const failures = results.filter(r => !r.ok).map(r => r.filter)

  await prisma.safetyLog.createMany({
    data: results.map(r => ({
      tokenId: token.id,
      filter: r.filter,
      passed: r.ok,
      reason: r.reason,
    })),
  })

  return { passed: failures.length === 0, failures }
}
