"use client"

import type React from "react"
import { useCallback, useState } from "react"

interface FileUploadProps {
  onFileSelected: (file: File | null) => void
  isLoading: boolean
  selectedFile: File | null
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, isLoading, selectedFile }) => {
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
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
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
      <p className="text-base font-semibold text-slate-800 mb-3 text-center">Archivo de Ventas (Obligatorio)</p>
      <label
        htmlFor="file-upload"
        className={`flex-grow flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer transition-colors
                    ${isLoading ? "cursor-not-allowed bg-slate-100" : "bg-white hover:bg-slate-50"}
                    ${isDraggingOver ? "border-blue-500 bg-blue-50" : "border-slate-300"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        aria-disabled={isLoading}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            className={`w-10 h-10 mb-3 ${isDraggingOver ? "text-blue-600" : "text-blue-500"}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 16"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
            />
          </svg>
          <p className="mb-2 text-sm text-slate-600">
            {selectedFile ? selectedFile.name : "Click para subir o arrastrar"}
          </p>
          <p className="text-xs text-slate-500">Reporte de Ventas (CSV o XLSX)</p>
        </div>
        <input
          id="file-upload"
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

export default FileUpload