"use client"
    
import type React from "react"
import { useState, useEffect } from "react"

interface NumericInputCardProps {
  label: string
  sublabel: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  id: string
}

const NumericInputCard: React.FC<NumericInputCardProps> = ({
  label,
  sublabel,
  value,
  onChange,
  min,
  max,
  id,
}) => {
  const [inputValue, setInputValue] = useState<string>(String(value))

  useEffect(() => {
    // Syncs the input field if the parent state changes (e.g., on reset)
    if (Number.parseInt(inputValue, 10) !== value) {
      setInputValue(String(value))
    }
  }, [value, inputValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let numericValue = Number.parseInt(e.target.value, 10)

    if (isNaN(numericValue) || numericValue < min) {
      numericValue = min
    } else if (numericValue > max) {
      numericValue = max
    }

    onChange(numericValue)
    setInputValue(String(numericValue))
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 bg-white rounded-xl shadow-lg transition-all hover:shadow-md">
      <div className="flex-grow flex flex-col justify-center">
        <label htmlFor={id} className="block text-base font-semibold text-slate-800 mb-1 text-center">
          {label}
        </label>
        <p className="text-xs text-slate-500 mb-3 text-center">{sublabel}</p>
        <input
          type="number"
          id={id}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl font-bold"
          aria-label={label}
          placeholder={String(min)}
        />
      </div>
    </div>
  )
}

export default NumericInputCard
