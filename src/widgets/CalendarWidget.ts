/**
 * Calendar widget plugin — renders a month grid with colored event ranges.
 * Pure DOM, no external dependencies.
 *
 * Spec fields:
 *   month?: string          — "YYYY-MM" (default: inferred from earliest event)
 *   events: Array<{ start: string, end: string, title: string, color?: string }>
 *
 * Code block lang: `calendar`
 */

import type { WidgetPlugin } from "../types"
import { escapeHtml } from "../utils"

interface CalendarEvent {
  start: string
  end: string
  title: string
  color?: string
}

const DEFAULT_COLORS = ["#6a8ac0", "#7aa874", "#c4a050", "#C15F3C", "#a070b0", "#50a0a0"]
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dayInRange(day: Date, start: Date, end: Date): boolean {
  return day >= start && day <= end
}

export const calendarPlugin: WidgetPlugin = {
  type: "calendar",
  codeBlockLang: "calendar",
  hydrate: (container, spec, theme) => {
    const events: CalendarEvent[] = spec.events
    if (!events || !Array.isArray(events) || events.length === 0) {
      container.textContent = "Calendar widget requires 'events' array"
      return
    }

    const isDark = theme === "dark"
    const textColor = isDark ? "#e8e6e3" : "#2a2520"
    const mutedColor = isDark ? "#6a6560" : "#a0a0a0"
    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
    const cellBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"
    const todayBorder = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"

    // Determine month to display
    let year: number, month: number
    if (spec.month) {
      const [y, m] = spec.month.split("-").map(Number)
      year = y
      month = m - 1
    } else {
      const earliest = parseDate(events[0].start)
      year = earliest.getFullYear()
      month = earliest.getMonth()
    }

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay() // 0=Sun
    const daysInMonth = lastDay.getDate()

    // Assign colors to events
    const coloredEvents = events.map((e, i) => ({
      ...e,
      color: e.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      startDate: parseDate(e.start),
      endDate: parseDate(e.end),
    }))

    // Build wrapper
    const wrapper = document.createElement("div")
    wrapper.style.margin = "1em 0"
    wrapper.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

    // Month header
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const header = document.createElement("div")
    header.style.textAlign = "center"
    header.style.fontWeight = "600"
    header.style.fontSize = "1.1em"
    header.style.marginBottom = "12px"
    header.style.color = textColor
    header.textContent = `${monthNames[month]} ${year}`
    wrapper.appendChild(header)

    // Grid
    const grid = document.createElement("div")
    grid.style.display = "grid"
    grid.style.gridTemplateColumns = "repeat(7, 1fr)"
    grid.style.gap = "1px"
    grid.style.borderRadius = "6px"
    grid.style.overflow = "hidden"
    grid.style.border = `1px solid ${borderColor}`

    // Day-of-week headers
    for (const dayName of DAY_NAMES) {
      const cell = document.createElement("div")
      cell.style.padding = "6px 4px"
      cell.style.textAlign = "center"
      cell.style.fontSize = "0.75em"
      cell.style.fontWeight = "600"
      cell.style.color = mutedColor
      cell.style.textTransform = "uppercase"
      cell.style.letterSpacing = "0.5px"
      cell.textContent = dayName
      grid.appendChild(cell)
    }

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      const cell = document.createElement("div")
      cell.style.padding = "6px"
      cell.style.backgroundColor = cellBg
      grid.appendChild(cell)
    }

    const today = new Date()

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const cell = document.createElement("div")
      cell.style.padding = "4px"
      cell.style.minHeight = "40px"
      cell.style.backgroundColor = cellBg
      cell.style.position = "relative"

      // Today highlight
      if (sameDay(date, today)) {
        cell.style.outline = `2px solid ${todayBorder}`
        cell.style.outlineOffset = "-2px"
        cell.style.borderRadius = "3px"
      }

      // Day number
      const num = document.createElement("div")
      num.style.fontSize = "0.8em"
      num.style.color = textColor
      num.style.marginBottom = "2px"
      num.textContent = String(d)
      cell.appendChild(num)

      // Event bars for this day
      for (const evt of coloredEvents) {
        if (dayInRange(date, evt.startDate, evt.endDate)) {
          const bar = document.createElement("div")
          bar.style.backgroundColor = evt.color
          bar.style.borderRadius = "2px"
          bar.style.height = "4px"
          bar.style.marginBottom = "1px"
          bar.style.opacity = "0.85"
          bar.title = evt.title
          cell.appendChild(bar)
        }
      }

      grid.appendChild(cell)
    }

    // Empty cells after last day
    const totalCells = startDow + daysInMonth
    const remainder = totalCells % 7
    if (remainder > 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        const cell = document.createElement("div")
        cell.style.padding = "6px"
        cell.style.backgroundColor = cellBg
        grid.appendChild(cell)
      }
    }

    wrapper.appendChild(grid)

    // Legend
    if (coloredEvents.length > 0) {
      const legend = document.createElement("div")
      legend.style.display = "flex"
      legend.style.flexWrap = "wrap"
      legend.style.gap = "12px"
      legend.style.marginTop = "10px"
      legend.style.fontSize = "0.8em"

      for (const evt of coloredEvents) {
        const item = document.createElement("div")
        item.style.display = "flex"
        item.style.alignItems = "center"
        item.style.gap = "5px"

        const dot = document.createElement("div")
        dot.style.width = "10px"
        dot.style.height = "10px"
        dot.style.borderRadius = "2px"
        dot.style.backgroundColor = evt.color
        dot.style.flexShrink = "0"
        item.appendChild(dot)

        const label = document.createElement("span")
        label.style.color = textColor
        label.innerHTML = escapeHtml(evt.title)
        item.appendChild(label)

        legend.appendChild(item)
      }

      wrapper.appendChild(legend)
    }

    container.innerHTML = ""
    container.appendChild(wrapper)
  },
}
