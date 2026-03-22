/**
 * Map widget plugin — renders interactive maps using Leaflet.
 * Loads Leaflet (~40kB) from CDN on first use.
 * Uses OpenFreeMap tiles (no API key needed).
 *
 * Spec fields:
 *   center?: [lat, lng]    — map center (default: [0, 0])
 *   zoom?: number          — zoom level (default: 2)
 *   markers?: Array<{ location: [lat, lng], label?: string, color?: string }>
 *   paths?: Array<{ coordinates: [lat, lng][], color?: string, width?: number, dashed?: boolean }>
 *   height?: string        — CSS height (default: "400px")
 *
 * Code block lang: `map`
 */

import type { WidgetPlugin } from "../types"
import { loadCDN } from "../utils"

const LEAFLET_JS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
const LEAFLET_CSS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

let cssLoaded = false

function loadLeafletCSS() {
  if (cssLoaded) return
  cssLoaded = true
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = LEAFLET_CSS
  document.head.appendChild(link)
}

export const mapPlugin: WidgetPlugin = {
  type: "map",
  codeBlockLang: "map",
  hydrate: (container, spec, theme) => {
    const center: [number, number] = spec.center || [0, 0]
    const zoom = spec.zoom ?? 2
    const markers: Array<{ location: [number, number]; label?: string; color?: string }> = spec.markers || []
    const paths: Array<{ coordinates: [number, number][]; color?: string; width?: number; dashed?: boolean }> = spec.paths || []
    const height = spec.height || "400px"

    loadLeafletCSS()

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

    loadCDN(LEAFLET_JS, "L")
      .then(() => {
        if (disposed) return
        const L = (window as any).L

        mapInstance = L.map(wrapper, {
          center: [center[0], center[1]],
          zoom,
          attributionControl: true,
          zoomControl: true,
        })

        // Tile layer — CARTO light (raster, fast, free)
        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTR,
          maxZoom: 19,
        }).addTo(mapInstance)

        // Markers
        for (const m of markers) {
          const color = m.color || "#C15F3C"

          // Custom colored circle marker
          const marker = L.circleMarker([m.location[0], m.location[1]], {
            radius: 7,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          }).addTo(mapInstance)

          if (m.label) {
            marker.bindPopup(`<div style="font-size:13px;padding:2px 4px">${m.label}</div>`)
          }
        }

        // Paths
        for (const p of paths) {
          const latlngs = p.coordinates.map((c: [number, number]) => [c[0], c[1]])
          L.polyline(latlngs, {
            color: p.color || "#C15F3C",
            weight: p.width || 2,
            dashArray: p.dashed ? "6 6" : undefined,
          }).addTo(mapInstance)
        }

        // Auto-fit bounds
        const allPoints = [
          ...markers.map(m => m.location),
          ...paths.flatMap(p => p.coordinates),
        ]
        if (!spec.center && allPoints.length > 1) {
          const bounds = L.latLngBounds(allPoints.map((p: [number, number]) => [p[0], p[1]]))
          mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
        } else if (!spec.center && allPoints.length === 1) {
          mapInstance.setView([allPoints[0][0], allPoints[0][1]], zoom || 10)
        }
      })
      .catch((err: Error) => {
        if (disposed) return
        container.textContent = `Failed to load Leaflet: ${err.message}`
      })

    return () => {
      disposed = true
      mapInstance?.remove()
    }
  },
}
