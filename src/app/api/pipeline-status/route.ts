import { getSchedulerStatus } from '@/lib/scheduler'

export async function GET() {
  return Response.json(getSchedulerStatus())
}
