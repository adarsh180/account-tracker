import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 5-Year Vision constants — ₹35L today → ₹50Cr valuation in 5 years
// Valuation model: scrap trading @ ~1x revenue multiple
// So ₹50Cr valuation ≈ ₹50Cr annual turnover
const VISION_ROADMAP = [
  {
    fyYear: 2025, // FY 2025-2026
    label: 'FY 2025-26',
    turnoverTarget: 10000000,    // ₹1 Crore
    profitTarget: 1200000,       // ₹12L net profit (~12% margin)
    valuationTarget: 10000000,   // ₹1 Cr valuation
    keyGoals: [
      'Hit ₹1 Crore annual turnover',
      'Build reliable buyer network (5+ buyers)',
      'Maintain gross margin above 12%',
      'Keep OD interest below ₹50,000/year',
      'Zero outstanding >30 days',
    ],
    growthFactor: 2.86, // from ₹35L
  },
  {
    fyYear: 2026, // FY 2026-2027
    label: 'FY 2026-27',
    turnoverTarget: 30000000,    // ₹3 Crore
    profitTarget: 4500000,       // ₹45L net profit (15% margin)
    valuationTarget: 45000000,   // ₹4.5 Cr valuation
    keyGoals: [
      'Scale to ₹3 Crore turnover (3x growth)',
      'Hire 1-2 operations staff',
      'Establish commodity pricing intelligence',
      'Expand to 2 new commodity types',
      'Reduce cost per KG by 5% through volume',
    ],
    growthFactor: 3.0,
  },
  {
    fyYear: 2027, // FY 2027-2028
    label: 'FY 2027-28',
    turnoverTarget: 80000000,    // ₹8 Crore
    profitTarget: 14400000,      // ₹1.44 Cr net profit (18% margin)
    valuationTarget: 120000000,  // ₹12 Cr valuation
    keyGoals: [
      'Hit ₹8 Crore turnover milestone',
      'Establish own godown / logistics',
      'Direct contracts with 2+ manufacturers',
      'Achieve 18%+ gross margin through optimisation',
      'Monthly turnover >₹65L consistently',
    ],
    growthFactor: 2.67,
  },
  {
    fyYear: 2028, // FY 2028-2029
    label: 'FY 2028-29',
    turnoverTarget: 200000000,   // ₹20 Crore
    profitTarget: 40000000,      // ₹4 Cr net profit (20% margin)
    valuationTarget: 300000000,  // ₹30 Cr valuation
    keyGoals: [
      'Break ₹20 Crore annual mark',
      'GST/TurnoverTax optimisation at scale',
      'Consider Pvt Ltd company structure',
      'Geographic expansion — new city/region',
      'Automated tracking system in place',
    ],
    growthFactor: 2.5,
  },
  {
    fyYear: 2029, // FY 2029-2030
    label: 'FY 2029-30',
    turnoverTarget: 500000000,   // ₹50 Crore
    profitTarget: 100000000,     // ₹10 Cr net profit (20% margin)
    valuationTarget: 500000000,  // ₹50 Cr VALUATION 🏆
    keyGoals: [
      '🏆 ₹50 CRORE COMPANY VALUATION ACHIEVED',
      'Annual turnover ₹50 Crore+',
      'Registered brand in scrap/recycling sector',
      'Full team: 10+ employees',
      'Explore export channels for premium scrap',
    ],
    growthFactor: 2.5,
  },
]

export async function GET() {
  try {
    // Pull all stored milestones
    const stored = await prisma.visionMilestone.findMany({
      orderBy: { fyYear: 'asc' },
    })

    // Pull actual FY data from FY 2025-26 onwards
    const fyActuals: Record<number, { turnover: number; profit: number }> = {}

    const fyYears = [2025, 2026, 2027, 2028, 2029]
    await Promise.all(
      fyYears.map(async (fy) => {
        const start = new Date(`${fy}-04-01T00:00:00.000Z`)
        const end = new Date(`${fy + 1}-03-31T23:59:59.999Z`)
        const [sales, purchases, expenses] = await Promise.all([
          prisma.sale.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
          prisma.purchase.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { totalCost: true } }),
          prisma.monthlyExpense.findMany({
            where: {
              OR: [
                { year: fy, month: { gte: 4 } },
                { year: fy + 1, month: { lte: 3 } },
              ],
            },
          }),
        ])
        const turnover = Number(sales._sum.totalAmount || 0)
        const purchaseCost = Number(purchases._sum.totalCost || 0)
        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
        fyActuals[fy] = {
          turnover,
          profit: turnover - purchaseCost - totalExpenses,
        }
      })
    )

    // Merge roadmap with stored & actual data
    const milestones = VISION_ROADMAP.map((road) => {
      const record = stored.find((s) => s.fyYear === road.fyYear)
      const actual = fyActuals[road.fyYear] || { turnover: 0, profit: 0 }

      const actualTurnover = record?.actualTurnover ? Number(record.actualTurnover) : actual.turnover
      const actualProfit = record?.actualProfit ? Number(record.actualProfit) : actual.profit

      const turnoverProgress = road.turnoverTarget > 0
        ? Math.min((actualTurnover / road.turnoverTarget) * 100, 100)
        : 0
      const isOnTrack = turnoverProgress >= Math.min(
        100,
        // expected progress based on current month in FY
        (new Date().getFullYear() === road.fyYear
          ? ((new Date().getMonth() >= 3 ? new Date().getMonth() - 3 : new Date().getMonth() + 9) / 12) * 100
          : 0)
      )

      return {
        fyYear: road.fyYear,
        label: road.label,
        turnoverTarget: road.turnoverTarget,
        profitTarget: road.profitTarget,
        valuationTarget: road.valuationTarget,
        actualTurnover,
        actualProfit,
        turnoverProgress: Math.round(turnoverProgress * 10) / 10,
        keyGoals: record?.keyGoals ? JSON.parse(record.keyGoals) : road.keyGoals,
        achievements: record?.achievements ? JSON.parse(record.achievements) : [],
        notes: record?.notes || null,
        isCompleted: record?.isCompleted || false,
        isCurrentFY: road.fyYear === (
          new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
        ),
        isOnTrack,
        growthFactor: road.growthFactor,
        id: record?.id || null,
      }
    })

    // Overall portfolio summary
    const currentFY = milestones.find((m) => m.isCurrentFY)
    const totalTarget = 500000000 // ₹50 Crore final valuation target
    const overallProgress = currentFY
      ? Math.min((currentFY.actualTurnover / totalTarget) * 100, 100)
      : 0

    // Compound growth rate needed from current to ₹50Cr in 5 years
    const currentTurnover = currentFY?.actualTurnover || 3500000
    const cagr = Math.pow(500000000 / Math.max(currentTurnover, 1), 1 / 5) - 1

    return NextResponse.json({
      milestones,
      summary: {
        finalTarget: totalTarget,
        finalLabel: '₹50 Crore Company Valuation',
        targetYear: 2030,
        currentProgress: Math.round(overallProgress * 100) / 100,
        cagr: Math.round(cagr * 10000) / 100, // percent
        currentFYTurnover: currentFY?.actualTurnover || 0,
        currentFYTarget: currentFY?.turnoverTarget || 10000000,
      },
    })
  } catch (error) {
    console.error('Failed to fetch vision data:', error)
    return NextResponse.json({ error: 'Failed to fetch vision data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fyYear, notes, achievements, isCompleted } = body

    const milestone = await prisma.visionMilestone.upsert({
      where: { fyYear: parseInt(fyYear) },
      update: {
        notes: notes || null,
        achievements: achievements ? JSON.stringify(achievements) : null,
        isCompleted: isCompleted || false,
      },
      create: {
        fyYear: parseInt(fyYear),
        turnoverTarget: 10000000,
        profitTarget: 1200000,
        valuationTarget: 10000000,
        notes: notes || null,
        achievements: achievements ? JSON.stringify(achievements) : null,
      },
    })

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('Failed to update vision milestone:', error)
    return NextResponse.json({ error: 'Failed to update vision milestone' }, { status: 500 })
  }
}
