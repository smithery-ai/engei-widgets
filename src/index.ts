// Types — the contract third-party widget authors build against
export type { WidgetPlugin, WidgetHydrator, WidgetSpec } from "./types"

// Registry helpers
export { buildWidgetRegistry, buildLangMap, hydrateWidgets, getDefaultWidgets } from "./registry"

// Built-in widget plugins (included in default registry)
export { chartPlugin } from "./widgets/ChartWidget"
export { mermaidPlugin } from "./widgets/MermaidWidget"
export { diffPlugin } from "./widgets/DiffWidget"
export { globePlugin } from "./widgets/GlobeWidget"
export { katexPlugin } from "./widgets/KatexWidget"
export { tablePlugin } from "./widgets/TableWidget"
export { embedPlugin } from "./widgets/EmbedWidget"
export { excalidrawPlugin } from "./widgets/ExcalidrawWidget"
export { mapPlugin } from "./widgets/MapWidget"
export { timelinePlugin } from "./widgets/TimelineWidget"
export { calendarPlugin } from "./widgets/CalendarWidget"
export { attachmentPlugin } from "./widgets/AttachmentWidget"
export { htmlPlugin } from "./widgets/HtmlWidget"

// Utilities for widget authors
export { loadCDN, escapeHtml } from "./utils"
