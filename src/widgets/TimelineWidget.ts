/**
 * Timeline widget plugin — Notion-style horizontal timeline.
 * Renders a scrollable date axis with event cards positioned by date.
 *
 * Spec fields:
 *   events: Array<{ date: string, title: string, description?: string, color?: string }>
 *   start?: string   — "YYYY-MM-DD" start of visible range (default: earliest event)
 *   end?: string     — "YYYY-MM-DD" end of visible range (default: latest event)
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
const DAY_WIDTH = 48
const CARD_HEIGHT = 36
const CARD_GAP = 4

function parseDate(s: string): Date {
  const d = new Date(s)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (86400000))
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export const timelinePlugin: WidgetPlugin = {
  type: "timeline",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "YYYY-MM-DD" },
            title: { type: "string" },
            description: { type: "string" },
            color: { type: "string" },
          },
          required: ["date", "title"],
        },
      },
      start: { type: "string", description: "YYYY-MM-DD visible range start" },
      end: { type: "string", description: "YYYY-MM-DD visible range end" },
    },
    required: ["events"],
  },
  codeBlockLang: "timeline",
  hydrate: (container, spec, theme) => {
    const events: TimelineEvent[] = spec.events
    if (!events || !Array.isArray(events) || events.length === 0) {
      container.textContent = "Timeline widget requires 'events' array"
      return
    }

    const isDark = theme === "dark"
    const textColor = isDark ? "#e8e6e3" : "#37352f"
    const mutedColor = isDark ? "#8a8580" : "#9b9a97"
    const lineColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
    const cardBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"
    const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
    const todayColor = "#C15F3C"

    // Sort events by date
    const sorted = [...events].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())

    // Determine date range — add padding of 2 days on each side
    const rangeStart = parseDate(spec.start || sorted[0].date)
    const rangeEnd = parseDate(spec.end || sorted[sorted.length - 1].date)
    rangeStart.setDate(rangeStart.getDate() - 2)
    rangeEnd.setDate(rangeEnd.getDate() + 2)
    const totalDays = daysBetween(rangeStart, rangeEnd)
    const totalWidth = totalDays * DAY_WIDTH

    // Outer scrollable container
    const outer = document.createElement("div")
    outer.style.cssText = `
      margin: 1em 0; overflow-x: auto; overflow-y: hidden;
      border-radius: 8px; border: 1px solid ${cardBorder};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `

    const inner = document.createElement("div")
    inner.style.cssText = `position: relative; min-width: ${totalWidth}px; padding-bottom: 16px;`

    // ── Date axis header ──
    const header = document.createElement("div")
    header.style.cssText = `
      position: relative; height: 50px; border-bottom: 1px solid ${lineColor};
    `

    // Month labels + day numbers
    let currentMonth = ""
    for (let i = 0; i <= totalDays; i++) {
      const d = new Date(rangeStart)
      d.setDate(d.getDate() + i)
      const x = i * DAY_WIDTH

      const month = formatMonth(d)
      if (month !== currentMonth) {
        currentMonth = month
        const monthLabel = document.createElement("div")
        monthLabel.style.cssText = `
          position: absolute; top: 4px; left: ${x + 4}px;
          font-size: 11px; font-weight: 600; color: ${textColor};
          white-space: nowrap;
        `
        monthLabel.textContent = month
        header.appendChild(monthLabel)
      }

      const dayLabel = document.createElement("div")
      const today = isToday(d)
      dayLabel.style.cssText = `
        position: absolute; bottom: 6px; left: ${x}px;
        width: ${DAY_WIDTH}px; text-align: center;
        font-size: 11px; color: ${today ? "#fff" : mutedColor};
        font-weight: ${today ? "600" : "400"};
      `
      if (today) {
        const circle = document.createElement("span")
        circle.style.cssText = `
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 50%;
          background: ${todayColor}; color: #fff; font-size: 11px; font-weight: 600;
        `
        circle.textContent = String(d.getDate())
        dayLabel.appendChild(circle)
      } else {
        dayLabel.textContent = String(d.getDate())
      }
      header.appendChild(dayLabel)
    }
    inner.appendChild(header)

    // ── Today indicator line ──
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (today >= rangeStart && today <= rangeEnd) {
      const todayX = daysBetween(rangeStart, today) * DAY_WIDTH + DAY_WIDTH / 2
      const todayLine = document.createElement("div")
      todayLine.style.cssText = `
        position: absolute; top: 50px; bottom: 0; left: ${todayX}px;
        width: 1px; background: ${todayColor}; opacity: 0.4; z-index: 1;
      `
      const todayDot = document.createElement("div")
      todayDot.style.cssText = `
        position: absolute; top: -3px; left: -3px;
        width: 7px; height: 7px; border-radius: 50%;
        background: ${todayColor};
      `
      todayLine.appendChild(todayDot)
      inner.appendChild(todayLine)
    }

    // ── Vertical grid lines ──
    for (let i = 0; i <= totalDays; i++) {
      const x = i * DAY_WIDTH + DAY_WIDTH / 2
      const gridLine = document.createElement("div")
      gridLine.style.cssText = `
        position: absolute; top: 50px; bottom: 0; left: ${x}px;
        width: 1px; background: ${lineColor};
      `
      inner.appendChild(gridLine)
    }

    // ── Event cards ──
    // Stack cards that overlap vertically
    const lanes: { end: number }[] = []

    const cardsArea = document.createElement("div")
    cardsArea.style.cssText = `position: relative; min-height: ${CARD_HEIGHT + 24}px;`

    for (let ei = 0; ei < sorted.length; ei++) {
      const event = sorted[ei]
      const eventDate = parseDate(event.date)
      const dayOffset = daysBetween(rangeStart, eventDate)
      const x = dayOffset * DAY_WIDTH
      const color = event.color || DEFAULT_COLORS[ei % DEFAULT_COLORS.length]

      // Find a lane
      let lane = 0
      for (let l = 0; l < lanes.length; l++) {
        if (x >= lanes[l].end + CARD_GAP) {
          lane = l
          break
        }
        lane = l + 1
      }

      const card = document.createElement("div")
      const cardWidth = Math.max(DAY_WIDTH * 3, 140)
      card.style.cssText = `
        position: absolute; top: ${12 + lane * (CARD_HEIGHT + CARD_GAP)}px; left: ${x + 4}px;
        width: ${cardWidth}px; height: ${CARD_HEIGHT}px;
        background: ${cardBg}; border: 1px solid ${cardBorder};
        border-radius: 4px; padding: 0 10px;
        display: flex; align-items: center; gap: 8px;
        cursor: default; overflow: hidden;
        border-left: 3px solid ${color};
        transition: background 0.12s ease;
      `
      card.addEventListener("mouseenter", () => { card.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" })
      card.addEventListener("mouseleave", () => { card.style.background = cardBg })

      const titleEl = document.createElement("div")
      titleEl.style.cssText = `
        font-size: 13px; font-weight: 500; color: ${textColor};
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
      `
      titleEl.innerHTML = escapeHtml(event.title)
      card.appendChild(titleEl)

      if (event.description) {
        card.title = `${event.title}\n${event.description}`
      }

      cardsArea.appendChild(card)

      // Update lane tracking
      const cardEnd = x + cardWidth
      if (lanes[lane]) {
        lanes[lane].end = cardEnd
      } else {
        lanes[lane] = { end: cardEnd }
      }
    }

    // Adjust cardsArea height
    const totalLanes = Math.max(lanes.length, 1)
    cardsArea.style.minHeight = `${12 + totalLanes * (CARD_HEIGHT + CARD_GAP) + 12}px`

    inner.appendChild(cardsArea)
    outer.appendChild(inner)

    container.innerHTML = ""
    container.appendChild(outer)

    // Scroll to today or first event
    const scrollTarget = (today >= rangeStart && today <= rangeEnd)
      ? daysBetween(rangeStart, today) * DAY_WIDTH
      : daysBetween(rangeStart, parseDate(sorted[0].date)) * DAY_WIDTH
    outer.scrollLeft = Math.max(0, scrollTarget - outer.clientWidth / 3)
  },
}
