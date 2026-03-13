import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const financialYear = searchParams.get('fy') // e.g. "2025-2026"

    let startYear, endYear;
    if (financialYear) {
      const parts = financialYear.split('-')
      startYear = parseInt(parts[0])
      endYear = parseInt(parts[1])
    } else {
      // Default calculating current IFY
      const now = new Date()
      startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
      endYear = startYear + 1
    }

    const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`)
    const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`)

    // Fetch all relevant data within the FY bounds
    const [purchases, sales, odTransactions] = await Promise.all([
      prisma.purchase.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { party: true },
        orderBy: { date: 'asc' },
      }),
      prisma.sale.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { party: true },
        orderBy: { date: 'asc' },
      }),
      prisma.oDTransaction.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' },
      })
    ])

    let totalTurnover = 0
    let totalPurchasesCost = 0
    let totalODInterestAndFees = 0

    // Construct unified ledger
    const ledger = []

    for (const p of purchases) {
      const cost = Number(p.totalCost)
      totalPurchasesCost += cost
      ledger.push({
        id: `pur-${p.id}`,
        date: p.date.toISOString(),
        type: 'PURCHASE',
        description: `Purchase of ${p.quantity} ${p.unit} ${p.commodity.replace('_', ' ')} from ${p.party.name}`,
        inflow: 0,
        outflow: cost,
        rawDetails: p
      })
    }

    for (const s of sales) {
      const revenue = Number(s.totalAmount)
      totalTurnover += revenue
      ledger.push({
        id: `sal-${s.id}`,
        date: s.date.toISOString(),
        type: 'SALE',
        description: `Sale of ${s.quantity} ${s.unit} ${s.commodity.replace('_', ' ')} to ${s.party.name}`,
        inflow: revenue,
        outflow: 0,
        rawDetails: s
      })
    }

    for (const od of odTransactions) {
      const amt = Number(od.amount)
      // If DRAW, we got money IN to our hands (though it's a liability).
      // If REPAY, we sent money OUT. 
      // This is a cashflow ledger context.
      const isDraw = od.type === 'DRAW'
      ledger.push({
        id: `od-${od.id}`,
        date: od.date.toISOString(),
        type: `OD_${od.type}`,
        description: `Overdraft ${od.type}: ${od.description || 'N/A'}`,
        inflow: isDraw ? amt : 0,
        outflow: isDraw ? 0 : amt,
        rawDetails: od
      })
    }

    // Sort ledger chronologically
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate running balance for the Ledger
    let runningBalance = 0
    const finalLedger = ledger.map(item => {
      runningBalance += (item.inflow - item.outflow)
      return { ...item, balance: runningBalance }
    })

    // Net Profit/Loss heuristic (Gross Turnover - Gross Purchases - OD Interest theoretically)
    // For simplicity: Net Profit = Total Turnover - Total Purchases Cost
    const netProfitLoss = totalTurnover - totalPurchasesCost

    return NextResponse.json({
      financialYear: `${startYear}-${endYear}`,
      startDate,
      endDate,
      kpis: {
        totalTurnover,
        totalPurchasesCost,
        netProfitLoss
      },
      ledger: finalLedger
    })

  } catch (error) {
    console.error('Failed to generate reports:', error)
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 })
  }
}
