/**
 * KaTeX widget plugin — renders LaTeX math expressions.
 * Loads KaTeX (~200kB) from CDN on first use.
 *
 * Supports both inline and display (block) math via the `display` spec field.
 * Code block lang: `katex` (aliases: `math`, `latex`)
 */

import type { WidgetPlugin } from "../types"
import { loadCDN } from "../utils"

const KATEX_JS_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js"
const KATEX_CSS_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css"

let cssLoaded = false

function loadKatexCSS() {
  if (cssLoaded) return
  cssLoaded = true
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = KATEX_CSS_CDN
  document.head.appendChild(link)
}

export const katexPlugin: WidgetPlugin = {
  type: "katex",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      expression: { type: "string", description: "LaTeX math expression" },
      display: { type: "boolean", description: "Display (block) mode vs inline" },
    },
    required: ["expression"],
  },
  codeBlockLang: "katex",
  toSpec: (text) => {
    try { return JSON.parse(text) } catch { /* fall back to raw LaTeX */ }
    return { expression: text.trim(), display: true }
  },
  hydrate: (container, spec, theme) => {
    const expression = spec.expression
    if (!expression) {
      container.textContent = "KaTeX widget missing 'expression'"
      return
    }

    loadKatexCSS()

    const wrapper = document.createElement("div")
    wrapper.style.margin = spec.display ? "1em 0" : "0"
    wrapper.style.textAlign = spec.display ? "center" : "inherit"
    wrapper.style.fontSize = "1.1em"
    wrapper.style.color = theme === "dark" ? "#e8e6e3" : "#2a2520"
    container.innerHTML = ""
    container.appendChild(wrapper)

    let disposed = false

    loadCDN(KATEX_JS_CDN, "katex")
      .then(() => {
        if (disposed) return
        const katex = (window as any).katex
        try {
          katex.render(expression, wrapper, {
            displayMode: spec.display !== false,
            throwOnError: false,
            trust: false,
          })
        } catch (err: any) {
          wrapper.textContent = `KaTeX error: ${err.message}`
          wrapper.style.color = "var(--color-text-danger, #e06c75)"
        }
      })
      .catch((err) => {
        if (disposed) return
        container.textContent = `Failed to load KaTeX: ${err.message}`
      })

    return () => {
      disposed = true
    }
  },
}
