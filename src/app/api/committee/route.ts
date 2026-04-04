import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const committees = await prisma.committeeInvestment.findMany({
      include: {
        payments: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const enriched = committees.map(c => {
      const totalPaid = c.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const monthsLeft = Math.max(0, Math.ceil(
        (new Date(c.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
      ))
      const progress = c.totalMonths > 0 ? (c.payments.length / c.totalMonths) * 100 : 0

      return {
        ...c,
        maturityAmount: Number(c.maturityAmount),
        totalPaid,
        monthsLeft,
        progress: Math.min(progress, 100),
        payments: c.payments.map(p => ({
          ...p,
          amount: Number(p.amount),
        })),
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Failed to fetch committees:', error)
    return NextResponse.json({ error: 'Failed to fetch committees' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create_committee') {
      const { committeeName, maturityAmount, startDate, maturityDate, totalMonths, notes } = body
      const committee = await prisma.committeeInvestment.create({
        data: {
          committeeName: committeeName || "Father's Committee",
          maturityAmount: parseFloat(maturityAmount),
          startDate: new Date(startDate),
          maturityDate: new Date(maturityDate),
          totalMonths: parseInt(totalMonths) || 13,
          notes: notes || null,
        },
      })
      return NextResponse.json(committee)
    }

    if (action === 'add_payment') {
      const { committeeId, month, year, amount, date } = body
      const payment = await prisma.committeePayment.upsert({
        where: {
          committeeId_month_year: {
            committeeId,
            month: parseInt(month),
            year: parseInt(year),
          },
        },
        update: {
          amount: parseFloat(amount),
          isPaid: true,
          date: date ? new Date(date) : new Date(),
        },
        create: {
          committeeId,
          month: parseInt(month),
          year: parseInt(year),
          amount: parseFloat(amount),
          isPaid: true,
          date: date ? new Date(date) : new Date(),
        },
      })
      return NextResponse.json(payment)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to save committee data:', error)
    return NextResponse.json({ error: 'Failed to save committee data' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, committeeName, maturityAmount, maturityDate, totalMonths, isActive, notes } = body

    const updated = await prisma.committeeInvestment.update({
      where: { id },
      data: {
        ...(committeeName && { committeeName }),
        ...(maturityAmount && { maturityAmount: parseFloat(maturityAmount) }),
        ...(maturityDate && { maturityDate: new Date(maturityDate) }),
        ...(totalMonths && { totalMonths: parseInt(totalMonths) }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update committee:', error)
    return NextResponse.json({ error: 'Failed to update committee' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.committeeInvestment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete committee:', error)
    return NextResponse.json({ error: 'Failed to delete committee' }, { status: 500 })
  }
}
