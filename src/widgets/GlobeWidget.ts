/**
 * Globe widget plugin — renders an interactive WebGL globe using COBE v2.
 * Loads COBE (~5kB) from CDN on first use.
 *
 * COBE v2 API: createGlobe(canvas, opts) → { update(state), destroy() }
 * Animation is done via requestAnimationFrame + globe.update({ phi })
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
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      size: { type: "number", description: "Canvas size in pixels (default: 600)" },
      phi: { type: "number", description: "Initial rotation angle (default: 0)" },
      theta: { type: "number", description: "Tilt angle (default: 0.2)" },
      rotateSpeed: { type: "number", description: "Rotation speed per frame (default: 0.005)" },
      markerColor: { type: "array", items: { type: "number" }, description: "RGB marker color [r, g, b]" },
      markers: {
        type: "array",
        description: "Array of map markers",
        items: {
          type: "object",
          properties: {
            location: { type: "array", items: { type: "number" }, description: "[lat, lng]" },
            size: { type: "number", description: "Marker size (default: 0.05)" },
          },
          required: ["location"],
        },
      },
    },
  },
  codeBlockLang: "globe",
  hydrate: (container, spec, theme) => {
    const wrapper = document.createElement("div")
    wrapper.style.display = "flex"
    wrapper.style.justifyContent = "center"
    wrapper.style.margin = "1em 0"

    const canvas = document.createElement("canvas")
    const size = spec.size || 600
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

    loadCobe()
      .then((mod) => {
        if (disposed) return
        const createGlobe = mod.default || mod.createGlobe || mod

        globe = createGlobe(canvas, {
          devicePixelRatio: 2,
          width: size,
          height: size,
          phi: phi,
          theta: spec.theta || 0.2,
          dark: isDark ? 1 : 0,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: 6,
          baseColor: isDark ? [0.3, 0.3, 0.3] : [1, 1, 1],
          markerColor: spec.markerColor || [1, 0.5, 0.2],
          glowColor: isDark ? [0.13, 0.11, 0.1] : [1, 1, 1],
          markers: (spec.markers || []).map((m: any) => ({
            location: m.location,
            size: m.size || 0.05,
          })),
        })

        // Animate with requestAnimationFrame + update()
        function animate() {
          if (disposed) return
          phi += spec.rotateSpeed || 0.005
          globe.update({ phi })
          rafId = requestAnimationFrame(animate)
        }
        rafId = requestAnimationFrame(animate)
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
