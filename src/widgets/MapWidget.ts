/**
 * Map widget plugin — renders interactive vector maps using MapLibre GL.
 * Loads MapLibre GL (~200kB) from CDN on first use.
 * Uses CARTO free vector tile styles (no API key needed).
 *
 * Spec fields:
 *   center?: [lat, lng]    — map center (default: [0, 0])
 *   zoom?: number          — zoom level (default: 2)
 *   markers?: Array<{ location: [lat, lng], label?: string, color?: string }>
 *   height?: string        — CSS height (default: "400px")
 *   pitch?: number         — 3D tilt angle in degrees (default: 0)
 *   bearing?: number       — rotation in degrees (default: 0)
 *   style?: string         — custom MapLibre style URL
 *
 * Code block lang: `map`
 */

import type { WidgetPlugin } from "../types"
import { loadCDN } from "../utils"

const MAPLIBRE_JS_CDN = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"
const MAPLIBRE_CSS_CDN = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css"

// CARTO free vector basemaps — no API key required
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"

let cssLoaded = false

function loadMaplibreCSS() {
  if (cssLoaded) return
  cssLoaded = true
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = MAPLIBRE_CSS_CDN
  document.head.appendChild(link)
}

export const mapPlugin: WidgetPlugin = {
  type: "map",
  codeBlockLang: "map",
  hydrate: (container, spec, theme) => {
    const center: [number, number] = spec.center || [0, 0]
    const zoom = spec.zoom ?? 2
    const markers: Array<{ location: [number, number]; label?: string; color?: string }> = spec.markers || []
    const height = spec.height || "400px"

    loadMaplibreCSS()

    const wrapper = document.createElement("div")
    wrapper.style.margin = "1em 0"
    wrapper.style.borderRadius = "8px"
    wrapper.style.overflow = "hidden"
    wrapper.style.height = height
    wrapper.style.border = `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`
    container.innerHTML = ""
    container.appendChild(wrapper)

    let mapInstance: any = null
    let disposed = false

    loadCDN(MAPLIBRE_JS_CDN, "maplibregl")
      .then(() => {
        if (disposed) return
        const maplibregl = (window as any).maplibregl

        const style = spec.style || (theme === "dark" ? DARK_STYLE : LIGHT_STYLE)

        mapInstance = new maplibregl.Map({
          container: wrapper,
          style,
          center: [center[1], center[0]], // MapLibre uses [lng, lat]
          zoom,
          pitch: spec.pitch || 0,
          bearing: spec.bearing || 0,
          attributionControl: true,
          fadeDuration: 0,
          renderWorldCopies: false,
        })

        if (spec.controls) {
          mapInstance.addControl(new maplibregl.NavigationControl(), "top-left")
        }

        // Add markers
        for (const m of markers) {
          const el = document.createElement("div")
          el.style.width = "14px"
          el.style.height = "14px"
          el.style.borderRadius = "50%"
          el.style.backgroundColor = m.color || "#C15F3C"
          el.style.border = "2px solid white"
          el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)"
          el.style.cursor = "pointer"

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([m.location[1], m.location[0]]) // [lng, lat]
            .addTo(mapInstance)

          if (m.label) {
            const popup = new maplibregl.Popup({
              offset: 12,
              closeButton: false,
              className: "koen-map-popup",
            })
            const labelEl = document.createElement("div")
            labelEl.style.cssText = "font-size:13px;padding:2px 4px"
            labelEl.textContent = m.label
            popup.setDOMContent(labelEl)
            marker.setPopup(popup)
          }
        }

        // Only auto-fit if no explicit center was provided
        if (!spec.center && markers.length > 1) {
          const bounds = new maplibregl.LngLatBounds()
          for (const m of markers) {
            bounds.extend([m.location[1], m.location[0]])
          }
          mapInstance.fitBounds(bounds, { padding: 50, maxZoom: 12, animate: false })
        } else if (!spec.center && markers.length === 1) {
          mapInstance.setCenter([markers[0].location[1], markers[0].location[0]])
          mapInstance.setZoom(zoom || 10)
        }
      })
      .catch((err) => {
        if (disposed) return
        container.textContent = `Failed to load MapLibre GL: ${err.message}`
      })

    return () => {
      disposed = true
      mapInstance?.remove()
    }
  },
}
