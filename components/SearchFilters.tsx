"use client"

import type React from "react"

interface SearchFiltersProps {
  skuSearch: string
  onSkuChange: (value: string) => void
  nameSearch: string
  onNameChange: (value: string) => void
  totalCount: number
  filteredCount: number
  onClearFilters: () => void
  onFilter: () => void;
  periodsDivisor: number
  onPeriodsDivisorChange: (value: number) => void
  weeksToAnalyze: number
  onWeeksToAnalyzeChange: (value: number) => void
  onRecalculate: () => void
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  skuSearch,
  onSkuChange,
  nameSearch,
  onNameChange,
  totalCount,
  filteredCount,
  onClearFilters,
  onFilter,
  periodsDivisor,
  onPeriodsDivisorChange,
  weeksToAnalyze,
  onWeeksToAnalyzeChange,
  onRecalculate,
}) => {
  const isFilterInputActive = !!(skuSearch || nameSearch)

  return (
    <div className="bg-[#f0f4f8] p-4 rounded-lg shadow-md w-full">
      <div className="flex flex-wrap justify-between items-end gap-x-8 gap-y-4">
        {/* Left Side: Filtering */}
        <div className="flex-grow flex flex-wrap items-end gap-4">
          {/* SKU Search */}
          <div>
            <label htmlFor="sku-search" className="block text-sm font-medium text-slate-700 mb-1">
              Buscar por SKU
            </label>
            <input
              type="text"
              id="sku-search"
              placeholder="SKU1, SKU2,..."
              value={skuSearch}
              onChange={(e) => onSkuChange(e.target.value)}
              className="block w-60 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Name Search */}
          <div>
            <label htmlFor="name-search" className="block text-sm font-medium text-slate-700 mb-1">
              Buscar por Nombre
            </label>
            <input
              type="text"
              id="name-search"
              placeholder="Nombre1, Nombre2,..."
              value={nameSearch}
              onChange={(e) => onNameChange(e.target.value)}
              className="block w-60 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-2">
            <button
                onClick={onFilter}
                className="px-6 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                           bg-blue-500 hover:bg-blue-600 text-white"
                title="Aplicar filtros de búsqueda"
              >
                Filtrar
            </button>
            <button
              onClick={onClearFilters}
              disabled={!isFilterInputActive}
              className="px-4 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500
                           bg-white hover:bg-slate-50 border border-slate-300 text-slate-700
                           disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              title="Limpiar filtros de búsqueda"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Right Side: Recalculating */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Weeks to Analyze */}
          <div style={{ width: "130px" }}>
            <label htmlFor="semanas-selector" className="block text-sm font-medium text-slate-700 mb-1">
              Semanas Visualizadas
            </label>
            <input
              type="number"
              id="semanas-selector"
              min="2"
              max="20"
              value={weeksToAnalyze}
              onChange={(e) => onWeeksToAnalyzeChange(Number(e.target.value))}
              className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                       focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* Periods Divisor */}
          <div style={{ width: "130px" }}>
            <label htmlFor="divisor-selector-results" className="block text-sm font-medium text-slate-700 mb-1">
              Divisor de Períodos
            </label>
            <input
              type="number"
              id="divisor-selector-results"
              min="1"
              max="52"
              value={periodsDivisor}
              onChange={(e) => onPeriodsDivisorChange(Number(e.target.value))}
              className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm
                       focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>

          <button
            onClick={onRecalculate}
            className="px-6 py-2 text-sm font-semibold rounded-md shadow-sm transition-colors
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                           bg-green-500 hover:bg-green-600 text-white"
            title="Recalcular con nuevos parámetros"
          >
            Recalcular
          </button>
        </div>
      </div>
      <div className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-300/60">
        Mostrando <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> productos
      </div>
    </div>
  )
}

export default SearchFilters