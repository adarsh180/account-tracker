import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { date: 'desc' },
      include: { party: true },
    })
    return NextResponse.json(purchases)
  } catch (error) {
    console.error('Failed to fetch purchases:', error)
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const purchasePrice = Number(body.quantity) * Number(body.rate)
    const gstPercent = Number(body.gstPercent || 0)
    const gstAmount = purchasePrice * (gstPercent / 100)
    const totalCost =
      purchasePrice +
      gstAmount +
      Number(body.laborCost || 0) +
      Number(body.transportCost || 0) +
      Number(body.loadingCost || 0) +
      Number(body.miscOverhead || 0)

    const purchase = await prisma.purchase.create({
      data: {
        commodity: body.commodity,
        unit: body.unit,
        quantity: Number(body.quantity),
        rate: Number(body.rate),
        purchasePrice: purchasePrice,
        laborCost: Number(body.laborCost || 0),
        transportCost: Number(body.transportCost || 0),
        loadingCost: Number(body.loadingCost || 0),
        miscOverhead: Number(body.miscOverhead || 0),
        gstPercent: gstPercent,
        gstAmount: gstAmount,
        totalCost: totalCost,
        partyId: body.partyId,
        date: body.date ? new Date(body.date) : new Date(),
        notes: body.notes || null,
      },
      include: { party: true },
    })

    // Update inventory: add quantity and recalculate WAC
    const inventory = await prisma.inventory.findUnique({
      where: { commodity: body.commodity },
    })
    if (inventory) {
      const existingQty = Number(inventory.quantity)
      const existingCost = Number(inventory.avgCost)
      const newQty = Number(body.quantity)
      const newTotalCostPerUnit = totalCost / newQty
      const totalQty = existingQty + newQty
      const wac =
        totalQty > 0
          ? (existingQty * existingCost + newQty * newTotalCostPerUnit) / totalQty
          : 0

      await prisma.inventory.update({
        where: { commodity: body.commodity },
        data: {
          quantity: totalQty,
          avgCost: wac,
          lastUpdated: new Date(),
        },
      })
    } else {
      await prisma.inventory.create({
        data: {
          commodity: body.commodity,
          unit: body.unit,
          quantity: Number(body.quantity),
          avgCost: totalCost / Number(body.quantity),
        },
      })
    }

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error('Failed to create purchase:', error)
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })

    const purchasePrice = Number(data.quantity) * Number(data.rate)
    const gstPercent = Number(data.gstPercent || 0)
    const gstAmount = purchasePrice * (gstPercent / 100)
    const totalCost =
      purchasePrice +
      gstAmount +
      Number(data.laborCost || 0) +
      Number(data.transportCost || 0) +
      Number(data.loadingCost || 0) +
      Number(data.miscOverhead || 0)

    const updated = await prisma.purchase.update({
      where: { id },
      data: {
        commodity: data.commodity,
        quantity: Number(data.quantity),
        rate: Number(data.rate),
        purchasePrice: purchasePrice,
        laborCost: Number(data.laborCost || 0),
        transportCost: Number(data.transportCost || 0),
        loadingCost: Number(data.loadingCost || 0),
        miscOverhead: Number(data.miscOverhead || 0),
        gstPercent: gstPercent,
        gstAmount: gstAmount,
        totalCost: totalCost,
        notes: data.notes || null,
        date: data.date ? new Date(data.date) : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update purchase' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 })

    await prisma.purchase.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete purchase' }, { status: 500 })
  }
}
