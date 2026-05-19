type Props = { score: number }

export default function ScoreBar({ score }: Props) {
  const pct = Math.min(Math.max(score, 0), 100)
  const barColor =
    pct > 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const textColor =
    pct > 60 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-[3px] min-w-[72px] flex-1 rounded-full bg-zinc-800">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-9 text-right font-mono text-xs tabular-nums ${textColor}`}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}
