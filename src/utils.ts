/** Lazy-load a script from CDN. Caches the promise and checks for a global before loading. */
export function loadCDN(url: string, globalName: string): Promise<void> {
  const key = `__cdn_${globalName}`
  if ((window as any)[key]) return (window as any)[key]
  if ((window as any)[globalName]) {
    return ((window as any)[key] = Promise.resolve())
  }
  return ((window as any)[key] = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = url
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${globalName}`))
    document.head.appendChild(s)
  }))
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
