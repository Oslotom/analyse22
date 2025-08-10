"use client"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { FinancialYear } from "@/lib/types"

function fmtNok(n: number) {
  return "NOK " + new Intl.NumberFormat("nb-NO", { notation: "compact" }).format(n)
}

export function RevenueProfitChart({
  data = [],
  title = "Revenue vs Profit",
}: {
  data?: FinancialYear[]
  title?: string
}) {
  const chartData = data.map((d) => ({
    year: d.year,
    revenue: d.revenue,
    profit: d.profit,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ChartContainer
          config={{
            revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
            profit: { label: "Profit", color: "hsl(var(--chart-2))" },
          }}
          className="h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => new Intl.NumberFormat("nb-NO", { notation: "compact" }).format(v)} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" />
              <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function BalanceSheetChart({
  data = [],
  title = "Equity and Liabilities",
}: {
  data?: FinancialYear[]
  title?: string
}) {
  const chartData = data.map((d) => ({
    year: d.year,
    equity: d.equity,
    liabilities: d.liabilities,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ChartContainer
          config={{
            equity: { label: "Equity", color: "hsl(var(--chart-3))" },
            liabilities: { label: "Liabilities", color: "hsl(var(--chart-4))" },
          }}
          className="h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => new Intl.NumberFormat("nb-NO", { notation: "compact" }).format(v)} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="equity" stackId="a" fill="var(--color-equity)" />
              <Bar dataKey="liabilities" stackId="a" fill="var(--color-liabilities)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function GrowthEmployeesChart({
  data = [],
  title = "Growth & Employees",
}: {
  data?: FinancialYear[]
  title?: string
}) {
  const chartData = data.map((d, i, arr) => {
    const prev = arr[i - 1]?.revenue ?? d.revenue
    const growth = ((d.revenue - prev) / Math.max(1, prev)) * 100
    return { year: d.year, growth: +growth.toFixed(2), employees: d.employees ?? 0 }
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ChartContainer
          config={{
            growth: { label: "Revenue growth %", color: "hsl(var(--chart-5))" },
            employees: { label: "Employees", color: "hsl(var(--chart-2))" },
          }}
          className="h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "growth" ? [`${value.toFixed(2)}%`, "Growth"] : [value, "Employees"]
                }
              />
              <Legend />
              <Line type="monotone" dataKey="growth" stroke="var(--color-growth)" />
              <Line type="monotone" dataKey="employees" stroke="var(--color-employees)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
