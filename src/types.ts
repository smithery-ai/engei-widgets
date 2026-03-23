/**
 * Widget System
 *
 * Widgets render rich content from fenced code blocks in markdown.
 * The code block language determines the widget type, and the content
 * is parsed as the widget's spec (configuration).
 *
 * Spec format:
 *   - JSON is the standard and required format for all widgets.
 *   - Three text-native widgets (mermaid, katex, html) also accept raw text
 *     via a custom `toSpec` function, since their content is inherently
 *     non-JSON. These widgets accept both JSON and raw text.
 *   - All other widgets require valid JSON specs.
 *
 * Lang aliases:
 *   - `math` and `latex` → `katex`
 *
 * Extending:
 *   - Implement the `WidgetPlugin` interface
 *   - Pass your plugin to `buildWidgetRegistry` / `buildLangMap`
 *   - Or combine with defaults: [...getDefaultWidgets(), myPlugin]
 *   - Use `specSchema` (JSON Schema) so agents can generate correct specs
 */

export type WidgetHydrator = (
  container: HTMLElement,
  spec: WidgetSpec,
  theme: "dark" | "light",
) => void | (() => void) // optional cleanup function

export interface WidgetSpec {
  widgetId: string
  type: string
  [key: string]: any
}

export interface WidgetPlugin {
  /** Widget type identifier used in the spec's `type` field */
  type: string
  /** Plugin version (semver). Used for compatibility checks and spec migration. */
  version?: string
  /** If set, fenced code blocks with this language become widget placeholders */
  codeBlockLang?: string
  /**
   * JSON Schema describing the spec fields this widget accepts.
   * Agents use this to generate correct specs without guessing.
   * Also used for validation before hydration.
   */
  specSchema?: Record<string, any>
  /**
   * Convert code block text into a partial spec object.
   * If omitted, text is parsed as JSON (the standard path).
   *
   * Only use this for text-native widgets (mermaid, katex, html)
   * where the code block content is inherently non-JSON.
   * Custom toSpec functions should still try JSON.parse first
   * and fall back to the raw text format.
   */
  toSpec?: (text: string, position?: number) => Record<string, any>
  /** Function that hydrates the widget into a DOM element */
  hydrate: WidgetHydrator
}
