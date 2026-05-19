'use client'

import { useState } from 'react'

type JobState = 'idle' | 'running' | 'done' | 'error'

function useJob(endpoint: string) {
  const [state, setState] = useState<JobState>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function run() {
    setState('running')
    setResult(null)
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      const count = data.synced ?? data.scored
      setResult(`${count} tokens`)
      setState('done')
    } catch (e) {
      setResult((e as Error).message)
      setState('error')
    }
  }

  return { state, result, run }
}

export default function ActionBar() {
  const sync = useJob('/api/sync')
  const score = useJob('/api/score')

  return (
    <div className="flex items-center gap-3">
      <JobButton label="Sync" job={sync} onDone={() => window.location.reload()} />
      <JobButton label="Score" job={score} onDone={() => window.location.reload()} />
    </div>
  )
}

function JobButton({
  label,
  job,
  onDone,
}: {
  label: string
  job: ReturnType<typeof useJob>
  onDone: () => void
}) {
  const { state, result, run } = job

  async function handleClick() {
    await run()
    if (state !== 'error') setTimeout(onDone, 800)
  }

  const busy = state === 'running'

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && (
        <span className="size-3 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
      )}
      {label}
      {result && (
        <span
          className={
            state === 'error' ? 'text-red-400' : 'text-emerald-400'
          }
        >
          · {result}
        </span>
      )}
    </button>
  )
}
