import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEAL_TYPES = ['DIRECT_PURCHASE', 'OD_TO_CASH_PURCHASE', 'PARTNERSHIP', 'BROKERAGE', 'RESALE']
const FUNDING_SOURCES = ['OWN_MONEY', 'EARNED_MONEY', 'OD_MONEY', 'OD_TO_CASH', 'PARTNER_MONEY', 'MIXED', 'BROKERAGE_ONLY']

type PartnerInput = {
  partnerName?: string
  investedAmount?: unknown
  sharePercent?: unknown
  expectedReturn?: unknown
  actualReturn?: unknown
  notes?: string
}

function amount(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function pickAllowed(value: unknown, allowed: string[], fallback: string) {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback
}

function dealRisk(input: {
  dealType: string
  odMoneyAmount: number
  odToCashAmount: number
  partnerMoneyAmount: number
  purchaseCost: number
  actualSaleValue: number
  brokerageAmount: number
}) {
  if (input.dealType === 'BROKERAGE') return input.brokerageAmount > 0 ? 'LOW' : 'WATCH'
  if (input.odToCashAmount > 0) return 'HIGH'
  if (input.odMoneyAmount > 0 && input.actualSaleValue < input.purchaseCost) return 'HIGH'
  if (input.partnerMoneyAmount > 0) return 'MEDIUM'
  return 'LOW'
}

function dealInsight(input: {
  dealType: string
  odMoneyAmount: number
  odToCashAmount: number
  partnerMoneyAmount: number
  purchaseCost: number
  expectedSaleValue: number
  actualSaleValue: number
  brokerageAmount: number
}) {
  if (input.dealType === 'BROKERAGE') {
    return input.brokerageAmount > 0
      ? 'Brokerage-only deal. No inventory capital is locked if collection is complete.'
      : 'Brokerage deal needs expected or received brokerage amount.'
  }
  if (input.odToCashAmount > 0) {
    return 'OD was converted into cash for this deal. Keep repayment and cash trail tightly recorded.'
  }
  if (input.partnerMoneyAmount > 0) {
    return 'Partnership money is involved. Partner contribution and return split should be reconciled at close.'
  }
  if (input.odMoneyAmount > 0) {
    return 'OD money is funding this deal. Fast sale and payment recovery matter more than headline margin.'
  }
  if (input.expectedSaleValue > input.purchaseCost) {
    return 'Expected sale value is above purchase cost. Track whether actual receipts match the plan.'
  }
  return 'Own or earned money is being used. Track sale linkage and receipt mode for complete profitability.'
}

export async function GET() {
  try {
    const deals = await prisma.dealFinance.findMany({
      orderBy: { date: 'desc' },
      include: {
        partners: true,
        purchase: { include: { party: true } },
        sale: { include: { party: true, payments: true } },
      },
    })

    const normalizedDeals = deals.map((deal) => {
      const purchaseCost = amount(deal.purchaseCost)
      const actualSaleValue = amount(deal.actualSaleValue) || amount(deal.sale?.totalAmount)
      const brokerageAmount = amount(deal.brokerageAmount)
      const grossResult =
        deal.dealType === 'BROKERAGE'
          ? brokerageAmount
          : actualSaleValue > 0
            ? actualSaleValue + brokerageAmount - purchaseCost
            : amount(deal.expectedSaleValue) + brokerageAmount - purchaseCost
      const totalReceived = amount(deal.cashReceivedAmount) + amount(deal.onlineReceivedAmount)
      const totalPaid = amount(deal.cashPaidAmount) + amount(deal.onlinePaidAmount)
      const odMoneyAmount = amount(deal.odMoneyAmount)
      const odToCashAmount = amount(deal.odToCashAmount)
      const partnerMoneyAmount = amount(deal.partnerMoneyAmount)

      return {
        id: deal.id,
        dealName: deal.dealName,
        dealType: deal.dealType,
        status: deal.status,
        itemName: deal.itemName,
        quantity: deal.quantity === null ? null : amount(deal.quantity),
        unit: deal.unit,
        purchaseId: deal.purchaseId,
        saleId: deal.saleId,
        dealValue: amount(deal.dealValue),
        purchaseCost,
        expectedSaleValue: amount(deal.expectedSaleValue),
        actualSaleValue,
        brokerageAmount,
        fundingSource: deal.fundingSource,
        ownMoneyAmount: amount(deal.ownMoneyAmount),
        earnedMoneyAmount: amount(deal.earnedMoneyAmount),
        odMoneyAmount,
        odToCashAmount,
        partnerMoneyAmount,
        cashPaidAmount: amount(deal.cashPaidAmount),
        onlinePaidAmount: amount(deal.onlinePaidAmount),
        cashReceivedAmount: amount(deal.cashReceivedAmount),
        onlineReceivedAmount: amount(deal.onlineReceivedAmount),
        shownToParty: deal.shownToParty,
        buyerPartyName: deal.buyerPartyName || deal.sale?.party?.name || null,
        sellerPartyName: deal.sellerPartyName || deal.purchase?.party?.name || null,
        profitShareNotes: deal.profitShareNotes,
        notes: deal.notes,
        date: deal.date,
        partners: deal.partners.map((partner) => ({
          id: partner.id,
          partnerName: partner.partnerName,
          investedAmount: amount(partner.investedAmount),
          sharePercent: amount(partner.sharePercent),
          expectedReturn: amount(partner.expectedReturn),
          actualReturn: amount(partner.actualReturn),
          notes: partner.notes,
        })),
        totalPaid: round(totalPaid),
        totalReceived: round(totalReceived),
        grossResult: round(grossResult),
        risk: dealRisk({ dealType: deal.dealType, odMoneyAmount, odToCashAmount, partnerMoneyAmount, purchaseCost, actualSaleValue, brokerageAmount }),
        insight: dealInsight({
          dealType: deal.dealType,
          odMoneyAmount,
          odToCashAmount,
          partnerMoneyAmount,
          purchaseCost,
          expectedSaleValue: amount(deal.expectedSaleValue),
          actualSaleValue,
          brokerageAmount,
        }),
      }
    })

    const summary = {
      totalDeals: normalizedDeals.length,
      openDeals: normalizedDeals.filter((deal) => deal.status === 'OPEN').length,
      totalPurchaseCost: round(normalizedDeals.reduce((sum, deal) => sum + deal.purchaseCost, 0)),
      expectedSales: round(normalizedDeals.reduce((sum, deal) => sum + deal.expectedSaleValue, 0)),
      actualSales: round(normalizedDeals.reduce((sum, deal) => sum + deal.actualSaleValue, 0)),
      brokerage: round(normalizedDeals.reduce((sum, deal) => sum + deal.brokerageAmount, 0)),
      grossResult: round(normalizedDeals.reduce((sum, deal) => sum + deal.grossResult, 0)),
      ownMoney: round(normalizedDeals.reduce((sum, deal) => sum + deal.ownMoneyAmount, 0)),
      earnedMoney: round(normalizedDeals.reduce((sum, deal) => sum + deal.earnedMoneyAmount, 0)),
      odMoney: round(normalizedDeals.reduce((sum, deal) => sum + deal.odMoneyAmount, 0)),
      odToCash: round(normalizedDeals.reduce((sum, deal) => sum + deal.odToCashAmount, 0)),
      partnerMoney: round(normalizedDeals.reduce((sum, deal) => sum + deal.partnerMoneyAmount, 0)),
      cashPaid: round(normalizedDeals.reduce((sum, deal) => sum + deal.cashPaidAmount, 0)),
      onlinePaid: round(normalizedDeals.reduce((sum, deal) => sum + deal.onlinePaidAmount, 0)),
      cashReceived: round(normalizedDeals.reduce((sum, deal) => sum + deal.cashReceivedAmount, 0)),
      onlineReceived: round(normalizedDeals.reduce((sum, deal) => sum + deal.onlineReceivedAmount, 0)),
    }

    const typeSummary = Object.values(
      normalizedDeals.reduce<Record<string, { dealType: string; count: number; value: number; result: number }>>((acc, deal) => {
        if (!acc[deal.dealType]) acc[deal.dealType] = { dealType: deal.dealType, count: 0, value: 0, result: 0 }
        acc[deal.dealType].count += 1
        acc[deal.dealType].value += deal.dealValue || deal.purchaseCost || deal.brokerageAmount
        acc[deal.dealType].result += deal.grossResult
        return acc
      }, {})
    ).map((item) => ({ ...item, value: round(item.value), result: round(item.result) }))

    const intelligence = [
      summary.odToCash > 0
        ? `OD converted to cash is Rs. ${Math.round(summary.odToCash).toLocaleString('en-IN')}. Keep these deals on a repayment watchlist.`
        : 'No OD-to-cash deal is recorded.',
      summary.partnerMoney > 0
        ? `Partner capital involved is Rs. ${Math.round(summary.partnerMoney).toLocaleString('en-IN')}. Reconcile contribution and payout on every partnership deal.`
        : 'No partner capital is currently recorded.',
      summary.brokerage > 0
        ? `Brokerage income tracked is Rs. ${Math.round(summary.brokerage).toLocaleString('en-IN')}. This is high-quality income when no capital is locked.`
        : 'No brokerage income is recorded yet.',
      summary.cashReceived > summary.onlineReceived
        ? 'Cash receipts are higher than online receipts in deal tracking. Keep cash trail notes strong.'
        : 'Online receipts are equal or higher than cash receipts in deal tracking.',
    ]

    return NextResponse.json({ deals: normalizedDeals, summary, typeSummary, intelligence })
  } catch (error) {
    console.error('Failed to fetch deal finance:', error)
    return NextResponse.json({ error: 'Failed to fetch deal finance' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const dealType = pickAllowed(body.dealType, DEAL_TYPES, 'DIRECT_PURCHASE')
    const fundingSource = pickAllowed(body.fundingSource, FUNDING_SOURCES, dealType === 'BROKERAGE' ? 'BROKERAGE_ONLY' : 'OWN_MONEY')
    const partners = Array.isArray(body.partners) ? (body.partners as PartnerInput[]) : []

    if (!body.dealName || !body.itemName) {
      return NextResponse.json({ error: 'Deal name and item name are required' }, { status: 400 })
    }

    const created = await prisma.dealFinance.create({
      data: {
        dealName: String(body.dealName),
        dealType,
        status: pickAllowed(body.status, ['OPEN', 'CLOSED', 'CANCELLED'], 'OPEN'),
        itemName: String(body.itemName),
        quantity: body.quantity ? amount(body.quantity) : null,
        unit: stringOrNull(body.unit),
        purchaseId: stringOrNull(body.purchaseId),
        saleId: stringOrNull(body.saleId),
        dealValue: amount(body.dealValue),
        purchaseCost: amount(body.purchaseCost),
        expectedSaleValue: amount(body.expectedSaleValue),
        actualSaleValue: amount(body.actualSaleValue),
        brokerageAmount: amount(body.brokerageAmount),
        fundingSource,
        ownMoneyAmount: amount(body.ownMoneyAmount),
        earnedMoneyAmount: amount(body.earnedMoneyAmount),
        odMoneyAmount: amount(body.odMoneyAmount),
        odToCashAmount: amount(body.odToCashAmount),
        partnerMoneyAmount: amount(body.partnerMoneyAmount),
        cashPaidAmount: amount(body.cashPaidAmount),
        onlinePaidAmount: amount(body.onlinePaidAmount),
        cashReceivedAmount: amount(body.cashReceivedAmount),
        onlineReceivedAmount: amount(body.onlineReceivedAmount),
        shownToParty: stringOrNull(body.shownToParty),
        buyerPartyName: stringOrNull(body.buyerPartyName),
        sellerPartyName: stringOrNull(body.sellerPartyName),
        profitShareNotes: stringOrNull(body.profitShareNotes),
        notes: stringOrNull(body.notes),
        date: body.date ? new Date(String(body.date)) : new Date(),
        partners: {
          create: partners
            .filter((partner) => partner.partnerName && String(partner.partnerName).trim().length > 0)
            .map((partner) => ({
              partnerName: String(partner.partnerName),
              investedAmount: amount(partner.investedAmount),
              sharePercent: amount(partner.sharePercent),
              expectedReturn: amount(partner.expectedReturn),
              actualReturn: amount(partner.actualReturn),
              notes: stringOrNull(partner.notes),
            })),
        },
      },
      include: { partners: true },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Failed to create deal finance:', error)
    return NextResponse.json({ error: 'Failed to create deal finance' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.dealFinance.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete deal finance:', error)
    return NextResponse.json({ error: 'Failed to delete deal finance' }, { status: 500 })
  }
}
