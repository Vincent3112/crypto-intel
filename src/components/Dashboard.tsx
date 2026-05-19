'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ScoreBar from './ScoreBar'

export type TokenRow = {
  id: string
  symbol: string
  name: string
  rank: number
  price: number
  marketCap: number
  volume24h: number
  priceChange24h: number
  priceChange7d: number | null
  athChangePercent: number | null
  compositeScore: number
  technicalScore: number
  sentimentScore: number
  fundamentalScore: number
  updatedAt: string
}

export type CandidateRow = {
  id: number
  tokenId: string
  name: string
  symbol: string
  priceAtSignal: number
  target1: number
  target2: number
  compositeScore: number
  createdAt: string
}

type PipelineStatus = {
  lastFullRun: string | null
  lastQuickRun: string | null
  lastEvaluate: string | null
  nextFullRun: string | null
}

type SortKey = keyof TokenRow
type SortDir = 'asc' | 'desc'
type Sort = { col: SortKey; dir: SortDir }

const COLS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: 'rank', label: 'Rank', right: true },
  { key: 'name', label: 'Name' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price', right: true },
  { key: 'priceChange24h', label: '24h %', right: true },
  { key: 'priceChange7d', label: '7d %', right: true },
  { key: 'volume24h', label: 'Volume', right: true },
  { key: 'compositeScore', label: 'Score', right: true },
  { key: 'technicalScore', label: 'Technical', right: true },
  { key: 'sentimentScore', label: 'Sentiment', right: true },
  { key: 'fundamentalScore', label: 'Fundamental', right: true },
]

function sortRows(rows: TokenRow[], sort: Sort): TokenRow[] {
  return [...rows].sort((a, b) => {
    const av = a[sort.col]
    const bv = b[sort.col]
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'string' && typeof bv === 'string') {
      const cmp = av.localeCompare(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    }
    return sort.dir === 'asc'
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number)
  })
}

function fmtPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (p >= 1) return `$${p.toFixed(2)}`
  if (p >= 0.01) return `$${p.toFixed(4)}`
  return `$${p.toFixed(6)}`
}

function fmtVolume(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  return `$${(v / 1e3).toFixed(1)}K`
}

function fmtChange(c: number | null): string {
  if (c === null) return '—'
  return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`
}

function changeClass(c: number | null): string {
  if (c === null) return 'text-zinc-600'
  return c >= 0 ? 'text-emerald-400' : 'text-red-400'
}

function subScoreClass(s: number): string {
  if (s >= 65) return 'text-emerald-400'
  if (s >= 50) return 'text-yellow-400'
  if (s >= 35) return 'text-orange-400'
  return 'text-red-400'
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function futureTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'soon'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `in ${mins}m`
  return `in ${Math.floor(mins / 60)}h`
}

function pipelineDotClass(lastRun: string | null): string {
  if (!lastRun) return 'bg-red-500 animate-pulse'
  const hours = (Date.now() - new Date(lastRun).getTime()) / 3_600_000
  if (hours < 5) return 'bg-emerald-500 animate-pulse'
  if (hours < 12) return 'bg-amber-500 animate-pulse'
  return 'bg-red-500 animate-pulse'
}

export default function Dashboard({
  tokens: initialTokens,
  candidates: initialCandidates,
}: {
  tokens: TokenRow[]
  candidates: CandidateRow[]
}) {
  const router = useRouter()
  const [sort, setSort] = useState<Sort>({ col: 'compositeScore', dir: 'desc' })
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/pipeline-status')
        if (res.ok) setPipelineStatus(await res.json())
      } catch {}
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 60_000)
    return () => clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return initialTokens
    return initialTokens.filter(
      t => t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q),
    )
  }, [initialTokens, search])

  const rows = useMemo(() => sortRows(filtered, sort), [filtered, sort])

  function handleSort(col: SortKey) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' },
    )
  }

  async function handleEvaluate() {
    setEvaluating(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/evaluate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Evaluate failed')
      setStatusMsg(
        `Evaluated ${data.evaluated} · ${data.passed} passed · ${data.candidates.length} new candidates`,
      )
      router.refresh()
    } catch (e) {
      setStatusMsg(`Error: ${(e as Error).message}`)
    } finally {
      setEvaluating(false)
    }
  }

  const avgScore =
    initialTokens.length > 0
      ? initialTokens.reduce((s, t) => s + t.compositeScore, 0) / initialTokens.length
      : 0
  const highCount = initialTokens.filter(t => t.compositeScore > 60).length

  const busy = evaluating

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-screen-2xl px-6 py-8">

        {/* Header */}
        <div className="mb-7 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-sm font-semibold tracking-[0.2em] text-white uppercase">
                Crypto Intel
              </h1>
              <span className={`size-1.5 rounded-full ${pipelineDotClass(pipelineStatus?.lastFullRun ?? null)}`} />
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-600">
              Automated pipeline · updates every 4h
            </p>
          </div>
          <div className="flex items-center gap-5">
            {/* Pipeline status */}
            <div className="flex items-center gap-4 font-mono text-[10px] text-zinc-600">
              <span>
                SYNC{' '}
                <span className="text-zinc-400">
                  {relativeTime(pipelineStatus?.lastFullRun ?? null)}
                </span>
              </span>
              <span>
                NEXT{' '}
                <span className="text-zinc-400">
                  {futureTime(pipelineStatus?.nextFullRun ?? null)}
                </span>
              </span>
              <span>
                EVAL{' '}
                <span className="text-zinc-400">
                  {relativeTime(pipelineStatus?.lastEvaluate ?? null)}
                </span>
              </span>
            </div>
            {statusMsg && (
              <span className="font-mono text-xs text-zinc-500">{statusMsg}</span>
            )}
            <HeaderButton onClick={handleEvaluate} busy={evaluating} disabled={busy} label="Evaluate" variant="green" />
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="Tokens Tracked" value={String(initialTokens.length)} />
          <StatCard label="Avg Composite Score" value={avgScore.toFixed(1)} accent="amber" />
          <StatCard
            label="High Potential"
            value={String(highCount)}
            sub="composite score › 60"
            accent="emerald"
          />
        </div>

        {/* Search */}
        <div className="mb-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name or symbol…"
            className="w-full max-w-xs rounded border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-600"
          />
        </div>

        {/* Main token table */}
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                {COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`select-none cursor-pointer whitespace-nowrap px-3 py-2.5 font-mono text-[10px] font-medium tracking-widest text-zinc-600 uppercase transition-colors hover:text-zinc-300 ${col.right ? 'text-right' : 'text-left'}`}
                  >
                    {col.label}
                    {sort.col === col.key && (
                      <span className="ml-1 text-zinc-400">
                        {sort.dir === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(token => {
                const selected = token.id === selectedId
                return (
                  <tr
                    key={token.id}
                    onClick={() => setSelectedId(selected ? null : token.id)}
                    className={`cursor-pointer border-b border-zinc-800/50 transition-colors ${selected ? 'bg-zinc-800/70' : 'hover:bg-zinc-900/70'}`}
                  >
                    <td className={`border-l-2 px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-600 transition-colors ${selected ? 'border-l-emerald-500' : 'border-l-transparent'}`}>
                      {token.rank}
                    </td>
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap text-zinc-100">
                      {token.name}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs uppercase text-zinc-500">
                      {token.symbol}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums whitespace-nowrap text-zinc-200">
                      {fmtPrice(token.price)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs tabular-nums ${changeClass(token.priceChange24h)}`}>
                      {fmtChange(token.priceChange24h)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs tabular-nums ${changeClass(token.priceChange7d)}`}>
                      {fmtChange(token.priceChange7d)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums whitespace-nowrap text-zinc-500">
                      {fmtVolume(token.volume24h)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="min-w-30">
                        <ScoreBar score={token.compositeScore} />
                      </div>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs tabular-nums ${subScoreClass(token.technicalScore)}`}>
                      {token.technicalScore.toFixed(1)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs tabular-nums ${subScoreClass(token.sentimentScore)}`}>
                      {token.sentimentScore.toFixed(1)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs tabular-nums ${subScoreClass(token.fundamentalScore)}`}>
                      {token.fundamentalScore.toFixed(1)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-16 text-center font-mono text-xs text-zinc-600">
              No results for &ldquo;{search}&rdquo;
            </p>
          )}
        </div>

        <p className="mb-10 mt-3 text-right font-mono text-[10px] text-zinc-700">
          {rows.length} / {initialTokens.length} tokens
        </p>

        {/* Buy Candidates */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-300">
              Buy Candidates
            </h2>
            <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              {initialCandidates.length} pending
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-emerald-900/40 bg-emerald-950/10">
            {initialCandidates.length === 0 ? (
              <p className="py-10 text-center font-mono text-xs text-zinc-600">
                No pending candidates — run Evaluate to identify buy signals
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-emerald-900/30 bg-emerald-950/30">
                    {['Name', 'Symbol', 'Price at Signal', 'Target ×1.5', 'Target ×2.0', 'Score', 'Date Flagged'].map(h => (
                      <th
                        key={h}
                        className={`whitespace-nowrap px-3 py-2.5 font-mono text-[10px] font-medium tracking-widest text-emerald-700 uppercase ${h === 'Name' ? 'text-left' : 'text-right'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {initialCandidates.map(c => (
                    <tr
                      key={c.id}
                      className="border-b border-emerald-900/20 transition-colors hover:bg-emerald-950/20"
                    >
                      <td className="border-l-2 border-l-emerald-600 px-3 py-2.5 font-medium whitespace-nowrap text-zinc-100">
                        {c.name}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs uppercase text-zinc-500">
                        {c.symbol}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-200">
                        {fmtPrice(c.priceAtSignal)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-emerald-400">
                        {fmtPrice(c.target1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-emerald-300">
                        {fmtPrice(c.target2)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex items-center rounded border border-emerald-800 bg-emerald-950 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                          {c.compositeScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-zinc-600">
                        {new Date(c.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function HeaderButton({
  onClick,
  busy,
  disabled,
  label,
  variant = 'default',
}: {
  onClick: () => void
  busy: boolean
  disabled: boolean
  label: string
  variant?: 'default' | 'green'
}) {
  const colors =
    variant === 'green'
      ? 'border-emerald-800 bg-emerald-950 text-emerald-400 hover:border-emerald-600 hover:bg-emerald-900 hover:text-emerald-300'
      : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-white'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded border px-4 py-2 font-mono text-xs font-medium uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${colors}`}
    >
      {busy && (
        <span className="size-3 animate-spin rounded-full border border-current border-t-transparent opacity-60" />
      )}
      {busy ? 'Running…' : label}
    </button>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'emerald' | 'amber'
}) {
  const valueClass =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'amber'
        ? 'text-amber-400'
        : 'text-white'

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className={`mt-1.5 font-mono text-3xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 font-mono text-[10px] text-zinc-700">{sub}</p>}
    </div>
  )
}
