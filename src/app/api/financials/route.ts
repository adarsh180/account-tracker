import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MONTH_NAMES = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fyParam = searchParams.get('fy')

    let startYear: number, endYear: number
    if (fyParam) {
      const parts = fyParam.split('-')
      startYear = parseInt(parts[0])
      endYear = parseInt(parts[1])
    } else {
      const now = new Date()
      startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
      endYear = startYear + 1
    }

    const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`)
    const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`)

    // Fetch all data in parallel
    const [purchases, sales, odAccounts, expenses, committeePayments, distributions] = await Promise.all([
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
      prisma.oDAccount.findMany(),
      prisma.monthlyExpense.findMany({
        where: {
          OR: [
            { year: startYear, month: { gte: 4 } },
            { year: endYear, month: { lte: 3 } },
          ],
        },
      }),
      prisma.committeePayment.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
      }),
      prisma.homeDistribution.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
        },
      }),
    ])

    // Monthly breakdown initialization (Apr-Mar)
    const monthlyData: Record<string, {
      month: string
      monthNum: number
      year: number
      sales: number
      purchases: number
      rent: number
      odInterest: number
      electricity: number
      salary: number
      miscExpense: number
      committeePayments: number
      homeDistributions: number
      grossProfit: number
      netProfit: number
    }> = {}

    // Initialize 12 months
    for (let i = 0; i < 12; i++) {
      const m = i < 9 ? i + 4 : i - 8 // Apr(4) to Mar(3)
      const y = i < 9 ? startYear : endYear
      const key = `${y}-${String(m).padStart(2, '0')}`
      monthlyData[key] = {
        month: MONTH_NAMES[i],
        monthNum: m,
        year: y,
        sales: 0,
        purchases: 0,
        rent: 0,
        odInterest: 0,
        electricity: 0,
        salary: 0,
        miscExpense: 0,
        committeePayments: 0,
        homeDistributions: 0,
        grossProfit: 0,
        netProfit: 0,
      }
    }

    // Populate sales
    sales.forEach(s => {
      const d = new Date(s.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].sales += Number(s.totalAmount)
      }
    })

    // Populate purchases
    purchases.forEach(p => {
      const d = new Date(p.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].purchases += Number(p.totalCost)
      }
    })

    // Populate expenses
    expenses.forEach(e => {
      const key = `${e.year}-${String(e.month).padStart(2, '0')}`
      if (monthlyData[key]) {
        const amount = Number(e.amount)
        switch (e.category) {
          case 'RENT': monthlyData[key].rent += amount; break
          case 'OD_INTEREST': monthlyData[key].odInterest += amount; break
          case 'ELECTRICITY': monthlyData[key].electricity += amount; break
          case 'SALARY': monthlyData[key].salary += amount; break
          default: monthlyData[key].miscExpense += amount; break
        }
      }
    })

    // Committee payments
    committeePayments.forEach(cp => {
      const d = new Date(cp.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].committeePayments += Number(cp.amount)
      }
    })

    // Home distributions
    distributions.forEach(dist => {
      const d = new Date(dist.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData[key]) {
        monthlyData[key].homeDistributions += Number(dist.amount)
      }
    })

    // Calculate profits per month
    Object.values(monthlyData).forEach(m => {
      m.grossProfit = m.sales - m.purchases
      const totalExpenses = m.rent + m.odInterest + m.electricity + m.salary + m.miscExpense
      m.netProfit = m.grossProfit - totalExpenses - m.committeePayments - m.homeDistributions
    })

    const monthly = Object.values(monthlyData)

    // Annual totals
    const annualTurnover = monthly.reduce((s, m) => s + m.sales, 0)
    const annualPurchases = monthly.reduce((s, m) => s + m.purchases, 0)
    const annualRent = monthly.reduce((s, m) => s + m.rent, 0)
    const annualODInterest = monthly.reduce((s, m) => s + m.odInterest, 0)
    const annualElectricity = monthly.reduce((s, m) => s + m.electricity, 0)
    const annualSalary = monthly.reduce((s, m) => s + m.salary, 0)
    const annualMisc = monthly.reduce((s, m) => s + m.miscExpense, 0)
    const annualCommittee = monthly.reduce((s, m) => s + m.committeePayments, 0)
    const annualDistributions = monthly.reduce((s, m) => s + m.homeDistributions, 0)
    const annualGrossProfit = annualTurnover - annualPurchases
    const annualTotalExpenses = annualRent + annualODInterest + annualElectricity + annualSalary + annualMisc
    const annualNetProfit = annualGrossProfit - annualTotalExpenses - annualCommittee - annualDistributions
    const grossMargin = annualTurnover > 0 ? (annualGrossProfit / annualTurnover) * 100 : 0
    const netMargin = annualTurnover > 0 ? (annualNetProfit / annualTurnover) * 100 : 0

    // Quarterly aggregation
    const quarterly = [
      { name: 'Q1 (Apr-Jun)', months: monthly.slice(0, 3) },
      { name: 'Q2 (Jul-Sep)', months: monthly.slice(3, 6) },
      { name: 'Q3 (Oct-Dec)', months: monthly.slice(6, 9) },
      { name: 'Q4 (Jan-Mar)', months: monthly.slice(9, 12) },
    ].map(q => ({
      name: q.name,
      sales: q.months.reduce((s, m) => s + m.sales, 0),
      purchases: q.months.reduce((s, m) => s + m.purchases, 0),
      expenses: q.months.reduce((s, m) => s + m.rent + m.odInterest + m.electricity + m.salary + m.miscExpense, 0),
      grossProfit: q.months.reduce((s, m) => s + m.grossProfit, 0),
      netProfit: q.months.reduce((s, m) => s + m.netProfit, 0),
    }))

    // OD Interest auto-calculation (current monthly estimate)
    const odMonthlyEstimate = odAccounts.reduce((sum, acc) => {
      const utilized = Number(acc.currentUtilized)
      const rate = Number(acc.interestRate)
      return sum + (utilized * rate / 12 / 100)
    }, 0)

    // Cash flow summary
    const totalCashInflow = annualTurnover
    const totalCashOutflow = annualPurchases + annualTotalExpenses + annualCommittee + annualDistributions
    const netCashFlow = totalCashInflow - totalCashOutflow

    // Goal tracking (Target: 1 Crore, Current: 35 Lakhs)
    const currentBusiness = annualTurnover > 0 ? annualTurnover : 3500000
    const targetBusiness = 10000000 // 1 Crore
    const progressToGoal = (currentBusiness / targetBusiness) * 100
    const growthNeeded = ((targetBusiness - currentBusiness) / currentBusiness) * 100
    const monthlyGrowthTarget = annualTurnover > 0
      ? Math.pow(targetBusiness / currentBusiness, 1 / 12) - 1
      : 0

    return NextResponse.json({
      financialYear: `${startYear}-${endYear}`,
      monthly,
      quarterly,
      annual: {
        turnover: Math.round(annualTurnover * 100) / 100,
        purchases: Math.round(annualPurchases * 100) / 100,
        grossProfit: Math.round(annualGrossProfit * 100) / 100,
        grossMargin: Math.round(grossMargin * 100) / 100,
        expenses: {
          rent: Math.round(annualRent * 100) / 100,
          odInterest: Math.round(annualODInterest * 100) / 100,
          electricity: Math.round(annualElectricity * 100) / 100,
          salary: Math.round(annualSalary * 100) / 100,
          misc: Math.round(annualMisc * 100) / 100,
          total: Math.round(annualTotalExpenses * 100) / 100,
        },
        committee: Math.round(annualCommittee * 100) / 100,
        distributions: Math.round(annualDistributions * 100) / 100,
        netProfit: Math.round(annualNetProfit * 100) / 100,
        netMargin: Math.round(netMargin * 100) / 100,
      },
      cashFlow: {
        totalInflow: Math.round(totalCashInflow * 100) / 100,
        totalOutflow: Math.round(totalCashOutflow * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
      },
      goalTracking: {
        currentTurnover: Math.round(currentBusiness),
        target: targetBusiness,
        progress: Math.round(progressToGoal * 100) / 100,
        growthNeededPercent: Math.round(growthNeeded * 100) / 100,
        monthlyGrowthTarget: Math.round(monthlyGrowthTarget * 10000) / 100,
        odMonthlyEstimate: Math.round(odMonthlyEstimate * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Failed to fetch financials:', error)
    return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 })
  }
}
