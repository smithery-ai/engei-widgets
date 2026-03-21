/**
 * Widget registry — maps widget types to hydration functions.
 * Supports per-instance registries via buildWidgetRegistry().
 */

import type { WidgetPlugin, WidgetHydrator, WidgetSpec } from "./types"

import { addExpandButton } from "./expandOverlay"
import { chartPlugin } from "./widgets/ChartWidget"
import { mermaidPlugin } from "./widgets/MermaidWidget"
import { katexPlugin } from "./widgets/KatexWidget"
import { tablePlugin } from "./widgets/TableWidget"
import { embedPlugin } from "./widgets/EmbedWidget"
import { excalidrawPlugin } from "./widgets/ExcalidrawWidget"
import { mapPlugin } from "./widgets/MapWidget"
import { timelinePlugin } from "./widgets/TimelineWidget"
import { calendarPlugin } from "./widgets/CalendarWidget"

// ─── Per-instance registry helpers ──────────────────────────

/** Build a Map<type, hydrator> from an array of WidgetPlugins. */
export function buildWidgetRegistry(plugins: WidgetPlugin[]): Map<string, WidgetHydrator> {
  return new Map(plugins.map(p => [p.type, p.hydrate]))
}

// Aliases: alternative code block lang names that map to the same plugin
const LANG_ALIASES: Record<string, string> = {
  katex: "math",
  latex: "math",
}

/** Build a Map<codeBlockLang, plugin> for parseWithPositions. */
export function buildLangMap(plugins: WidgetPlugin[]): Map<string, WidgetPlugin> {
  const map = new Map<string, WidgetPlugin>()
  for (const p of plugins) {
    if (p.codeBlockLang) map.set(p.codeBlockLang, p)
  }
  // Register aliases
  for (const [alias, canonical] of Object.entries(LANG_ALIASES)) {
    const plugin = map.get(canonical)
    if (plugin && !map.has(alias)) map.set(alias, plugin)
  }
  return map
}

// ─── Default built-in widgets ───────────────────────────────

const _defaults: WidgetPlugin[] = [chartPlugin, mermaidPlugin, katexPlugin, tablePlugin, embedPlugin, excalidrawPlugin, mapPlugin, timelinePlugin, calendarPlugin]

export function getDefaultWidgets(): WidgetPlugin[] {
  return _defaults
}

// ─── Error fallback ─────────────────────────────────────────

export function renderWidgetError(el: HTMLElement, type: string, _message: string, theme: "dark" | "light") {
  const isDark = theme === "dark"

  // Recover spec source for debug details
  const specAttr = el.getAttribute("data-widget-spec")
  let source = ""
  if (specAttr) {
    try {
      const spec = JSON.parse(specAttr)
      const { widgetId, ...rest } = spec
      source = JSON.stringify(rest, null, 2)
    } catch {
      source = specAttr
    }
  }

  el.innerHTML = ""

  const wrapper = document.createElement("div")
  wrapper.style.margin = "1em 0"
  wrapper.style.textAlign = "center"

  const msg = document.createElement("div")
  msg.style.fontSize = "0.8em"
  msg.style.color = isDark ? "#5a5550" : "#bbb"
  msg.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  msg.textContent = `${type} widget unavailable`
  wrapper.appendChild(msg)

  el.appendChild(wrapper)

  // Details toggle
  if (source) {
    const details = document.createElement("details")
    details.style.marginTop = "8px"
    details.style.textAlign = "left"

    const summary = document.createElement("summary")
    summary.style.fontSize = "0.75em"
    summary.style.color = isDark ? "#5a5550" : "#bbb"
    summary.style.cursor = "pointer"
    summary.style.userSelect = "none"
    summary.style.padding = "4px 0"
    summary.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    summary.textContent = "show widget spec"
    details.appendChild(summary)

    const code = document.createElement("pre")
    code.style.margin = "4px 0 0"
    code.style.padding = "12px"
    code.style.backgroundColor = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"
    code.style.border = `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
    code.style.borderRadius = "4px"
    code.style.fontSize = "0.75em"
    code.style.lineHeight = "1.4"
    code.style.color = isDark ? "#807870" : "#a0a0a0"
    code.style.overflow = "auto"
    code.style.maxHeight = "200px"
    code.style.fontFamily = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace"
    code.textContent = source
    details.appendChild(code)

    el.appendChild(details)
  }

}

// ─── Hydration ──────────────────────────────────────────────

/**
 * Find all widget placeholders in a container and hydrate them.
 */
export function hydrateWidgets(
  container: HTMLElement,
  theme: "dark" | "light",
  registry: Map<string, WidgetHydrator>,
): (() => void)[] {
  const cleanups: (() => void)[] = []
  const placeholders = container.querySelectorAll<HTMLElement>("[data-widget-spec]")

  for (const el of placeholders) {
    try {
      const spec: WidgetSpec = JSON.parse(el.getAttribute("data-widget-spec")!)
      const hydrator = registry.get(spec.type)
      if (hydrator) {
        const cleanup = hydrator(el, spec, theme)
        if (cleanup) cleanups.push(cleanup)

        // Add expand-to-fullscreen button
        const expandCleanup = addExpandButton(el, spec, hydrator, theme)
        cleanups.push(expandCleanup)
      } else {
        renderWidgetError(el, spec.type, `Unknown widget type: ${spec.type}`, theme)
      }
    } catch (err) {
      renderWidgetError(el, "widget", String(err), theme)
    }
  }

  return cleanups
}
