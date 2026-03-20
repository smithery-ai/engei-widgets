/**
 * Timeline widget plugin — renders chronological events as a vertical timeline.
 *
 * Spec fields:
 *   events: Array<{ date: string, title: string, description?: string, color?: string }>
 *   direction?: "asc" | "desc" — sort order (default: "asc")
 *
 * Code block lang: `timeline`
 */

import type { WidgetPlugin } from "../types"
import { escapeHtml } from "../utils"

interface TimelineEvent {
  date: string
  title: string
  description?: string
  color?: string
}

const DEFAULT_COLORS = ["#6a8ac0", "#7aa874", "#c4a050", "#C15F3C", "#a070b0", "#50a0a0"]

export const timelinePlugin: WidgetPlugin = {
  type: "timeline",
  codeBlockLang: "timeline",
  toSpec: (text) => {
    const parsed = JSON.parse(text.trim())
    // Accept both raw array and { events: [...] } formats
    if (Array.isArray(parsed)) return { events: parsed }
    return parsed
  },
  hydrate: (container, spec, theme) => {
    const events: TimelineEvent[] = spec.events
    if (!events || !Array.isArray(events) || events.length === 0) {
      container.textContent = "Timeline widget requires 'events' array"
      return
    }

    const sorted = [...events].sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime()
      return spec.direction === "desc" ? -d : d
    })

    const isDark = theme === "dark"
    const textColor = isDark ? "#e8e6e3" : "#2a2520"
    const mutedColor = isDark ? "#8a8580" : "#8a8580"
    const lineColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"

    const wrapper = document.createElement("div")
    wrapper.style.margin = "1em 0"
    wrapper.style.paddingLeft = "24px"
    wrapper.style.position = "relative"

    // Vertical line
    const line = document.createElement("div")
    line.style.position = "absolute"
    line.style.left = "11px"
    line.style.top = "8px"
    line.style.bottom = "8px"
    line.style.width = "2px"
    line.style.backgroundColor = lineColor
    wrapper.appendChild(line)

    sorted.forEach((event, i) => {
      const color = event.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]

      const item = document.createElement("div")
      item.style.position = "relative"
      item.style.paddingLeft = "20px"
      item.style.paddingBottom = i < sorted.length - 1 ? "24px" : "0"

      // Dot
      const dot = document.createElement("div")
      dot.style.position = "absolute"
      dot.style.left = "-18px"
      dot.style.top = "6px"
      dot.style.width = "12px"
      dot.style.height = "12px"
      dot.style.borderRadius = "50%"
      dot.style.backgroundColor = color
      dot.style.border = `2px solid ${isDark ? "#1a1816" : "#faf8f5"}`
      item.appendChild(dot)

      // Date
      const date = document.createElement("div")
      date.style.fontSize = "0.8em"
      date.style.color = mutedColor
      date.style.marginBottom = "2px"
      date.textContent = event.date
      item.appendChild(date)

      // Title
      const title = document.createElement("div")
      title.style.fontWeight = "600"
      title.style.color = textColor
      title.innerHTML = escapeHtml(event.title)
      item.appendChild(title)

      // Description
      if (event.description) {
        const desc = document.createElement("div")
        desc.style.fontSize = "0.9em"
        desc.style.color = mutedColor
        desc.style.marginTop = "4px"
        desc.innerHTML = escapeHtml(event.description)
        item.appendChild(desc)
      }

      wrapper.appendChild(item)
    })

    container.innerHTML = ""
    container.appendChild(wrapper)
  },
}
