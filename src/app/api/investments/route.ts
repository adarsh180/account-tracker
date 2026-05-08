import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type FundingSource = 'OWN_SAVINGS' | 'EARNED_MONEY' | 'OD_MONEY' | 'MIXED'

const FUNDING_SOURCES: FundingSource[] = ['OWN_SAVINGS', 'EARNED_MONEY', 'OD_MONEY', 'MIXED']

function amount(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeFundingSource(value: unknown): FundingSource {
  return FUNDING_SOURCES.includes(value as FundingSource) ? (value as FundingSource) : 'EARNED_MONEY'
}

function sourceBreakdown(body: Record<string, unknown>, totalAmount: number, source: FundingSource) {
  const ownSavingsAmount = amount(body.ownSavingsAmount)
  const earnedMoneyAmount = amount(body.earnedMoneyAmount)
  const odMoneyAmount = amount(body.odMoneyAmount)
  const splitTotal = ownSavingsAmount + earnedMoneyAmount + odMoneyAmount

  if (source === 'MIXED' && splitTotal > 0) {
    return { ownSavingsAmount, earnedMoneyAmount, odMoneyAmount }
  }

  return {
    ownSavingsAmount: source === 'OWN_SAVINGS' ? totalAmount : 0,
    earnedMoneyAmount: source === 'EARNED_MONEY' ? totalAmount : 0,
    odMoneyAmount: source === 'OD_MONEY' ? totalAmount : 0,
  }
}

function riskForUse(input: {
  category: string
  odMoneyAmount: number
  expectedReturn?: number | null
}) {
  if (input.odMoneyAmount <= 0) return 'LOW'
  if (['PERSONAL', 'FAMILY', 'OTHER'].includes(input.category) && !input.expectedReturn) return 'HIGH'
  if (input.expectedReturn && input.expectedReturn > input.odMoneyAmount) return 'MEDIUM'
  return 'WATCH'
}

function insightForUse(input: {
  category: string
  odMoneyAmount: number
  expectedReturn?: number | null
}) {
  if (input.odMoneyAmount <= 0) {
    return 'No OD money used. This keeps debt pressure clean.'
  }
  if (['PERSONAL', 'FAMILY'].includes(input.category)) {
    return 'OD money is being used outside direct business return. Track repayment priority carefully.'
  }
  if (input.expectedReturn && input.expectedReturn > input.odMoneyAmount) {
    return 'OD money is tied to a return expectation. Monitor date and cash recovery.'
  }
  return 'OD money is involved. Add expected return or repayment note to make this decision sharper.'
}

export async function GET() {
  try {
    const [uses, committeePayments, odAccounts, sales, payments] = await Promise.all([
      prisma.investmentUse.findMany({ orderBy: { date: 'desc' } }),
      prisma.committeePayment.findMany({ include: { committee: true }, orderBy: { date: 'desc' } }),
      prisma.oDAccount.findMany(),
      prisma.sale.findMany(),
      prisma.payment.findMany(),
    ])

    const normalizedUses = uses.map((use) => {
      const total = amount(use.amount)
      const ownSavingsAmount = amount(use.ownSavingsAmount)
      const earnedMoneyAmount = amount(use.earnedMoneyAmount)
      const odMoneyAmount = amount(use.odMoneyAmount)

      return {
        id: use.id,
        title: use.title,
        category: use.category,
        fundingSource: use.fundingSource,
        amount: total,
        ownSavingsAmount,
        earnedMoneyAmount,
        odMoneyAmount,
        expectedReturn: use.expectedReturn === null ? null : amount(use.expectedReturn),
        expectedReturnDate: use.expectedReturnDate,
        odAccountId: use.odAccountId,
        notes: use.notes,
        date: use.date,
        risk: riskForUse({ category: use.category, odMoneyAmount, expectedReturn: use.expectedReturn === null ? null : amount(use.expectedReturn) }),
        insight: insightForUse({ category: use.category, odMoneyAmount, expectedReturn: use.expectedReturn === null ? null : amount(use.expectedReturn) }),
      }
    })

    const committeeUses = committeePayments.map((payment) => {
      const total = amount(payment.amount)
      const ownSavingsAmount = amount(payment.ownSavingsAmount)
      const earnedMoneyAmount = amount(payment.earnedMoneyAmount)
      const odMoneyAmount = amount(payment.odMoneyAmount)

      return {
        id: `committee-${payment.id}`,
        title: `${payment.committee.committeeName} payment`,
        category: 'COMMITTEE',
        fundingSource: payment.fundingSource,
        amount: total,
        ownSavingsAmount,
        earnedMoneyAmount,
        odMoneyAmount,
        expectedReturn: amount(payment.committee.maturityAmount),
        expectedReturnDate: payment.committee.maturityDate,
        odAccountId: payment.odAccountId,
        notes: `${payment.month}/${payment.year}`,
        date: payment.date,
        risk: riskForUse({ category: 'COMMITTEE', odMoneyAmount, expectedReturn: amount(payment.committee.maturityAmount) }),
        insight: insightForUse({ category: 'COMMITTEE', odMoneyAmount, expectedReturn: amount(payment.committee.maturityAmount) }),
      }
    })

    const allUses = [...normalizedUses, ...committeeUses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const totalUsed = allUses.reduce((sum, use) => sum + use.amount, 0)
    const sourceSummary = {
      ownSavings: round(allUses.reduce((sum, use) => sum + use.ownSavingsAmount, 0)),
      earnedMoney: round(allUses.reduce((sum, use) => sum + use.earnedMoneyAmount, 0)),
      odMoney: round(allUses.reduce((sum, use) => sum + use.odMoneyAmount, 0)),
      totalUsed: round(totalUsed),
    }

    const categorySummary = Object.values(
      allUses.reduce<Record<string, { category: string; amount: number; odMoney: number }>>((acc, use) => {
        if (!acc[use.category]) acc[use.category] = { category: use.category, amount: 0, odMoney: 0 }
        acc[use.category].amount += use.amount
        acc[use.category].odMoney += use.odMoneyAmount
        return acc
      }, {})
    ).map((item) => ({ ...item, amount: round(item.amount), odMoney: round(item.odMoney) }))

    const totalSales = sales.reduce((sum, sale) => sum + amount(sale.totalAmount), 0)
    const totalPaymentsReceived = payments.reduce((sum, payment) => sum + amount(payment.amount), 0)
    const totalODLimit = odAccounts.reduce((sum, account) => sum + amount(account.odLimit), 0)
    const totalODUtilized = odAccounts.reduce((sum, account) => sum + amount(account.currentUtilized), 0)
    const earnedMoneyEstimate = Math.max(0, totalPaymentsReceived - sourceSummary.earnedMoney)

    const intelligence = [
      sourceSummary.odMoney > 0
        ? `${round((sourceSummary.odMoney / Math.max(totalUsed, 1)) * 100)}% of tracked money use came from OD. Keep this tied to fast-return decisions.`
        : 'No tracked investment use is currently funded by OD money.',
      earnedMoneyEstimate > 0
        ? `Estimated earned money left after tracked uses is Rs. ${Math.round(earnedMoneyEstimate).toLocaleString('en-IN')}.`
        : 'Earned money estimate is tight. Record payments and investment uses consistently for better signal.',
      totalODLimit > 0
        ? `OD utilization is ${round((totalODUtilized / totalODLimit) * 100)}% across recorded accounts.`
        : 'No OD account limit is recorded yet.',
    ]

    return NextResponse.json({
      uses: allUses,
      manualUses: normalizedUses,
      sourceSummary,
      categorySummary,
      intelligence,
      capitalSnapshot: {
        totalSales: round(totalSales),
        paymentsReceived: round(totalPaymentsReceived),
        earnedMoneyEstimate: round(earnedMoneyEstimate),
        odLimit: round(totalODLimit),
        odUtilized: round(totalODUtilized),
        odAvailable: round(Math.max(0, totalODLimit - totalODUtilized)),
      },
    })
  } catch (error) {
    console.error('Failed to fetch investment tracker:', error)
    return NextResponse.json({ error: 'Failed to fetch investment tracker' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const totalAmount = amount(body.amount)
    const fundingSource = normalizeFundingSource(body.fundingSource)
    const split = sourceBreakdown(body, totalAmount, fundingSource)

    if (!body.title || totalAmount <= 0) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 })
    }

    if (fundingSource === 'MIXED') {
      const splitTotal = split.ownSavingsAmount + split.earnedMoneyAmount + split.odMoneyAmount
      if (Math.abs(splitTotal - totalAmount) > 1) {
        return NextResponse.json({ error: 'Mixed source split must equal the total amount' }, { status: 400 })
      }
    }

    const created = await prisma.investmentUse.create({
      data: {
        title: String(body.title),
        category: String(body.category || 'OTHER'),
        fundingSource,
        amount: totalAmount,
        ...split,
        expectedReturn: body.expectedReturn ? amount(body.expectedReturn) : null,
        expectedReturnDate: body.expectedReturnDate ? new Date(String(body.expectedReturnDate)) : null,
        odAccountId: body.odAccountId ? String(body.odAccountId) : null,
        notes: body.notes ? String(body.notes) : null,
        date: body.date ? new Date(String(body.date)) : new Date(),
      },
    })

    return NextResponse.json(created)
  } catch (error) {
    console.error('Failed to create investment use:', error)
    return NextResponse.json({ error: 'Failed to create investment use' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.investmentUse.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete investment use:', error)
    return NextResponse.json({ error: 'Failed to delete investment use' }, { status: 500 })
  }
}
