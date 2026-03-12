import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const accounts = await prisma.oDAccount.findMany({
      include: { transactions: { orderBy: { date: 'desc' }, take: 50 } },
    })

    // Calculate live interest for each account
    const enriched = accounts.map((acc) => {
      const dailyRate = Number(acc.interestRate) / 365 / 100
      const daysSinceAccrual = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(acc.lastAccrualDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
      const pendingInterest =
        Number(acc.currentUtilized) * dailyRate * daysSinceAccrual
      const utilizationPercent =
        Number(acc.odLimit) > 0
          ? (Number(acc.currentUtilized) / Number(acc.odLimit)) * 100
          : 0

      return {
        ...acc,
        pendingInterest: Math.round(pendingInterest * 100) / 100,
        dailyInterestBurn: Math.round(Number(acc.currentUtilized) * dailyRate * 100) / 100,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        daysSinceAccrual,
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Failed to fetch OD accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch OD accounts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.action === 'create_account') {
      const account = await prisma.oDAccount.create({
        data: {
          bankName: body.bankName,
          odLimit: new Prisma.Decimal(body.odLimit),
          interestRate: new Prisma.Decimal(body.interestRate),
          currentUtilized: new Prisma.Decimal(body.currentUtilized || 0),
        },
      })
      return NextResponse.json(account, { status: 201 })
    }

    if (body.action === 'transaction') {
      const account = await prisma.oDAccount.findUnique({
        where: { id: body.accountId },
      })
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const currentUtilized = Number(account.currentUtilized)
      let newUtilized: number

      if (body.type === 'DRAW') {
        newUtilized = currentUtilized + Number(body.amount)
        if (newUtilized > Number(account.odLimit)) {
          return NextResponse.json(
            { error: 'Exceeds OD limit' },
            { status: 400 }
          )
        }
      } else {
        newUtilized = Math.max(0, currentUtilized - Number(body.amount))
      }

      const transaction = await prisma.oDTransaction.create({
        data: {
          accountId: body.accountId,
          amount: new Prisma.Decimal(body.amount),
          type: body.type,
          description: body.description || null,
          date: body.date ? new Date(body.date) : new Date(),
        },
      })

      await prisma.oDAccount.update({
        where: { id: body.accountId },
        data: {
          currentUtilized: new Prisma.Decimal(newUtilized),
        },
      })

      return NextResponse.json(transaction, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to process OD request:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
