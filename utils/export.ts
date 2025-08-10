"use client"

import { toPng } from "html-to-image"
import jsPDF from "jspdf"
import type { Company } from "@/lib/types"

export async function exportSectionToPdf(elementId: string, fileName = "report.pdf") {
  const node = document.getElementById(elementId)
  if (!node) throw new Error("Section not found")
  const dataUrl = await toPng(node, { cacheBust: true })
  const pdf = new jsPDF({ orientation: "p", unit: "px", format: "a4" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const imgProps = (pdf as any).getImageProperties(dataUrl)
  const ratio = imgProps.width ? pageWidth / imgProps.width : 1
  const imgHeight = imgProps.height * ratio
  pdf.addImage(dataUrl, "PNG", 0, 0, pageWidth, imgHeight)
  pdf.save(fileName)
}

export function exportFinancialsToCsv(company: Company) {
  const rows = [
    ["Company", company.name],
    ["Orgnr", company.orgnr],
    [],
    ["Year", "Revenue", "Profit", "Equity", "Liabilities", "Employees"],
    ...company.financials.map((f) => [f.year, f.revenue, f.profit, f.equity, f.liabilities, f.employees ?? ""]),
  ]
  const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `${company.name.replace(/\s+/g, "_")}_financials.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
