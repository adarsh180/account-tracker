import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const inventory = await prisma.inventory.findMany({
      orderBy: { commodity: 'asc' },
    })
    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = await prisma.inventory.findUnique({
      where: { commodity: body.commodity },
    })
    if (existing) {
      return NextResponse.json({ error: 'Commodity already exists' }, { status: 400 })
    }
    const item = await prisma.inventory.create({
      data: {
        commodity: body.commodity,
        unit: body.unit,
        quantity: 0,
        avgCost: 0,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Failed to create inventory item:', error)
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 })
  }
}
