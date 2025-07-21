import React, { useRef, useMemo } from "react";
import type { ProductCalculatedData } from "../types";
import { useVirtualizer } from "@tanstack/react-virtual";

interface ResultsTableProps {
  results: ProductCalculatedData[];
  weekHeaders: string[];
  sortConfig: { key: string; direction: 'ascending' | 'descending' } | null;
  onSort: (key: string) => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results, weekHeaders, sortConfig, onSort }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const getColumnConfig = (header: string) => {
    switch (header) {
      case "ID":
        return { width: 80, align: "text-left", key: 'ID' };
      case "Nombre":
        return { width: 320, align: "text-left", key: 'Nombre' };
      case "Venta Mes Actual":
        return { width: 90, align: "text-right", key: 'Venta_Total_Mes_Actual' };
      case "Venta Prom. Semanal":
        return { width: 90, align: "text-right", key: 'Venta_Promedio_Semanal' };
      case "Semanas Cobertura":
        return { width: 90, align: "text-right", key: 'Semanas_Cobertura_Stock' };
      case "Stock Actual":
        return { width: 90, align: "text-right", key: 'Stock_Actual' };
      case "Stock Ideal":
        return { width: 90, align: "text-right", key: 'Stock_Ideal' };
      case "Unidades a Abastecer":
        return { width: 90, align: "text-right", key: 'Unidades_A_Abastecer' };
      case "Estado":
        return { width: 80, align: "text-center", key: 'status' };
      default: // Para "Vta Semana XX"
        return { width: 80, align: "text-right", key: null }; // Not sortable
    }
  };

  const { columnConfigs, totalWidth } = useMemo(() => {
    const reversedPeriodHeaders = [...weekHeaders].reverse();
    const staticHeaders = [
      "Venta Prom. Semanal",
      "Semanas Cobertura",
      "Stock Actual",
      "Stock Ideal",
      "Unidades a Abastecer",
      "Estado",
    ];
    const allHeaders = ["ID", "Nombre", "Venta Mes Actual", ...reversedPeriodHeaders, ...staticHeaders];
    
    const configs = allHeaders.map((h) => ({
      header: h,
      ...getColumnConfig(h),
    }));
    
    const width = configs.reduce((acc, config) => acc + config.width, 0);

    return { columnConfigs: configs, totalWidth: width };
  }, [weekHeaders]);


  if (!results || results.length === 0) {
    return (
      <div className="text-center bg-white p-8 rounded-lg shadow-md">
        <p className="text-slate-600">No hay resultados para mostrar con los filtros actuales.</p>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  const formatHeader = (headerText: string): JSX.Element => {
    if (headerText.startsWith("Vta")) return <>{headerText}</>;
    const words = headerText.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      if (currentLine.length > 0 && (currentLine + " " + word).length > 12) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return (
      <>
        {lines.map((line, index) => (
          <React.Fragment key={line + index}>
            {line}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  };

  const getStatusComponent = (product: ProductCalculatedData) => {
    if (product.error) {
      return (
        <span className="text-red-600 font-medium" title={product.error}>
          Error
        </span>
      );
    }
    if (product.status === "Fijo") {
      return <span className="font-semibold text-slate-700">Fijo</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">OK</span>;
  };

  return (
    <div ref={parentRef} className="overflow-auto bg-white shadow-lg rounded-lg" style={{ maxHeight: "70vh" }}>
      <div style={{ width: `${totalWidth}px` }}>
        <table className="w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-20 bg-slate-200">
            <tr>
              {columnConfigs.map(({ header, width, align, key }, index) => {
                const isSticky = index < 2;
                const isSortable = !!key;
                const isActiveSort = sortConfig?.key === key;
                
                const stickyStyles = isSticky ? { left: index === 0 ? 0 : columnConfigs[0].width } : {};
                const stickyClasses = isSticky ? "sticky z-10 bg-slate-200" : "";
                const borderClass = index === 1 ? "border-r-2 border-slate-400" : "border-r border-slate-300";

                return (
                  <th
                    key={header}
                    scope="col"
                    onClick={isSortable ? () => onSort(key) : undefined}
                    className={`p-2 text-xs font-bold text-slate-700 text-center align-bottom ${borderClass} ${stickyClasses} ${isSortable ? 'cursor-pointer hover:bg-slate-300 transition-colors' : ''}`}
                    style={{ width: `${width}px`, ...stickyStyles }}
                    title={isSortable ? `Ordenar por ${header}` : header}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {formatHeader(header)}
                      {isActiveSort && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualItems.map((virtualRow) => {
              const product = results[virtualRow.index];
              const rowData = [
                product.ID,
                product.Nombre,
                product.Venta_Total_Mes_Actual,
                ...[...product.salesPeriods].reverse(),
                product.Venta_Promedio_Semanal,
                product.Semanas_Cobertura_Stock,
                product.Stock_Actual,
                product.Stock_Ideal,
                product.Unidades_A_Abastecer,
                getStatusComponent(product),
              ];

              return (
                <tr
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="group"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {rowData.map((cellData, cellIndex) => {
                    const config = columnConfigs[cellIndex];
                    if (!config) return null;

                    const isSticky = cellIndex < 2;
                    const stickyStyles = isSticky ? { left: cellIndex === 0 ? 0 : columnConfigs[0].width } : {};
                    let bgClasses = "";
                    if (product.error) {
                      bgClasses = "bg-red-50 group-hover:bg-red-100";
                    } else {
                      bgClasses = "bg-white group-hover:bg-slate-50";
                    }
                    const isNombre = config.header === "Nombre";
                    const isUnidades = config.header === "Unidades a Abastecer";
                    const isNumericBold = ["Venta Prom. Semanal", "Stock Ideal"].includes(config.header);
                    const borderClass = cellIndex === 1 ? "border-r-2 border-slate-300" : "border-r border-slate-200";
                    const stickyClasses = isSticky ? `sticky z-10 ${borderClass}` : "";

                    return (
                      <td
                        key={config.header}
                        className={`px-2 py-3 text-sm text-slate-700 border-b border-slate-200 ${config.align} ${isNombre ? "whitespace-normal" : "whitespace-nowrap"} ${isUnidades ? "font-bold" : ""} ${isNumericBold ? "font-medium" : ""} ${bgClasses} ${stickyClasses} ${borderClass}`}
                        style={{ width: `${config.width}px`, ...stickyStyles }}
                        title={String(cellData)}
                      >
                        {cellData}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
