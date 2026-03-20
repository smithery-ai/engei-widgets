/**
 * Mermaid widget plugin — renders Mermaid diagrams from declarative specs.
 * Loads Mermaid from CDN on first use.
 */

import type { WidgetPlugin } from "../types"
import { loadCDN } from "../utils"
import { renderWidgetError } from "../registry"

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"

let renderCounter = 0

export const mermaidPlugin: WidgetPlugin = {
  type: "mermaid",
  codeBlockLang: "mermaid",
  toSpec: (text) => ({ diagram: text }),
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
