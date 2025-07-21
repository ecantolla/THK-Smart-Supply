"use client"

import type React from "react"
import { useCallback, useState } from "react"

interface ConfigUploadProps {
  onFileSelected: (file: File | null) => void
  isLoading: boolean
  selectedFile: File | null
}

const ConfigUpload: React.FC<ConfigUploadProps> = ({ onFileSelected, isLoading, selectedFile }) => {
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)

  const processFile = (file: File) => {
    const supportedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    const isSupported =
      supportedTypes.includes(file.type) ||
      file.name.toLowerCase().endsWith(".csv") ||
      file.name.toLowerCase().endsWith(".xlsx")

    if (file && isSupported) {
      onFileSelected(file)
    } else {
      onFileSelected(null)
      alert("Por favor, sube un archivo CSV o XLSX válido.")
    }
  }

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        processFile(file)
      } else {
        onFileSelected(null)
      }
    },
    [onFileSelected],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDraggingOver(false)
      if (isLoading) return

      const file = event.dataTransfer.files?.[0]
      if (file) {
        processFile(file)
      } else {
        onFileSelected(null)
      }
      const fileInput = document.getElementById("config-file-upload") as HTMLInputElement
      if (fileInput) {
        fileInput.value = ""
      }
    },
    [isLoading, onFileSelected],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (isLoading) return
      setIsDraggingOver(true)
    },
    [isLoading],
  )

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
  }, [])

  return (
    <div className="w-full flex flex-col p-4 sm:p-6 bg-white rounded-xl shadow-lg transition-all hover:shadow-md">
      <p className="text-base font-semibold text-slate-800 mb-3 text-center">Archivo de Reglas (Opcional)</p>
      <label
        htmlFor="config-file-upload"
        className={`relative flex-grow flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer transition-colors
                    ${isLoading ? "cursor-not-allowed bg-slate-100" : "bg-white hover:bg-slate-50"}
                    ${isDraggingOver ? "border-purple-500 bg-purple-50" : "border-slate-300"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        aria-disabled={isLoading}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            className={`w-10 h-10 mb-3 ${isDraggingOver ? "text-purple-600" : "text-purple-500"}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          <p className="mb-1 text-sm text-slate-600">
            {selectedFile ? selectedFile.name : "Subir archivo de reglas"}
          </p>
          <p className="text-xs text-slate-500">Define Stock Fijo o Cobertura por producto</p>
        </div>
        <input
          id="config-file-upload"
          type="file"
          className="hidden"
          accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>
    </div>
  )
}

export default ConfigUpload