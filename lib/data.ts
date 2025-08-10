import type { Company, FinancialYear } from "./types"

export function seedFinancials(startYear = new Date().getFullYear() - 5, base = 100_000_000) {
  const yrs: FinancialYear[] = []
  let revenue = base
  const profitMargin = 0.08
  let equity = base * 0.4
  let liabilities = base * 0.3
  let employees = 120

  for (let i = 0; i < 6; i++) {
    const growth = 0.05 + Math.random() * 0.07 // 5% - 12%
    revenue = Math.round(revenue * (1 + growth))
    const profit = Math.round(revenue * (profitMargin + (Math.random() - 0.5) * 0.02))
    equity = Math.max(0, Math.round(equity * (1 + 0.04 + (Math.random() - 0.5) * 0.02)))
    liabilities = Math.max(0, Math.round(liabilities * (1 + 0.03 + (Math.random() - 0.5) * 0.02)))
    employees = Math.round(employees * (1 + 0.03 + (Math.random() - 0.5) * 0.02))

    yrs.push({
      year: startYear + i,
      revenue,
      profit,
      equity,
      liabilities,
      employees,
      ebitda: Math.round(profit * 1.4),
    })
  }
  return yrs
}

const mockCompanies: Company[] = [
  {
    orgnr: "915933151",
    name: "Nordkraft AS",
    industry: "Energy",
    orgForm: "AS",
    founded: "2007-04-12",
    address: "Hans Nielsen Hauges gate 50",
    city: "Oslo",
    website: "https://www.nordkraft.no",
    registryLinks: {
      brreg: "https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=915933151",
      annualReport: "https://www.nordkraft.no/reports/annual",
    },
    contacts: [
      { name: "Kari Nordmann", role: "CEO", email: "kari@nordkraft.no", phone: "+47 400 00 001" },
      { name: "Ola Nordmann", role: "CFO", email: "ola@nordkraft.no", phone: "+47 400 00 002" },
    ],
    financials: seedFinancials(undefined, 1_100_000_000),
    kpis: { marketShare: 6.2, growthRate: 9.1, riskScore: 34 },
  },
  {
    orgnr: "984652345",
    name: "FjordTech ASA",
    industry: "Software",
    orgForm: "ASA",
    founded: "2011-08-23",
    address: "Bryggegata 4",
    city: "Bergen",
    website: "https://www.fjordtech.no",
    registryLinks: {
      brreg: "https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=984652345",
    },
    contacts: [
      { name: "Ingrid Lunde", role: "CEO", email: "ingrid@fjordtech.no" },
      { name: "Mats Eide", role: "VP Sales", phone: "+47 400 00 123" },
    ],
    financials: seedFinancials(undefined, 320_000_000),
    kpis: { marketShare: 2.1, growthRate: 12.4, riskScore: 28 },
  },
  {
    orgnr: "991234567",
    name: "Boreal Foods AS",
    industry: "Food & Beverage",
    orgForm: "AS",
    founded: "2004-01-11",
    address: "Havnegata 19",
    city: "Trondheim",
    website: "https://www.borealfoods.no",
    registryLinks: {
      brreg: "https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=991234567",
    },
    contacts: [{ name: "Sofie Solberg", role: "COO" }],
    financials: seedFinancials(undefined, 800_000_000),
    kpis: { marketShare: 3.4, growthRate: 7.3, riskScore: 42 },
  },
  {
    orgnr: "977123321",
    name: "Arctic Logistics AS",
    industry: "Logistics",
    orgForm: "AS",
    founded: "1999-05-30",
    address: "Storgata 2",
    city: "Tromsø",
    registryLinks: {
      brreg: "https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=977123321",
    },
    contacts: [{ name: "Thomas Haug", role: "Head of Ops", phone: "+47 400 00 456" }],
    financials: seedFinancials(undefined, 500_000_000),
    kpis: { marketShare: 1.2, growthRate: 5.2, riskScore: 51 },
  },
  {
    orgnr: "923456789",
    name: "Vest Maritime AS",
    industry: "Maritime",
    orgForm: "AS",
    founded: "2016-09-14",
    address: "Sjøgata 9",
    city: "Stavanger",
    registryLinks: {
      brreg: "https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=923456789",
    },
    contacts: [{ name: "Hanne Fjell", role: "CRO" }],
    financials: seedFinancials(undefined, 900_000_000),
    kpis: { marketShare: 2.9, growthRate: 8.2, riskScore: 39 },
  },
]

export function getCompanies(): Company[] {
  return mockCompanies
}

export function searchCompanies(q: string): Company[] {
  const query = q.trim().toLowerCase()
  if (!query) return []
  return mockCompanies
    .filter(
      (c) =>
        c.name.toLowerCase().includes(query) || c.orgnr.includes(query) || c.industry.toLowerCase().includes(query),
    )
    .slice(0, 8)
}

export function getCompanyByOrgnr(orgnr: string): Company | undefined {
  return mockCompanies.find((c) => c.orgnr === orgnr)
}
