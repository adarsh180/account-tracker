import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { date: 'desc' },
      include: { party: true, purchase: true, payments: true },
    })
    return NextResponse.json(sales)
  } catch (error) {
    console.error('Failed to fetch sales:', error)
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const quantity = Number(body.quantity)
    const rate = Number(body.rate)
    const gstPercent = Number(body.gstPercent || 0)
    
    const salePrice = quantity * rate
    const gstAmount = salePrice * (gstPercent / 100)
    const totalAmount = salePrice + gstAmount
    
    const bankAmount = Number(body.bankAmount || 0)
    const cashAmount = Math.max(0, totalAmount - bankAmount)

    const sale = await prisma.sale.create({
      data: {
        commodity: body.commodity,
        unit: body.unit,
        quantity: quantity,
        rate: rate,
        gstPercent: gstPercent,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        bankAmount: bankAmount,
        cashAmount: cashAmount,
        sourceCommodity: body.sourceCommodity || null,
        purchaseId: body.purchaseId || null,
        batchId: body.batchId || null,
        partyId: body.partyId,
        date: body.date ? new Date(body.date) : new Date(),
        notes: body.notes || null,
      },
      include: { party: true },
    })

    // Update inventory: reduce quantity from sourceCommodity if provided, else commodity
    const inventoryTarget = body.sourceCommodity || body.commodity
    const inventory = await prisma.inventory.findUnique({
      where: { commodity: inventoryTarget },
    })
    if (inventory) {
      const newQty = Math.max(0, Number(inventory.quantity) - quantity)
      await prisma.inventory.update({
        where: { commodity: inventoryTarget },
        data: {
          quantity: newQty,
          lastUpdated: new Date(),
        },
      })
    }

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Failed to create sale:', error)
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'Sale ID required' }, { status: 400 })

    const quantity = Number(data.quantity)
    const rate = Number(data.rate)
    const gstPercent = Number(data.gstPercent || 0)
    
    const salePrice = quantity * rate
    const gstAmount = salePrice * (gstPercent / 100)
    const totalAmount = salePrice + gstAmount
    
    const bankAmount = Number(data.bankAmount || 0)
    const cashAmount = Math.max(0, totalAmount - bankAmount)

    const updated = await prisma.sale.update({
      where: { id },
      data: {
        commodity: data.commodity,
        quantity: quantity,
        rate: rate,
        gstPercent: gstPercent,
        gstAmount: gstAmount,
        totalAmount: totalAmount,
        bankAmount: bankAmount,
        cashAmount: cashAmount,
        sourceCommodity: data.sourceCommodity || null,
        purchaseId: data.purchaseId || null,
        batchId: data.batchId || null,
        notes: data.notes || null,
        date: data.date ? new Date(data.date) : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Sale ID required' }, { status: 400 })

    await prisma.sale.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 })
  }
}
