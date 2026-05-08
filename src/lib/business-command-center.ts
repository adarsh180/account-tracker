import { prisma } from '@/lib/prisma'

const MS_PER_DAY = 1000 * 60 * 60 * 24

export type CommandCenterMetric = {
  label: string
  value: number
  unit: 'currency' | 'percent' | 'days' | 'number'
}

export type CommandCenterIssue = {
  title: string
  severity: 'critical' | 'warning' | 'opportunity' | 'stable'
  value?: number
  detail: string
}

export type CommandCenterSnapshot = {
  generatedAt: string
  business: {
    name: string
    domain: string
    currency: string
  }
  summary: {
    totalSales: number
    totalPurchases: number
    grossProfit: number
    profitMargin: number
    outstandingReceivables: number
    inventoryValue: number
    bankSales: number
    cashSales: number
    ownCapitalEstimate: number
  }
  overdraft: {
    totalLimit: number
    totalUtilized: number
    utilizationPercent: number
    dailyInterestBurn: number
    monthlyInterestBurn: number
    accruedInterest: number
  }
  topBuyers: Array<{
    name: string
    revenue: number
    outstanding: number
    averageDso: number
    margin: number
  }>
  topSuppliers: Array<{
    name: string
    purchasedValue: number
    generatedRevenue: number
    roi: number
    averageFlipDays: number
  }>
  commodityPnL: Array<{
    commodity: string
    purchases: number
    sales: number
    profit: number
    margin: number
  }>
  inventory: Array<{
    commodity: string
    quantity: number
    unit: string
    value: number
    averageCost: number
    stagnationDays: number
    runwayDays: number
  }>
  financialYear: {
    label: string
    turnover: number
    purchases: number
    expenses: number
    netProfit: number
    netMargin: number
  }
  monthlyTrend: Array<{
    label: string
    sales: number
    purchases: number
    expenses: number
    netProfit: number
  }>
  dealFinance: {
    totalDeals: number
    openDeals: number
    grossResult: number
    brokerageIncome: number
    odMoneyUsed: number
    odConvertedToCash: number
    partnerCapital: number
    cashPaid: number
    onlinePaid: number
    cashReceived: number
    onlineReceived: number
    highRiskDeals: number
    recentDeals: Array<{
      dealName: string
      dealType: string
      itemName: string
      purchaseCost: number
      actualSaleValue: number
      brokerageAmount: number
      grossResult: number
      fundingSource: string
      partnerCapital: number
      odConvertedToCash: number
    }>
  }
  issues: CommandCenterIssue[]
  actionCandidates: string[]
}

type SaleLike = Awaited<ReturnType<typeof prisma.sale.findMany>>[number] & {
  party: { name: string }
  payments: Array<{ amount: unknown }>
  purchase: { totalCost: unknown; partyId: string } | null
}

type PurchaseLike = Awaited<ReturnType<typeof prisma.purchase.findMany>>[number] & {
  party: { name: string }
  sales: Array<{ totalAmount: unknown; quantity: unknown; date: Date }>
}

function money(value: unknown): number {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function currentFinancialYear(now = new Date()) {
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const endYear = startYear + 1

  return {
    startYear,
    endYear,
    label: `${startYear}-${endYear}`,
    startDate: new Date(`${startYear}-04-01T00:00:00.000Z`),
    endDate: new Date(`${endYear}-03-31T23:59:59.999Z`),
  }
}

function averageDso(sales: SaleLike[]): number {
  const paidSales = sales.filter((sale) => sale.isPaid && sale.paidDate)
  if (paidSales.length === 0) return 0

  const totalDays = paidSales.reduce((sum, sale) => {
    const paidDate = sale.paidDate ? new Date(sale.paidDate) : new Date()
    return sum + Math.max(0, (paidDate.getTime() - new Date(sale.date).getTime()) / MS_PER_DAY)
  }, 0)

  return Math.round(totalDays / paidSales.length)
}

function outstandingForSales(sales: SaleLike[]): number {
  return round(
    sales
      .filter((sale) => !sale.isPaid)
      .reduce((sum, sale) => {
        const paid = sale.payments.reduce((paymentSum, payment) => paymentSum + money(payment.amount), 0)
        return sum + Math.max(0, money(sale.totalAmount) - paid)
      }, 0)
  )
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function fyMonthKeys(startYear: number, endYear: number) {
  const labels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

  return labels.map((label, index) => {
    const month = index < 9 ? index + 4 : index - 8
    const year = index < 9 ? startYear : endYear
    return {
      label,
      key: `${year}-${String(month).padStart(2, '0')}`,
      month,
      year,
    }
  })
}

export async function getBusinessCommandCenterSnapshot(): Promise<CommandCenterSnapshot> {
  const fy = currentFinancialYear()

  const [
    purchases,
    sales,
    inventory,
    odAccounts,
    payments,
    parties,
    expenses,
    committeePayments,
    distributions,
    dealFinances,
  ] = await Promise.all([
    prisma.purchase.findMany({ include: { party: true, sales: true }, orderBy: { date: 'asc' } }),
    prisma.sale.findMany({ include: { party: true, payments: true, purchase: true }, orderBy: { date: 'asc' } }),
    prisma.inventory.findMany(),
    prisma.oDAccount.findMany(),
    prisma.payment.findMany(),
    prisma.party.findMany(),
    prisma.monthlyExpense.findMany({
      where: {
        OR: [
          { year: fy.startYear, month: { gte: 4 } },
          { year: fy.endYear, month: { lte: 3 } },
        ],
      },
    }),
    prisma.committeePayment.findMany({ where: { date: { gte: fy.startDate, lte: fy.endDate } } }),
    prisma.homeDistribution.findMany({ where: { date: { gte: fy.startDate, lte: fy.endDate } } }),
    prisma.dealFinance.findMany({ include: { partners: true }, orderBy: { date: 'desc' } }),
  ])

  const typedSales = sales as SaleLike[]
  const typedPurchases = purchases as PurchaseLike[]
  const buyers = parties.filter((party) => party.type === 'BUYER')
  const sellers = parties.filter((party) => party.type === 'SELLER')

  const totalPurchases = typedPurchases.reduce((sum, purchase) => sum + money(purchase.totalCost), 0)
  const totalSales = typedSales.reduce((sum, sale) => sum + money(sale.totalAmount), 0)
  const bankSales = typedSales.reduce((sum, sale) => sum + money(sale.bankAmount), 0)
  const cashSales = typedSales.reduce((sum, sale) => sum + money(sale.cashAmount), 0)
  const grossProfit = totalSales - totalPurchases
  const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
  const outstandingReceivables = outstandingForSales(typedSales)
  const totalPaymentsReceived = payments.reduce((sum, payment) => sum + money(payment.amount), 0)

  let odLimit = 0
  let odUtilized = 0
  let dailyInterestBurn = 0
  let accruedInterest = 0

  for (const account of odAccounts) {
    const utilized = money(account.currentUtilized)
    const limit = money(account.odLimit)
    const rate = money(account.interestRate)
    const dailyRate = rate / 365 / 100
    const daysSinceAccrual = Math.max(
      0,
      Math.floor((Date.now() - new Date(account.lastAccrualDate).getTime()) / MS_PER_DAY)
    )

    odLimit += limit
    odUtilized += utilized
    dailyInterestBurn += utilized * dailyRate
    accruedInterest += money(account.accruedInterest) + utilized * dailyRate * daysSinceAccrual
  }

  const topBuyers = buyers
    .map((buyer) => {
      const buyerSales = typedSales.filter((sale) => sale.partyId === buyer.id)
      const revenue = buyerSales.reduce((sum, sale) => sum + money(sale.totalAmount), 0)
      const purchaseCost = buyerSales.reduce((sum, sale) => sum + money(sale.purchase?.totalCost), 0)
      const margin = revenue > 0 ? ((revenue - purchaseCost) / revenue) * 100 : 0

      return {
        name: buyer.name,
        revenue: round(revenue),
        outstanding: outstandingForSales(buyerSales),
        averageDso: averageDso(buyerSales),
        margin: round(margin),
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  const topSuppliers = sellers
    .map((seller) => {
      const sellerPurchases = typedPurchases.filter((purchase) => purchase.partyId === seller.id)
      const purchasedValue = sellerPurchases.reduce((sum, purchase) => sum + money(purchase.totalCost), 0)
      let generatedRevenue = 0
      let flipDays = 0
      let flipCount = 0

      for (const purchase of sellerPurchases) {
        for (const sale of purchase.sales) {
          generatedRevenue += money(sale.totalAmount)
          flipDays += Math.max(0, (new Date(sale.date).getTime() - new Date(purchase.date).getTime()) / MS_PER_DAY)
          flipCount += 1
        }
      }

      const roi = purchasedValue > 0 ? ((generatedRevenue - purchasedValue) / purchasedValue) * 100 : 0

      return {
        name: seller.name,
        purchasedValue: round(purchasedValue),
        generatedRevenue: round(generatedRevenue),
        roi: round(roi),
        averageFlipDays: flipCount > 0 ? round(flipDays / flipCount, 1) : -1,
      }
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 8)

  const commodityMap = new Map<string, { purchases: number; sales: number }>()
  for (const purchase of typedPurchases) {
    const entry = commodityMap.get(purchase.commodity) ?? { purchases: 0, sales: 0 }
    entry.purchases += money(purchase.totalCost)
    commodityMap.set(purchase.commodity, entry)
  }
  for (const sale of typedSales) {
    const entry = commodityMap.get(sale.commodity) ?? { purchases: 0, sales: 0 }
    entry.sales += money(sale.totalAmount)
    commodityMap.set(sale.commodity, entry)
  }

  const commodityPnL = Array.from(commodityMap.entries())
    .map(([commodity, entry]) => {
      const profit = entry.sales - entry.purchases

      return {
        commodity,
        purchases: round(entry.purchases),
        sales: round(entry.sales),
        profit: round(profit),
        margin: entry.sales > 0 ? round((profit / entry.sales) * 100) : 0,
      }
    })
    .sort((a, b) => b.sales - a.sales)

  const inventorySnapshot = inventory
    .map((item) => {
      const commodityPurchases = typedPurchases.filter((purchase) => purchase.commodity === item.commodity)
      const commoditySales = typedSales.filter((sale) => sale.commodity === item.commodity)
      const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY)
      const recentSalesQty = commoditySales
        .filter((sale) => new Date(sale.date) >= thirtyDaysAgo)
        .reduce((sum, sale) => sum + money(sale.quantity), 0)
      const dailySaleVolume = recentSalesQty / 30

      let maxStagnationDays = 0
      for (const purchase of commodityPurchases) {
        const soldQuantity = purchase.sales.reduce((sum, sale) => sum + money(sale.quantity), 0)
        if (soldQuantity < money(purchase.quantity)) {
          maxStagnationDays = Math.max(
            maxStagnationDays,
            (Date.now() - new Date(purchase.date).getTime()) / MS_PER_DAY
          )
        }
      }

      const quantity = money(item.quantity)
      const averageCost = money(item.avgCost)

      return {
        commodity: item.commodity,
        quantity: round(quantity, 3),
        unit: item.unit,
        value: round(quantity * averageCost),
        averageCost: round(averageCost),
        stagnationDays: Math.floor(maxStagnationDays),
        runwayDays: dailySaleVolume > 0 ? Math.floor(quantity / dailySaleVolume) : 999,
      }
    })
    .sort((a, b) => b.value - a.value)

  const inventoryValue = inventorySnapshot.reduce((sum, item) => sum + item.value, 0)

  const monthly = fyMonthKeys(fy.startYear, fy.endYear).map((month) => ({
    ...month,
    sales: 0,
    purchases: 0,
    expenses: 0,
    netProfit: 0,
  }))

  const monthByKey = new Map(monthly.map((month) => [month.key, month]))

  for (const sale of typedSales.filter((sale) => sale.date >= fy.startDate && sale.date <= fy.endDate)) {
    const month = monthByKey.get(getMonthKey(sale.date))
    if (month) month.sales += money(sale.totalAmount)
  }

  for (const purchase of typedPurchases.filter((purchase) => purchase.date >= fy.startDate && purchase.date <= fy.endDate)) {
    const month = monthByKey.get(getMonthKey(purchase.date))
    if (month) month.purchases += money(purchase.totalCost)
  }

  for (const expense of expenses) {
    const month = monthByKey.get(`${expense.year}-${String(expense.month).padStart(2, '0')}`)
    if (month) month.expenses += money(expense.amount)
  }

  for (const committeePayment of committeePayments) {
    const month = monthByKey.get(getMonthKey(committeePayment.date))
    if (month) month.expenses += money(committeePayment.amount)
  }

  for (const distribution of distributions) {
    const month = monthByKey.get(getMonthKey(distribution.date))
    if (month) month.expenses += money(distribution.amount)
  }

  const monthlyTrend = monthly.map((month) => ({
    label: month.label,
    sales: round(month.sales),
    purchases: round(month.purchases),
    expenses: round(month.expenses),
    netProfit: round(month.sales - month.purchases - month.expenses),
  }))

  const fyTurnover = monthlyTrend.reduce((sum, month) => sum + month.sales, 0)
  const fyPurchases = monthlyTrend.reduce((sum, month) => sum + month.purchases, 0)
  const fyExpenses = monthlyTrend.reduce((sum, month) => sum + month.expenses, 0)
  const fyNetProfit = fyTurnover - fyPurchases - fyExpenses

  const issues: CommandCenterIssue[] = []
  if (profitMargin < 3 && totalSales > 0) {
    issues.push({
      title: 'Margin pressure',
      severity: profitMargin < 0 ? 'critical' : 'warning',
      value: round(profitMargin),
      detail: 'Net trading margin is below a healthy buffer for scrap volatility and OD interest.',
    })
  }
  if (odLimit > 0 && odUtilized / odLimit > 0.75) {
    issues.push({
      title: 'High OD utilization',
      severity: odUtilized / odLimit > 0.9 ? 'critical' : 'warning',
      value: round((odUtilized / odLimit) * 100),
      detail: 'Debt headroom is tight. Collections and fast inventory conversion should be prioritized.',
    })
  }
  if (outstandingReceivables > totalSales * 0.25 && totalSales > 0) {
    issues.push({
      title: 'Receivable concentration',
      severity: 'warning',
      value: outstandingReceivables,
      detail: 'A large share of turnover is still unpaid, which can quietly increase interest cost.',
    })
  }

  for (const item of inventorySnapshot.filter((item) => item.stagnationDays > 30 && item.value > 0).slice(0, 3)) {
    issues.push({
      title: `${item.commodity.replaceAll('_', ' ')} inventory aging`,
      severity: 'opportunity',
      value: item.value,
      detail: `${item.stagnationDays} days of stagnation. Consider pricing it to release working capital.`,
    })
  }

  const dealFinance = {
    totalDeals: dealFinances.length,
    openDeals: dealFinances.filter((deal) => deal.status === 'OPEN').length,
    grossResult: round(
      dealFinances.reduce((sum, deal) => {
        const purchaseCost = money(deal.purchaseCost)
        const actualSaleValue = money(deal.actualSaleValue)
        const expectedSaleValue = money(deal.expectedSaleValue)
        const brokerageAmount = money(deal.brokerageAmount)
        const result = deal.dealType === 'BROKERAGE'
          ? brokerageAmount
          : (actualSaleValue > 0 ? actualSaleValue : expectedSaleValue) + brokerageAmount - purchaseCost
        return sum + result
      }, 0)
    ),
    brokerageIncome: round(dealFinances.reduce((sum, deal) => sum + money(deal.brokerageAmount), 0)),
    odMoneyUsed: round(dealFinances.reduce((sum, deal) => sum + money(deal.odMoneyAmount), 0)),
    odConvertedToCash: round(dealFinances.reduce((sum, deal) => sum + money(deal.odToCashAmount), 0)),
    partnerCapital: round(dealFinances.reduce((sum, deal) => sum + money(deal.partnerMoneyAmount), 0)),
    cashPaid: round(dealFinances.reduce((sum, deal) => sum + money(deal.cashPaidAmount), 0)),
    onlinePaid: round(dealFinances.reduce((sum, deal) => sum + money(deal.onlinePaidAmount), 0)),
    cashReceived: round(dealFinances.reduce((sum, deal) => sum + money(deal.cashReceivedAmount), 0)),
    onlineReceived: round(dealFinances.reduce((sum, deal) => sum + money(deal.onlineReceivedAmount), 0)),
    highRiskDeals: dealFinances.filter((deal) => money(deal.odToCashAmount) > 0 || (money(deal.odMoneyAmount) > 0 && deal.status === 'OPEN')).length,
    recentDeals: dealFinances.slice(0, 8).map((deal) => {
      const purchaseCost = money(deal.purchaseCost)
      const actualSaleValue = money(deal.actualSaleValue)
      const expectedSaleValue = money(deal.expectedSaleValue)
      const brokerageAmount = money(deal.brokerageAmount)
      return {
        dealName: deal.dealName,
        dealType: deal.dealType,
        itemName: deal.itemName,
        purchaseCost: round(purchaseCost),
        actualSaleValue: round(actualSaleValue),
        brokerageAmount: round(brokerageAmount),
        grossResult: round(deal.dealType === 'BROKERAGE' ? brokerageAmount : (actualSaleValue > 0 ? actualSaleValue : expectedSaleValue) + brokerageAmount - purchaseCost),
        fundingSource: deal.fundingSource,
        partnerCapital: round(money(deal.partnerMoneyAmount)),
        odConvertedToCash: round(money(deal.odToCashAmount)),
      }
    }),
  }

  if (dealFinance.odConvertedToCash > 0) {
    issues.push({
      title: 'OD converted to cash',
      severity: 'critical',
      value: dealFinance.odConvertedToCash,
      detail: 'Some deals use overdraft money converted into cash. These need strict repayment tracking and cash trail notes.',
    })
  }
  if (dealFinance.partnerCapital > 0) {
    issues.push({
      title: 'Partner capital involved',
      severity: 'opportunity',
      value: dealFinance.partnerCapital,
      detail: 'Partnership deals are recorded. Reconcile partner contribution, profit share, and payout before closing each deal.',
    })
  }

  if (issues.length === 0) {
    issues.push({
      title: 'Operating base is stable',
      severity: 'stable',
      detail: 'No severe risk pattern was detected from the current ledger snapshot.',
    })
  }

  const actionCandidates = [
    ...topBuyers
      .filter((buyer) => buyer.outstanding > 0)
      .slice(0, 3)
      .map((buyer) => `Collect Rs. ${Math.round(buyer.outstanding).toLocaleString('en-IN')} from ${buyer.name}`),
    ...inventorySnapshot
      .filter((item) => item.stagnationDays > 30 && item.value > 0)
      .slice(0, 3)
      .map((item) => `Move ${item.commodity.replaceAll('_', ' ')} stock worth Rs. ${Math.round(item.value).toLocaleString('en-IN')}`),
    ...commodityPnL
      .filter((item) => item.sales > 0 && item.margin < 5)
      .slice(0, 2)
      .map((item) => `Review pricing on ${item.commodity.replaceAll('_', ' ')} because margin is ${item.margin}%`),
    ...(dealFinance.odConvertedToCash > 0 ? [`Repay or reconcile OD-to-cash exposure of Rs. ${Math.round(dealFinance.odConvertedToCash).toLocaleString('en-IN')}`] : []),
    ...(dealFinance.brokerageIncome > 0 ? [`Protect brokerage income of Rs. ${Math.round(dealFinance.brokerageIncome).toLocaleString('en-IN')} with clear collection records`] : []),
  ]

  return {
    generatedAt: new Date().toISOString(),
    business: {
      name: 'Royal Iron Steel Supply',
      domain: 'Scrap trade ledger, inventory, sales, purchases, OD, expenses, personal distributions',
      currency: 'INR',
    },
    summary: {
      totalSales: round(totalSales),
      totalPurchases: round(totalPurchases),
      grossProfit: round(grossProfit),
      profitMargin: round(profitMargin),
      outstandingReceivables,
      inventoryValue: round(inventoryValue),
      bankSales: round(bankSales),
      cashSales: round(cashSales),
      ownCapitalEstimate: round(totalPaymentsReceived - odUtilized),
    },
    overdraft: {
      totalLimit: round(odLimit),
      totalUtilized: round(odUtilized),
      utilizationPercent: odLimit > 0 ? round((odUtilized / odLimit) * 100) : 0,
      dailyInterestBurn: round(dailyInterestBurn),
      monthlyInterestBurn: round(dailyInterestBurn * 30),
      accruedInterest: round(accruedInterest),
    },
    topBuyers,
    topSuppliers,
    commodityPnL,
    inventory: inventorySnapshot,
    financialYear: {
      label: fy.label,
      turnover: round(fyTurnover),
      purchases: round(fyPurchases),
      expenses: round(fyExpenses),
      netProfit: round(fyNetProfit),
      netMargin: fyTurnover > 0 ? round((fyNetProfit / fyTurnover) * 100) : 0,
    },
    monthlyTrend,
    dealFinance,
    issues,
    actionCandidates: actionCandidates.slice(0, 8),
  }
}
