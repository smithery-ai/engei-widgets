# engei-widgets

Widget plugin SDK for [engei](https://github.com/smithery-ai/koen) — build custom widgets that render inside markdown preview.

## Install

```bash
npm install engei-widgets
```

## Create a widget

A widget is an object that satisfies the `WidgetPlugin` interface:

```ts
import type { WidgetPlugin } from "engei-widgets"

export const myPlugin: WidgetPlugin = {
  type: "my-widget",
  hydrate: (container, spec, theme) => {
    container.textContent = `Hello from ${spec.name}!`
  },
}
```

### WidgetPlugin interface

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `string` | Yes | Identifier matching the spec's `type` field |
| `hydrate` | `WidgetHydrator` | Yes | Renders the widget into a DOM element. May return a cleanup function |
| `codeBlockLang` | `string` | No | Auto-detect widgets from fenced code blocks with this language |
| `toSpec` | `(text, position?) => object` | No | Parse code block text into a spec object. Defaults to `JSON.parse` |

### WidgetHydrator signature

```ts
type WidgetHydrator = (
  container: HTMLElement,
  spec: WidgetSpec,
  theme: "dark" | "light",
) => void | (() => void)
```

The `spec` contains `widgetId`, `type`, and any additional fields from the markdown source.

Return a cleanup function to dispose resources when the widget is removed.

## Use with engei

Pass your widgets to the editor alongside the built-in defaults:

```tsx
import { Editor } from "engei"
import { getDefaultWidgets } from "engei-widgets"
import { myPlugin } from "./my-plugin"

<Editor
  content={markdown}
  mode="preview"
  widgets={[...getDefaultWidgets(), myPlugin]}
/>
```

## Fenced code block widgets

Widgets can auto-detect from fenced code blocks by setting `codeBlockLang`:

```ts
export const csvPlugin: WidgetPlugin = {
  type: "csv-table",
  codeBlockLang: "csv",
  toSpec: (text) => ({
    rows: text.split("\n").map(line => line.split(",")),
  }),
  hydrate: (container, spec, theme) => {
    const table = document.createElement("table")
    for (const row of spec.rows) {
      const tr = document.createElement("tr")
      for (const cell of row) {
        const td = document.createElement("td")
        td.textContent = cell
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }
    container.appendChild(table)
  },
}
```

Then in markdown:

````md
```csv
Name,Score
Alice,95
Bob,87
```
````

## Utilities

The package exports helpers useful for building widgets:

- **`loadCDN(url, globalName)`** — lazy-load a script from CDN, cached and deduped
- **`escapeHtml(str)`** — escape HTML entities

## Built-in widgets

### Default (included in `getDefaultWidgets()`)

| Widget | Type | Code block lang | Description |
|---|---|---|---|
| `chartPlugin` | `chart` | — | Chart.js charts from JSON config |
| `mermaidPlugin` | `mermaid` | `mermaid` | Mermaid diagrams |
| `diffPlugin` | `diff` | `diff` | Syntax-highlighted code diffs |
| `globePlugin` | `globe` | `globe` | Interactive WebGL globe (COBE) |
| `katexPlugin` | `katex` | `math` | LaTeX math rendering via KaTeX |
| `tablePlugin` | `table` | `table` | Enhanced tables with sorting from JSON |
| `embedPlugin` | `embed` | `embed` | Sanitized iframes (YouTube, Figma, Loom, etc.) |

### Optional (import individually)

These are exported but not in the default registry. Add them explicitly:

```tsx
import { getDefaultWidgets, excalidrawPlugin, mapPlugin, timelinePlugin } from "engei-widgets"

const widgets = [...getDefaultWidgets(), excalidrawPlugin, mapPlugin, timelinePlugin]
```

| Widget | Type | Code block lang | Description |
|---|---|---|---|
| `excalidrawPlugin` | `excalidraw` | `excalidraw` | Excalidraw whiteboard sketches from JSON |
| `mapPlugin` | `map` | `map` | Interactive Leaflet maps with markers |
| `timelinePlugin` | `timeline` | `timeline` | Vertical chronological timeline |

### Embed allowlist

The embed widget only loads iframes from trusted domains: YouTube, Vimeo, Loom, Figma, CodeSandbox, StackBlitz, CodePen, Google Docs, Airtable, Notion, Excalidraw, Miro, and Whimsical. Share URLs (e.g. `youtube.com/watch?v=...`) are automatically converted to embed URLs.

## License

MIT
