/**
 * Mermaid widget plugin — renders Mermaid diagrams from declarative specs.
 * Loads Mermaid from CDN on first use.
 */

import type { WidgetPlugin } from "../types"
import { loadCDN } from "../utils"
import { renderWidgetError } from "../registry"

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"

let renderCounter = 0

/** Parse a CSS color (hex or rgb) to relative luminance (0=black, 1=white). */
function luminance(color: string): number | null {
  let r: number, g: number, b: number
  const hex = color.match(/^#([0-9a-f]{3,8})$/i)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]
    r = parseInt(h.slice(0, 2), 16) / 255
    g = parseInt(h.slice(2, 4), 16) / 255
    b = parseInt(h.slice(4, 6), 16) / 255
  } else {
    const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (!rgb) return null
    r = +rgb[1] / 255; g = +rgb[2] / 255; b = +rgb[3] / 255
  }
  // sRGB relative luminance
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** Force dark text on light-filled SVG nodes and vice versa for contrast. */
function fixSvgTextContrast(wrapper: HTMLElement) {
  const svgEl = wrapper.querySelector("svg")
  if (!svgEl) return
  // Find all shape elements that might be node backgrounds
  const shapes = svgEl.querySelectorAll("rect, polygon, circle, ellipse, path")
  for (const shape of shapes) {
    const fill = (shape as SVGElement).getAttribute("fill") ||
                 (shape as SVGElement).style.fill
    if (!fill || fill === "none" || fill === "transparent") continue
    const lum = luminance(fill)
    if (lum === null) continue
    // Find text siblings in the same parent group
    const group = shape.closest("g")
    if (!group) continue
    const texts = group.querySelectorAll("text, tspan, foreignObject span, foreignObject div, foreignObject p")
    if (texts.length === 0) continue
    // Light background → dark text, dark background → light text
    const textColor = lum > 0.4 ? "#1a1a1a" : "#e8e6e3"
    for (const t of texts) {
      (t as SVGElement | HTMLElement).setAttribute("fill", textColor);
      (t as SVGElement | HTMLElement).style.color = textColor
    }
  }
}

export const mermaidPlugin: WidgetPlugin = {
  type: "mermaid",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      diagram: { type: "string", description: "Mermaid diagram source text" },
    },
    required: ["diagram"],
  },
  codeBlockLang: "mermaid",
  toSpec: (text) => {
    try { return JSON.parse(text) } catch { /* fall back to raw diagram text */ }
    return { diagram: text }
  },
  hydrate: (container, spec, theme) => {
    const diagram = spec.diagram
    if (!diagram) {
      container.textContent = "Mermaid widget missing 'diagram'"
      return
    }

    const isOverlay = container.closest(".koen-widget-overlay-content") !== null

    const wrapper = document.createElement("div")
    wrapper.style.display = "flex"
    wrapper.style.justifyContent = "center"
    wrapper.style.overflow = "auto"
    if (isOverlay) {
      wrapper.style.width = "100%"
      wrapper.style.height = "100%"
      wrapper.style.padding = "40px"
      wrapper.style.alignItems = "center"
    } else {
      wrapper.style.margin = "1em 0"
    }
    container.innerHTML = ""
    container.appendChild(wrapper)

    const id = `mermaid-${spec.widgetId || ++renderCounter}`
    let disposed = false

    loadCDN(MERMAID_CDN, "mermaid")
      .then(async () => {
        if (disposed) return // cleanup already ran — don't touch DOM
        const mermaid = (window as any).mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          themeVariables: theme === "dark" ? {
            primaryColor: "#3a3530",
            primaryTextColor: "#e8e6e3",
            primaryBorderColor: "#5a5550",
            lineColor: "#6a8ac0",
            secondaryColor: "#2a2520",
            tertiaryColor: "#1a1816",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          } : {
            primaryColor: "#e8e4de",
            primaryTextColor: "#2a2520",
            primaryBorderColor: "#c8c0b8",
            lineColor: "#6a8ac0",
            secondaryColor: "#f0ece6",
            tertiaryColor: "#faf8f5",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
        })

        try {
          const { svg } = await mermaid.render(id, diagram)
          if (disposed) return
          wrapper.innerHTML = svg
          // Fix text contrast: when nodes have custom light fills,
          // mermaid keeps the theme's primaryTextColor (light in dark mode).
          // Post-process to force dark text on light backgrounds.
          fixSvgTextContrast(wrapper)
          // Prevent ultra-wide diagrams from becoming unreadably small
          // by setting min-width from the viewBox so overflow:auto scrolls instead
          const svgEl = wrapper.querySelector("svg")
          if (svgEl) {
            const vb = svgEl.getAttribute("viewBox")?.split(" ")
            if (vb && vb.length === 4) {
              const vbW = parseFloat(vb[2])
              const vbH = parseFloat(vb[3])
              // If aspect ratio is wider than 4:1, let it scroll horizontally
              if (vbW / vbH > 4) {
                svgEl.style.minWidth = `${Math.min(vbW, 1200)}px`
                svgEl.style.width = "auto"
                svgEl.removeAttribute("width")
                // Start scrolled to the left, not centered
                wrapper.style.justifyContent = "flex-start"
              } else if (isOverlay) {
                // In overlay: scale to fit both dimensions
                svgEl.style.maxWidth = "100%"
                svgEl.style.maxHeight = "100%"
                svgEl.style.width = "auto"
                svgEl.style.height = "auto"
                svgEl.removeAttribute("width")
                svgEl.removeAttribute("height")
              } else {
                // Inline: scale diagram to fill available width
                svgEl.style.width = "100%"
                svgEl.style.height = "auto"
                svgEl.removeAttribute("height")
              }
            } else {
              // No viewBox — still try to fill width
              svgEl.style.width = "100%"
              svgEl.style.height = "auto"
              svgEl.removeAttribute("height")
            }
          }
        } catch (renderErr: any) {
          if (disposed) return
          const raw = typeof renderErr === "string" ? renderErr : renderErr?.message || ""
          const msg = raw.replace(/<[^>]*>/g, "").replace(/\{[^}]{50,}\}/g, "").trim().slice(0, 150) || "Syntax error in diagram"
          renderWidgetError(container, "mermaid", msg, theme)
        }
      })
      .catch((err: any) => {
        if (disposed) return
        renderWidgetError(container, "mermaid", `Failed to load Mermaid: ${err.message}`, theme)
      })

    return () => {
      disposed = true
    }
  },
}
