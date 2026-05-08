import type { CommandCenterSnapshot } from '@/lib/business-command-center'

export type BusinessAiReport = {
  title: string
  modelUsed: string
  confidence: 'high' | 'medium' | 'low'
  briefOverview: string
  commandFocus: string
  executiveSummary: Array<{
    heading: string
    value?: string
    insight: string
  }>
  financialReport: Array<{
    heading: string
    status: 'good' | 'watch' | 'danger' | 'neutral'
    insight: string
    metric?: string
  }>
  priorityActions: Array<{
    action: string
    reason: string
    expectedImpact: string
  }>
  risks: Array<{
    risk: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    mitigation: string
  }>
  opportunities: Array<{
    opportunity: string
    move: string
    expectedUpside: string
  }>
  questionsToAskNext: string[]
}

type GoogleContentPart = {
  text?: string
}

type GoogleResponse = {
  candidates?: Array<{
    content?: {
      parts?: GoogleContentPart[]
    }
  }>
  error?: {
    message?: string
  }
}

const DEFAULT_MODELS = ['gemma-4-31b-it', 'gemma-4-26b-it', 'gemma-3-27b-it']

function configuredModels(): string[] {
  const configured = process.env.GOOGLE_AI_MODELS || process.env.GEMMA_MODEL_ORDER
  if (!configured) return DEFAULT_MODELS

  const models = configured
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)

  return models.length > 0 ? models : DEFAULT_MODELS
}

function getApiKey(): string | null {
  return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || null
}

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
}

function safeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/[*#`_~|<>]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeReport(report: BusinessAiReport, modelUsed: string): BusinessAiReport {
  return {
    title: safeText(report.title) || 'Business Command Center',
    modelUsed,
    confidence: report.confidence || 'medium',
    briefOverview: safeText(report.briefOverview),
    commandFocus: safeText(report.commandFocus),
    executiveSummary: (report.executiveSummary || []).slice(0, 6).map((item) => ({
      heading: safeText(item.heading),
      value: safeText(item.value),
      insight: safeText(item.insight),
    })),
    financialReport: (report.financialReport || []).slice(0, 8).map((item) => ({
      heading: safeText(item.heading),
      status: item.status || 'neutral',
      insight: safeText(item.insight),
      metric: safeText(item.metric),
    })),
    priorityActions: (report.priorityActions || []).slice(0, 6).map((item) => ({
      action: safeText(item.action),
      reason: safeText(item.reason),
      expectedImpact: safeText(item.expectedImpact),
    })),
    risks: (report.risks || []).slice(0, 6).map((item) => ({
      risk: safeText(item.risk),
      severity: item.severity || 'medium',
      mitigation: safeText(item.mitigation),
    })),
    opportunities: (report.opportunities || []).slice(0, 6).map((item) => ({
      opportunity: safeText(item.opportunity),
      move: safeText(item.move),
      expectedUpside: safeText(item.expectedUpside),
    })),
    questionsToAskNext: (report.questionsToAskNext || []).slice(0, 5).map(safeText).filter(Boolean),
  }
}

function formatInr(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`
}

export function buildLocalReport(snapshot: CommandCenterSnapshot, question: string, reason: string): BusinessAiReport {
  const profitStatus = snapshot.summary.grossProfit >= 0 ? 'good' : 'danger'
  const odStatus =
    snapshot.overdraft.utilizationPercent > 85
      ? 'danger'
      : snapshot.overdraft.utilizationPercent > 65
        ? 'watch'
        : 'neutral'

  return {
    title: 'Business Command Center',
    modelUsed: reason,
    confidence: 'medium',
    briefOverview:
      question.trim().length > 0
        ? `Prepared a ledger based command response for: ${question.trim()}`
        : 'Prepared a ledger based command response from the latest business snapshot.',
    commandFocus:
      snapshot.actionCandidates[0] ||
      'Keep recording purchases, sales, payments, expenses, and OD movements so the command center has sharper signals.',
    executiveSummary: [
      {
        heading: 'Turnover',
        value: formatInr(snapshot.summary.totalSales),
        insight: `Total recorded purchases are ${formatInr(snapshot.summary.totalPurchases)} with gross profit of ${formatInr(snapshot.summary.grossProfit)}.`,
      },
      {
        heading: 'Receivables',
        value: formatInr(snapshot.summary.outstandingReceivables),
        insight: 'Collections have the fastest impact on cash position and overdraft pressure.',
      },
      {
        heading: 'Inventory',
        value: formatInr(snapshot.summary.inventoryValue),
        insight: 'Slow stock should be reviewed before fresh purchases are added.',
      },
      {
        heading: 'Overdraft Burn',
        value: formatInr(snapshot.overdraft.monthlyInterestBurn),
        insight: `OD utilization is ${snapshot.overdraft.utilizationPercent}% of the sanctioned limit.`,
      },
    ],
    financialReport: [
      {
        heading: 'Gross Margin',
        status: profitStatus,
        metric: `${snapshot.summary.profitMargin}%`,
        insight: 'Margin must stay high enough to absorb transport, labor, OD interest, and commodity price movement.',
      },
      {
        heading: 'Financial Year Net',
        status: snapshot.financialYear.netProfit >= 0 ? 'good' : 'danger',
        metric: formatInr(snapshot.financialYear.netProfit),
        insight: `${snapshot.financialYear.label} includes expenses, committee payments, and home distributions in the net view.`,
      },
      {
        heading: 'OD Utilization',
        status: odStatus,
        metric: `${snapshot.overdraft.utilizationPercent}%`,
        insight: 'Higher OD utilization reduces flexibility and makes slow receivables more expensive.',
      },
    ],
    priorityActions: snapshot.actionCandidates.slice(0, 5).map((action) => ({
      action,
      reason: 'This item is visible in the current ledger and can improve working capital quickly.',
      expectedImpact: 'Better cash rotation, cleaner OD position, and stronger buying capacity.',
    })),
    risks: snapshot.issues.slice(0, 5).map((issue) => ({
      risk: issue.title,
      severity: issue.severity === 'critical' ? 'critical' : issue.severity === 'warning' ? 'high' : 'medium',
      mitigation: issue.detail,
    })),
    opportunities: snapshot.commodityPnL
      .filter((item) => item.profit > 0)
      .slice(0, 4)
      .map((item) => ({
        opportunity: `${item.commodity.replaceAll('_', ' ')} is producing profit`,
        move: `Protect pricing discipline and prioritize faster rotation around ${item.margin}% margin.`,
        expectedUpside: `${formatInr(item.profit)} gross profit is already visible in the ledger.`,
      })),
    questionsToAskNext: [
      'Which buyer should I collect from today?',
      'Which stock should I sell first?',
      'What is hurting my margin most?',
      'How can I reduce overdraft pressure this month?',
    ],
  }
}

function buildPrompt(snapshot: CommandCenterSnapshot, question: string): string {
  return JSON.stringify({
    role: 'gemma-for-business command center',
    instruction:
      'You are the private CFO and operations command center for Royal Iron Steel Supply. Analyze only the provided business data. The user wants brief but high value financial and operational advice. Respond only as valid JSON. Do not use markdown. Do not use asterisks, bullet dashes, hash headings, tables, emojis, decorative characters, or code fences. Keep language direct, premium, and business focused. Mention uncertainty when data is thin. Do not invent transactions. Do not recommend illegal tax evasion or hiding cash. Recommend compliant record keeping.',
    dealFinanceRules:
      'Always consider dealFinance when present. Distinguish own money, earned money, OD money, OD converted to cash, partner capital, brokerage-only income, cash paid, online paid, cash received, and online received. For partnership deals, call out contribution and payout reconciliation. For brokerage deals, treat brokerage as income without inventory capital unless data says otherwise. For OD-to-cash deals, treat them as high-risk and recommend repayment discipline and clean records.',
    requiredJsonShape: {
      title: 'string',
      confidence: 'high | medium | low',
      briefOverview: 'string',
      commandFocus: 'string',
      executiveSummary: [{ heading: 'string', value: 'string', insight: 'string' }],
      financialReport: [{ heading: 'string', status: 'good | watch | danger | neutral', insight: 'string', metric: 'string' }],
      priorityActions: [{ action: 'string', reason: 'string', expectedImpact: 'string' }],
      risks: [{ risk: 'string', severity: 'critical | high | medium | low', mitigation: 'string' }],
      opportunities: [{ opportunity: 'string', move: 'string', expectedUpside: 'string' }],
      questionsToAskNext: ['string'],
    },
    userQuestion: question || 'Give me the command center overview.',
    businessSnapshot: snapshot,
  })
}

async function callGoogleModel(model: string, apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          topP: 0.85,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const data = (await response.json()) as GoogleResponse
  if (!response.ok) {
    throw new Error(data.error?.message || `Google AI request failed with status ${response.status}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim()
  if (!text) throw new Error('Google AI returned an empty response')

  return text
}

export async function generateBusinessAiReport(snapshot: CommandCenterSnapshot, question: string): Promise<BusinessAiReport> {
  const apiKey = getApiKey()
  if (!apiKey) {
    return buildLocalReport(snapshot, question, 'Local analysis. Add GOOGLE_AI_API_KEY to enable Gemma.')
  }

  const prompt = buildPrompt(snapshot, question)
  const models = configuredModels()
  const failures: string[] = []

  for (const model of models) {
    try {
      const text = await callGoogleModel(model, apiKey, prompt)
      const parsed = JSON.parse(stripJsonFence(text)) as BusinessAiReport
      return normalizeReport(parsed, model)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown model failure'
      failures.push(`${model}: ${message}`)
    }
  }

  return buildLocalReport(snapshot, question, `Local analysis after model fallback failure. ${failures.join(' ')}`)
}
