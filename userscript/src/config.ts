export const DEFAULT_CONFIG = {
  lrrServerUrl: 'http://localhost:3000',
  lrrApiKey: '',
  lrrConcurrency: 8,
  enableAltSearch: true,
  altSearchConcurrency: 2,
  requestTimeoutMs: 45000,
  searchTimeoutMs: 40000,
  enableLogging: false,
  queueServerUrl: 'http://localhost:29481',
  panelCollapsed: true,
  theme: 'auto',
  redesigned: true,
  density: 'standard',
}
export function gmGet<T>(key: string, fallback: T): T {
  try { return GM_getValue(key, fallback) ?? fallback }
  catch { return fallback }
}
export function gmSet(key: string, value: unknown) {
  try { GM_setValue(key, value) } catch {}
}
export const CONFIG = Object.fromEntries(
  Object.entries(DEFAULT_CONFIG).map(([key, fallback]) => [key, gmGet(key, fallback)]),
) as typeof DEFAULT_CONFIG
