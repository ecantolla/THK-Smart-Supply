// c:\Users\ecant\OneDrive\Documentos\Smart\SmartSupplyGem-mainjul18\types.ts
export interface TransactionInputData {
  rowIndex: number
  ID: string
  Nombre: string
  Fecha: string
  Unidades_Vendidas: number
  Semanas_Cobertura_Stock: number
  Stock_Actual: number
}

export interface Transaction extends Omit<TransactionInputData, "Fecha"> {
  fechaDate: Date
  isoWeek: number
  isoYear: number
}

export interface ProductInputData {
  rowIndex: number
  ID: string
  Nombre: string
  Venta_Total_Mes_Actual: number
  salesPeriods: number[]
  Semanas_Cobertura_Stock: number
  Stock_Actual: number
  Divisor_Periodos: number
  productAgeInWeeks: number
  stockFijoOverride?: number
}

export interface ProductCalculatedData extends ProductInputData {
  Venta_Promedio_Semanal: number
  Stock_Ideal: number
  Unidades_A_Abastecer: number
  status: "OK" | "Fijo"
  error?: string
}

export interface ConfigRule {
  ID: string
  Stock_Fijo?: number
  Semanas_Cobertura_Stock?: number
}

export interface Rule {
  Stock_Fijo?: number
  Semanas_Cobertura_Stock?: number
}

export type AppView = "upload" | "results"

export interface ProcessingInfo {
  totalRows: number
  productsWithSales: number
  productsWithoutSales: number
  productsWithConfig: number
  dateRange: {
    start: string
    end: string
  }
}
