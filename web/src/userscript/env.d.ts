declare module '*.css?inline' { const css: string; export default css }
declare function GM_getValue<T>(key: string, fallback: T): T
declare function GM_setValue(key: string, value: unknown): void
