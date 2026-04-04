import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined

    const where: any = { year }
    if (month) where.month = month

    const expenses = await prisma.monthlyExpense.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Failed to fetch expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { month, year, category, amount, description } = body

    if (!month || !year || !category || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const expense = await prisma.monthlyExpense.upsert({
      where: {
        month_year_category: { month: parseInt(month), year: parseInt(year), category },
      },
      update: {
        amount: parseFloat(amount),
        description: description || null,
      },
      create: {
        month: parseInt(month),
        year: parseInt(year),
        category,
        amount: parseFloat(amount),
        description: description || null,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Failed to save expense:', error)
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.monthlyExpense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
