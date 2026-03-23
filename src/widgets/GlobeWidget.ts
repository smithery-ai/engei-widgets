/**
 * Globe widget plugin — renders an interactive WebGL globe using COBE v2.
 * Loads COBE (~5kB) from CDN on first use.
 *
 * Spec fields:
 *   markers?: Array<{ location: [lat, lng], size?, color?: [r,g,b], id? }>
 *   arcs?: Array<{ from: [lat, lng], to: [lat, lng], color?: [r,g,b] }>
 *   phi?: number          — horizontal rotation (radians, default: 0)
 *   theta?: number        — vertical tilt (radians, default: 0.2)
 *   rotate?: boolean      — auto-rotate (default: false)
 *   rotateSpeed?: number  — rotation speed per frame (default: 0.003)
 *   size?: number         — canvas size in pixels (default: 600)
 *   scale?: number        — globe scale multiplier (default: 1)
 *   markerColor?: [r,g,b] — default marker color
 *   arcColor?: [r,g,b]    — default arc color
 *   arcWidth?: number     — arc line thickness (default: 0.4)
 *   arcHeight?: number    — arc curve height (default: 0.25)
 *
 * Code block lang: `globe`
 */

import type { WidgetPlugin } from "../types"

const COBE_CDN = "https://cdn.jsdelivr.net/npm/cobe@2.0.0/+esm"

let cobeModule: Promise<any> | null = null

function loadCobe(): Promise<any> {
  if (!cobeModule) {
    cobeModule = import(/* @vite-ignore */ COBE_CDN)
  }
  return cobeModule
}

export const globePlugin: WidgetPlugin = {
  type: "globe",
  version: "2.0.0",
  specSchema: {
    type: "object",
    properties: {
      markers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            location: { type: "array", description: "[lat, lng]" },
            size: { type: "number", description: "Marker size (default: 0.04)" },
            color: { type: "array", description: "RGB [r,g,b] values 0-1" },
            id: { type: "string", description: "ID for CSS anchor positioning" },
          },
          required: ["location"],
        },
      },
      arcs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "array", description: "[lat, lng]" },
            to: { type: "array", description: "[lat, lng]" },
            color: { type: "array", description: "RGB [r,g,b] values 0-1" },
          },
          required: ["from", "to"],
        },
      },
      phi: { type: "number", description: "Horizontal rotation in radians (default: 0)" },
      theta: { type: "number", description: "Vertical tilt in radians (default: 0.2)" },
      rotate: { type: "boolean", description: "Auto-rotate (default: false)" },
      rotateSpeed: { type: "number", description: "Rotation speed per frame (default: 0.003)" },
      size: { type: "number", description: "Canvas size in pixels (default: 600)" },
      scale: { type: "number", description: "Globe scale multiplier (default: 1)" },
      markerColor: { type: "array", description: "Default marker RGB [r,g,b] values 0-1" },
      arcColor: { type: "array", description: "Default arc RGB [r,g,b] values 0-1" },
      arcWidth: { type: "number", description: "Arc line thickness (default: 0.4)" },
      arcHeight: { type: "number", description: "Arc curve height (default: 0.25)" },
    },
  },
  codeBlockLang: "globe",
  hydrate: (container, spec, theme) => {
    const wrapper = document.createElement("div")
    wrapper.style.display = "flex"
    wrapper.style.justifyContent = "center"
    wrapper.style.margin = "1em 0"

    const canvas = document.createElement("canvas")
    const size = spec.size || 800
    canvas.width = size
    canvas.height = size
    canvas.style.width = `${size / 2}px`
    canvas.style.height = `${size / 2}px`
    canvas.style.maxWidth = "100%"
    canvas.style.aspectRatio = "1"

    wrapper.appendChild(canvas)
    container.innerHTML = ""
    container.appendChild(wrapper)

    let globe: any = null
    let disposed = false
    let phi = spec.phi || 0
    let rafId = 0

    const isDark = theme === "dark"
    const defaultMarkerColor = spec.markerColor || (isDark ? [1, 0.5, 0.2] : [0.2, 0.4, 1])
    const defaultArcColor = spec.arcColor || defaultMarkerColor

    loadCobe()
      .then((mod) => {
        if (disposed) return
        const createGlobe = mod.default || mod.createGlobe || mod

        const markers = (spec.markers || []).map((m: any) => ({
          location: m.location,
          size: m.size || 0.04,
          ...(m.color ? { color: m.color } : {}),
          ...(m.id ? { id: m.id } : {}),
        }))

        const arcs = (spec.arcs || []).map((a: any) => ({
          from: a.from,
          to: a.to,
          ...(a.color ? { color: a.color } : {}),
        }))

        globe = createGlobe(canvas, {
          devicePixelRatio: 2,
          width: size,
          height: size,
          phi,
          theta: spec.theta ?? 0.2,
          dark: isDark ? 1 : 0,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: 6,
          baseColor: [1, 1, 1],
          markerColor: defaultMarkerColor,
          glowColor: isDark ? [0.15, 0.15, 0.15] : [1, 1, 1],
          markers,
          arcs: arcs.length > 0 ? arcs : undefined,
          arcColor: defaultArcColor,
          arcWidth: spec.arcWidth ?? 0.4,
          arcHeight: spec.arcHeight ?? 0.25,
          scale: spec.scale ?? 1,
        })

        // Re-render after texture loads (COBE loads its land texture async)
        setTimeout(() => { if (!disposed) globe.update({}) }, 1000)

        // Drag to rotate (matches COBE website recipe)
        let pointerStart: { x: number; y: number } | null = null
        let dragOffset = { phi: 0, theta: 0 }
        let phiBase = phi
        let thetaBase = spec.theta ?? 0.2
        canvas.style.cursor = "grab"

        canvas.addEventListener("pointerdown", (e) => {
          pointerStart = { x: e.clientX, y: e.clientY }
          canvas.setPointerCapture(e.pointerId)
          canvas.style.cursor = "grabbing"
        })
        window.addEventListener("pointermove", (e) => {
          if (!pointerStart || disposed) return
          dragOffset = {
            phi: (e.clientX - pointerStart.x) / 150,
            theta: (e.clientY - pointerStart.y) / 300,
          }
          globe.update({
            phi: phiBase + dragOffset.phi,
            theta: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, thetaBase + dragOffset.theta)),
          })
        })
        window.addEventListener("pointerup", () => {
          if (pointerStart) {
            phiBase += dragOffset.phi
            thetaBase += dragOffset.theta
            dragOffset = { phi: 0, theta: 0 }
            pointerStart = null
            canvas.style.cursor = "grab"
          }
        })

        if (spec.rotate) {
          const speed = spec.rotateSpeed || 0.003
          function animate() {
            if (disposed) return
            if (!pointerStart) {
              phiBase += speed
              globe.update({ phi: phiBase + dragOffset.phi })
            }
            rafId = requestAnimationFrame(animate)
          }
          rafId = requestAnimationFrame(animate)
        }
      })
      .catch((err) => {
        if (disposed) return
        container.textContent = `Failed to load globe: ${err.message}`
      })

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      globe?.destroy()
    }
  },
}
