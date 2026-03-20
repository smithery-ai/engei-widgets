/**
 * Widget expand-to-fullscreen overlay.
 * Adds an expand button to each widget placeholder; on click, re-hydrates
 * the widget into a fullscreen overlay panel.
 */

import type { WidgetHydrator, WidgetSpec } from "./types"

const EXPAND_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,2 14,2 14,6"/><polyline points="6,14 2,14 2,10"/><line x1="14" y1="2" x2="9" y2="7"/><line x1="2" y1="14" x2="7" y2="9"/></svg>`

const CLOSE_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="14" y2="14"/><line x1="14" y1="4" x2="4" y2="14"/></svg>`

export function addExpandButton(
  el: HTMLElement,
  spec: WidgetSpec,
  hydrator: WidgetHydrator,
  theme: "dark" | "light",
): () => void {
  const btn = document.createElement("button")
  btn.className = "koen-widget-expand-btn"
  btn.innerHTML = EXPAND_SVG
  btn.title = "Expand widget"

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    openOverlay(spec, hydrator, theme)
  }
  btn.addEventListener("click", handleClick)
  el.appendChild(btn)

  return () => {
    btn.removeEventListener("click", handleClick)
    btn.remove()
  }
}

function openOverlay(
  spec: WidgetSpec,
  hydrator: WidgetHydrator,
  theme: "dark" | "light",
): void {
  // Prevent double-open
  if (document.querySelector(".koen-widget-overlay-backdrop")) return

  const isDark = theme === "dark"

  // Backdrop
  const backdrop = document.createElement("div")
  backdrop.className = "koen-widget-overlay-backdrop"

  // Panel
  const panel = document.createElement("div")
  panel.className = "koen-widget-overlay-panel"
  panel.style.background = isDark ? "#1a1816" : "#faf8f5"
  panel.style.color = isDark ? "#e8e6e3" : "#2a2520"

  // Close button (inside panel)
  const closeBtn = document.createElement("button")
  closeBtn.className = "koen-widget-overlay-close"
  closeBtn.innerHTML = CLOSE_SVG
  closeBtn.style.color = isDark ? "#e8e6e3" : "#2a2520"
  closeBtn.title = "Close"
  panel.appendChild(closeBtn)

  // Widget container — flex centered
  const widgetContainer = document.createElement("div")
  widgetContainer.className = "koen-widget-overlay-content"
  panel.appendChild(widgetContainer)

  backdrop.appendChild(panel)
  document.body.appendChild(backdrop)

  // Lock scroll — compensate for scrollbar width to prevent layout shift
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  const prevOverflow = document.body.style.overflow
  const prevPaddingRight = document.body.style.paddingRight
  document.body.style.overflow = "hidden"
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  // Re-hydrate with overlay-safe spec (avoid ID collisions)
  const overlaySpec = { ...spec, widgetId: spec.widgetId + "-overlay" }
  const widgetCleanup = hydrator(widgetContainer, overlaySpec, theme)

  // Close logic
  const close = () => {
    if (widgetCleanup) widgetCleanup()
    backdrop.remove()
    document.body.style.overflow = prevOverflow
    document.body.style.paddingRight = prevPaddingRight
    document.removeEventListener("keydown", handleEscape)
  }

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") close()
  }
  document.addEventListener("keydown", handleEscape)

  closeBtn.addEventListener("click", close)
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close()
  })
}
