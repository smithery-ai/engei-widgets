/**
 * Calendar widget plugin — month grid or week view with time slots.
 * Pure DOM, no external dependencies.
 *
 * Spec fields:
 *   view?: "month" | "week"  — display mode (default: "month")
 *   month?: string           — "YYYY-MM" for month view (default: inferred from earliest event)
 *   week?: string            — "YYYY-MM-DD" start date for week view (default: inferred from earliest event)
 *   events: Array<{
 *     start: string           — "YYYY-MM-DD" (month) or "YYYY-MM-DD" (all-day in week)
 *     end: string             — "YYYY-MM-DD" (month) or "YYYY-MM-DD" (all-day in week)
 *     startTime?: string      — "HH:MM" for timed events in week view
 *     endTime?: string        — "HH:MM" for timed events in week view
 *     title: string
 *     color?: string
 *   }>
 *
 * Code block lang: `calendar`
 */

import type { WidgetPlugin } from "../types"
import { escapeHtml } from "../utils"

interface CalendarEvent {
  start: string
  end: string
  startTime?: string
  endTime?: string
  title: string
  color?: string
}

const DEFAULT_COLORS = ["#6a8ac0", "#7aa874", "#c4a050", "#C15F3C", "#a070b0", "#50a0a0"]
const DAY_NAMES_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const DAY_NAMES_LONG = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h + m / 60
}

function fmtTime12(t: string): string {
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "pm" : "am"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`
}

function hourLabel(h: number): string {
  if (h === 0) return "12 AM"
  if (h < 12) return `${h} AM`
  if (h === 12) return "12 PM"
  return `${h - 12} PM`
}

// ─── Month View ──────────────────────────────────────────────

function renderMonthView(container: HTMLElement, spec: any, events: CalendarEvent[], theme: "dark" | "light") {
  const isDark = theme === "dark"
  const textColor = isDark ? "#e8e6e3" : "#37352f"
  const mutedColor = isDark ? "#5a5550" : "#a0a0a0"
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"
  const todayBg = isDark ? "rgba(193,95,60,0.06)" : "rgba(193,95,60,0.04)"

  let year: number, month: number
  if (spec.month) {
    const [y, m] = spec.month.split("-").map(Number)
    year = y; month = m - 1
  } else {
    const earliest = parseDate(events[0].start)
    year = earliest.getFullYear(); month = earliest.getMonth()
  }

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const coloredEvents = events.map((e, i) => ({
    ...e, color: e.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    startDate: parseDate(e.start), endDate: parseDate(e.end),
  }))

  const dayEvents = new Map<string, typeof coloredEvents>()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const key = fmtDate(date)
    const active = coloredEvents.filter(e => date >= e.startDate && date <= e.endDate)
    if (active.length > 0) dayEvents.set(key, active)
  }

  const wrapper = document.createElement("div")
  wrapper.style.cssText = "margin:1em 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

  // ── Column headers (matches week view style) ──
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const headerRow = document.createElement("div")
  headerRow.style.cssText = "display:grid;grid-template-columns:repeat(7,1fr);gap:0;margin-bottom:4px"

  for (let i = 0; i < 7; i++) {
    const col = document.createElement("div")
    col.style.cssText = "text-align:center;padding:8px 0 6px"
    const dayLabel = document.createElement("div")
    dayLabel.style.cssText = `font-size:0.7em;font-weight:600;color:${mutedColor};letter-spacing:0.5px`
    dayLabel.textContent = DAY_NAMES_LONG[i]
    col.appendChild(dayLabel)
    headerRow.appendChild(col)
  }
  wrapper.appendChild(headerRow)

  // Month + year label (subtle, top-left)
  const monthLabel = document.createElement("div")
  monthLabel.style.cssText = `font-size:0.8em;font-weight:600;color:${mutedColor};margin-bottom:6px;padding-left:2px`
  monthLabel.textContent = `${monthNames[month]} ${year}`
  wrapper.insertBefore(monthLabel, headerRow)

  // ── Grid ──
  const grid = document.createElement("div")
  grid.style.cssText = `display:grid;grid-template-columns:repeat(7,1fr);border-radius:8px;overflow:hidden;border:1px solid ${borderColor}`

  const today = new Date()
  const ROW_HEIGHT = 72

  // Empty leading cells
  for (let i = 0; i < startDow; i++) {
    const cell = document.createElement("div")
    cell.style.cssText = `height:${ROW_HEIGHT}px;border-bottom:1px solid ${borderColor};${i < 6 ? `border-right:1px solid ${borderColor}` : ""}`
    grid.appendChild(cell)
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const key = fmtDate(date)
    const dow = (startDow + d - 1) % 7
    const isToday = sameDay(date, today)
    const evts = dayEvents.get(key) || []
    const weekRow = Math.floor((startDow + d - 1) / 7)
    const totalWeeks = Math.ceil((startDow + daysInMonth) / 7)
    const isLastRow = weekRow === totalWeeks - 1

    const cell = document.createElement("div")
    cell.style.cssText = `height:${ROW_HEIGHT}px;padding:5px 6px;position:relative;overflow:hidden;${isToday ? `background:${todayBg}` : ""};${!isLastRow ? `border-bottom:1px solid ${borderColor};` : ""}${dow < 6 ? `border-right:1px solid ${borderColor};` : ""}`

    // Day number
    const num = document.createElement("div")
    if (isToday) {
      // Circle highlight for today
      num.style.cssText = "display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#C15F3C;color:white;font-size:0.75em;font-weight:700;margin-bottom:3px"
    } else {
      num.style.cssText = `font-size:0.75em;color:${evts.length > 0 ? textColor : mutedColor};font-weight:${evts.length > 0 ? "600" : "400"};margin-bottom:3px;padding:2px 0`
    }
    num.textContent = String(d)
    cell.appendChild(num)

    // Event pills
    const maxVisible = 2
    for (let i = 0; i < Math.min(evts.length, maxVisible); i++) {
      const evt = evts[i]
      const isStart = sameDay(date, evt.startDate)
      const isEnd = sameDay(date, evt.endDate)
      const pill = document.createElement("div")
      pill.title = evt.title

      if (isStart) {
        // Labeled pill on start day
        pill.style.cssText = `background:${evt.color};border-radius:4px;padding:2px 6px;font-size:0.65em;font-weight:500;color:white;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:3px solid color-mix(in srgb, ${evt.color}, black 20%)`
        pill.textContent = evt.title
      } else {
        // Continuation bar
        pill.style.cssText = `background:${evt.color};opacity:0.7;height:6px;margin-bottom:2px;${isEnd ? "border-radius:0 3px 3px 0" : "border-radius:0"}`
      }
      cell.appendChild(pill)
    }

    if (evts.length > maxVisible) {
      const more = document.createElement("div")
      more.style.cssText = `font-size:0.6em;color:${mutedColor};margin-top:1px`
      more.textContent = `+${evts.length - maxVisible} more`
      cell.appendChild(more)
    }

    grid.appendChild(cell)
  }

  // Trailing empty cells
  const totalCells = startDow + daysInMonth
  const remainder = totalCells % 7
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      const cell = document.createElement("div")
      cell.style.cssText = `height:${ROW_HEIGHT}px;${i < 6 - remainder ? `border-right:1px solid ${borderColor}` : ""}`
      grid.appendChild(cell)
    }
  }

  wrapper.appendChild(grid)

  // Legend (only for 2+ events)
  if (coloredEvents.length > 1) {
    const legend = document.createElement("div")
    legend.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;font-size:0.75em"
    for (const evt of coloredEvents) {
      const item = document.createElement("div")
      item.style.cssText = "display:flex;align-items:center;gap:4px"
      const dot = document.createElement("div")
      dot.style.cssText = `width:8px;height:8px;border-radius:2px;background:${evt.color};flex-shrink:0`
      item.appendChild(dot)
      const label = document.createElement("span")
      label.style.color = mutedColor
      label.innerHTML = escapeHtml(evt.title)
      item.appendChild(label)
      legend.appendChild(item)
    }
    wrapper.appendChild(legend)
  }

  container.innerHTML = ""
  container.appendChild(wrapper)
}

// ─── Week View ───────────────────────────────────────────────

function renderWeekView(container: HTMLElement, spec: any, events: CalendarEvent[], theme: "dark" | "light") {
  const isDark = theme === "dark"
  const textColor = isDark ? "#e8e6e3" : "#37352f"
  const mutedColor = isDark ? "#5a5550" : "#a0a0a0"
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"
  const todayBg = isDark ? "rgba(193,95,60,0.06)" : "rgba(193,95,60,0.04)"

  // Determine the week start (Sunday)
  let weekStart: Date
  if (spec.week) {
    weekStart = parseDate(spec.week)
    // Roll back to Sunday
    const dow = weekStart.getDay()
    if (dow > 0) weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - dow)
  } else {
    const earliest = parseDate(events[0].start)
    const dow = earliest.getDay()
    weekStart = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate() - dow)
  }

  // Generate 7 days
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i))
  }

  // Assign colors
  const coloredEvents = events.map((e, i) => ({
    ...e, color: e.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }))

  // Separate all-day vs timed events
  const allDayEvents: typeof coloredEvents = []
  const timedEvents: typeof coloredEvents = []
  for (const e of coloredEvents) {
    if (e.startTime && e.endTime) {
      timedEvents.push(e)
    } else {
      allDayEvents.push(e)
    }
  }

  // Always show full 24 hours — scroll to first event
  const minHour = 0
  const maxHour = 24
  const totalHours = 24

  // Find the earliest event hour to auto-scroll
  let scrollToHour = 8
  if (timedEvents.length > 0) {
    scrollToHour = Math.max(0, Math.floor(Math.min(...timedEvents.map(e => parseTime(e.startTime!)))) - 1)
  }

  const today = new Date()
  const HOUR_HEIGHT = 48
  const GUTTER = 52
  const COL_GAP = 1

  const wrapper = document.createElement("div")
  wrapper.style.cssText = "margin:1em 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

  // ── Column headers ──
  const headerRow = document.createElement("div")
  headerRow.style.cssText = `display:grid;grid-template-columns:${GUTTER}px repeat(7,1fr);gap:0 ${COL_GAP}px;margin-bottom:4px`

  // Empty gutter
  const gutterHeader = document.createElement("div")
  headerRow.appendChild(gutterHeader)

  for (let i = 0; i < 7; i++) {
    const d = days[i]
    const isToday = sameDay(d, today)
    const col = document.createElement("div")
    col.style.cssText = `text-align:center;padding:6px 0 8px`

    const dayLabel = document.createElement("div")
    dayLabel.style.cssText = `font-size:0.7em;font-weight:600;color:${mutedColor};letter-spacing:0.5px;margin-bottom:2px`
    dayLabel.textContent = DAY_NAMES_LONG[d.getDay()]
    col.appendChild(dayLabel)

    const dateNum = document.createElement("div")
    if (isToday) {
      dateNum.style.cssText = `font-size:1.4em;font-weight:700;color:#C15F3C;line-height:1.3`
    } else {
      dateNum.style.cssText = `font-size:1.4em;font-weight:500;color:${textColor};line-height:1.3`
    }
    dateNum.textContent = String(d.getDate())
    col.appendChild(dateNum)

    headerRow.appendChild(col)
  }
  wrapper.appendChild(headerRow)

  // ── All-day events banner ──
  const dayAllDay = days.map(d => {
    const key = fmtDate(d)
    return allDayEvents.filter(e => {
      const s = parseDate(e.start)
      const en = parseDate(e.end)
      return d >= s && d <= en
    })
  })
  const hasAllDay = dayAllDay.some(a => a.length > 0)

  if (hasAllDay) {
    const allDayRow = document.createElement("div")
    allDayRow.style.cssText = `display:grid;grid-template-columns:${GUTTER}px repeat(7,1fr);gap:0 ${COL_GAP}px;margin-bottom:4px`

    const allDayGutter = document.createElement("div")
    allDayGutter.style.cssText = `font-size:0.65em;color:${mutedColor};padding:2px 4px 2px 0;text-align:right`
    allDayGutter.textContent = "ALL DAY"
    allDayRow.appendChild(allDayGutter)

    for (let i = 0; i < 7; i++) {
      const col = document.createElement("div")
      col.style.cssText = "padding:2px 2px"
      for (const evt of dayAllDay[i]) {
        const isStart = sameDay(days[i], parseDate(evt.start))
        const pill = document.createElement("div")
        pill.style.cssText = `background:${evt.color};border-radius:3px;padding:2px 6px;font-size:0.7em;font-weight:500;color:white;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`
        pill.textContent = isStart ? evt.title : ""
        if (!isStart) {
          pill.style.height = "6px"
          pill.style.padding = "0"
        }
        pill.title = evt.title
        col.appendChild(pill)
      }
      allDayRow.appendChild(col)
    }
    wrapper.appendChild(allDayRow)
  }

  // ── Time grid ──
  const gridContainer = document.createElement("div")
  gridContainer.style.cssText = `position:relative;display:grid;grid-template-columns:${GUTTER}px repeat(7,1fr);gap:0 ${COL_GAP}px;border-radius:8px;overflow:hidden;border:1px solid ${borderColor}`

  // Hour rows (gutter labels + grid lines)
  for (let h = minHour; h < maxHour; h++) {
    const rowY = (h - minHour) * HOUR_HEIGHT

    // Gutter label
    const label = document.createElement("div")
    label.style.cssText = `position:absolute;left:0;top:${rowY}px;width:${GUTTER - 4}px;height:${HOUR_HEIGHT}px;font-size:0.65em;color:${mutedColor};text-align:right;padding-right:8px;padding-top:0;line-height:1;z-index:1;transform:translateY(-0.4em)`
    if (h > minHour) label.textContent = hourLabel(h)
    gridContainer.appendChild(label)

    // Grid line
    const line = document.createElement("div")
    line.style.cssText = `position:absolute;left:${GUTTER}px;right:0;top:${rowY}px;height:1px;background:${borderColor}`
    gridContainer.appendChild(line)
  }

  // Column backgrounds + vertical dividers
  for (let i = 0; i < 7; i++) {
    const isToday = sameDay(days[i], today)
    const colBg = document.createElement("div")
    const left = `calc(${GUTTER}px + ${i} * ((100% - ${GUTTER}px) / 7) + ${i * COL_GAP}px)`
    const width = `calc((100% - ${GUTTER}px - ${6 * COL_GAP}px) / 7)`
    colBg.style.cssText = `position:absolute;left:${left};top:0;width:${width};height:100%;${isToday ? `background:${todayBg}` : ""}${i < 6 ? `;border-right:1px solid ${borderColor}` : ""}`
    gridContainer.appendChild(colBg)
  }

  // Set grid height
  const gridHeight = totalHours * HOUR_HEIGHT
  gridContainer.style.height = `${gridHeight}px`

  // ── Place timed events ──
  for (const evt of timedEvents) {
    const evtDate = parseDate(evt.start)
    const dayIdx = days.findIndex(d => sameDay(d, evtDate))
    if (dayIdx === -1) continue

    const startH = parseTime(evt.startTime!)
    const endH = parseTime(evt.endTime!)
    const top = (startH - minHour) * HOUR_HEIGHT
    const height = Math.max((endH - startH) * HOUR_HEIGHT, 20)

    const left = `calc(${GUTTER}px + ${dayIdx} * ((100% - ${GUTTER}px) / 7) + ${dayIdx * COL_GAP}px + 2px)`
    const width = `calc((100% - ${GUTTER}px - ${6 * COL_GAP}px) / 7 - 6px)`

    const block = document.createElement("div")
    block.style.cssText = `position:absolute;left:${left};top:${top}px;width:${width};height:${height}px;background:${evt.color};border-radius:6px;padding:4px 8px;font-size:0.75em;color:white;overflow:hidden;z-index:2;cursor:default;border-left:3px solid color-mix(in srgb, ${evt.color}, black 20%)`
    block.title = `${evt.title}\n${fmtTime12(evt.startTime!)} – ${fmtTime12(evt.endTime!)}`

    const title = document.createElement("div")
    title.style.cssText = "font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
    title.textContent = evt.title
    block.appendChild(title)

    if (height >= 36) {
      const time = document.createElement("div")
      time.style.cssText = "font-size:0.85em;opacity:0.85;margin-top:1px"
      time.textContent = `${fmtTime12(evt.startTime!)} – ${fmtTime12(evt.endTime!)}`
      block.appendChild(time)
    }

    gridContainer.appendChild(block)
  }

  // Gutter background
  const gutterBg = document.createElement("div")
  gutterBg.style.cssText = `position:absolute;left:0;top:0;width:${GUTTER}px;height:100%;border-right:1px solid ${borderColor}`
  gridContainer.appendChild(gutterBg)

  // Wrap in scrollable container
  const scrollContainer = document.createElement("div")
  const maxVisibleHeight = spec.height ? parseInt(spec.height) : 480
  scrollContainer.style.cssText = `max-height:${maxVisibleHeight}px;overflow-y:auto;border-radius:8px;border:1px solid ${borderColor}`
  gridContainer.style.border = "none"
  gridContainer.style.borderRadius = "0"
  scrollContainer.appendChild(gridContainer)
  wrapper.appendChild(scrollContainer)

  // Auto-scroll to first event
  requestAnimationFrame(() => {
    scrollContainer.scrollTop = scrollToHour * HOUR_HEIGHT
  })

  container.innerHTML = ""
  container.appendChild(wrapper)
}

// ─── Plugin ──────────────────────────────────────────────────

export const calendarPlugin: WidgetPlugin = {
  type: "calendar",
  codeBlockLang: "calendar",
  hydrate: (container, spec, theme) => {
    const events: CalendarEvent[] = spec.events
    if (!events || !Array.isArray(events) || events.length === 0) {
      container.textContent = "Calendar widget requires 'events' array"
      return
    }

    const view = spec.view || "month"
    if (view === "week") {
      renderWeekView(container, spec, events, theme)
    } else {
      renderMonthView(container, spec, events, theme)
    }
  },
}
