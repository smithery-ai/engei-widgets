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

    const wrapper = document.createElement("div")
    wrapper.style.display = "flex"
    wrapper.style.justifyContent = "center"
    wrapper.style.margin = "1em 0"
    wrapper.style.overflow = "auto"
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
