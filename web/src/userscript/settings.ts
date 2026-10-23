export const defaultSettings = {
  lrrServerUrl: '', lrrApiKey: '', queueServerUrl: '', enableAltSearch: true,
  lrrConcurrency: 8, altSearchConcurrency: 2, requestTimeoutMs: 45000,
  searchTimeoutMs: 40000, enableLogging: false,
}
export type Settings = typeof defaultSettings

export function readSettings(): Settings {
  const settings = { ...defaultSettings }
  for (const key of Object.keys(settings) as (keyof Settings)[]) {
    try {
      const value = GM_getValue(key, settings[key])
      if (typeof value === typeof settings[key]) Object.assign(settings, { [key]: value })
    } catch {}
  }
  for (const key of ['lrrConcurrency', 'altSearchConcurrency', 'requestTimeoutMs', 'searchTimeoutMs'] as const) {
    if (!Number.isSafeInteger(settings[key]) || settings[key] < 1) settings[key] = defaultSettings[key]
  }
  return settings
}

export function saveSettings(settings: Settings) {
  for (const key of ['lrrServerUrl', 'queueServerUrl'] as const) {
    if (!settings[key]) continue
    const url = new URL(settings[key])
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('服务地址必须是无用户名、密码、查询参数的 HTTP(S) 地址')
  }
  for (const key of ['lrrConcurrency', 'altSearchConcurrency', 'requestTimeoutMs', 'searchTimeoutMs'] as const) {
    if (!Number.isSafeInteger(settings[key]) || settings[key] < 1) throw new Error('并发数和超时时间必须是正整数')
  }
  for (const [key, value] of Object.entries(settings)) GM_setValue(key, value)
  GM_setValue('lrr-settings-version', 2)
}
