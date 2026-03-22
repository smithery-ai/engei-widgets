/**
 * Map widget plugin — renders interactive vector maps using MapLibre GL.
 * Loads MapLibre GL (~200kB) from CDN on first use.
 * Uses CARTO free vector tile styles (no API key needed).
 *
 * Spec fields:
 *   center?: [lat, lng]    — map center (default: [0, 0])
 *   zoom?: number          — zoom level (default: 2)
 *   markers?: Array<{ location: [lat, lng], label?: string, color?: string, pin?: boolean }>
 *   paths?: Array<{ coordinates: [lat, lng][], color?: string, width?: number, dashed?: boolean }>
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

// OpenFreeMap — free hosted OpenMapTiles, no API key
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark"
const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/bright"

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
    const markers: Array<{ location: [number, number]; label?: string; color?: string; pin?: boolean }> = spec.markers || []
    const paths: Array<{ coordinates: [number, number][]; color?: string; width?: number; dashed?: boolean }> = spec.paths || []
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

        const style = spec.style || LIGHT_STYLE

        mapInstance = new maplibregl.Map({
          container: wrapper,
          style,
          center: [center[1], center[0]], // MapLibre uses [lng, lat]
          zoom,
          pitch: spec.pitch || 0,
          bearing: spec.bearing || 0,
          attributionControl: false,
          fadeDuration: 0,
          renderWorldCopies: false,
        })

        mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right")

        if (spec.controls) {
          mapInstance.addControl(new maplibregl.NavigationControl(), "top-left")
        }

        // Add markers
        for (const m of markers) {
          const color = m.color || "#C15F3C"
          const el = document.createElement("div")

          if (m.pin) {
            // Teardrop pin style (like Google Maps)
            el.innerHTML = `<svg width="27" height="40" viewBox="0 0 27 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 0C6.04 0 0 6.04 0 13.5C0 23.62 13.5 40 13.5 40S27 23.62 27 13.5C27 6.04 20.96 0 13.5 0Z" fill="${color}"/>
              <circle cx="13.5" cy="13.5" r="5.5" fill="white"/>
            </svg>`
            el.style.cursor = "pointer"
            el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
          } else {
            // Default dot style
            el.style.width = "14px"
            el.style.height = "14px"
            el.style.borderRadius = "50%"
            el.style.backgroundColor = color
            el.style.border = "2px solid white"
            el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)"
            el.style.cursor = "pointer"
          }

          const marker = new maplibregl.Marker({
            element: el,
            anchor: m.pin ? "bottom" : "center",
          })
            .setLngLat([m.location[1], m.location[0]]) // [lng, lat]
            .addTo(mapInstance)

          if (m.label) {
            const popup = new maplibregl.Popup({
              offset: m.pin ? 30 : 12,
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

        // Add paths (lines between points)
        if (paths.length > 0) {
          mapInstance.on("load", () => {
            if (disposed) return
            for (let i = 0; i < paths.length; i++) {
              const p = paths[i]
              const id = `path-${i}`
              mapInstance.addSource(id, {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: p.coordinates.map((c: [number, number]) => [c[1], c[0]]), // [lng, lat]
                  },
                },
              })
              mapInstance.addLayer({
                id,
                type: "line",
                source: id,
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                  "line-color": p.color || "#C15F3C",
                  "line-width": p.width || 2,
                  ...(p.dashed ? { "line-dasharray": [2, 2] } : {}),
                },
              })
            }
          })
        }

        // Only auto-fit if no explicit center was provided
        const allPoints = [
          ...markers.map(m => m.location),
          ...paths.flatMap(p => p.coordinates),
        ]
        if (!spec.center && allPoints.length > 1) {
          const bounds = new maplibregl.LngLatBounds()
          for (const pt of allPoints) {
            bounds.extend([pt[1], pt[0]])
          }
          mapInstance.fitBounds(bounds, { padding: 50, maxZoom: 12, animate: false })
        } else if (!spec.center && allPoints.length === 1) {
          mapInstance.setCenter([allPoints[0][1], allPoints[0][0]])
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
