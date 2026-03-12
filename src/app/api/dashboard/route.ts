import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Fetch all needed data in parallel
    const [
      purchases,
      sales,
      inventory,
      odAccounts,
      payments,
      parties,
    ] = await Promise.all([
      prisma.purchase.findMany({ include: { party: true } }),
      prisma.sale.findMany({ include: { party: true, payments: true, purchase: true } }),
      prisma.inventory.findMany(),
      prisma.oDAccount.findMany({ include: { transactions: true } }),
      prisma.payment.findMany(),
      prisma.party.findMany({ where: { type: 'BUYER' } }),
    ])

    // Total Purchases
    const totalPurchases = purchases.reduce(
      (sum, p) => sum + Number(p.totalCost),
      0
    )

    // Total Sales
    const totalSales = sales.reduce(
      (sum, s) => sum + Number(s.totalAmount),
      0
    )

    // Bank vs Cash totals
    const totalBankAmount = sales.reduce(
      (sum, s) => sum + Number(s.bankAmount),
      0
    )
    const totalCashAmount = sales.reduce(
      (sum, s) => sum + Number(s.cashAmount),
      0
    )

    // Profit calculations
    const totalProfit = totalSales - totalPurchases
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

    // Bank view profit (only bank amounts)
    const bankViewProfit = totalBankAmount - totalPurchases
    const bankProfitMargin =
      totalBankAmount > 0 ? (bankViewProfit / totalBankAmount) * 100 : 0

    // OD analysis
    let totalODUtilized = 0
    let totalODLimit = 0
    let totalDailyBurn = 0
    let totalAccruedInterest = 0

    const odDetails = odAccounts.map((acc) => {
      const utilized = Number(acc.currentUtilized)
      const limit = Number(acc.odLimit)
      const rate = Number(acc.interestRate)
      const dailyRate = rate / 365 / 100
      const dailyBurn = utilized * dailyRate
      const daysSinceAccrual = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(acc.lastAccrualDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
      const pendingInterest = utilized * dailyRate * daysSinceAccrual

      totalODUtilized += utilized
      totalODLimit += limit
      totalDailyBurn += dailyBurn
      totalAccruedInterest += Number(acc.accruedInterest) + pendingInterest

      return {
        id: acc.id,
        bankName: acc.bankName,
        utilized,
        limit,
        rate,
        dailyBurn: Math.round(dailyBurn * 100) / 100,
        pendingInterest: Math.round(pendingInterest * 100) / 100,
        utilizationPercent: limit > 0 ? Math.round((utilized / limit) * 10000) / 100 : 0,
      }
    })

    // Own Capital = total cash/bank position - OD utilized
    const totalPaymentsReceived = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )
    const ownCapital = totalPaymentsReceived - totalODUtilized

    // Outstanding receivables
    const totalOutstanding = sales
      .filter((s) => !s.isPaid)
      .reduce((sum, s) => {
        const paid = s.payments.reduce(
          (pSum, p) => pSum + Number(p.amount),
          0
        )
        return sum + (Number(s.totalAmount) - paid)
      }, 0)

    // Buyer DSO calculation
    const buyerMetrics = parties.map((buyer) => {
      const buyerSales = sales.filter((s) => s.partyId === buyer.id)
      const paidSales = buyerSales.filter((s) => s.isPaid && s.paidDate)

      let avgDSO = 0
      if (paidSales.length > 0) {
        const totalDays = paidSales.reduce((sum, s) => {
          const saleDate = new Date(s.date)
          const paidDate = new Date(s.paidDate!)
          return (
            sum + (paidDate.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        }, 0)
        avgDSO = Math.round(totalDays / paidSales.length)
      }

      const totalBuyerRevenue = buyerSales.reduce(
        (sum, s) => sum + Number(s.totalAmount),
        0
      )
      const totalBuyerProfit =
        totalBuyerRevenue -
        buyerSales.reduce((sum, s) => {
          if (s.purchase) return sum + Number(s.purchase.totalCost)
          return sum
        }, 0)
      const buyerMargin =
        totalBuyerRevenue > 0
          ? (totalBuyerProfit / totalBuyerRevenue) * 100
          : 0

      const unpaidSales = buyerSales.filter((s) => !s.isPaid)
      const outstanding = unpaidSales.reduce((sum, s) => {
        const paid = s.payments.reduce(
          (pSum, p) => pSum + Number(p.amount),
          0
        )
        return sum + (Number(s.totalAmount) - paid)
      }, 0)

      // Profit-to-Wait Ratio
      const profitToWait =
        avgDSO > 0 ? buyerMargin / avgDSO : buyerMargin > 0 ? buyerMargin : 0

      return {
        id: buyer.id,
        name: buyer.name,
        totalSales: buyerSales.length,
        totalRevenue: Math.round(totalBuyerRevenue * 100) / 100,
        avgDSO,
        outstanding: Math.round(outstanding * 100) / 100,
        margin: Math.round(buyerMargin * 100) / 100,
        profitToWait: Math.round(profitToWait * 100) / 100,
        isLate: avgDSO > 15,
      }
    })

    // Inventory summary
    const inventorySummary = inventory.map((inv) => ({
      commodity: inv.commodity,
      unit: inv.unit,
      quantity: Number(inv.quantity),
      avgCost: Number(inv.avgCost),
      totalValue: Math.round(Number(inv.quantity) * Number(inv.avgCost) * 100) / 100,
    }))
    const totalInventoryValue = inventorySummary.reduce(
      (sum, inv) => sum + inv.totalValue,
      0
    )

    // Recent transactions (last 10)
    const recentPurchases = purchases.slice(0, 5).map((p) => ({
      type: 'purchase' as const,
      commodity: p.commodity,
      quantity: Number(p.quantity),
      amount: Number(p.totalCost),
      party: p.party.name,
      date: p.date,
    }))
    const recentSales = sales.slice(0, 5).map((s) => ({
      type: 'sale' as const,
      commodity: s.commodity,
      quantity: Number(s.quantity),
      amount: Number(s.totalAmount),
      party: s.party.name,
      date: s.date,
    }))
    const recentTransactions = [...recentPurchases, ...recentSales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    // Commodity-wise P&L
    const commodityPnL: Record<string, { purchases: number; sales: number; profit: number }> = {}
    purchases.forEach((p) => {
      if (!commodityPnL[p.commodity]) {
        commodityPnL[p.commodity] = { purchases: 0, sales: 0, profit: 0 }
      }
      commodityPnL[p.commodity].purchases += Number(p.totalCost)
    })
    sales.forEach((s) => {
      if (!commodityPnL[s.commodity]) {
        commodityPnL[s.commodity] = { purchases: 0, sales: 0, profit: 0 }
      }
      commodityPnL[s.commodity].sales += Number(s.totalAmount)
    })
    Object.keys(commodityPnL).forEach((commodity) => {
      commodityPnL[commodity].profit =
        commodityPnL[commodity].sales - commodityPnL[commodity].purchases
    })

    return NextResponse.json({
      summary: {
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        ownCapital: Math.round(ownCapital * 100) / 100,
      },
      bankVsReality: {
        bankProfit: Math.round(bankViewProfit * 100) / 100,
        bankProfitMargin: Math.round(bankProfitMargin * 100) / 100,
        trueProfit: Math.round(totalProfit * 100) / 100,
        trueProfitMargin: Math.round(profitMargin * 100) / 100,
        totalBankAmount: Math.round(totalBankAmount * 100) / 100,
        totalCashAmount: Math.round(totalCashAmount * 100) / 100,
      },
      overdraft: {
        totalUtilized: Math.round(totalODUtilized * 100) / 100,
        totalLimit: Math.round(totalODLimit * 100) / 100,
        dailyBurn: Math.round(totalDailyBurn * 100) / 100,
        accruedInterest: Math.round(totalAccruedInterest * 100) / 100,
        accounts: odDetails,
      },
      buyerMetrics: buyerMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue),
      inventory: inventorySummary,
      recentTransactions,
      commodityPnL,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
