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
  /** If set, fenced code blocks with this language become widget placeholders */
  codeBlockLang?: string
  /** Convert code block text into a partial spec object. If omitted, text is parsed as JSON. */
  toSpec?: (text: string, position?: number) => Record<string, any>
  /** Function that hydrates the widget into a DOM element */
  hydrate: WidgetHydrator
}
