import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

    let where: any = {}
    if (year) {
      // FY filter: April year to March year+1
      where.date = {
        gte: new Date(`${year}-04-01T00:00:00.000Z`),
        lte: new Date(`${year + 1}-03-31T23:59:59.999Z`),
      }
    }

    const distributions = await prisma.homeDistribution.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    const enriched = distributions.map(d => ({
      ...d,
      amount: Number(d.amount),
    }))

    // Summary
    const totalWife = enriched.filter(d => d.recipient === 'WIFE').reduce((s, d) => s + d.amount, 0)
    const totalSon = enriched.filter(d => d.recipient === 'SON').reduce((s, d) => s + d.amount, 0)
    const totalOther = enriched.filter(d => d.recipient === 'OTHER').reduce((s, d) => s + d.amount, 0)
    const grandTotal = totalWife + totalSon + totalOther

    return NextResponse.json({
      distributions: enriched,
      summary: {
        totalWife: Math.round(totalWife * 100) / 100,
        totalSon: Math.round(totalSon * 100) / 100,
        totalOther: Math.round(totalOther * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Failed to fetch distributions:', error)
    return NextResponse.json({ error: 'Failed to fetch distributions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, recipient, description, date } = body

    if (!amount || !recipient) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const distribution = await prisma.homeDistribution.create({
      data: {
        amount: parseFloat(amount),
        recipient,
        description: description || null,
        date: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json(distribution)
  } catch (error) {
    console.error('Failed to create distribution:', error)
    return NextResponse.json({ error: 'Failed to create distribution' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.homeDistribution.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete distribution:', error)
    return NextResponse.json({ error: 'Failed to delete distribution' }, { status: 500 })
  }
}
