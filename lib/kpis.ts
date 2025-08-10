import type { FinancialYear } from "./types"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pct(n: number | undefined) {
  return typeof n === "number" && Number.isFinite(n) ? n * 100 : undefined
}

function round(n: number | undefined, digits = 1) {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

export function computeKPIs(financials: FinancialYear[]) {
  if (!Array.isArray(financials) || financials.length === 0) {
    return { growthRate: undefined, riskScore: undefined }
  }
  const years = [...financials].sort((a, b) => a.year - b.year)
  const last = years[years.length - 1]
  const prev = years[years.length - 2] ?? last

  // Revenue CAGR over up to last 5 years
  const slice = years.slice(-5)
  const first = slice[0]
  const yearsDiff = Math.max(1, slice.at(-1)!.year - first.year)
  const revenueCagr = first.revenue > 0 ? Math.pow(last.revenue / first.revenue, 1 / yearsDiff) - 1 : undefined

  // YoY revenue growth
  const yoyGrowth = prev.revenue > 0 ? (last.revenue - prev.revenue) / prev.revenue : undefined

  // Margins
  const profitMargin = last.revenue > 0 ? last.profit / last.revenue : undefined
  const ebitdaMargin = last.ebitda && last.revenue > 0 ? last.ebitda / last.revenue : undefined

  // Leverage
  const debtToEquity = typeof last.equity === "number" && last.equity > 0 ? last.liabilities / last.equity : undefined

  // Employees CAGR (if available)
  const empFirst = slice.find((y) => typeof y.employees === "number")?.employees
  const empLast = [...slice].reverse().find((y) => typeof y.employees === "number")?.employees
  const employeesCagr =
    typeof empFirst === "number" && empFirst > 0 && typeof empLast === "number"
      ? Math.pow(empLast / empFirst, 1 / yearsDiff) - 1
      : undefined

  // Simple heuristic risk score (0 best, 100 worst)
  let risk = 50
  if (typeof debtToEquity === "number") risk += clamp((debtToEquity - 1) * 20, -10, 30)
  if (typeof profitMargin === "number") risk += profitMargin < 0 ? 15 : profitMargin > 0.1 ? -10 : 0
  if (typeof yoyGrowth === "number") risk += yoyGrowth < 0 ? 10 : -5
  if (typeof revenueCagr === "number") risk += revenueCagr < 0 ? 10 : -5
  risk = Math.round(clamp(risk, 0, 100))

  return {
    // For backward compatibility with existing UI fields:
    growthRate: round(pct(revenueCagr), 1),
    riskScore: risk,

    // New KPIs:
    revenueCAGR: round(pct(revenueCagr), 1),
    yoyRevenueGrowth: round(pct(yoyGrowth), 1),
    profitMargin: round(pct(profitMargin), 1),
    ebitdaMargin: round(pct(ebitdaMargin), 1),
    debtToEquity: round(debtToEquity, 2),
    employeesCAGR: round(pct(employeesCagr), 1),
  }
}
