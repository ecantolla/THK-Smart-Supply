// c:\Users\ecant\OneDrive\Documentos\Smart\SmartSupplyGem-mainjul18\services\dataProcessor.ts
import * as XLSX from "xlsx"
import type {
  Transaction,
  Rule,
  ConfigRule,
  ProductInputData,
  ProductCalculatedData,
  ProcessingInfo,
} from "../types"
import {
  TRANSACTION_REQUIRED_HEADERS,
  CONFIG_REQUIRED_HEADERS,
} from "../constants"

// --- Funciones de Ayuda (Helpers) ---

const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return ""
  return String(id).trim().replace(/,/g, "").replace(/\.0+$/, "")
}

const parseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null
  if (dateValue instanceof Date) return dateValue

  if (typeof dateValue === "number") {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000)
    date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000)
    return date
  }

  if (typeof dateValue === "string") {
    const parts = dateValue.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
    if (parts) {
      const day = parseInt(parts[1], 10)
      const month = parseInt(parts[2], 10) - 1
      let year = parseInt(parts[3], 10)
      if (year < 100) year += 2000
      return new Date(Date.UTC(year, month, day))
    }
  }
  return null
}

const getISOWeekAndYear = (date: Date): { isoWeek: number; isoYear: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { isoWeek, isoYear: d.getUTCFullYear() }
}

const getISOWeekStartDate = (isoYear: number, isoWeek: number): Date => {
  const simple = new Date(Date.UTC(isoYear, 0, 1 + (isoWeek - 1) * 7))
  const dayOfWeek = simple.getUTCDay()
  const isoWeekStart = simple
  if (dayOfWeek <= 4) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1)
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay())
  }
  return isoWeekStart
}

const getISOWeekEndDate = (isoYear: number, isoWeek: number): Date => {
  const startDate = getISOWeekStartDate(isoYear, isoWeek)
  const endDate = new Date(startDate)
  endDate.setUTCDate(startDate.getUTCDate() + 6)
  return endDate
}

const getISOWeekRange = (
  startYear: number,
  startWeek: number,
  numWeeks: number,
): { isoWeek: number; isoYear: number }[] => {
  const weeks = []
  let currentYear = startYear
  let currentWeek = startWeek

  for (let i = 0; i < numWeeks; i++) {
    weeks.push({ isoWeek: currentWeek, isoYear: currentYear })
    currentWeek--
    if (currentWeek < 1) {
      currentYear--
      const { isoWeek: lastWeekPrevYear } = getISOWeekAndYear(new Date(Date.UTC(currentYear, 11, 31)))
      currentWeek = lastWeekPrevYear
    }
  }
  return weeks
}

// --- Lógica de Lectura y Agregación ---

const readFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: true })
        resolve(json)
      } catch (err) {
        reject(new Error("Error al leer o procesar el archivo. Asegúrate de que sea un formato válido (CSV/Excel)."))
      }
    }
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."))
    reader.readAsArrayBuffer(file)
  })
}

const validateHeaders = (data: any[], requiredHeaders: string[]): string | null => {
  if (data.length === 0) return "El archivo está vacío o no tiene datos."
  const headers = Object.keys(data[0])
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
  if (missingHeaders.length > 0) {
    return `Faltan las siguientes columnas obligatorias: ${missingHeaders.join(", ")}`
  }
  return null
}

const aggregateTransactionsToProducts = (
  transactions: Transaction[],
  numPeriods: number,
  divisorPeriodos: number,
): { data: ProductInputData[]; weekHeaders: string[]; error?: string } => {
  if (transactions.length === 0) return { data: [], weekHeaders: [] }

  const latestDateMs = Math.max(...transactions.map((t) => t.fechaDate.getTime()))
  const latestDate = new Date(latestDateMs)
  const safeLatestDate = new Date(latestDate.getTime())
  safeLatestDate.setUTCHours(12, 0, 0, 0)
  const currentMonthStart = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), 1))

  const { isoWeek: currentISOWeek, isoYear: currentISOYear } = getISOWeekAndYear(safeLatestDate)
  let p1Week = currentISOWeek - 1,
    p1Year = currentISOYear
  if (p1Week < 1) {
    p1Year -= 1
    const { isoWeek: lastWeekPrevYear } = getISOWeekAndYear(new Date(Date.UTC(p1Year, 11, 31)))
    p1Week = lastWeekPrevYear
  }
  const fullIsoWeekRange = getISOWeekRange(p1Year, p1Week, numPeriods)
  const periodRanges = fullIsoWeekRange.map(({ isoWeek, isoYear }) => {
    const start = getISOWeekStartDate(isoYear, isoWeek)
    const end = getISOWeekEndDate(isoYear, isoWeek)
    end.setUTCHours(23, 59, 59, 999)
    return { start, end }
  })

  const productGroups = new Map<string, Transaction[]>()
  transactions.forEach((t) => {
    const normalizedId = normalizeId(t.ID)
    const group = productGroups.get(normalizedId) || []
    group.push(t)
    productGroups.set(normalizedId, group)
  })

  const weekHeaders = fullIsoWeekRange.map(({ isoWeek }) => `Vta Semana ${isoWeek}`)

  const aggregatedProducts: ProductInputData[] = []
  productGroups.forEach((productTransactions) => {
    const firstTransaction = productTransactions[0]
    const salesPeriods = Array(numPeriods).fill(0)
    let ventaTotalMesActual = 0

    productTransactions.forEach((t) => {
      for (let i = 0; i < periodRanges.length; i++) {
        if (t.fechaDate >= periodRanges[i].start && t.fechaDate <= periodRanges[i].end) {
          salesPeriods[i] += t.Unidades_Vendidas
          break
        }
      }
      if (t.fechaDate >= currentMonthStart) ventaTotalMesActual += t.Unidades_Vendidas
    })

    const firstSaleDate = new Date(Math.min(...productTransactions.map((t) => t.fechaDate.getTime())))
    const productAgeInWeeks = Math.ceil((latestDate.getTime() - firstSaleDate.getTime() + 1) / (7 * 24 * 60 * 60 * 1000))
    const divisorForAverage = Math.max(1, Math.min(productAgeInWeeks, divisorPeriodos))

    aggregatedProducts.push({
      ID: String(firstTransaction.ID),
      Nombre: String(firstTransaction.Nombre ?? ""),
      Venta_Total_Mes_Actual: ventaTotalMesActual,
      Semanas_Cobertura_Stock: firstTransaction.Semanas_Cobertura_Stock,
      Stock_Actual: firstTransaction.Stock_Actual,
      salesPeriods: salesPeriods,
      rowIndex: firstTransaction.rowIndex,
      Divisor_Periodos: divisorForAverage,
      productAgeInWeeks,
    })
  })
  return { data: aggregatedProducts, weekHeaders, error: undefined }
}

// --- Lógica de Cálculo ---

export const calculateProductMetrics = (
  products: ProductInputData[],
  rules: Map<string, Rule>,
): ProductCalculatedData[] => {
  return products.map((p) => {
    const rule = rules.get(normalizeId(p.ID))
    let semanasCobertura = p.Semanas_Cobertura_Stock
    if (rule?.Semanas_Cobertura_Stock !== undefined && rule.Semanas_Cobertura_Stock > 0) {
      semanasCobertura = rule.Semanas_Cobertura_Stock
    }

    const ventaPromedioSemanal = p.salesPeriods.reduce((a, b) => a + b, 0) / p.Divisor_Periodos
    let stockIdeal = ventaPromedioSemanal * semanasCobertura
    let status: "OK" | "Fijo" = "OK"

    if (rule?.Stock_Fijo !== undefined) {
      stockIdeal = rule.Stock_Fijo
      status = "Fijo"
    }

    const unidadesAAbastecer = Math.max(0, stockIdeal - p.Stock_Actual)

    return {
      ...p,
      Semanas_Cobertura_Stock: semanasCobertura,
      Venta_Promedio_Semanal: parseFloat(ventaPromedioSemanal.toFixed(2)),
      Stock_Ideal: Math.round(stockIdeal),
      Unidades_A_Abastecer: Math.round(unidadesAAbastecer),
      status,
    }
  })
}

// --- Función Principal de Orquestación ---

export const processAndCalculate = async (
  salesFile: File,
  configFile: File | null,
  numPeriods: number,
  divisorPeriodos: number,
): Promise<{
  results: ProductCalculatedData[]
  weekHeaders: string[]
  error?: string
  warnings?: string[]
  processingInfo?: ProcessingInfo
}> => {
  const warnings: string[] = []
  try {
    const salesData = await readFile(salesFile)
    let headerError = validateHeaders(salesData, TRANSACTION_REQUIRED_HEADERS)
    if (headerError) return { results: [], weekHeaders: [], error: headerError }

    const transactions: Transaction[] = []
    salesData.forEach((row, index) => {
      const fecha = parseDate(row.Fecha)
      if (!fecha) {
        warnings.push(`Fila ${index + 2}: Fecha inválida o vacía, esta fila será ignorada.`)
        return
      }
      const transaction: Transaction = {
        rowIndex: index + 2,
        ID: String(row.ID ?? ""),
        Nombre: String(row.Nombre ?? ""),
        fechaDate: fecha,
        Unidades_Vendidas: Number(row.Unidades_Vendidas) || 0,
        Semanas_Cobertura_Stock: Number(row.Semanas_Cobertura_Stock) || 0,
        Stock_Actual: Number(row.Stock_Actual) || 0,
        isoWeek: 0,
        isoYear: 0,
      }
      const { isoWeek, isoYear } = getISOWeekAndYear(fecha)
      transaction.isoWeek = isoWeek
      transaction.isoYear = isoYear
      transactions.push(transaction)
    })

    if (transactions.length === 0) {
      return { results: [], weekHeaders: [], error: "No se encontraron transacciones válidas en el archivo de ventas." }
    }

    const { data: aggregatedData, weekHeaders } = aggregateTransactionsToProducts(
      transactions,
      numPeriods,
      divisorPeriodos,
    )

    let rules = new Map<string, Rule>()
    if (configFile) {
      const configData = await readFile(configFile)
      headerError = validateHeaders(configData, CONFIG_REQUIRED_HEADERS)
      if (headerError) {
        warnings.push(`Archivo de reglas: ${headerError}. Se procesará sin reglas.`)
      } else {
        configData.forEach((row: ConfigRule) => {
          const id = normalizeId(row.ID)
          if (id) {
            rules.set(id, {
              Stock_Fijo: row.Stock_Fijo,
              Semanas_Cobertura_Stock: row.Semanas_Cobertura_Stock,
            })
          }
        })
      }
    }

    const results = calculateProductMetrics(aggregatedData, rules)

    const dateRange = {
      start: new Date(Math.min(...transactions.map((t) => t.fechaDate.getTime()))).toLocaleDateString("es-ES"),
      end: new Date(Math.max(...transactions.map((t) => t.fechaDate.getTime()))).toLocaleDateString("es-ES"),
    }

    const processingInfo: ProcessingInfo = {
      totalRows: salesData.length,
      productsWithSales: results.length,
      productsWithoutSales: 0, // Lógica a implementar si es necesario
      productsWithConfig: rules.size,
      dateRange,
    }

    return { results, weekHeaders, warnings, processingInfo }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Ocurrió un error desconocido."
    return { results: [], weekHeaders: [], error: errorMsg }
  }
}

// --- Función de Exportación ---

export const exportResultsToExcel = (
  results: ProductCalculatedData[],
  weekHeaders: string[],
  fileName: string,
  weeksToAnalyze: number,
  periodsDivisor: number,
  processingInfo: ProcessingInfo,
) => {
  const wb = XLSX.utils.book_new()

  // Hoja de Resumen
  const summaryData = [
    ["Parámetro", "Valor"],
    ["Archivo de Ventas", fileName],
    ["Semanas a Analizar", weeksToAnalyze],
    ["Divisor de Períodos", periodsDivisor],
    ["Rango de Fechas", `${processingInfo.dateRange.start} - ${processingInfo.dateRange.end}`],
    ["Total de Productos Analizados", processingInfo.productsWithSales],
    ["Productos con Reglas Aplicadas", processingInfo.productsWithConfig],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumen")

  // Hoja de Resultados
  const dataToExport = results.map((r) => {
    const sales: { [key: string]: number } = {}
    weekHeaders.forEach((h, i) => {
      sales[h] = r.salesPeriods[i]
    })
    return {
      ID: r.ID,
      Nombre: r.Nombre,
      "Venta Mes Actual": r.Venta_Total_Mes_Actual,
      ...sales,
      "Venta Prom. Semanal": r.Venta_Promedio_Semanal,
      "Semanas Cobertura": r.Semanas_Cobertura_Stock,
      "Stock Actual": r.Stock_Actual,
      "Stock Ideal": r.Stock_Ideal,
      "Unidades a Abastecer": r.Unidades_A_Abastecer,
      Estado: r.status,
    }
  })

  // Define el orden explícito de las columnas para evitar que la librería las ordene alfabéticamente.
  const explicitHeaders = [
    "ID",
    "Nombre",
    "Venta Mes Actual",
    ...weekHeaders, // Las semanas ya vienen ordenadas de la más nueva a la más antigua
    "Venta Prom. Semanal",
    "Semanas Cobertura",
    "Stock Actual",
    "Stock Ideal",
    "Unidades a Abastecer",
    "Estado",
  ]

  const resultsWs = XLSX.utils.json_to_sheet(dataToExport, { header: explicitHeaders })
  XLSX.utils.book_append_sheet(wb, resultsWs, "Resultados")

  XLSX.writeFile(wb, `SmartSupply_Resultados_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
