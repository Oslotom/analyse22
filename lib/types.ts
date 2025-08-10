export type ContactPerson = {
  name: string
  role: string
  email?: string
  phone?: string
}

export type FinancialYear = {
  year: number
  revenue: number
  profit: number
  equity: number
  liabilities: number
  employees?: number
  ebitda?: number
}

export type Company = {
  orgnr: string
  name: string
  industry: string
  orgForm: string
  founded: string
  address: string
  city: string
  country?: string
  website?: string
  registryLinks: {
    brreg: string
    annualReport?: string
  }
  contacts: ContactPerson[]
  financials: FinancialYear[]
  kpis: {
    marketShare?: number
    growthRate?: number
    riskScore?: number
  }
  dataSources?: DataSources
}

export type DataSources = {
  financials?: "regnskapsregisteret" | "fallback"
}
