import cron from 'node-cron'
import { syncTokens } from '@/lib/jobs/syncTokens'
import { syncCandles } from '@/lib/jobs/syncCandles'
import { syncSentiment } from '@/lib/jobs/syncSentiment'
import { scoreTokens } from '@/lib/jobs/scoreTokens'
import { evaluateCandidates } from '@/lib/jobs/evaluateCandidates'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

let lastFullRun: Date | null = null
let lastQuickRun: Date | null = null
let lastEvaluate: Date | null = null

async function runFullPipeline() {
  console.log(`[pipeline:full] Starting at ${new Date().toISOString()}`)
  try {
    await syncTokens()
    await scoreTokens()
    console.log('[pipeline:full] Tokens synced + scored')
    await sleep(5000)
    await syncCandles()
    await scoreTokens()
    console.log('[pipeline:full] Candles synced + rescored')
    await sleep(3000)
    await syncSentiment()
    lastFullRun = new Date()
    console.log(`[pipeline:full] Done at ${lastFullRun.toISOString()}`)
  } catch (err) {
    console.error('[pipeline:full] Failed:', err)
  }
}

async function runQuickRefresh() {
  if (lastFullRun && Date.now() - lastFullRun.getTime() < 10 * 60 * 1000) {
    console.log('[pipeline:quick] Skipping — full pipeline ran recently')
    return
  }
  console.log(`[pipeline:quick] Starting at ${new Date().toISOString()}`)
  try {
    await syncTokens()
    await scoreTokens()
    console.log('[pipeline:quick] Tokens synced + scored')
    await sleep(3000)
    await syncSentiment()
    lastQuickRun = new Date()
    console.log(`[pipeline:quick] Done at ${lastQuickRun.toISOString()}`)
  } catch (err) {
    console.error('[pipeline:quick] Failed:', err)
  }
}

async function runEvaluate() {
  console.log(`[pipeline:evaluate] Starting at ${new Date().toISOString()}`)
  try {
    const result = await evaluateCandidates()
    lastEvaluate = new Date()
    console.log(`[pipeline:evaluate] Done — ${result.passed} candidates at ${lastEvaluate.toISOString()}`)
  } catch (err) {
    console.error('[pipeline:evaluate] Failed:', err)
  }
}

export function startScheduler() {
  cron.schedule('0 */4 * * *', () => { runFullPipeline().catch(console.error) })
  cron.schedule('0 * * * *', () => { runQuickRefresh().catch(console.error) })
  cron.schedule('0 8 * * *', () => { runEvaluate().catch(console.error) })

  console.log('[pipeline:boot] Running initial sync...')
  runFullPipeline().catch(console.error)
}

export function getSchedulerStatus() {
  return {
    lastFullRun: lastFullRun?.toISOString() ?? null,
    lastQuickRun: lastQuickRun?.toISOString() ?? null,
    lastEvaluate: lastEvaluate?.toISOString() ?? null,
    nextFullRun: lastFullRun
      ? new Date(lastFullRun.getTime() + 4 * 60 * 60 * 1000).toISOString()
      : null,
  }
}
