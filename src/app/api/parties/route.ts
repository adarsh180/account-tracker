import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const parties = await prisma.party.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { purchases: true, sales: true, payments: true },
        },
      },
    })
    return NextResponse.json(parties)
  } catch (error) {
    console.error('Failed to fetch parties:', error)
    return NextResponse.json({ error: 'Failed to fetch parties' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const party = await prisma.party.create({
      data: {
        name: body.name,
        type: body.type,
        phone: body.phone || null,
        address: body.address || null,
        gstNumber: body.gstNumber || null,
        paymentTerms: body.paymentTerms || 0,
      },
    })
    return NextResponse.json(party, { status: 201 })
  } catch (error) {
    console.error('Failed to create party:', error)
    return NextResponse.json({ error: 'Failed to create party' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'Party ID required' }, { status: 400 })

    const updated = await prisma.party.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        phone: data.phone || null,
        address: data.address || null,
        gstNumber: data.gstNumber || null,
        paymentTerms: data.paymentTerms || 0,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update party' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Party ID required' }, { status: 400 })

    await prisma.party.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete party' }, { status: 500 })
  }
}
