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
      prisma.purchase.findMany({ include: { party: true, sales: true } }),
      prisma.sale.findMany({ include: { party: true, payments: true, purchase: true } }),
      prisma.inventory.findMany(),
      prisma.oDAccount.findMany({ include: { transactions: true } }),
      prisma.payment.findMany(),
      prisma.party.findMany(),
    ])

    const buyers = parties.filter(p => p.type === 'BUYER')
    const sellers = parties.filter(p => p.type === 'SELLER')

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
    const buyerMetrics = buyers.map((buyer) => {
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

      // Ideal Customer Profile (ICP) Score out of 100
      // 40% Volume, 40% Margin, 20% Fast Payment (DSO)
      const maxPossibleRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
      const volumeScore = maxPossibleRevenue > 0 ? (totalBuyerRevenue / maxPossibleRevenue) * 40 : 0
      const marginScore = Math.min((buyerMargin / 20) * 40, 40) // Assume 20% margin is "perfect" score
      const dsoScore = avgDSO <= 0 ? 20 : Math.max(0, 20 - (avgDSO / 3)) // Lose points past 0 days
      const icpScore = Math.round(volumeScore + marginScore + dsoScore)

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
        icpScore
      }
    })

    // Seller Grading (Supplier Metrics)
    const sellerMetrics = sellers.map((seller) => {
      const sellerPurchases = purchases.filter((p) => p.partyId === seller.id)
      const totalPurchasedVolume = sellerPurchases.reduce((sum, p) => sum + Number(p.quantity), 0)
      const totalPurchasedValue = sellerPurchases.reduce((sum, p) => sum + Number(p.totalCost), 0)

      // Calculate generated revenue and pure profit from this supplier
      let generatedRevenue = 0
      sellerPurchases.forEach(p => {
        p.sales.forEach(s => {
          generatedRevenue += Number(s.totalAmount)
        })
      })
      const pureProfit = generatedRevenue > 0 ? generatedRevenue - totalPurchasedValue : 0
      const roi = totalPurchasedValue > 0 ? (pureProfit / totalPurchasedValue) * 100 : 0

      // Calculate time-to-cash (Velocity) for this supplier's goods
      let totalFlipDays = 0
      let flipCount = 0
      sellerPurchases.forEach(p => {
        p.sales.forEach(s => {
          const pDate = new Date(p.date)
          const sDate = new Date(s.date)
          totalFlipDays += (sDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24)
          flipCount++
        })
      })
      const avgFlipDays = flipCount > 0 ? totalFlipDays / flipCount : -1 // -1 means unsold

      return {
        id: seller.id,
        name: seller.name,
        totalPurchasedValue: Math.round(totalPurchasedValue * 100) / 100,
        volume: totalPurchasedVolume,
        generatedRevenue: Math.round(generatedRevenue * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        avgFlipDays: Math.round(avgFlipDays * 10) / 10
      }
    })

    // Commodity Velocity
    const commodityVelocity = inventory.map(inv => {
      const commPurchases = purchases.filter(p => p.commodity === inv.commodity)
      const commSales = sales.filter(s => s.commodity === inv.commodity)
      
      const qtyPurchased = commPurchases.reduce((sum, p) => sum + Number(p.quantity), 0)
      const qtySold = commSales.reduce((sum, s) => sum + Number(s.quantity), 0)
      const turnoverRate = qtyPurchased > 0 ? (qtySold / qtyPurchased) * 100 : 0
      
      // Calculate how many days unsold inventory has been sitting (stagnation)
      let maxStagnationDays = 0
      if (Number(inv.quantity) > 0) {
        commPurchases.forEach(p => {
          // If this purchase hasn't been completely sold
          const pSold = p.sales.reduce((sum, s) => sum + Number(s.quantity), 0)
          if (pSold < Number(p.quantity)) {
            const ageDays = (Date.now() - new Date(p.date).getTime()) / (1000 * 60 * 60 * 24)
            if (ageDays > maxStagnationDays) maxStagnationDays = ageDays
          }
        })
      }

      // Calculate Daily Sale Volume (Average over last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentSalesQty = commSales
        .filter(s => new Date(s.date) >= thirtyDaysAgo)
        .reduce((sum, s) => sum + Number(s.quantity), 0)
      const dailySaleVolume = recentSalesQty / 30

      return {
        commodity: inv.commodity,
        quantity: Number(inv.quantity),
        value: Math.round(Number(inv.quantity) * Number(inv.avgCost)),
        turnoverRate: Math.round(turnoverRate * 100) / 100,
        stagnationDays: Math.floor(maxStagnationDays),
        dailySaleVolume // Needed for Smart Restocking
      }
    })

    // Pricing Fraud/Anomaly Detector
    const anomalies: Array<{ type: string; date: string; commodity: string; party: string; variance: number; message: string }> = []
    
    inventory.forEach(inv => {
      const wac = Number(inv.avgCost)
      if (wac <= 0) return

      // Check recent purchases against WAC
      purchases.filter(p => p.commodity === inv.commodity).slice(-10).forEach(p => {
        const unitPrice = Number(p.totalCost) / Number(p.quantity)
        const variance = ((unitPrice - wac) / wac) * 100
        if (Math.abs(variance) > 15) {
          anomalies.push({
            type: 'PURCHASE',
            date: p.date.toISOString(),
            commodity: p.commodity,
            party: p.party.name,
            variance: Math.round(variance * 10) / 10,
            message: `Purchased at ₹${unitPrice.toFixed(2)}/kg (WAC is ₹${wac.toFixed(2)})`
          })
        }
      })

      // Check recent sales against WAC
      sales.filter(s => s.commodity === inv.commodity).slice(-10).forEach(s => {
        const unitPrice = Number(s.totalAmount) / Number(s.quantity)
        const variance = ((unitPrice - wac) / wac) * 100
        // Flag if sold for LESS than WAC (negative variance)
        if (variance < -5) {
          anomalies.push({
            type: 'SALE_LOSS',
            date: s.date.toISOString(),
            commodity: s.commodity,
            party: s.party.name,
            variance: Math.round(variance * 10) / 10,
            message: `Sold at ₹${unitPrice.toFixed(2)}/kg (WAC is ₹${wac.toFixed(2)}). Loss-making sale.`
          })
        }
      })
    })

    // Cashflow Runway Predictor
    // Calculate average daily inflows over the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentPayments = payments.filter(p => new Date(p.date) >= thirtyDaysAgo)
    const dailyAvgInflow = recentPayments.reduce((sum, p) => sum + Number(p.amount), 0) / 30

    // Remaining OD availability
    const availableOD = Math.max(0, totalODLimit - totalODUtilized)
    
    // Runway = Available Cash / Net Daily Burn (OD Interest + Operational Estimates - Average Inflows)
    // If daily inflow > burn, runway is infinite.
    const netDailyBurn = totalDailyBurn - dailyAvgInflow
    let runwayDays = -1 // Infinite
    if (netDailyBurn > 0) {
      runwayDays = Math.floor(availableOD / netDailyBurn)
    }

    // OD Threat Analytics
    const cashInflow = totalPaymentsReceived

    const odThreatScore = cashInflow > 0 ? (totalODUtilized / cashInflow) * 100 : (totalODUtilized > 0 ? 999 : 0)
    const odThreat = {
      score: Math.round(odThreatScore * 100) / 100,
      monthlyBurn: Math.round(totalDailyBurn * 30),
      isCritical: odThreatScore > 80 || (totalDailyBurn * 30) > totalProfit, // Critical if OD debt > 80% of cash inflows or interest eats all profit
      runwayDays,
      dailyAvgInflow: Math.round(dailyAvgInflow)
    }


    // Inventory summary with Restocking Needs
    const inventorySummary = inventory.map((inv) => {
      const vData = commodityVelocity.find(v => v.commodity === inv.commodity)
      const dailyVolume = vData?.dailySaleVolume || 0
      const runway = dailyVolume > 0 ? Number(inv.quantity) / dailyVolume : 999

      return {
        commodity: inv.commodity,
        unit: inv.unit,
        quantity: Number(inv.quantity),
        avgCost: Number(inv.avgCost),
        totalValue: Math.round(Number(inv.quantity) * Number(inv.avgCost) * 100) / 100,
        stockRunwayDays: Math.floor(runway),
        needsRestock: runway < 7 && runway > 0 // Less than 7 days of stock left
      }
    })
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
      sellerMetrics: sellerMetrics.sort((a, b) => b.roi - a.roi),
      inventory: inventorySummary,
      commodityVelocity: commodityVelocity.sort((a, b) => b.stagnationDays - a.stagnationDays),
      odThreat,
      anomalies,
      recentTransactions,
      commodityPnL,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
