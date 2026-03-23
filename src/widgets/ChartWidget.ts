/**
 * Chart widget plugin — renders Chart.js charts from declarative specs.
 * Loads Chart.js from CDN on first use.
 */

import type { WidgetPlugin } from "../types"
import { loadCDN } from "../utils"

const CHART_JS_CDN = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"

function getThemeColors(theme: "dark" | "light") {
  if (theme === "dark") {
    return {
      textColor: "#e8e6e3",
      gridColor: "rgba(255, 255, 255, 0.08)",
      borderColor: "rgba(255, 255, 255, 0.15)",
    }
  }
  return {
    textColor: "#2a2520",
    gridColor: "rgba(0, 0, 0, 0.08)",
    borderColor: "rgba(0, 0, 0, 0.15)",
  }
}

// Default color palette (matches koen theme)
const PALETTE = [
  "#6a8ac0", // blue
  "#7aa874", // green
  "#c4a050", // amber
  "#C15F3C", // coral/accent
  "#a070b0", // purple
  "#50a0a0", // teal
  "#c07070", // red
  "#b08050", // brown
]

export const chartPlugin: WidgetPlugin = {
  type: "chart",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      type: { type: "string", description: "Chart type", enum: ["bar", "line", "pie", "doughnut", "radar", "polarArea"] },
      data: { type: "object", description: "Chart.js data object with labels and datasets" },
      options: { type: "object", description: "Chart.js options" },
      config: { type: "object", description: "Legacy wrapper: { type, data, options }" },
    },
    required: ["type", "data"],
  },
  codeBlockLang: "chart",
  hydrate: (container, spec, theme) => {
    // Accept spec directly (e.g. { type, data }) or legacy { config: { type, data } }
    const config = spec.config || spec
    if (!config.type && !config.data) {
      container.textContent = "Chart widget: needs 'type' and 'data'"
      return
    }

    // Create canvas
    const chartType = config.type || "bar"
    const wrapper = document.createElement("div")
    wrapper.style.position = "relative"
    wrapper.style.width = "100%"
    wrapper.style.maxWidth = ["radar", "pie", "doughnut", "polarArea"].includes(chartType) ? "500px" : "700px"
    wrapper.style.margin = "1em auto"

    // Calculate height based on chart type
    if (chartType === "horizontalBar" || (chartType === "bar" && config.options?.indexAxis === "y")) {
      const barCount = config.data?.labels?.length || 5
      wrapper.style.height = `${barCount * 40 + 80}px`
    } else {
      wrapper.style.height = chartType === "radar" ? "400px" : "340px"
    }

    const canvas = document.createElement("canvas")
    wrapper.appendChild(canvas)
    container.innerHTML = ""
    container.appendChild(wrapper)

    // Apply theme colors and palette to datasets
    const { textColor, gridColor } = getThemeColors(theme)
    const isRadial = ["pie", "doughnut", "polarArea", "radar"].includes(chartType)

    // For radar, use translucent fill so grid lines show through
    const datasets = (config.data?.datasets || []).map((ds: any, i: number) => {
      const color = ds.borderColor || PALETTE[i % PALETTE.length]
      let bg = ds.backgroundColor || PALETTE[i % PALETTE.length]
      if (chartType === "radar" && !ds.backgroundColor) {
        // Convert hex to rgba with low opacity
        bg = color + "20" // ~12% opacity
      }
      return {
        ...ds,
        backgroundColor: bg,
        borderColor: color,
        borderWidth: ds.borderWidth ?? (["line", "radar"].includes(chartType) ? 2 : 0),
        ...(chartType === "radar" && !ds.pointBackgroundColor ? { pointBackgroundColor: color, pointBorderColor: color, pointRadius: 4 } : {}),
      }
    })

    // Build scales config based on chart type
    let scales: any
    if (chartType === "radar") {
      scales = {
        r: {
          ...config.options?.scales?.r,
          angleLines: { color: gridColor, ...config.options?.scales?.r?.angleLines },
          grid: { color: gridColor, ...config.options?.scales?.r?.grid },
          pointLabels: { font: { size: 12 }, color: textColor, ...config.options?.scales?.r?.pointLabels },
          ticks: { font: { size: 10 }, color: textColor, backdropColor: "transparent", ...config.options?.scales?.r?.ticks },
        },
      }
    } else if (!isRadial) {
      scales = {
        ...config.options?.scales,
        x: {
          ...config.options?.scales?.x,
          ticks: { font: { size: 11 }, ...config.options?.scales?.x?.ticks, color: textColor },
          grid: { ...config.options?.scales?.x?.grid, color: gridColor },
        },
        y: {
          ...config.options?.scales?.y,
          ticks: { font: { size: 11 }, ...config.options?.scales?.y?.ticks, color: textColor },
          grid: { ...config.options?.scales?.y?.grid, color: gridColor },
        },
      }
    }

    const themedConfig = {
      ...config,
      data: { ...config.data, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...config.options,
        plugins: {
          ...config.options?.plugins,
          legend: {
            display: true,
            ...config.options?.plugins?.legend,
            labels: { usePointStyle: true, padding: 16, font: { size: 12 }, ...config.options?.plugins?.legend?.labels, color: textColor },
          },
          title: {
            ...config.options?.plugins?.title,
            color: textColor,
          },
        },
        ...(scales ? { scales } : {}),
      },
    }

    let chartInstance: any = null
    let disposed = false

    loadCDN(CHART_JS_CDN, "Chart")
      .then(() => {
        if (disposed) return // cleanup already ran — don't touch DOM
        const Chart = (window as any).Chart
        chartInstance = new Chart(canvas, themedConfig)
      })
      .catch((err) => {
        if (disposed) return
        container.textContent = `Failed to load Chart.js: ${err.message}`
      })

    // Return cleanup
    return () => {
      disposed = true
      chartInstance?.destroy()
    }
  },
}
