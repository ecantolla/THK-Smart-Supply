export const TRANSACTION_REQUIRED_HEADERS: string[] = [
  "ID",
  "Nombre",
  "Fecha",
  "Unidades_Vendidas",
  "Semanas_Cobertura_Stock",
  "Stock_Actual",
]

export const TRANSACTION_NUMERIC_COLUMNS: (keyof import("./types").TransactionInputData)[] = [
  "Unidades_Vendidas",
  "Semanas_Cobertura_Stock",
  "Stock_Actual",
]

export const CALCULATION_NUMERIC_COLUMNS: (keyof Omit<
  import("./types").ProductInputData,
  "salesPeriods" | "ID" | "Nombre" | "rowIndex" | "stockFijoOverride"
>)[] = ["Semanas_Cobertura_Stock", "Stock_Actual", "Divisor_Periodos", "productAgeInWeeks"]


export const CONFIG_REQUIRED_HEADERS: string[] = ["ID"]

export const CONFIG_OPTIONAL_HEADERS: string[] = ["Nombre", "Stock_Fijo", "Semanas_Cobertura_Stock"]
