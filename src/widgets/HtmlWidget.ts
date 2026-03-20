/**
 * HTML widget plugin — renders sanitized HTML/CSS/SVG directly in the document.
 *
 * Uses DOMPurify to strip scripts and event handlers, keeping only safe
 * HTML, CSS, and SVG. Renders inline (no iframe), so comments, copy/paste,
 * print, and theming all work naturally.
 *
 * Code block lang: `html`
 * Content: raw HTML/CSS/SVG (scripts are stripped)
 */

import DOMPurify from "dompurify"
import type { WidgetPlugin } from "../types"

export const htmlPlugin: WidgetPlugin = {
  type: "html",
  codeBlockLang: "html",
  toSpec: (text: string) => ({ html: text }),
  hydrate: (container, spec, theme) => {
    const raw = spec.html as string
    if (!raw) {
      container.textContent = "HTML widget requires content"
      return
    }

    const isDark = theme === "dark"
    const scopeId = `koen-html-${spec.widgetId}`

    // Extract <style> blocks before sanitization (DOMPurify strips them)
    const styleBlocks: string[] = []
    const htmlWithoutStyles = raw.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
      styleBlocks.push(css)
      return ""
    })

    // Sanitize the HTML (no style tags to worry about now)
    const clean = DOMPurify.sanitize(htmlWithoutStyles, {
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "textarea", "button", "select"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur",
        "onsubmit", "onchange", "oninput", "onkeydown", "onkeyup", "onkeypress"],
    })

    const wrapper = document.createElement("div")
    wrapper.style.margin = "1em 0"
    wrapper.style.color = isDark ? "#e8e6e3" : "#2a2520"
    wrapper.setAttribute("data-koen-html", scopeId)
    wrapper.innerHTML = clean

    // Re-inject extracted styles, scoped to this widget
    if (styleBlocks.length > 0) {
      const style = document.createElement("style")
      let scoped = ""
      for (const css of styleBlocks) {
        scoped += css.replace(
          /([^{}@][^{}]*)\{/g,
          (match, selector: string) => {
            // Don't scope @-rules (media queries, keyframes, etc.)
            if (selector.trim().startsWith("@")) return match
            const selectors = selector.split(",").map((s: string) =>
              `[data-koen-html="${scopeId}"] ${s.trim()}`
            ).join(", ")
            return `${selectors} {`
          },
        )
      }
      style.textContent = scoped
      wrapper.prepend(style)
    }

    container.innerHTML = ""
    container.appendChild(wrapper)
  },
}
