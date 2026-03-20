/**
 * Widget registry — maps widget types to hydration functions.
 * Supports per-instance registries via buildWidgetRegistry().
 */

import type { WidgetPlugin, WidgetHydrator, WidgetSpec } from "./types"
import { chartPlugin } from "./widgets/ChartWidget"
import { mermaidPlugin } from "./widgets/MermaidWidget"
import { diffPlugin } from "./widgets/DiffWidget"
import { globePlugin } from "./widgets/GlobeWidget"
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

/** Build a Map<codeBlockLang, plugin> for parseWithPositions. */
export function buildLangMap(plugins: WidgetPlugin[]): Map<string, WidgetPlugin> {
  const map = new Map<string, WidgetPlugin>()
  for (const p of plugins) {
    if (p.codeBlockLang) map.set(p.codeBlockLang, p)
  }
  return map
}

// ─── Default built-in widgets ───────────────────────────────

const _defaults: WidgetPlugin[] = [chartPlugin, mermaidPlugin, diffPlugin, globePlugin, katexPlugin, tablePlugin, embedPlugin, excalidrawPlugin, mapPlugin, timelinePlugin, calendarPlugin]

export function getDefaultWidgets(): WidgetPlugin[] {
  return _defaults
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
      } else {
        el.textContent = `Unknown widget type: ${spec.type}`
        el.style.color = "var(--color-text-secondary, #888)"
        el.style.fontStyle = "italic"
        el.style.padding = "1em"
      }
    } catch (err) {
      el.textContent = `Widget error: ${err}`
      el.style.color = "var(--color-text-danger, #e06c75)"
    }
  }

  return cleanups
}
