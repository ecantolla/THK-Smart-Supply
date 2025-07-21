"use client"

import { useState, useCallback, useMemo } from "react"
import type { ProductCalculatedData, AppView, ProcessingInfo } from "../types"
import { processAndCalculate, exportResultsToExcel } from "../services/dataProcessor"
import Header from "../components/Header"
import Footer from "../components/Footer"
import FileUpload from "../components/FileUpload"
import ConfigUpload from "../components/ConfigUpload"
import ResultsTable from "../components/ResultsTable"
import LoadingSpinner from "../components/LoadingSpinner"
import SearchFilters from "../components/SearchFilters"
import NumericInputCard from "../components/NumericInputCard"
import NotificationPanel from "../components/NotificationPanel"
import InstructionPanel from "../components/InstructionPanel"

export default function SmartSupply() {
  // State for data and files
  const [calculationResults, setCalculationResults] = useState<ProductCalculatedData[] | null>(null)
  const [filteredResults, setFilteredResults] = useState<ProductCalculatedData[] | null>(null)
  const [salesFile, setSalesFile] = useState<File | null>(null)
  const [configFile, setConfigFile] = useState<File | null>(null)
  const [weekHeaders, setWeekHeaders] = useState<string[]>([])

  // State for UI and notifications
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [processingInfo, setProcessingInfo] = useState<ProcessingInfo | null>(null)
  const [currentView, setCurrentView] = useState<AppView>("upload")

  // State for calculation parameters
  const [weeksToAnalyze, setWeeksToAnalyze] = useState(8)
  const [periodsDivisor, setPeriodsDivisor] = useState(4)

  // State for filters and sorting
  const [skuSearch, setSkuSearch] = useState<string>("")
  const [nameSearch, setNameSearch] = useState<string>("")
  const [appliedSkuSearch, setAppliedSkuSearch] = useState<string>("")
  const [appliedNameSearch, setAppliedNameSearch] = useState<string>("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);


  const handleCalculate = useCallback(async () => {
    if (!salesFile) {
      setErrorMessage("Por favor, sube el archivo de ventas.")
      return
    }
    setIsLoading(true)
    setErrorMessage(null)
    setWarnings([])

    try {
      const {
        results,
        weekHeaders: headers,
        error,
        warnings: procWarnings,
        processingInfo: info,
      } = await processAndCalculate(salesFile, configFile, weeksToAnalyze, periodsDivisor)

      if (error) {
        setErrorMessage(error)
        setCalculationResults(null)
        setFilteredResults(null)
        setCurrentView("upload")
      } else {
        setCalculationResults(results)
        setFilteredResults(results) // Initially, filtered results are all results
        setWeekHeaders(headers)
        setCurrentView("results")
        if (procWarnings) {
          setWarnings(procWarnings)
        }
        if (info) {
          setProcessingInfo(info)
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Ocurrió un error desconocido durante el procesamiento."
      setErrorMessage(errorMsg)
      setCalculationResults(null)
      setFilteredResults(null)
      setCurrentView("upload")
    }

    setIsLoading(false)
  }, [salesFile, configFile, weeksToAnalyze, periodsDivisor])

  const handleStartOver = () => {
    setCalculationResults(null)
    setFilteredResults(null)
    setSalesFile(null)
    setConfigFile(null)
    setWeekHeaders([])
    setErrorMessage(null)
    setWarnings([])
    setProcessingInfo(null)
    setCurrentView("upload")
    setSkuSearch("")
    setNameSearch("")
    setAppliedSkuSearch("")
    setAppliedNameSearch("")
    setWeeksToAnalyze(8)
    setPeriodsDivisor(4)
    setSortConfig(null); // Reset sort on start over
    // Clear the file inputs visually
    const salesFileInput = document.getElementById("file-upload") as HTMLInputElement
    if (salesFileInput) salesFileInput.value = ""
    const configFileInput = document.getElementById("config-file-upload") as HTMLInputElement
    if (configFileInput) configFileInput.value = ""
  }

  const handleClearFilters = () => {
    setSkuSearch("")
    setNameSearch("")
    setAppliedSkuSearch("")
    setAppliedNameSearch("")
    setFilteredResults(calculationResults)
  }

  const handleExport = () => {
    if (sortedAndFilteredResults && processingInfo) {
      exportResultsToExcel(
        sortedAndFilteredResults,
        weekHeaders,
        salesFile?.name || "reporte",
        weeksToAnalyze,
        periodsDivisor,
        processingInfo
      )
    }
  }

  const handleApplyFilters = () => {
    if (!calculationResults) return
    setAppliedSkuSearch(skuSearch)
    setAppliedNameSearch(nameSearch)

    const normalizeSkuForSearch = (id: any): string => {
        if (id === null || id === undefined) return "";
        return String(id)
            .trim()
            .replace(/,/g, "")
            .replace(/\.0+$/, "")
            .toLowerCase();
    };

    const filtered = calculationResults.filter((product) => {
      const skuTerms = skuSearch.toLowerCase().split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
      const skuMatch = skuTerms.length > 0
        ? skuTerms.some(term => 
            normalizeSkuForSearch(product.ID).includes(term)
          )
        : true;

      const nameTerms = nameSearch.toLowerCase().split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
      const nameMatch = nameTerms.length > 0
        ? nameTerms.some(term => product.Nombre.toLowerCase().includes(term))
        : true;

      return skuMatch && nameMatch;
    });
    setFilteredResults(filtered)
  }

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredResults = useMemo(() => {
    let sortableItems = filteredResults ? [...filteredResults] : [];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof ProductCalculatedData];
        const bValue = b[sortConfig.key as keyof ProductCalculatedData];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredResults, sortConfig]);

  const filteredCount = useMemo(() => sortedAndFilteredResults?.length || 0, [sortedAndFilteredResults])
  const totalCount = useMemo(() => calculationResults?.length || 0, [calculationResults])

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header 
        onStartOver={handleStartOver} 
        showStartOver={currentView === "results"}
        onExport={handleExport}
        showExport={currentView === "results"}
        isExportDisabled={!sortedAndFilteredResults || sortedAndFilteredResults.length === 0}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        {isLoading && <LoadingSpinner />}

        {currentView === "upload" && !isLoading && (
          <>
            <InstructionPanel />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
              <NumericInputCard
                id="weeks-to-analyze"
                label="Semanas a Analizar"
                sublabel="Número de semanas de venta a considerar para el promedio."
                value={weeksToAnalyze}
                onChange={setWeeksToAnalyze}
                min={2}
                max={20}
              />
              <NumericInputCard
                id="periods-divisor"
                label="Divisor de Períodos"
                sublabel="Número de períodos (semanas) para calcular el promedio de ventas."
                value={periodsDivisor}
                onChange={setPeriodsDivisor}
                min={1}
                max={52}
              />
              <FileUpload onFileSelected={setSalesFile} isLoading={isLoading} selectedFile={salesFile} />
              <ConfigUpload onFileSelected={setConfigFile} isLoading={isLoading} selectedFile={configFile} />
            </div>

            <div className="max-w-4xl mx-auto">
              <button
                onClick={handleCalculate}
                disabled={!salesFile || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Calcular Abastecimiento
              </button>
            </div>
            {errorMessage && (
              <div className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg max-w-4xl mx-auto">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}
          </>
        )}

        {currentView === "results" && sortedAndFilteredResults && !isLoading && (
          <>
            <NotificationPanel warnings={warnings} />
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-grow">
                  <h2 className="text-xl font-semibold text-slate-800">Resultados del Cálculo</h2>
                </div>
                {/* The Export button was here and has been moved to the Header */}
              </div>
              <SearchFilters
                // Props para filtros de búsqueda
                skuSearch={skuSearch}
                onSkuChange={setSkuSearch}
                nameSearch={nameSearch}
                onNameChange={setNameSearch}
                onFilter={handleApplyFilters}
                onClearFilters={handleClearFilters}
                // Props para recálculo
                weeksToAnalyze={weeksToAnalyze}
                onWeeksToAnalyzeChange={setWeeksToAnalyze}
                periodsDivisor={periodsDivisor}
                onPeriodsDivisorChange={setPeriodsDivisor}
                onRecalculate={handleCalculate}
                // Props para mostrar información
                totalCount={totalCount}
                filteredCount={filteredCount}
              />
            </div>
            <ResultsTable 
              results={sortedAndFilteredResults} 
              weekHeaders={weekHeaders}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
