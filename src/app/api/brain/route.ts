import { NextResponse } from 'next/server'
import { getBusinessCommandCenterSnapshot } from '@/lib/business-command-center'
import { generateBusinessAiReport } from '@/lib/google-business-ai'

export const runtime = 'nodejs'
export const maxDuration = 60

type BrainRequest = {
  question?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as BrainRequest
    const question = typeof body.question === 'string' ? body.question.slice(0, 800) : ''
    const snapshot = await getBusinessCommandCenterSnapshot()
    const report = await generateBusinessAiReport(snapshot, question)

    return NextResponse.json({
      report,
      snapshot,
      triggeredAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to run business brain:', error)
    return NextResponse.json({ error: 'Failed to run business brain' }, { status: 500 })
  }
}
