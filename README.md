# Smart Supply - Abastecimiento Inteligente

Smart Supply es una aplicación web inteligente diseñada para automatizar y optimizar el abastecimiento de productos para tiendas minoristas.

## 🚀 Características

- 📊 Análisis de ventas históricas (2-20 semanas configurables)
- ⚙️ **Control total con reglas personalizadas (opcional)**: Define stock fijo o semanas de cobertura por producto.
- 🔄 Cálculo automático de stock ideal basado en patrones de venta
- 📈 Recomendaciones de abastecimiento personalizadas
- 📋 Exportación a Excel con reportes detallados
- 🔍 Filtros de búsqueda avanzados por SKU y nombre
- 📱 Diseño responsive para cualquier dispositivo
- ⚡ Procesamiento rápido de archivos CSV y Excel
- 📅 Análisis por semanas ISO 8601

## 📋 Cómo usar

### Paso 1: Prepara tus Archivos

1.  **Reporte de Ventas (Obligatorio)**:
    -   Tu archivo CSV o Excel debe contener las siguientes columnas (el orden no importa): `ID`, `Nombre`, `Fecha` (formato DD/MM/AAAA), `Unidades_Vendidas`, `Semanas_Cobertura_Stock`, `Stock_Actual`.
2.  **Archivo de Reglas (Opcional)**:
    -   Crea un archivo CSV o Excel para definir reglas específicas por producto.
    -   **Columnas**: `ID` (requerido), `Nombre` (opcional, como referencia), `Stock_Fijo` (opcional), `Semanas_Cobertura_Stock` (opcional).
    -   Usar `Stock_Fijo` anulará el cálculo dinámico y establecerá un stock ideal manual.

### Paso 2: Configura y Calcula
-   Define los parámetros de análisis (`Semanas a Analizar` y `Divisor de Períodos`).
-   Sube tu reporte de ventas y, si lo deseas, tu archivo de reglas.
-   Presiona **"Calcular Abastecimiento"** para iniciar el análisis.

### Paso 3: Revisa y exporta
Los resultados se mostrarán instantáneamente. Puedes filtrar por SKU o nombre y exportar todo a Excel.

## 🛠️ Tecnologías utilizadas

- **React (con TypeScript)** - Interfaz de usuario
- **Tailwind CSS** - Estilos
- **XLSX** - Procesamiento de archivos Excel

## 📊 Cálculos

La aplicación sigue una secuencia lógica de cálculos.

### 1. Agregación y Determinación de Semanas de Análisis

Pensar en una "semana" puede ser complicado. ¿Una semana va de domingo a sábado o de lunes a domingo? Para evitar ambigüedades que distorsionen los promedios, la aplicación utiliza una metodología estandarizada y robusta:

1.  **Encontrar el Punto de Referencia (Ancla):**
    *   La app escanea todas las transacciones y encuentra la **fecha más reciente**. Esta fecha es el punto de partida para el análisis.

2.  **Usar el Estándar ISO 8601 para Semanas:**
    *   La app se basa en el estándar internacional **ISO 8601**, que define una "semana" de forma universal y consistente:
        *   Una semana ISO siempre empieza en **lunes** y termina en **domingo**.
        *   Cada semana del año tiene un número (del 1 al 52 o 53).
        *   Esto resuelve la confusión de las semanas que se dividen entre dos años (ej. a finales de diciembre).

3.  **Identificar la Semana de Partida:**
    *   El análisis comienza en la semana completa **inmediatamente anterior** a la fecha más reciente encontrada, para asegurar que solo se usan datos de semanas completas (7 días). A esta la llamamos **Período 1 (P1)**.

4.  **Calcular Hacia Atrás:**
    *   A partir de P1, la aplicación cuenta hacia atrás según el número de "Semanas a Analizar" que el usuario haya seleccionado.

**¿Por qué es tan importante este método?**

Garantiza que **cada período de venta que se compara es exactamente igual en duración (7 días, de lunes a domingo)**. Esto hace que la "Venta Promedio Semanal" sea mucho más precisa y fiable.


### 2. Venta Promedio Semanal
```
Venta Prom. Semanal = Suma de Ventas de Períodos ÷ Divisor de Períodos
```

### 3. Stock Ideal
```
Stock Ideal = Venta Prom. Semanal × Semanas de Cobertura
```

### 4. Unidades a Abastecer
```
Unidades a Abastecer = Stock Ideal - Stock Actual
```
## 📄 Licencia

Este proyecto es privado y está destinado para uso interno.
