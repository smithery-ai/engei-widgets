/**
 * Attachment widget — renders a Notion-style file block inline.
 *
 * Spec fields:
 *   url: string         — path to the file (e.g. "/~/public/slug/report.pdf")
 *   title?: string      — display name (default: filename from url)
 *   size?: string       — human-readable size (e.g. "2.4 MB")
 *
 * Code block lang: `attachment`
 */

import type { WidgetPlugin } from "../types"

const EXT_COLORS: Record<string, string> = {
  pdf: "#C15F3C", doc: "#4285f4", docx: "#4285f4",
  xls: "#0f9d58", xlsx: "#0f9d58", csv: "#0f9d58",
  ppt: "#db4437", pptx: "#db4437", zip: "#8e8e8e",
}

function getExt(url: string): string {
  return url.split(".").pop()?.toLowerCase() || ""
}

// Notion-style page/file icon — simple folded-corner document
function fileIconSvg(color: string): string {
  return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 3a1 1 0 011-1h6l5 5v10a1 1 0 01-1 1H5a1 1 0 01-1-1V3z" fill="${color}" opacity="0.15"/>
    <path d="M4 3a1 1 0 011-1h6l5 5v10a1 1 0 01-1 1H5a1 1 0 01-1-1V3z" stroke="${color}" stroke-width="1.2" fill="none"/>
    <path d="M11 2v4a1 1 0 001 1h4" stroke="${color}" stroke-width="1.2" fill="none"/>
  </svg>`
}

export const attachmentPlugin: WidgetPlugin = {
  type: "attachment",
  codeBlockLang: "attachment",
  hydrate: (container, spec, theme) => {
    const url: string = spec.url
    if (!url) {
      container.textContent = "Attachment widget requires 'url'"
      return
    }

    const isDark = theme === "dark"
    const ext = getExt(url)
    const color = EXT_COLORS[ext] || (isDark ? "#9a9590" : "#7a7570")
    const filename = spec.title || url.split("/").pop() || "file"
    const size: string = spec.size || ""

    const textColor = isDark ? "#e8e6e3" : "#37352f"
    const mutedColor = isDark ? "#6a6560" : "#a0a0a0"
    const hoverBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"

    const link = document.createElement("a")
    // Use absolute URL so the preview click handler opens in new tab
    link.href = url.startsWith("/") ? `${window.location.origin}${url}` : url
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:3px 8px 3px 4px;border-radius:4px;text-decoration:none;margin:2px 0;transition:background 0.1s;cursor:pointer`
    link.addEventListener("mouseenter", () => { link.style.background = hoverBg })
    link.addEventListener("mouseleave", () => { link.style.background = "transparent" })

    // Icon
    const iconEl = document.createElement("span")
    iconEl.style.cssText = "flex-shrink:0;line-height:0;display:inline-flex"
    iconEl.innerHTML = fileIconSvg(color)
    link.appendChild(iconEl)

    // Filename with underline
    const name = document.createElement("span")
    name.style.cssText = `font-size:0.9em;color:${textColor};border-bottom:1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"};padding-bottom:1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`
    name.textContent = filename
    link.appendChild(name)

    // Size + ext badge
    if (size || ext) {
      const meta = document.createElement("span")
      meta.style.cssText = `font-size:0.75em;color:${mutedColor};margin-left:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`
      meta.textContent = size ? size : ext.toUpperCase()
      link.appendChild(meta)
    }

    container.innerHTML = ""
    container.appendChild(link)
  },
}
