import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, passphrase } = body

    if (action === 'lock') {
      await prisma.appConfig.upsert({
        where: { key: 'emergency_locked' },
        update: { value: 'true' },
        create: { key: 'emergency_locked', value: 'true' },
      })
      return NextResponse.json({ locked: true })
    }

    if (action === 'unlock') {
      if (passphrase !== 'SCRAP-UNLOCK-2026') {
        return NextResponse.json({ error: 'Invalid passphrase' }, { status: 403 })
      }
      await prisma.appConfig.upsert({
        where: { key: 'emergency_locked' },
        update: { value: 'false' },
        create: { key: 'emergency_locked', value: 'false' },
      })
      return NextResponse.json({ locked: false })
    }

    if (action === 'status') {
      const config = await prisma.appConfig.findUnique({
        where: { key: 'emergency_locked' },
      })
      return NextResponse.json({ locked: config?.value === 'true' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Emergency lock error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
