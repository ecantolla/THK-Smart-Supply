import type React from "react"

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center my-8">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      <p className="ml-4 text-blue-600 font-semibold">Cargando Resultados...</p>
    </div>
  )
}

export default LoadingSpinner
