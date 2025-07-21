import * as XLSX from "xlsx"
import type {
  Transaction,
  ProductInputData,
  ProductCalculatedData,
  TransactionInputData,
  ConfigRule,
} from "../types"
import {
  TRANSACTION_REQUIRED_HEADERS,
  TRANSACTION_NUMERIC_COLUMNS,
  CALCULATION_NUMERIC_COLUMNS,
  CONFIG_REQUIRED_HEADERS,
  CONFIG_OPTIONAL_HEADERS,
} from "../constants"
import { getISOWeekAndYear, getISOWeekRange, getISOWeekStartDate, getISOWeekEndDate } from "../utils/dateUtils"

// --- UTILITY FUNCTIONS ---

const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return ""
  return String(id)
    .trim()
    .replace(/,/g, "")
    .replace(/\.0+$/, "")
    .toUpperCase()
}

const parseDate = (dateValue: any): Date | null => {
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()))
  }

  if (typeof dateValue === "number" && dateValue > 0) {
    const utcMilliseconds = (dateValue - 25569) * 86400 * 1000
    const parsedDate = new Date(utcMilliseconds)
    if (parsedDate.getUTCFullYear() > 1900 && parsedDate.getUTCFullYear() < 3000) {
      return parsedDate
    }
  }

  if (typeof dateValue === "string") {
    const parts = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (!parts) return null
    const d = parseInt(parts[1], 10)
    const m = parseInt(parts[2], 10)
    const y = parseInt(parts[3], 10)
    if (y < 1970 || y > 3000 || m === 0 || m > 12 || d === 0 || d > 31) return null
    const date = new Date(Date.UTC(y, m - 1, d))
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      return date
    }
  }

  return null
}

const readFileData = async (file: File): Promise<any[][]> => {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text()
    const result = XLSX.read(text, { type: "string" })
    const worksheet = result.Sheets[result.SheetNames[0]]
    return XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: null })
  } else {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "buffer" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!worksheet) throw new Error("El archivo Excel no contiene hojas.")
    return XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: null })
  }
}

// --- FILE PROCESSING ---

const validateAndMapHeaders = (
  uploadedHeaders: any[],
  requiredHeaders: string[],
): { headerMap: Map<string, number>; error?: string; optionalHeaderMap?: Map<string, number> } => {
  const headerMap = new Map<string, number>()
  const optionalHeaderMap = new Map<string, number>()
  const lowercasedUploadedHeaders = uploadedHeaders.map((h) => (h ? String(h).trim().toLowerCase() : ""))

  const missingHeaders = requiredHeaders.filter((reqH) => {
    const index = lowercasedUploadedHeaders.indexOf(reqH.toLowerCase())
    if (index !== -1) {
      headerMap.set(reqH, index)
      return false
    }
    return true
  })

  if (missingHeaders.length > 0) {
    return { headerMap, error: `Encabezados requeridos no encontrados: ${missingHeaders.join(", ")}.` }
  }

  // Map optional headers for config file
  CONFIG_OPTIONAL_HEADERS.forEach((optH) => {
    const index = lowercasedUploadedHeaders.indexOf(optH.toLowerCase())
    if (index !== -1) {
      optionalHeaderMap.set(optH, index)
    }
  })

  return { headerMap, optionalHeaderMap }
}

const parseTransactionsFromData = (
  data: any[][],
  headerMap: Map<string, number>,
): { transactions: Transaction[]; error?: string } => {
  const transactions: Transaction[] = []
  const errors: string[] = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) continue

    let rowHasError = false
    const transactionInput: any = { rowIndex: i + 1 }

    const fechaValue = row[headerMap.get("Fecha")!]
    const fechaDate = parseDate(fechaValue)
    if (!fechaDate) {
      errors.push(
        `Fila ${i + 1}: Formato de fecha inválido para "${
          fechaValue || ""
        }". Se esperaba DD/MM/AAAA o un número de serie de Excel.`,
      )
      rowHasError = true
    }

    TRANSACTION_REQUIRED_HEADERS.forEach((header) => {
      if (header === "Fecha") return // Already handled
      const key = header as keyof TransactionInputData
      const colIndex = headerMap.get(header)!
      const value = row[colIndex]

      if (TRANSACTION_NUMERIC_COLUMNS.includes(key as any)) {
        const numValue = parseFloat(String(value ?? ""))
        if (value === null || value === undefined || String(value).trim() === "" || isNaN(numValue)) {
          errors.push(`Fila ${i + 1}, Columna "${header}": Valor "${value}" no es un número.`)
          rowHasError = true
        } else {
          transactionInput[key] = numValue
        }
      } else {
        // For ID and Nombre
        transactionInput[key] = value
      }
    })

    if (transactionInput.ID === null || transactionInput.ID === undefined || String(transactionInput.ID).trim() === "") {
      errors.push(`Fila ${i + 1}: "ID" no puede estar vacío.`)
      rowHasError = true
    }

    if (!rowHasError) {
      const { isoWeek, isoYear } = getISOWeekAndYear(fechaDate!)
      transactions.push({ ...transactionInput, fechaDate: fechaDate!, isoWeek, isoYear })
    }
  }
  const errorString =
    errors.length > 0 ? `Problemas al analizar datos:\n- ${errors.slice(0, 10).join("\n- ")}` : undefined
  return { transactions, error: errorString }
}

const parseConfigRules = (
  data: any[][],
  headerMap: Map<string, number>,
  optionalHeaderMap: Map<string, number>,
): { rules: Map<string, ConfigRule>; warnings: string[] } => {
  const rules = new Map<string, ConfigRule>()
  const warnings: string[] = []
  const idCol = headerMap.get("ID")!
  const stockFijoCol = optionalHeaderMap.get("Stock_Fijo")
  const semanasCoberturaCol = optionalHeaderMap.get("Semanas_Cobertura_Stock")

  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) continue

    const id = normalizeId(row[idCol])
    if (!id) {
      warnings.push(`Fila ${i + 1} del archivo de reglas: El ID está vacío y será ignorado.`)
      continue
    }

    const rule: ConfigRule = { ID: id }

    if (stockFijoCol !== undefined) {
      const stockFijoValue = row[stockFijoCol]
      if (stockFijoValue !== null && stockFijoValue !== undefined && String(stockFijoValue).trim() !== "") {
        const numValue = parseFloat(String(stockFijoValue))
        if (!isNaN(numValue) && isFinite(numValue)) {
          rule.Stock_Fijo = numValue
        } else {
          warnings.push(`Fila ${i + 1} (ID ${id}): Valor de Stock_Fijo "${stockFijoValue}" no es un número válido y será ignorado.`)
        }
      }
    }

    if (semanasCoberturaCol !== undefined) {
      const semanasCoberturaValue = row[semanasCoberturaCol]
      if (
        semanasCoberturaValue !== null &&
        semanasCoberturaValue !== undefined &&
        String(semanasCoberturaValue).trim() !== ""
      ) {
        const numValue = parseFloat(String(semanasCoberturaValue))
        if (!isNaN(numValue) && isFinite(numValue)) {
          rule.Semanas_Cobertura_Stock = numValue
        } else {
          warnings.push(
            `Fila ${i + 1} (ID ${id}): Valor de Semanas_Cobertura_Stock "${semanasCoberturaValue}" no es un número válido y será ignorado.`,
          )
        }
      }
    }

    if (rules.has(id)) {
      warnings.push(`Fila ${i + 1}: ID duplicado "${id}" en el archivo de reglas. Se usará la última regla encontrada.`)
    }
    rules.set(id, rule)
  }
  return { rules, warnings }
}

// --- AGGREGATION AND CALCULATION ---

const applyConfigRules = (products: ProductInputData[], rules: Map<string, ConfigRule>): ProductInputData[] => {
  return products.map((product) => {
    const normalizedId = normalizeId(product.ID)
    const rule = rules.get(normalizedId)
    if (!rule) return product

    const updatedProduct = { ...product }

    if (typeof rule.Semanas_Cobertura_Stock === "number") {
      updatedProduct.Semanas_Cobertura_Stock = rule.Semanas_Cobertura_Stock
    }

    if (typeof rule.Stock_Fijo === "number") {
      updatedProduct.stockFijoOverride = rule.Stock_Fijo
    }

    return updatedProduct
  })
}

const aggregateTransactionsToProducts = (
  transactions: Transaction[],
  numPeriods: number,
  divisorPeriodos: number,
): { data: ProductInputData[]; weekHeaders: string[]; error?: string } => {
  if (transactions.length === 0) return { data: [], weekHeaders: [] }

  const latestDate = new Date(Math.max(...transactions.map((t) => t.fechaDate.getTime())))
  const currentMonthStart = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), 1))

  const { isoWeek: currentISOWeek, isoYear: currentISOYear } = getISOWeekAndYear(latestDate)
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
      ID: String(firstTransaction.ID), // Ensure ID is a string for display
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

const calculateReplenishment = (products: ProductInputData[]): ProductCalculatedData[] => {
  return products.map((product) => {
    const result: ProductCalculatedData = {
      ...product,
      Venta_Promedio_Semanal: 0,
      Stock_Ideal: 0,
      Unidades_A_Abastecer: 0,
      status: "OK", // Default status
    }
    
    // Always calculate weekly average for informational purposes
    try {
        const divisor = product.Divisor_Periodos
        if (divisor > 0) {
            // salesPeriods is newest to oldest, so we take the first 'divisor' elements
            const salesToAverage = product.salesPeriods.slice(0, divisor)
            const sumOfSales = salesToAverage.reduce((acc, curr) => acc + curr, 0)
            result.Venta_Promedio_Semanal = Math.round(sumOfSales / divisor)
        }
    } catch {
        result.Venta_Promedio_Semanal = 0; // Keep it at 0 on error
    }


    try {
      // Set status to 'Fijo' if there's a valid stock override
      if (typeof product.stockFijoOverride === "number" && isFinite(product.stockFijoOverride)) {
        result.status = "Fijo"
        result.Stock_Ideal = product.stockFijoOverride
      } else {
        // --- Standard Dynamic Calculation ---
        CALCULATION_NUMERIC_COLUMNS.forEach((key) => {
          const value = (product as any)[key]
          if (typeof value !== "number" || !isFinite(value)) {
            throw new Error(`Dato base inválido para ${key}: "${value}"`)
          }
        })
        result.Stock_Ideal = Math.round(result.Venta_Promedio_Semanal * product.Semanas_Cobertura_Stock)
      }
      
      const stockActual = product.Stock_Actual
       if (typeof stockActual !== "number" || !isFinite(stockActual)) {
        throw new Error(`Stock_Actual inválido: "${stockActual}"`)
      }

      result.Unidades_A_Abastecer = Math.round(Math.max(0, result.Stock_Ideal - stockActual))
    } catch (e) {
      const error = e instanceof Error ? e.message : "Error de cálculo desconocido"
      result.error = `Error para ID ${product.ID || `en fila ${product.rowIndex}`}: ${error}`
      result.Stock_Ideal = 0
      result.Unidades_A_Abastecer = 0
    }

    return result
  })
}

// --- MAIN EXPORTED FUNCTIONS ---

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
  processingInfo?: { totalTransactions: number; uniqueProducts: number }
}> => {
  try {
    const salesData = await readFileData(salesFile)
    if (salesData.length < 2)
      return { results: [], weekHeaders: [], error: "El archivo de ventas debe tener encabezado y datos." }

    const { headerMap, error: headerError } = validateAndMapHeaders(salesData[0], TRANSACTION_REQUIRED_HEADERS)
    if (headerError) return { results: [], weekHeaders: [], error: headerError }

    const { transactions, error: parseError } = parseTransactionsFromData(salesData, headerMap)
    if (transactions.length === 0)
      return { results: [], weekHeaders: [], error: parseError || "No se encontraron transacciones válidas." }
    if(parseError) return { results: [], weekHeaders: [], error: parseError }

    let configRules = new Map<string, ConfigRule>()
    let configWarnings: string[] = []

    if (configFile) {
      const configData = await readFileData(configFile)
      if (configData.length >= 2) {
        const {
          headerMap: configHeaderMap,
          optionalHeaderMap: configOptionalMap,
          error: configHeaderError,
        } = validateAndMapHeaders(configData[0], CONFIG_REQUIRED_HEADERS)
        if (configHeaderError) {
          return { results: [], weekHeaders: [], error: `Error en archivo de reglas: ${configHeaderError}` }
        } else {
          const { rules, warnings } = parseConfigRules(configData, configHeaderMap, configOptionalMap!)
          configRules = rules
          configWarnings = warnings
        }
      } else {
        configWarnings.push("El archivo de reglas está vacío o solo contiene encabezados.")
      }
    }

    const {
      data: aggregatedData,
      weekHeaders,
      error: aggregationError,
    } = aggregateTransactionsToProducts(transactions, numPeriods, divisorPeriodos)
    if (aggregationError) return { results: [], weekHeaders: [], error: aggregationError }


    const dataWithRules = applyConfigRules(aggregatedData, configRules)

    const finalResults = calculateReplenishment(dataWithRules)

    return {
      results: finalResults,
      weekHeaders: weekHeaders,
      warnings: configWarnings,
      processingInfo: {
        totalTransactions: transactions.length,
        uniqueProducts: finalResults.length,
      },
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : "Ocurrió un error desconocido."
    return { results: [], weekHeaders: [], error: `Error Crítico: ${error}` }
  }
}

export const exportResultsToExcel = (
  results: ProductCalculatedData[],
  weekHeaders: string[] = [],
  fileName: string,
  weeksToAnalyze: number,
  divisor: number,
  processingInfo: { totalTransactions: number; uniqueProducts: number },
): void => {
  if (!results || results.length === 0) return

  const numPeriodsToExport = weekHeaders.length > 0 ? weekHeaders.length : results[0]?.salesPeriods?.length || 0
  const baseWeekHeaders =
    weekHeaders.length > 0
      ? weekHeaders
      : Array.from({ length: numPeriodsToExport }, (_, i) => `Vta Semana ${numPeriodsToExport - i}`)
  const reversedWeekHeaders = [...baseWeekHeaders].reverse()
  const tableHeaders = [
    "ID",
    "Nombre",
    "Venta Mes Actual",
    ...reversedWeekHeaders,
    "Venta Prom. Semanal",
    "Semanas Cobertura",
    "Stock Actual",
    "Stock Ideal",
    "Unidades a Abastecer",
    "Estado",
    "Error",
  ]

  const tableDataRows = results.map((product) => {
    const weeklySales = product.salesPeriods.slice(0, numPeriodsToExport).map((s) => s || 0)
    const reversedWeeklySales = [...weeklySales].reverse()

    return [
      product.ID,
      product.Nombre,
      product.Venta_Total_Mes_Actual,
      ...reversedWeeklySales,
      product.Venta_Promedio_Semanal,
      product.Semanas_Cobertura_Stock,
      product.Stock_Actual,
      product.Stock_Ideal,
      product.Unidades_A_Abastecer,
      product.status,
      product.error ? product.error.replace(`Error para ID ${product.ID || "Unknown"}: `, "") : "",
    ]
  })

  const summaryRow1 = ["Resultados del Cálculo de Abastecimiento"]
  const summaryRow2 = [
    `Mostrando resultados para el archivo: ${fileName} (Análisis de ${weeksToAnalyze} semanas, Divisor: ${divisor})`,
  ]
  const summaryRow3 = [
    `Procesamiento: ${processingInfo.totalTransactions} transacciones procesadas, ${processingInfo.uniqueProducts} productos únicos`,
  ]
  const blankRow = [""]
  const dataToExport = [summaryRow1, summaryRow2, summaryRow3, blankRow, tableHeaders, ...tableDataRows]

  const worksheet = XLSX.utils.aoa_to_sheet(dataToExport)

  const columnWidths = tableHeaders.map((header, colIndex) => {
    if (header === "Nombre") return { wch: 45 }
    if (header === "ID") return { wch: 12 }
    if (header === "Error") return { wch: 40 }

    const allRowsForCol = dataToExport.map((row) => row[colIndex])
    const maxWidth = Math.max(...allRowsForCol.map((cell) => String(cell ?? "").length))
    return { wch: Math.min(50, maxWidth + 4) }
  })
  worksheet["!cols"] = columnWidths

  const numColumns = tableHeaders.length
  if (!worksheet["!merges"]) worksheet["!merges"] = []
  worksheet["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: numColumns - 1 } })
  worksheet["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: numColumns - 1 } })
  worksheet["!merges"].push({ s: { r: 2, c: 0 }, e: { r: 2, c: numColumns - 1 } })

  const titleStyle = { font: { bold: true, sz: 14 }, alignment: { horizontal: "left", vertical: "center" } }
  const summaryStyle = { font: { sz: 11 }, alignment: { horizontal: "left", vertical: "center" } }
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "2563EB" } }, // blue-600
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  }

  const getAlignment = (header: string): { horizontal: "left" | "right" | "center" } => {
    const numericHeaders = new Set([
      "Venta Mes Actual",
      ...baseWeekHeaders,
      "Venta Prom. Semanal",
      "Semanas Cobertura",
      "Stock Actual",
      "Stock Ideal",
      "Unidades a Abastecer",
    ])
    if (header === "Estado") return { horizontal: "center" }
    if (numericHeaders.has(header)) return { horizontal: "right" }
    return { horizontal: "left" }
  }

  worksheet[XLSX.utils.encode_cell({ r: 0, c: 0 })].s = titleStyle
  worksheet[XLSX.utils.encode_cell({ r: 1, c: 0 })].s = summaryStyle
  worksheet[XLSX.utils.encode_cell({ r: 2, c: 0 })].s = summaryStyle

  for (let C = 0; C < numColumns; C++) {
    const cellRef = XLSX.utils.encode_cell({ r: 4, c: C })
    if (worksheet[cellRef]) worksheet[cellRef].s = headerStyle
  }

  for (let R = 5; R < dataToExport.length; R++) {
    const productHasError = results[R - 5]?.error
    for (let C = 0; C < numColumns; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C })
      if (worksheet[cellRef]) {
        const header = tableHeaders[C]
        worksheet[cellRef].s = {
          alignment: { ...getAlignment(header), vertical: "center" },
          fill: productHasError ? { fgColor: { rgb: "FFEBEE" } } : undefined,
          font: header === "Unidades a Abastecer" ? { bold: true } : undefined,
        }
      }
    }
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Abastecimiento")
  XLSX.writeFile(workbook, "Smart_Supply_Abastecimiento_Report.xlsx")
}
