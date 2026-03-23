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
 *   routes?: Array<{ from: [lat, lng], to: [lat, lng], color?: string, width?: number, dashed?: boolean, profile?: "driving" | "walking" | "cycling" }>
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

  const style = document.createElement("style")
  style.textContent = `
    .koen-map-popup .maplibregl-popup-content {
      background: var(--widget-bg, #222220);
      border: 1px solid var(--widget-border, #333);
      color: var(--editor-fg, #e8e6e3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.01em;
      padding: 5px 10px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    }
    .koen-map-popup .maplibregl-popup-tip {
      display: none;
    }
  `
  document.head.appendChild(style)
}

export const mapPlugin: WidgetPlugin = {
  type: "map",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      center: { type: "array", description: "[lat, lng] map center" },
      zoom: { type: "number", description: "Zoom level" },
      markers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            location: { type: "array", description: "[lat, lng]" },
            label: { type: "string" },
            color: { type: "string" },
            pin: { type: "boolean", description: "Teardrop pin style" },
          },
          required: ["location"],
        },
      },
      paths: {
        type: "array",
        items: {
          type: "object",
          properties: {
            coordinates: { type: "array", description: "Array of [lat, lng] points" },
            color: { type: "string" },
            width: { type: "number" },
            dashed: { type: "boolean" },
          },
          required: ["coordinates"],
        },
      },
      routes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "array", description: "[lat, lng]" },
            to: { type: "array", description: "[lat, lng]" },
            color: { type: "string" },
            width: { type: "number" },
            dashed: { type: "boolean" },
            profile: { type: "string", enum: ["driving", "walking", "cycling"] },
          },
          required: ["from", "to"],
        },
      },
      height: { type: "string", description: "CSS height, e.g. '400px'" },
      pitch: { type: "number", description: "3D tilt angle in degrees" },
      bearing: { type: "number", description: "Rotation in degrees" },
      style: { type: "string", description: "Custom MapLibre style URL" },
      controls: { type: "boolean", description: "Show navigation controls" },
    },
  },
  codeBlockLang: "map",
  hydrate: (container, spec, theme) => {
    const center: [number, number] = spec.center || [0, 0]
    const zoom = spec.zoom ?? 2
    const markers: Array<{ location: [number, number]; label?: string; color?: string; pin?: boolean }> = spec.markers || []
    const paths: Array<{ coordinates: [number, number][]; color?: string; width?: number; dashed?: boolean }> = spec.paths || []
    const routes: Array<{ from: [number, number]; to: [number, number]; color?: string; width?: number; dashed?: boolean; profile?: string }> = spec.routes || []
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
        // Start attribution collapsed (just the ⓘ icon)
        mapInstance.on("load", () => {
          const el = wrapper.querySelector(".maplibregl-ctrl-attrib") as HTMLElement
          if (el) el.classList.remove("maplibregl-compact-show")
        })

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
              offset: m.pin ? [0, 5] : [0, 8],
              closeButton: false,
              className: "koen-map-popup",
              anchor: "top",
            })
            popup.setHTML(m.label)
            el.addEventListener("mouseenter", () => popup.addTo(mapInstance).setLngLat([m.location[1], m.location[0]]))
            el.addEventListener("mouseleave", () => popup.remove())
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

        // Resolve routes via OSRM
        if (routes.length > 0) {
          const addRouteLayer = (routeIndex: number, coordinates: [number, number][], r: typeof routes[0]) => {
            const id = `route-${routeIndex}`
            mapInstance.addSource(id, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates },
              },
            })
            mapInstance.addLayer({
              id,
              type: "line",
              source: id,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: {
                "line-color": r.color || "#3b82f6",
                "line-width": r.width || 3,
                ...(r.dashed ? { "line-dasharray": [2, 2] } : {}),
              },
            })
          }

          const addRoutePill = (distance: number, duration: number) => {
            const km = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`
            const mins = Math.round(duration / 60)
            const timeStr = mins >= 60 ? `${Math.floor(mins / 60)} hr ${mins % 60} min` : `${mins} min`

            const pill = document.createElement("div")
            pill.textContent = `${timeStr} · ${km}`
            pill.style.cssText = `
              position: absolute; top: 12px; right: 12px;
              background: var(--widget-bg, #222220);
              border: 1px solid var(--widget-border, #333);
              color: var(--editor-fg, #e8e6e3);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              font-size: 12px; font-weight: 500;
              padding: 5px 14px;
              border-radius: 20px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
              pointer-events: none;
              z-index: 10;
            `
            wrapper.style.position = "relative"
            wrapper.appendChild(pill)
          }

          for (let i = 0; i < routes.length; i++) {
            const r = routes[i]
            const profile = r.profile || "driving"
            const url = `https://router.project-osrm.org/route/v1/${profile}/${r.from[1]},${r.from[0]};${r.to[1]},${r.to[0]}?overview=full&geometries=geojson`
            fetch(url)
              .then(res => res.json())
              .then(data => {
                if (disposed || !data.routes?.[0]) return
                const route = data.routes[0]
                const coords = route.geometry.coordinates
                const draw = () => { if (!disposed) addRouteLayer(i, coords, r) }
                if (mapInstance.isStyleLoaded()) draw()
                else mapInstance.on("load", draw)
                if (i === 0) addRoutePill(route.distance, route.duration)
              })
              .catch(() => {})
          }
        }

        // Only auto-fit if no explicit center was provided
        const allPoints = [
          ...markers.map(m => m.location),
          ...paths.flatMap(p => p.coordinates),
          ...routes.flatMap(r => [r.from, r.to]),
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
