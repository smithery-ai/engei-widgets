/**
 * Embed widget plugin — renders sanitized iframes for allowed domains.
 *
 * Spec fields:
 *   url: string          — the URL to embed
 *   width?: string       — CSS width (default: "100%")
 *   height?: string      — CSS height (default: "400px")
 *   aspectRatio?: string — CSS aspect-ratio (overrides height if set)
 *
 * Code block lang: `embed`
 */

import type { WidgetPlugin } from "../types"

const ALLOWED_DOMAINS = [
  // Video
  "youtube.com", "www.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com",
  "player.vimeo.com", "vimeo.com",
  "loom.com", "www.loom.com",
  // Design
  "figma.com", "www.figma.com",
  // Code
  "codesandbox.io",
  "stackblitz.com",
  "codepen.io",
  // Docs
  "docs.google.com",
  "airtable.com",
  "notion.so", "www.notion.so",
  // Other
  "excalidraw.com",
  "miro.com",
  "whimsical.com",
]

function isAllowed(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    return false
  }
}

/** Convert common share URLs to embeddable URLs */
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)

    // YouTube: watch?v=ID → embed/ID
    if ((u.hostname === "youtube.com" || u.hostname === "www.youtube.com") && u.pathname === "/watch") {
      const id = u.searchParams.get("v")
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`
    }
    // YouTube short: youtu.be/ID
    if (u.hostname === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed${u.pathname}`
    }
    // Vimeo: vimeo.com/ID → player.vimeo.com/video/ID
    if (u.hostname === "vimeo.com" && /^\/\d+/.test(u.pathname)) {
      return `https://player.vimeo.com/video${u.pathname}`
    }
    // Loom: loom.com/share/ID → loom.com/embed/ID
    if (u.hostname.endsWith("loom.com") && u.pathname.startsWith("/share/")) {
      return `https://www.loom.com/embed/${u.pathname.slice(7)}`
    }
    // Figma: add &embed=1 if not present
    if (u.hostname.endsWith("figma.com") && !u.searchParams.has("embed")) {
      u.searchParams.set("embed", "1")
      return u.toString()
    }
  } catch {
    // fall through
  }
  return url
}

export const embedPlugin: WidgetPlugin = {
  type: "embed",
  version: "1.0.0",
  specSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to embed" },
      width: { type: "string", description: "CSS width (default: \"100%\")" },
      height: { type: "string", description: "CSS height (default: \"400px\")" },
      aspectRatio: { type: "string", description: "CSS aspect-ratio (overrides height)" },
    },
    required: ["url"],
  },
  codeBlockLang: "embed",
  hydrate: (container, spec, theme) => {
    const rawUrl = spec.url
    if (!rawUrl) {
      container.textContent = "Embed widget missing 'url'"
      return
    }

    const embedUrl = toEmbedUrl(rawUrl)

    if (!isAllowed(embedUrl)) {
      const msg = document.createElement("div")
      msg.style.padding = "1em"
      msg.style.color = theme === "dark" ? "#e8a87c" : "#b35a00"
      msg.style.fontStyle = "italic"
      msg.textContent = `Embed blocked: ${new URL(rawUrl).hostname} is not in the allowlist`
      container.innerHTML = ""
      container.appendChild(msg)
      return
    }

    const wrapper = document.createElement("div")
    wrapper.style.margin = "1em 0"
    wrapper.style.borderRadius = "8px"
    wrapper.style.overflow = "hidden"
    wrapper.style.border = `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`

    const iframe = document.createElement("iframe")
    iframe.src = embedUrl
    iframe.style.width = spec.width || "100%"
    if (spec.aspectRatio) {
      iframe.style.aspectRatio = spec.aspectRatio
    } else {
      iframe.style.height = spec.height || "400px"
    }
    iframe.style.border = "none"
    iframe.style.display = "block"
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    iframe.setAttribute("allowfullscreen", "")
    iframe.setAttribute("loading", "lazy")
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms")

    wrapper.appendChild(iframe)
    container.innerHTML = ""
    container.appendChild(wrapper)
  },
}
