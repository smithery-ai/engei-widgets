/**
 * Table widget plugin — renders enhanced tables with sorting from JSON or CSV.
 *
 * Spec fields:
 *   columns?: string[]       — header labels (inferred from data keys if omitted)
 *   rows: object[] | any[][] — data rows
 *   sortable?: boolean       — enable click-to-sort headers (default: true)
 *   caption?: string         — optional table caption
 *
 * Code block lang: `table` (expects JSON)
 */

import type { WidgetPlugin } from "../types"
import { escapeHtml } from "../utils"

interface TableSpec {
  type: "table"
  widgetId: string
  columns?: string[]
  rows: Record<string, any>[] | any[][]
  sortable?: boolean
  caption?: string
}

function inferColumns(rows: Record<string, any>[] | any[][]): string[] {
  if (rows.length === 0) return []
  const first = rows[0]
  if (Array.isArray(first)) return first.map((_: any, i: number) => `Col ${i + 1}`)
  return Object.keys(first)
}

function getCellValue(row: any, col: string, colIdx: number): any {
  if (Array.isArray(row)) return row[colIdx] ?? ""
  return row[col] ?? ""
}

export const tablePlugin: WidgetPlugin = {
  type: "table",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      columns: { type: "array", items: { type: "string" }, description: "Header labels (inferred from data keys if omitted)" },
      rows: { type: "array", description: "Array of objects or arrays" },
      sortable: { type: "boolean", description: "Enable click-to-sort headers" },
      caption: { type: "string", description: "Table caption" },
    },
    required: ["rows"],
  },
  codeBlockLang: "table",
  hydrate: (container, spec, theme) => {
    const s = spec as TableSpec
    if (!s.rows || !Array.isArray(s.rows)) {
      container.textContent = "Table widget requires 'rows' array"
      return
    }

    const columns = s.columns || inferColumns(s.rows)
    const sortable = s.sortable !== false
    let rows = [...s.rows]
    let sortCol = -1
    let sortAsc = true

    const isDark = theme === "dark"

    function render() {
      const wrapper = document.createElement("div")
      wrapper.style.margin = "1em 0"
      wrapper.style.overflowX = "auto"
      wrapper.style.fontSize = "0.9em"

      if (s.caption) {
        const cap = document.createElement("div")
        cap.style.fontWeight = "600"
        cap.style.marginBottom = "0.5em"
        cap.style.color = isDark ? "#e8e6e3" : "#2a2520"
        cap.textContent = s.caption
        wrapper.appendChild(cap)
      }

      const table = document.createElement("table")
      table.style.width = "100%"
      table.style.borderCollapse = "collapse"
      table.style.color = isDark ? "#e8e6e3" : "#2a2520"

      // Header
      const thead = document.createElement("thead")
      const headerRow = document.createElement("tr")
      columns.forEach((col, i) => {
        const th = document.createElement("th")
        th.style.textAlign = "left"
        th.style.padding = "8px 12px"
        th.style.borderBottom = `2px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`
        th.style.fontWeight = "600"
        th.style.whiteSpace = "nowrap"

        let label = escapeHtml(String(col))
        if (sortable && sortCol === i) {
          label += sortAsc ? " \u25b2" : " \u25bc"
        }
        th.innerHTML = label

        if (sortable) {
          th.style.cursor = "pointer"
          th.style.userSelect = "none"
          th.addEventListener("click", () => {
            if (sortCol === i) {
              sortAsc = !sortAsc
            } else {
              sortCol = i
              sortAsc = true
            }
            rows.sort((a, b) => {
              const va = getCellValue(a, col, i)
              const vb = getCellValue(b, col, i)
              const na = Number(va), nb = Number(vb)
              if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na
              return sortAsc
                ? String(va).localeCompare(String(vb))
                : String(vb).localeCompare(String(va))
            })
            render()
          })
        }

        headerRow.appendChild(th)
      })
      thead.appendChild(headerRow)
      table.appendChild(thead)

      // Body
      const tbody = document.createElement("tbody")
      rows.forEach((row, rowIdx) => {
        const tr = document.createElement("tr")
        if (rowIdx % 2 === 1) {
          tr.style.backgroundColor = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
        }

        columns.forEach((col, colIdx) => {
          const td = document.createElement("td")
          td.style.padding = "6px 12px"
          td.style.borderBottom = `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
          td.textContent = String(getCellValue(row, col, colIdx))
          tr.appendChild(td)
        })

        tbody.appendChild(tr)
      })
      table.appendChild(tbody)
      wrapper.appendChild(table)

      container.innerHTML = ""
      container.appendChild(wrapper)
    }

    render()
  },
}
