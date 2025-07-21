import type React from "react"
import { TRANSACTION_REQUIRED_HEADERS, CONFIG_REQUIRED_HEADERS, CONFIG_OPTIONAL_HEADERS } from "../constants"

const InstructionPanel: React.FC = () => {
  return (
    <div className="w-full max-w-4xl bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8 mx-auto">
      <h2 className="text-2xl font-semibold text-slate-800 mb-6 border-b-2 border-slate-200 pb-3">
        Cómo Empezar con Smart Supply
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-slate-700">
        <div className="lg:col-span-1">
          <strong className="text-blue-700 text-lg">Paso 1: Reporte de Ventas</strong>
          <p className="mt-1 mb-2">
            Tu archivo principal (CSV/Excel) debe ser un reporte de ventas. Columnas requeridas:
          </p>
          <ul className="list-disc list-inside bg-slate-50 p-4 rounded-md text-sm space-y-1">
            {TRANSACTION_REQUIRED_HEADERS.map((header) => (
              <li key={header}>
                <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">{header}</code>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            La columna <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">Fecha</code> debe estar en
            formato <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">DD/MM/AAAA</code>.
          </p>
        </div>

        <div className="lg:col-span-1">
          <strong className="text-purple-700 text-lg">Paso 2: Archivo de Reglas (Opcional)</strong>
          <p className="mt-1 mb-2">
            Puedes subir un segundo archivo para definir reglas personalizadas por producto.
          </p>
          <ul className="list-disc list-inside bg-purple-50 p-4 rounded-md text-sm space-y-1">
            <li>
              <strong>Requerido:</strong>{" "}
              <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-800">
                {CONFIG_REQUIRED_HEADERS[0]}
              </code>
            </li>
            {CONFIG_OPTIONAL_HEADERS.map((header) => (
              <li key={header}>
                <strong>Opcional:</strong>{" "}
                <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-800">{header}</code>
              </li>
            ))}
          </ul>
           <p className="text-xs text-slate-500 mt-2">
            <code className="bg-purple-100 px-1 py-0.5 rounded text-purple-800">Stock_Fijo</code> anula el cálculo dinámico.
          </p>
        </div>
        
        <div className="lg:col-span-1">
          <strong className="text-green-700 text-lg">Paso 3: Configura y Calcula</strong>
          <p className="mt-1">
            Define los parámetros de análisis, sube tus archivos y presiona el botón <span className="font-semibold text-blue-600">"Calcular Abastecimiento"</span> para iniciar el proceso.
          </p>
        </div>

      </div>

      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-xl font-semibold text-slate-800 mb-3">Beneficios Clave:</h3>
        <ul className="list-disc list-inside space-y-2 text-slate-600">
           <li>
            <strong className="text-blue-700">Control Total:</strong> Define reglas de stock fijo o cobertura por producto.
          </li>
          <li>
            <strong className="text-blue-700">Flexibilidad:</strong> Analiza el historial de ventas que necesites, desde
            2 a 20 semanas.
          </li>
          <li>
            <strong className="text-blue-700">Automatización:</strong> No más cálculos manuales de ventas por período.
          </li>
          <li>
            <strong className="text-blue-700">Eficiencia:</strong> Usa tus reportes de venta directamente.
          </li>
        </ul>
      </div>
    </div>
  )
}

export default InstructionPanel
