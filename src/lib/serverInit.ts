import { startScheduler } from '@/lib/scheduler'

declare global {
  // eslint-disable-next-line no-var
  var __schedulerStarted: boolean | undefined
}

export function initServer() {
  if (!global.__schedulerStarted) {
    global.__schedulerStarted = true
    startScheduler()
    console.log('[server] Scheduler started')
  }
}
