import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { date: 'desc' },
      include: { sale: true, party: true },
    })
    return NextResponse.json(payments)
  } catch (error) {
    console.error('Failed to fetch payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const payment = await prisma.payment.create({
      data: {
        saleId: body.saleId,
        partyId: body.partyId,
        amount: new Prisma.Decimal(body.amount),
        mode: body.mode,
        reference: body.reference || null,
        date: body.date ? new Date(body.date) : new Date(),
      },
      include: { sale: true, party: true },
    })

    // Check if sale is fully paid
    const allPayments = await prisma.payment.findMany({
      where: { saleId: body.saleId },
    })
    const totalPaid = allPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )
    const sale = await prisma.sale.findUnique({
      where: { id: body.saleId },
    })
    if (sale && totalPaid >= Number(sale.totalAmount)) {
      await prisma.sale.update({
        where: { id: body.saleId },
        data: { isPaid: true, paidDate: new Date() },
      })
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Failed to create payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
