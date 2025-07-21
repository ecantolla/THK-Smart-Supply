import type React from "react"

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-200 text-slate-600 p-6 mt-12 text-center text-sm border-t border-slate-300">
      <div className="container mx-auto">
        <p>&copy; {new Date().getFullYear()} Smart Supply. All rights reserved.</p>
        <p className="mt-1">Designed for efficient inventory management.</p>
      </div>
    </footer>
  )
}

export default Footer