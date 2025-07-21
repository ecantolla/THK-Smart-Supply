import type React from "react"
import HeaderIcon from "./HeaderIcon"

interface HeaderProps {
  onStartOver: () => void;
  showStartOver: boolean;
  onExport: () => void;
  showExport: boolean;
  isExportDisabled: boolean;
}

const Header: React.FC<HeaderProps> = ({ onStartOver, showStartOver, onExport, showExport, isExportDisabled }) => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg p-6 mb-8">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <HeaderIcon />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Smart Supply</h1>
            <p className="text-blue-200 text-sm">Cálculo de Abastecimiento Inteligente</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showStartOver && (
            <button
              onClick={onStartOver}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              aria-label="Reiniciar cálculos"
            >
              Reiniciar Cálculos
            </button>
          )}
          {showExport && (
            <button
              onClick={onExport}
              disabled={isExportDisabled}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Exportar a Excel"
            >
              Exportar a Excel
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
