/**
 * Sketch widget plugin — renders hand-drawn-style diagrams using Rough.js.
 * Loads Rough.js (~10kB) from CDN on first use.
 *
 * Spec fields:
 *   width?: number           — SVG width (default: 600)
 *   height?: number          — SVG height (default: 300)
 *   elements: Array of:
 *     { type: "rect", x, y, width, height, color?, fill?, label? }
 *     { type: "ellipse", x, y, width, height, color?, fill?, label? }
 *     { type: "line", x1, y1, x2, y2, color? }
 *     { type: "arrow", x1, y1, x2, y2, color? }
 *     { type: "text", x, y, text, color?, fontSize? }
 *
 * Code block lang: `sketch`
 */

import type { WidgetPlugin } from "../types"

const ROUGH_CDN = "https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.esm.js"

let roughModule: Promise<any> | null = null

function loadRough(): Promise<any> {
  if (!roughModule) {
    roughModule = import(/* @vite-ignore */ ROUGH_CDN)
  }
  return roughModule
}

export const excalidrawPlugin: WidgetPlugin = {
  type: "excalidraw",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      width: { type: "number", description: "SVG width (default: 600)" },
      height: { type: "number", description: "SVG height (default: 300)" },
      elements: {
        type: "array",
        description: "Drawing elements",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["rect", "ellipse", "line", "arrow", "text"] },
            x: { type: "number" },
            y: { type: "number" },
            x1: { type: "number" },
            y1: { type: "number" },
            x2: { type: "number" },
            y2: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
            color: { type: "string" },
            fill: { type: "string" },
            label: { type: "string" },
            text: { type: "string" },
            fontSize: { type: "number" },
          },
          required: ["type"],
        },
      },
    },
    required: ["elements"],
  },
  codeBlockLang: "sketch",
  hydrate: (container, spec, theme) => {
    const elements = spec.elements
    if (!elements || !Array.isArray(elements)) {
      container.textContent = "Sketch widget requires 'elements' array"
      return
    }

    const isDark = theme === "dark"
    const defaultStroke = isDark ? "#e8e6e3" : "#2a2520"
    const defaultFill = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
    const textColor = isDark ? "#e8e6e3" : "#2a2520"

    const svgWidth = spec.width || 600
    const svgHeight = spec.height || 300

    const wrapper = document.createElement("div")
    wrapper.style.display = "flex"
    wrapper.style.justifyContent = "center"
    wrapper.style.margin = "1em 0"
    wrapper.style.overflow = "auto"
    container.innerHTML = ""
    container.appendChild(wrapper)

    let disposed = false

    loadRough()
      .then((mod) => {
        if (disposed) return
        const rough = mod.default || mod

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svg.setAttribute("width", String(svgWidth))
        svg.setAttribute("height", String(svgHeight))
        svg.style.maxWidth = "100%"
        svg.style.height = "auto"

        const rc = rough.svg(svg)

        for (const el of elements) {
          const stroke = el.color || defaultStroke
          const fill = el.fill || defaultFill

          if (el.type === "rect") {
            const node = rc.rectangle(el.x, el.y, el.width, el.height, {
              stroke,
              fill,
              fillStyle: "solid",
              roughness: 1.2,
            })
            svg.appendChild(node)

            if (el.label) {
              const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
              text.setAttribute("x", String(el.x + el.width / 2))
              text.setAttribute("y", String(el.y + el.height / 2))
              text.setAttribute("text-anchor", "middle")
              text.setAttribute("dominant-baseline", "central")
              text.setAttribute("fill", el.color || textColor)
              text.setAttribute("font-size", String(el.fontSize || 14))
              text.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
              text.textContent = el.label
              svg.appendChild(text)
            }
          } else if (el.type === "ellipse") {
            const node = rc.ellipse(
              el.x + (el.width || 60) / 2,
              el.y + (el.height || 60) / 2,
              el.width || 60,
              el.height || 60,
              { stroke, fill, fillStyle: "solid", roughness: 1.2 },
            )
            svg.appendChild(node)

            if (el.label) {
              const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
              text.setAttribute("x", String(el.x + (el.width || 60) / 2))
              text.setAttribute("y", String(el.y + (el.height || 60) / 2))
              text.setAttribute("text-anchor", "middle")
              text.setAttribute("dominant-baseline", "central")
              text.setAttribute("fill", el.color || textColor)
              text.setAttribute("font-size", String(el.fontSize || 14))
              text.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
              text.textContent = el.label
              svg.appendChild(text)
            }
          } else if (el.type === "line") {
            const node = rc.line(el.x1, el.y1, el.x2, el.y2, {
              stroke,
              roughness: 1.2,
            })
            svg.appendChild(node)
          } else if (el.type === "arrow") {
            // Line
            const node = rc.line(el.x1, el.y1, el.x2, el.y2, {
              stroke,
              roughness: 1.2,
            })
            svg.appendChild(node)

            // Arrowhead
            const dx = el.x2 - el.x1
            const dy = el.y2 - el.y1
            const angle = Math.atan2(dy, dx)
            const headLen = 12
            const a1 = angle - Math.PI / 6
            const a2 = angle + Math.PI / 6

            const head = rc.linearPath(
              [
                [el.x2 - headLen * Math.cos(a1), el.y2 - headLen * Math.sin(a1)],
                [el.x2, el.y2],
                [el.x2 - headLen * Math.cos(a2), el.y2 - headLen * Math.sin(a2)],
              ],
              { stroke, roughness: 0.8 },
            )
            svg.appendChild(head)

            if (el.label) {
              const mx = (el.x1 + el.x2) / 2
              const my = (el.y1 + el.y2) / 2
              const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
              text.setAttribute("x", String(mx))
              text.setAttribute("y", String(my - 8))
              text.setAttribute("text-anchor", "middle")
              text.setAttribute("fill", el.color || textColor)
              text.setAttribute("font-size", String(el.fontSize || 12))
              text.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
              text.textContent = el.label
              svg.appendChild(text)
            }
          } else if (el.type === "text") {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
            text.setAttribute("x", String(el.x))
            text.setAttribute("y", String(el.y))
            text.setAttribute("fill", el.color || textColor)
            text.setAttribute("font-size", String(el.fontSize || 14))
            text.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
            text.textContent = el.text
            svg.appendChild(text)
          }
        }

        wrapper.appendChild(svg)
      })
      .catch((err: any) => {
        if (disposed) return
        container.textContent = `Failed to load Rough.js: ${err.message}`
      })

    return () => {
      disposed = true
    }
  },
}
