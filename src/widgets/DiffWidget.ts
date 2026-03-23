/**
 * Diff widget plugin — renders code diffs with syntax highlighting.
 * Uses jsdiff for computation and highlight.js for syntax coloring.
 */

import { diffLines } from "diff"
import hljs from "highlight.js/lib/core"
import type { WidgetPlugin } from "../types"
import { escapeHtml } from "../utils"

interface DiffWidgetSpec {
  type: "diff"
  widgetId: string
  language?: string
  old: string
  new: string
  filename?: string
}

function highlightLines(code: string, language?: string): string[] {
  let highlighted: string
  if (language && hljs.getLanguage(language)) {
    highlighted = hljs.highlight(code, { language }).value
  } else {
    highlighted = escapeHtml(code)
  }
  return splitHighlightedLines(highlighted)
}

/**
 * Split highlighted HTML into lines while preserving open span tags.
 * When a span is open at a line break, close it and reopen on the next line.
 */
function splitHighlightedLines(html: string): string[] {
  const rawLines = html.split("\n")
  const result: string[] = []
  let openTags: string[] = []

  for (const raw of rawLines) {
    let line = openTags.join("") + raw

    const tagRe = /<\/?span[^>]*>/g
    let m
    while ((m = tagRe.exec(raw)) !== null) {
      if (m[0].startsWith("</")) {
        openTags.pop()
      } else {
        openTags.push(m[0])
      }
    }

    for (let i = openTags.length - 1; i >= 0; i--) {
      line += "</span>"
    }

    result.push(line)
  }

  return result
}


export const diffPlugin: WidgetPlugin = {
  type: "diff",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      old: { type: "string", description: "Original text" },
      new: { type: "string", description: "Modified text" },
      language: { type: "string", description: "Language for syntax highlighting" },
      filename: { type: "string", description: "Optional filename shown in header" },
    },
    required: ["old", "new"],
  },
  codeBlockLang: "diff",
  // diff code blocks contain JSON — default toSpec (JSON.parse) works
  hydrate: (container, spec, _theme) => {
    const s = spec as DiffWidgetSpec
    if (s.old == null || s.new == null) {
      container.textContent = "Diff widget requires 'old' and 'new' fields"
      return
    }

    const oldText = s.old
    const newText = s.new

    const changes = diffLines(oldText, newText)

    const oldLines = highlightLines(oldText, s.language)
    const newLines = highlightLines(newText, s.language)

    const rows: { type: "equal" | "add" | "remove"; lineNum: number; html: string }[] = []
    let oldIdx = 0
    let newIdx = 0
    let added = 0
    let removed = 0

    for (const change of changes) {
      const count = change.count || 0
      if (change.removed) {
        for (let i = 0; i < count; i++) {
          rows.push({ type: "remove", lineNum: oldIdx + 1, html: oldLines[oldIdx] || "" })
          oldIdx++
          removed++
        }
      } else if (change.added) {
        for (let i = 0; i < count; i++) {
          rows.push({ type: "add", lineNum: newIdx + 1, html: newLines[newIdx] || "" })
          newIdx++
          added++
        }
      } else {
        for (let i = 0; i < count; i++) {
          rows.push({ type: "equal", lineNum: newIdx + 1, html: newLines[newIdx] || "" })
          oldIdx++
          newIdx++
        }
      }
    }

    const wrapper = document.createElement("div")
    wrapper.className = "koen-diff-widget"

    if (s.filename) {
      const header = document.createElement("div")
      header.className = "koen-diff-header"
      header.textContent = s.filename
      wrapper.appendChild(header)
    }

    const summary = document.createElement("div")
    summary.className = "koen-diff-summary"
    const parts: string[] = []
    if (added > 0) parts.push(`Added ${added} line${added !== 1 ? "s" : ""}`)
    if (removed > 0) parts.push(`removed ${removed} line${removed !== 1 ? "s" : ""}`)
    summary.textContent = parts.length > 0 ? parts.join(", ") : "No changes"
    wrapper.appendChild(summary)

    const table = document.createElement("table")
    table.className = "koen-diff-table"

    for (const row of rows) {
      if (row.type === "equal") continue
      const tr = document.createElement("tr")
      tr.className = `koen-diff-row koen-diff-${row.type}`

      const numTd = document.createElement("td")
      numTd.className = "koen-diff-num"
      numTd.textContent = String(row.lineNum)
      tr.appendChild(numTd)

      const prefixTd = document.createElement("td")
      prefixTd.className = "koen-diff-prefix"
      prefixTd.textContent = row.type === "add" ? "+" : row.type === "remove" ? "\u2212" : ""
      tr.appendChild(prefixTd)

      const codeTd = document.createElement("td")
      codeTd.className = "koen-diff-code"
      codeTd.innerHTML = row.html || "&nbsp;"
      tr.appendChild(codeTd)

      table.appendChild(tr)
    }

    wrapper.appendChild(table)
    container.innerHTML = ""
    container.appendChild(wrapper)
  },
}
