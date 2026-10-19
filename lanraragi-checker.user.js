// ==UserScript==
// @name         Lanraragi Checker + Panel
// @namespace    https://github.com/slqy123/lrr
// @description  在 ExHentai/E-Hentai 列表页查重 Lanraragi 库并标记，附设置与选品面板
// @match        https://exhentai.org/*
// @match        https://e-hentai.org/*
// @match        https://g.e-hentai.org/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-idle
// @license      MIT
// @version      1.3.5
// @updateURL    https://raw.githubusercontent.com/slqy123/lrr/main/lanraragi-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/slqy123/lrr/main/lanraragi-checker.user.js
// ==/UserScript==
(function() {
	//#region ../userscript/src/config.ts
	var DEFAULT_CONFIG = {
		lrrServerUrl: "http://localhost:3000",
		lrrApiKey: "",
		lrrConcurrency: 8,
		enableAltSearch: true,
		altSearchConcurrency: 2,
		requestTimeoutMs: 45e3,
		searchTimeoutMs: 4e4,
		enableLogging: false,
		queueServerUrl: "http://localhost:29481",
		panelCollapsed: true,
		theme: "auto"
	};
	function gmGet(key, fallback) {
		try {
			return GM_getValue(key, fallback) ?? fallback;
		} catch {
			return fallback;
		}
	}
	function gmSet(key, value) {
		try {
			GM_setValue(key, value);
		} catch {}
	}
	var CONFIG = Object.fromEntries(Object.entries(DEFAULT_CONFIG).map(([key, fallback]) => [key, gmGet(key, fallback)]));
	//#endregion
	//#region ../userscript/src/gallery.css?inline
	var gallery_default = ".lrr-item-checkbox {\n  appearance: auto !important;\n  position: static !important;\n  opacity: 1 !important;\n  width: 16px !important;\n  height: 16px !important;\n  margin: 0 8px 0 0 !important;\n  accent-color: var(--lrr-accent);\n  cursor: pointer;\n}\n.lrr-item-checkbox:focus-visible, .lrr-marker-span:focus-visible,\n.lrr-hc-btn:focus-visible, .lrr-hc-searchall:focus-visible,\n.lrr-suggest-item:focus-visible {\n  outline: 2px solid var(--lrr-accent);\n  outline-offset: 3px;\n}\n.lrr-check-state {\n  color: var(--lrr-muted);\n  background: var(--lrr-surface);\n}\n[data-lrr-status=missing] > .lrr-check-state,\n[data-lrr-status=checking] > .lrr-check-state,\n[data-lrr-status=downloaded]:has(> .lrr-marker-span) > .lrr-check-state,\n[data-lrr-status=duplicate]:has(> .lrr-marker-span) > .lrr-check-state,\n[data-lrr-status=error]:has(> .lrr-marker-span) > .lrr-check-state {\n  display: none;\n}\n:is([data-lrr-status=queued], [data-lrr-status=downloading], [data-lrr-status=retrying],\n[data-lrr-status=queue-failed], [data-lrr-status=queue-unknown]) > .lrr-marker-span {\n  display: none;\n}\n[data-lrr-status=downloaded] .lrr-check-state { color: var(--lrr-accent); }\n[data-lrr-status=duplicate] .lrr-check-state { color: var(--lrr-duplicate); }\n.lrr-marker-span, .lrr-check-state {\n  box-sizing: border-box;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 20px;\n  margin-right: 6px;\n  padding: 0;\n  flex-shrink: 0;\n  border: 1px solid currentColor;\n  border-radius: 6px;\n  font: 600 12px/1 system-ui, sans-serif;\n  vertical-align: middle;\n  cursor: pointer;\n}\n.lrr-marker-downloaded { color: var(--lrr-accent); background: var(--lrr-accent-soft); }\n.lrr-marker-file { color: var(--lrr-duplicate); background: var(--lrr-duplicate-soft); }\n.lrr-marker-error { color: var(--lrr-muted); background: var(--lrr-surface); }\n.lrr-title-selected {\n  outline: 2px solid var(--lrr-accent);\n  outline-offset: 3px;\n  border-radius: 4px;\n}\n/* Fixed to body: avoids both overflow clipping and inheriting the selected-title color. */\n.lrr-hover-card {\n  position: fixed;\n  z-index: 1000000;\n  min-width: min(320px, calc(100vw - 24px));\n  max-width: min(440px, calc(100vw - 24px));\n  max-height: min(480px, calc(100dvh - 24px));\n  overflow-y: auto;\n  background: var(--lrr-bg);\n  border: 1px solid var(--lrr-line);\n  border-radius: var(--lrr-radius-lg);\n  box-shadow: var(--lrr-shadow);\n  font: var(--lrr-font);\n  color: var(--lrr-text);\n  text-align: left;\n  opacity: 0;\n  visibility: hidden;\n  transform: translateY(-4px);\n  transition: opacity .12s ease, transform .12s ease, visibility .12s;\n}\n.lrr-hover-card.show { opacity: 1; visibility: visible; transform: none; }\n.lrr-hc-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 14px;\n  border-bottom: 1px solid var(--lrr-line);\n  position: sticky;\n  top: 0;\n  background: var(--lrr-bg);\n}\n.lrr-hc-badge {\n  font-size: 11px;\n  font-weight: 600;\n  padding: 3px 8px;\n  border-radius: 6px;\n  background: var(--lrr-accent-soft);\n  color: var(--lrr-accent);\n}\n.lrr-hover-card[data-match=alt] .lrr-hc-badge {\n  background: var(--lrr-duplicate-soft);\n  color: var(--lrr-duplicate);\n}\n.lrr-hover-card[data-match=error] .lrr-hc-badge {\n  background: var(--lrr-error-soft);\n  color: var(--lrr-error);\n}\n.lrr-hc-count, .lrr-hc-meta { font-size: 11px; color: var(--lrr-muted); }\n.lrr-hc-meta { margin-top: 4px; }\n.lrr-hc-item { display: flex; gap: 12px; padding: 14px; border-bottom: 1px solid var(--lrr-line); }\n.lrr-hc-item:last-child { border-bottom: none; }\n.lrr-hc-thumb {\n  width: 56px;\n  height: 80px;\n  flex-shrink: 0;\n  overflow: hidden;\n  border: 1px solid var(--lrr-line);\n  border-radius: var(--lrr-radius);\n  background: var(--lrr-surface);\n}\n.lrr-hc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }\n.lrr-hc-info { flex: 1; min-width: 0; }\n.lrr-hc-title {\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--lrr-text);\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n  overflow-wrap: anywhere;\n}\n.lrr-hc-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }\n.lrr-hc-tag {\n  font-size: 11px;\n  padding: 2px 6px;\n  border: 1px solid var(--lrr-line);\n  border-radius: 6px;\n  background: var(--lrr-surface);\n  color: var(--lrr-muted);\n}\n.lrr-hc-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }\n.lrr-hc-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 10px;\n  border: 1px solid var(--lrr-line);\n  border-radius: var(--lrr-radius);\n  font-size: 12px;\n  font-weight: 500;\n  text-decoration: none !important;\n}\n.lrr-hc-btn-read { background: var(--lrr-accent); border-color: var(--lrr-accent); color: var(--lrr-on-accent) !important; }\n.lrr-hc-btn-read:hover { background: var(--lrr-accent-hover); border-color: var(--lrr-accent-hover); }\n.lrr-hc-btn-edit { background: var(--lrr-bg); color: var(--lrr-text) !important; }\n.lrr-hc-btn-edit:hover { background: var(--lrr-surface); }\n.lrr-hc-footer { padding: 12px 14px; border-top: 1px solid var(--lrr-line); }\n.lrr-hc-searchall { font-size: 12px; color: var(--lrr-accent) !important; text-decoration: none; }\n.lrr-hc-searchall:hover { text-decoration: underline; }\n#lrr-search-suggest {\n  position: absolute;\n  top: 100%;\n  left: 0;\n  z-index: 100000;\n  min-width: min(240px, calc(100vw - 24px));\n  max-width: calc(100vw - 24px);\n  box-sizing: border-box;\n  margin-top: 8px;\n  padding: 14px;\n  background: var(--lrr-bg);\n  border: 1px solid var(--lrr-line);\n  border-radius: var(--lrr-radius-lg);\n  box-shadow: var(--lrr-shadow);\n  color: var(--lrr-text);\n  font: var(--lrr-font);\n  opacity: 0;\n  visibility: hidden;\n  transform: translateY(-4px);\n  transition: opacity .12s ease, transform .12s ease, visibility .12s;\n}\n#lrr-search-suggest.open { opacity: 1; visibility: visible; transform: none; }\n.lrr-suggest-group { margin-bottom: 14px; }\n.lrr-suggest-group:last-child { margin-bottom: 0; }\n.lrr-suggest-label { margin-bottom: 8px; color: var(--lrr-muted); font-size: 11px; font-weight: 600; }\n.lrr-suggest-items { display: flex; flex-wrap: wrap; gap: 8px; }\n.lrr-suggest-item {\n  padding: 6px 10px;\n  background: var(--lrr-bg);\n  border: 1px solid var(--lrr-line);\n  border-radius: var(--lrr-radius);\n  color: var(--lrr-text);\n  font: inherit;\n  font-size: 12px;\n  cursor: pointer;\n  transition: background .12s ease, border-color .12s ease, color .12s ease;\n}\n.lrr-suggest-item:hover { border-color: var(--lrr-accent); background: var(--lrr-accent-soft); color: var(--lrr-accent); }\n.lrr-suggest-item.active { background: var(--lrr-accent); border-color: var(--lrr-accent); color: var(--lrr-on-accent); }\n@media (prefers-reduced-motion: reduce) {\n  .lrr-hover-card, #lrr-search-suggest, .lrr-suggest-item { transition: none; transform: none; }\n}\n";
	//#endregion
	//#region ../userscript/src/theme.css?inline
	var theme_default = "html, :host {\n  --lrr-bg: #ffffff;\n  --lrr-surface: #f3f5f3;\n  --lrr-text: #252925;\n  --lrr-muted: #616961;\n  --lrr-line: #d7ded7;\n  --lrr-accent: #287a42;\n  --lrr-accent-hover: #206535;\n  --lrr-on-accent: #ffffff;\n  --lrr-accent-soft: #e8f3eb;\n  --lrr-duplicate: #7851aa;\n  --lrr-duplicate-soft: #f1eafa;\n  --lrr-warning: #825d15;\n  --lrr-warning-soft: #fbf2dd;\n  --lrr-error: #b52d3d;\n  --lrr-error-soft: #fbecef;\n  --lrr-radius: 8px;\n  --lrr-radius-lg: 14px;\n  --lrr-shadow: 0 8px 28px #0000001f;\n  --lrr-font: 13px/1.5 system-ui, sans-serif;\n}\nhtml[data-lrr-theme=dark], :host([data-theme=dark]) {\n  --lrr-bg: #242624;\n  --lrr-surface: #2d302d;\n  --lrr-text: #ecefec;\n  --lrr-muted: #adb5ad;\n  --lrr-line: #454c45;\n  --lrr-accent: #82cc95;\n  --lrr-accent-hover: #a0ddb0;\n  --lrr-on-accent: #142d1b;\n  --lrr-accent-soft: #293d2e;\n  --lrr-duplicate: #c5a3ee;\n  --lrr-duplicate-soft: #382e44;\n  --lrr-warning: #e4be70;\n  --lrr-warning-soft: #413823;\n  --lrr-error: #f39da7;\n  --lrr-error-soft: #442d32;\n  --lrr-shadow: 0 8px 28px #0000004d;\n}\n";
	//#endregion
	//#region ../userscript/src/state.ts
	var galleries = /* @__PURE__ */ new Map();
	var labels = {
		checking: "检查中",
		downloaded: "已入库",
		duplicate: "疑似重复",
		missing: "未入库",
		error: "检查失败",
		queued: "待下载",
		downloading: "下载中",
		retrying: "等待重试",
		"queue-failed": "下载失败",
		"queue-unknown": "队列查询失败"
	};
	var symbols = {
		checking: "…",
		downloaded: "✓",
		duplicate: "≃",
		missing: "−",
		error: "!",
		queued: "◷",
		downloading: "↓",
		retrying: "↻",
		"queue-failed": "!",
		"queue-unknown": "?"
	};
	function notify() {
		document.dispatchEvent(new Event("lrr:state"));
	}
	function setStatus(title, status) {
		const gallery = [...galleries.values()].find((item) => item.title === title);
		if (!gallery) return;
		gallery.libraryStatus = status;
		if (status !== "downloaded" && status !== "checking") status = gallery.queueStatus ?? status;
		gallery.status = status;
		title.dataset.lrrStatus = status;
		let badge = title.querySelector(".lrr-check-state");
		if (!badge) {
			badge = document.createElement("span");
			badge.className = "lrr-check-state";
			title.prepend(badge);
		}
		badge.textContent = symbols[status];
		badge.title = labels[status] + (gallery.queueStatus === status && gallery.queueDetail ? "\n" + gallery.queueDetail : "");
		badge.setAttribute("aria-label", badge.title);
		notify();
	}
	function setQueueStatus(url, status, detail) {
		const gallery = galleries.get(url);
		if (!gallery) return;
		gallery.queueStatus = status;
		gallery.queueDetail = detail;
		setStatus(gallery.title, gallery.libraryStatus ?? "checking");
	}
	function collect() {
		document.querySelectorAll(".itg .gl1t a[href*=\"/g/\"]").forEach((link) => {
			const title = link.querySelector(".glink");
			if (!title || galleries.has(link.href)) return;
			const gallery = {
				url: link.href,
				title,
				selected: false,
				status: "checking"
			};
			galleries.set(link.href, gallery);
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.className = "lrr-item-checkbox";
			checkbox.setAttribute("aria-label", "选择画廊");
			checkbox.addEventListener("click", (event) => event.stopPropagation());
			checkbox.addEventListener("change", () => {
				gallery.selected = checkbox.checked;
				title.classList.toggle("lrr-title-selected", checkbox.checked);
				notify();
			});
			title.prepend(checkbox);
			setStatus(title, "checking");
		});
	}
	function select(predicate) {
		for (const gallery of galleries.values()) {
			gallery.selected = predicate(gallery);
			const checkbox = gallery.title.querySelector(".lrr-item-checkbox");
			if (checkbox) checkbox.checked = gallery.selected;
			gallery.title.classList.toggle("lrr-title-selected", gallery.selected);
		}
		notify();
	}
	//#endregion
	//#region ../userscript/src/ui.css?inline
	var ui_default = ":host {\n  --bg:var(--lrr-bg);\n  --surface:var(--lrr-surface);\n  --text:var(--lrr-text);\n  --muted:var(--lrr-muted);\n  --line:var(--lrr-line);\n  --accent:var(--lrr-accent);\n  --on-accent:var(--lrr-on-accent);\n  --error:var(--lrr-error);\n  color-scheme:light;\n  font:var(--lrr-font);\n  color:var(--text)\n}\n:host([data-theme=dark]) {\n  color-scheme:dark\n}\n* {\n  box-sizing:border-box\n}\nbutton,input,select {\n  font:inherit\n}\nbutton {\n  display:inline-flex;\n  align-items:center;\n  justify-content:center;\n  gap:8px;\n  border:1px solid var(--line);\n  border-radius:8px;\n  background:var(--bg);\n  color:var(--text);\n  padding:9px 12px;\n  cursor:pointer\n}\nbutton:hover {\n  background:var(--surface)\n}\nbutton.primary:hover:not(:disabled) {\n  background:var(--lrr-accent-hover);\n  border-color:var(--lrr-accent-hover)\n}\nbutton:disabled {\n  opacity:.45;\n  cursor:default\n}\nbutton:focus-visible,input:focus-visible,select:focus-visible {\n  outline:2px solid var(--accent);\n  outline-offset:3px\n}\nbutton.primary {\n  background:var(--accent);\n  color:var(--on-accent);\n  border-color:var(--accent)\n}\nsvg {\n  flex:none\n}\nsmall,.hint {\n  color:var(--muted)\n}\nsmall {\n  font-size:12px;\n  font-weight:400;\n  margin-left:8px\n}\n[hidden] {\n  display:none!important\n}\n.launcher {\n  position:fixed;\n  right:16px;\n  bottom:16px;\n  z-index:2147483000;\n  box-shadow:var(--lrr-shadow)\n}\n.panel {\n  position:fixed;\n  right:16px;\n  bottom:72px;\n  width:340px;\n  max-width:calc(100vw - 32px);\n  max-height:calc(100dvh - 96px);\n  overflow:auto;\n  background:var(--bg);\n  border:1px solid var(--line);\n  border-radius:14px;\n  box-shadow:var(--lrr-shadow);\n  z-index:2147483000;\n  animation:appear .14s ease-out\n}\nheader,footer {\n  display:flex;\n  align-items:center;\n  justify-content:space-between;\n  gap:8px;\n  padding:14px 16px\n}\nheader {\n  border-bottom:1px solid var(--line)\n}\nheader button {\n  border:0;\n  padding:6px\n}\nsection {\n  padding:16px\n}\n.summary {\n  font-size:18px;\n  font-weight:650;\n  font-variant-numeric:tabular-nums\n}\n.hint {\n  font-size:12px;\n  margin:8px 0 12px\n}\n.choices {\n  display:grid;\n  grid-template-columns:1fr 1fr;\n  gap:8px\n}\n.counts {\n  display:flex;\n  flex-wrap:wrap;\n  gap:6px 12px;\n  color:var(--muted);\n  font-size:12px\n}\n.actions {\n  display:grid;\n  gap:8px;\n  border-top:1px solid var(--line)\n}\n.feedback {\n  margin:0;\n  padding:0 16px 12px;\n  overflow-wrap:anywhere\n}\n.feedback:empty {\n  display:none\n}\n.error,.settings-error {\n  color:var(--error)\n}\nfooter {\n  border-top:1px solid var(--line);\n  flex-wrap:wrap\n}\nfooter button {\n  font-size:12px;\n  padding:7px 9px\n}\ndialog {\n  color:var(--text);\n  background:var(--bg);\n  border:1px solid var(--line);\n  border-radius:14px;\n  padding:0;\n  width:520px;\n  max-width:calc(100vw - 32px);\n  max-height:calc(100dvh - 32px);\n  box-shadow:var(--lrr-shadow)\n}\ndialog::backdrop {\n  background:#0007\n}\n.fields {\n  padding:16px;\n  display:grid;\n  gap:20px\n}\nfieldset {\n  border:0;\n  padding:0;\n  margin:0;\n  display:grid;\n  gap:12px\n}\nlegend {\n  font-weight:650;\n  margin-bottom:12px\n}\nlabel {\n  display:grid;\n  gap:6px;\n  font-size:13px\n}\nlabel:has(input[type=checkbox]) {\n  display:flex;\n  align-items:center;\n  justify-content:space-between\n}\ninput:not([type=checkbox]),select {\n  width:100%;\n  min-width:0;\n  border:1px solid var(--line);\n  border-radius:7px;\n  padding:9px;\n  background:var(--surface);\n  color:var(--text)\n}\ninput[type=checkbox] {\n  accent-color:var(--accent);\n  width:17px;\n  height:17px\n}\n.settings-error {\n  padding:0 16px\n}\ndialog footer {\n  justify-content:flex-end\n}\n@keyframes appear {\n  from {\n    opacity:0;\n    transform:translateY(4px)\n  }\n  to {\n    opacity:1;\n    transform:none\n  }\n}\n@media(prefers-reduced-motion:reduce) {\n  * {\n    animation:none!important;\n    transition:none!important\n  }\n}\n";
	//#endregion
	//#region ../userscript/src/panel.ts
	var paths = {
		menu: "M4 6h16M4 12h16M4 18h16",
		close: "m6 6 12 12M6 18 18 6",
		send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
		copy: "M9 9h12v12H9zM15 9V3H3v12h6",
		settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
		external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
		refresh: "M20 7a9 9 0 1 0 1 9M20 2v6h-6"
	};
	function icon(name) {
		return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/></svg>`;
	}
	function mountPanel(options) {
		const { config, defaults, persist } = options;
		const host = document.createElement("div");
		host.id = "lrr-tools";
		document.body.append(host);
		const root = host.attachShadow({ mode: "open" });
		root.innerHTML = `<style>${theme_default}\n${ui_default}</style>
    <button class="launcher" aria-label="打开 LRR 工具" aria-expanded="false">${icon("menu")} LRR <span id="launcher-count"></span></button>
    <aside class="panel" aria-label="LRR 画廊工具" hidden>
      <header><strong>LRR <small>画廊工具</small></strong><button data-action="close" aria-label="关闭面板">${icon("close")}</button></header>
      <section><div class="summary" aria-live="polite"></div><p class="hint">按状态替换选择，也可在画廊上逐项勾选。</p>
        <div class="choices"><button data-select="missing">选择未入库</button><button data-select="duplicate">选择疑似重复</button><button data-select="all">全选</button><button data-select="none">清空</button></div>
        <p class="scope hint"></p><div class="counts"></div>
      </section>
      <section class="actions"><button class="primary" data-action="send">${icon("send")}发送到队列</button><button data-action="copy">${icon("copy")}复制链接</button></section>
      <p class="feedback" role="status" aria-live="polite"></p>
      <footer><button data-action="recheck">${icon("refresh")}重新检查</button><button data-action="settings">${icon("settings")}设置</button><button data-action="backend">${icon("external")}后台</button></footer>
    </aside>
    <dialog aria-labelledby="settings-title"><form><header><strong id="settings-title">设置</strong><button type="button" data-action="cancel" aria-label="关闭设置">${icon("close")}</button></header><div class="fields"></div><p class="settings-error" role="alert"></p><footer><button type="button" data-action="reset">恢复默认</button><button type="button" data-action="cancel">取消</button><button class="primary" type="submit">保存并重新检查</button></footer></form></dialog>`;
		const get = (selector) => root.querySelector(selector);
		const panel = get(".panel");
		const launcher = get(".launcher");
		const dialog = get("dialog");
		let sending = false;
		let baseline = "";
		const feedback = (message, error = false) => {
			get(".feedback").textContent = message;
			get(".feedback").classList.toggle("error", error);
		};
		function theme() {
			const mode = String(config.theme || "auto");
			host.dataset.theme = mode === "auto" ? location.hostname === "exhentai.org" ? "dark" : "light" : mode;
			document.documentElement.dataset.lrrTheme = host.dataset.theme;
		}
		function expanded(open) {
			const wasOpen = !panel.hidden;
			panel.hidden = !open;
			launcher.setAttribute("aria-expanded", String(open));
			config.panelCollapsed = !open;
			persist("panelCollapsed", !open);
			if (!open && wasOpen) launcher.focus();
		}
		const queueStatuses = /* @__PURE__ */ new Set([
			"queued",
			"downloading",
			"retrying",
			"queue-failed"
		]);
		function render() {
			const items = [...galleries.values()];
			const count = items.filter((item) => item.selected).length;
			get(".summary").textContent = `已选 ${count} / ${items.length} 个画廊`;
			get("#launcher-count").textContent = count ? String(count) : "";
			get(".scope").textContent = config.enableAltSearch ? "未入库：URL 与可提取标题均无匹配；未知与失败不计入。" : "未入库仅表示 URL 未命中；标题搜索已关闭。";
			const counts = Object.entries(labels).filter(([status]) => !queueStatuses.has(status));
			counts.push(["queue", "在队列中"]);
			get(".counts").replaceChildren(...counts.map(([status, label]) => {
				const span = document.createElement("span");
				span.textContent = `${label} ${items.filter((item) => status === "queue" ? queueStatuses.has(item.status) : item.status === status).length}`;
				return span;
			}));
			get("[data-action=\"send\"]").disabled = sending || count === 0;
			get("[data-action=\"copy\"]").disabled = count === 0;
		}
		const groups = [
			["连接", [
				[
					"lrrServerUrl",
					"LANraragi 地址",
					"url"
				],
				[
					"lrrApiKey",
					"API Key",
					"password"
				],
				[
					"queueServerUrl",
					"队列服务器地址",
					"url"
				]
			]],
			["检查行为", [
				[
					"enableAltSearch",
					"备用标题搜索",
					"checkbox"
				],
				[
					"lrrConcurrency",
					"URL 检查并发数",
					"number"
				],
				[
					"altSearchConcurrency",
					"标题搜索并发数",
					"number"
				]
			]],
			["高级", [
				[
					"requestTimeoutMs",
					"URL 请求超时（毫秒）",
					"number"
				],
				[
					"searchTimeoutMs",
					"标题搜索超时（毫秒）",
					"number"
				],
				[
					"enableLogging",
					"控制台日志",
					"checkbox"
				]
			]]
		];
		function fill(values) {
			const fields = get(".fields");
			fields.replaceChildren();
			for (const [name, entries] of groups) {
				const group = document.createElement("fieldset");
				const legend = document.createElement("legend");
				legend.textContent = name;
				group.append(legend);
				for (const [key, text, type] of entries) {
					const label = document.createElement("label");
					label.textContent = text;
					const input = document.createElement("input");
					input.name = key;
					input.type = type;
					if (type === "checkbox") input.checked = Boolean(values[key]);
					else input.value = String(values[key]);
					if (type === "number") {
						input.required = true;
						input.min = key.endsWith("Ms") ? "1000" : "1";
						input.step = "1";
					}
					if (type === "url") {
						input.required = true;
						input.pattern = "https?://.+";
					}
					input.autocomplete = "off";
					label.append(input);
					group.append(label);
				}
				fields.append(group);
			}
			const label = document.createElement("label");
			label.textContent = "外观";
			const select = document.createElement("select");
			select.name = "theme";
			for (const [value, text] of [
				["auto", "随站点"],
				["light", "浅色"],
				["dark", "深色"]
			]) {
				const option = new Option(text, value);
				select.append(option);
			}
			select.value = String(values.theme || "auto");
			label.append(select);
			fields.append(label);
		}
		const snapshot = () => JSON.stringify([...get("form").elements].filter((item) => item instanceof HTMLInputElement || item instanceof HTMLSelectElement).map((item) => [item.name, item instanceof HTMLInputElement && item.type === "checkbox" ? item.checked : item.value]));
		function cancelSettings() {
			if (snapshot() !== baseline && !confirm("放弃未保存的设置？")) return;
			dialog.close();
		}
		launcher.addEventListener("click", () => expanded(Boolean(panel.hidden)));
		root.addEventListener("click", async (event) => {
			const button = event.target.closest("button");
			if (!button) return;
			const choice = button.dataset.select;
			if (choice) select((item) => choice === "all" || item.status === choice);
			const action = button.dataset.action;
			if (action === "close") expanded(false);
			if (action === "settings") {
				fill(config);
				baseline = snapshot();
				get(".settings-error").textContent = "";
				dialog.showModal();
			}
			if (action === "cancel") cancelSettings();
			if (action === "reset" && confirm("将表单恢复默认？保存后生效。")) fill(defaults);
			if (action === "backend") window.open(String(config.queueServerUrl), "_blank", "noopener");
			if (action === "recheck") {
				options.recheck();
				feedback("已重新检查当前页");
			}
			const selected = [...galleries.values()].filter((item) => item.selected);
			if (action === "copy") try {
				options.copy(selected.map((item) => item.url).join("\n"));
				feedback(`已复制 ${selected.length} 条链接`);
			} catch {
				feedback("复制失败，请重试", true);
			}
			if (action === "send" && !sending && selected.length) {
				sending = true;
				render();
				feedback("正在发送…");
				try {
					const result = await options.send(selected.map((item) => item.url));
					const sent = new Set(selected);
					select((item) => !sent.has(item) && item.selected);
					feedback(`新增 ${result.added} 条，已存在 ${result.duplicates} 条`);
				} catch (error) {
					feedback(`发送失败：${error instanceof Error ? error.message : "请重试"}，选择已保留`, true);
				} finally {
					sending = false;
					render();
				}
			}
		});
		get("form").addEventListener("submit", (event) => {
			event.preventDefault();
			const form = get("form");
			if (!form.reportValidity()) return;
			for (const [, entries] of groups) for (const [key, , type] of entries) {
				const input = form.elements.namedItem(key);
				config[key] = type === "checkbox" ? input.checked : type === "number" ? Number(input.value) : input.value.trim().replace(type === "url" ? /\/+$/ : /$^/, "");
				persist(key, config[key]);
			}
			config.theme = form.elements.namedItem("theme").value;
			persist("theme", config.theme);
			theme();
			dialog.close();
			options.recheck();
			feedback("设置已保存，正在重新检查；检查失败可点击重新检查重试");
		});
		dialog.addEventListener("cancel", (event) => {
			event.preventDefault();
			cancelSettings();
		});
		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape" && !dialog.open && !panel.hidden) expanded(false);
		});
		document.addEventListener("lrr:state", render);
		collect();
		theme();
		expanded(!config.panelCollapsed);
		notify();
	}
	//#endregion
	//#region ../userscript/src/checker.js
	var generation = 0;
	function cacheNamespace() {
		return "lrr-checker-v2-" + simpleHash(CONFIG.lrrServerUrl + CONFIG.lrrApiKey) + "-";
	}
	function log(...args) {
		if (CONFIG.enableLogging) console.log("[LRR]", ...args);
	}
	function warn(...args) {
		if (CONFIG.enableLogging) console.warn("[LRR]", ...args);
	}
	GM_addStyle(theme_default + "\n" + gallery_default);
	var CACHE_DURATION = 2592e5;
	var CLEANUP_INTERVAL = 6048e5;
	var MAX_CACHE_ITEMS = 2e3;
	var MUTATION_DEBOUNCE_MS = 400;
	var seenGalleryUrls = /* @__PURE__ */ new Set();
	var altSearchInflight = /* @__PURE__ */ new Map();
	var galleriesToCheck = [];
	function simpleHash(str) {
		let h = 0;
		for (let i = 0; i < str.length; i++) {
			h = (h << 5) - h + str.charCodeAt(i);
			h |= 0;
		}
		return (h >>> 0).toString(16);
	}
	function createPool(limit) {
		let active = 0;
		const queue = [];
		function runNext() {
			if (active >= limit || queue.length === 0) return;
			const item = queue.shift();
			active++;
			Promise.resolve(item.fn()).then(function(value) {
				active--;
				item.resolve(value);
				runNext();
			}, function(error) {
				active--;
				item.reject(error);
				runNext();
			});
		}
		return function run(fn) {
			return new Promise(function(resolve, reject) {
				queue.push({
					fn,
					resolve,
					reject
				});
				runNext();
			});
		};
	}
	var runAltSearchLimited = createPool(CONFIG.altSearchConcurrency);
	function getCache(key) {
		if (generation > 0) return null;
		key = cacheNamespace() + key;
		const cached = localStorage.getItem(key);
		if (!cached) return null;
		try {
			const parsed = JSON.parse(cached);
			if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) return parsed.data;
		} catch (e) {
			warn("Corrupted cache for " + key + ", removing");
			localStorage.removeItem(key);
		}
		return null;
	}
	function setCache(key, data) {
		key = cacheNamespace() + key;
		const item = {
			timestamp: Date.now(),
			data: minimizeCacheData(data)
		};
		try {
			localStorage.setItem(key, JSON.stringify(item));
		} catch (e) {
			if (!isQuotaExceeded(e)) {
				warn("Error setting cache", e);
				return;
			}
			warn("Cache quota exceeded, cleaning up");
			cleanupExpiredCache();
			try {
				localStorage.setItem(key, JSON.stringify(item));
				return;
			} catch (e2) {
				if (enforceMaxCacheItems() === 0) purgeOldest(25);
				try {
					localStorage.setItem(key, JSON.stringify(item));
				} catch (e3) {
					warn("Cache write failed even after cleanup", e3);
				}
			}
		}
	}
	function minimizeCacheData(original) {
		try {
			if (typeof original === "object" && original && typeof original.altHit === "boolean") {
				const altOut = { altHit: original.altHit };
				if (original.altHits) altOut.altHits = original.altHits;
				return altOut;
			}
			const out = {};
			if (typeof original === "object" && original) {
				if ("success" in original) out.success = original.success;
				if (original.error) out.error = original.error;
				if (original.data) {
					const d = original.data;
					out.data = {};
					if (d.id !== void 0) out.data.id = d.id;
					if (d.arcid !== void 0) out.data.arcid = d.arcid;
					if (d.title) out.data.title = d.title;
					if (d.tags) out.data.tags = d.tags;
					if (d.pagecount !== void 0) out.data.pagecount = d.pagecount;
					if (d.filesize !== void 0) out.data.filesize = d.filesize;
				}
			}
			return out;
		} catch (_) {
			return original;
		}
	}
	function isQuotaExceeded(error) {
		return error && (error.name === "QuotaExceededError" || error.code === 22);
	}
	function listCacheEntries() {
		const entries = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith("lrr-checker-")) try {
				const parsed = JSON.parse(localStorage.getItem(key));
				entries.push({
					key,
					timestamp: parsed && parsed.timestamp ? parsed.timestamp : 0
				});
			} catch (_) {
				entries.push({
					key,
					timestamp: 0
				});
			}
		}
		return entries;
	}
	function purgeOldest(count) {
		const entries = listCacheEntries().sort(function(a, b) {
			return a.timestamp - b.timestamp;
		});
		let removed = 0;
		for (let i = 0; i < entries.length && removed < count; i++) {
			localStorage.removeItem(entries[i].key);
			removed++;
		}
		return removed;
	}
	function enforceMaxCacheItems() {
		const entries = listCacheEntries();
		if (entries.length > MAX_CACHE_ITEMS) return purgeOldest(entries.length - MAX_CACHE_ITEMS);
		return 0;
	}
	function cleanupExpiredCache() {
		const lastCleanup = localStorage.getItem("lrr-cache-last-cleanup");
		const now = Date.now();
		if (lastCleanup && now - parseInt(lastCleanup, 10) <= CLEANUP_INTERVAL) return;
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith("lrr-checker-")) try {
				if (now - JSON.parse(localStorage.getItem(key)).timestamp > CACHE_DURATION) {
					localStorage.removeItem(key);
					i--;
				}
			} catch (e) {}
		}
		localStorage.setItem("lrr-cache-last-cleanup", now.toString());
	}
	function getGalleryTitlePlain(titleElement) {
		const clone = titleElement.cloneNode(true);
		clone.querySelectorAll(".lrr-marker-span, .lrr-check-state, .lrr-item-checkbox").forEach(function(el) {
			el.remove();
		});
		return clone.textContent.replace(/\s+/g, " ").trim();
	}
	function hasLrrMarker(titleElement) {
		return !!(titleElement && titleElement.querySelector(".lrr-marker-span"));
	}
	function pickArchive(data) {
		return {
			id: data.id || data.arcid || "",
			title: data.title || "",
			tags: data.tags || "",
			pagecount: data.pagecount || 0,
			filesize: data.filesize || 0
		};
	}
	function formatLrrSize(bytes) {
		if (!bytes) return "";
		if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
		if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
		if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
		return bytes + " B";
	}
	function buildHoverCard(matchType, hits, searchQuery) {
		const card = document.createElement("div");
		card.className = "lrr-hover-card";
		card.dataset.match = matchType;
		const header = document.createElement("div");
		header.className = "lrr-hc-header";
		const badge = document.createElement("span");
		badge.className = "lrr-hc-badge";
		badge.textContent = matchType === "urlfinder" ? "URL 精确匹配" : matchType === "error" ? "请求失败" : "标题搜索";
		const count = document.createElement("span");
		count.className = "lrr-hc-count";
		count.textContent = matchType === "error" ? "" : hits.length + " 条结果";
		header.appendChild(badge);
		header.appendChild(count);
		card.appendChild(header);
		if (matchType === "error") {
			const item = document.createElement("div");
			item.className = "lrr-hc-item";
			item.textContent = "无法连接或解析 Lanraragi 响应。";
			card.appendChild(item);
			return card;
		}
		hits.forEach(function(hit) {
			const item = document.createElement("div");
			item.className = "lrr-hc-item";
			if (hit.id) {
				const thumb = document.createElement("div");
				thumb.className = "lrr-hc-thumb";
				const img = document.createElement("img");
				img.src = CONFIG.lrrServerUrl + "/api/archivethumbnail?id=" + encodeURIComponent(hit.id);
				img.alt = hit.id;
				img.loading = "lazy";
				img.onerror = function() {
					thumb.remove();
				};
				thumb.appendChild(img);
				item.appendChild(thumb);
			}
			const info = document.createElement("div");
			info.className = "lrr-hc-info";
			const titleDiv = document.createElement("div");
			titleDiv.className = "lrr-hc-title";
			titleDiv.textContent = hit.title || hit.id || "(无标题)";
			titleDiv.title = hit.title || "";
			info.appendChild(titleDiv);
			const metaParts = [];
			if (hit.pagecount) metaParts.push(hit.pagecount + " 页");
			if (hit.filesize) metaParts.push(formatLrrSize(hit.filesize));
			if (hit.id) metaParts.push("ID: " + hit.id.substring(0, 12) + (hit.id.length > 12 ? "..." : ""));
			const meta = document.createElement("div");
			meta.className = "lrr-hc-meta";
			meta.textContent = metaParts.join(" · ");
			info.appendChild(meta);
			if (hit.tags) {
				const tagsDiv = document.createElement("div");
				tagsDiv.className = "lrr-hc-tags";
				hit.tags.split(/[,，]/).filter(function(t) {
					return t.trim();
				}).slice(0, 6).forEach(function(t) {
					const tag = document.createElement("span");
					tag.className = "lrr-hc-tag";
					tag.textContent = t.trim();
					tagsDiv.appendChild(tag);
				});
				info.appendChild(tagsDiv);
			}
			if (hit.id) {
				const actions = document.createElement("div");
				actions.className = "lrr-hc-actions";
				const readBtn = document.createElement("a");
				readBtn.className = "lrr-hc-btn lrr-hc-btn-read";
				readBtn.href = CONFIG.lrrServerUrl + "/reader?id=" + encodeURIComponent(hit.id);
				readBtn.target = "_blank";
				readBtn.rel = "noopener";
				readBtn.textContent = "阅读器";
				const editBtn = document.createElement("a");
				editBtn.className = "lrr-hc-btn lrr-hc-btn-edit";
				editBtn.href = CONFIG.lrrServerUrl + "/edit?id=" + encodeURIComponent(hit.id);
				editBtn.target = "_blank";
				editBtn.rel = "noopener";
				editBtn.textContent = "编辑";
				actions.appendChild(readBtn);
				actions.appendChild(editBtn);
				info.appendChild(actions);
			}
			item.appendChild(info);
			card.appendChild(item);
		});
		if (matchType !== "urlfinder" && searchQuery) {
			const footer = document.createElement("div");
			footer.className = "lrr-hc-footer";
			const searchLink = document.createElement("a");
			searchLink.className = "lrr-hc-searchall";
			searchLink.href = CONFIG.lrrServerUrl + "/?sort=1&sortdir=desc&q=" + encodeURIComponent(searchQuery);
			searchLink.target = "_blank";
			searchLink.rel = "noopener";
			searchLink.textContent = "在 Lanraragi 中查看全部 →";
			footer.appendChild(searchLink);
			card.appendChild(footer);
		}
		return card;
	}
	var activeHoverCard = null;
	var hoverHideTimer = null;
	function showHoverCard(marker, card) {
		cancelHide();
		if (activeHoverCard && activeHoverCard !== card) activeHoverCard.classList.remove("show");
		activeHoverCard = card;
		if (!card.isConnected) document.body.appendChild(card);
		card.classList.add("show");
		const rect = marker.getBoundingClientRect();
		const width = card.offsetWidth;
		const height = card.offsetHeight;
		let top = rect.bottom + 4;
		if (top + height > window.innerHeight) top = Math.max(4, rect.top - height - 4);
		const left = Math.max(4, Math.min(rect.left, window.innerWidth - width - 4));
		card.style.left = left + "px";
		card.style.top = top + "px";
	}
	function scheduleHide() {
		clearTimeout(hoverHideTimer);
		hoverHideTimer = setTimeout(function() {
			if (activeHoverCard) activeHoverCard.classList.remove("show");
			activeHoverCard = null;
		}, 250);
	}
	function cancelHide() {
		clearTimeout(hoverHideTimer);
	}
	window.addEventListener("scroll", function(e) {
		if (activeHoverCard && !activeHoverCard.contains(e.target)) {
			activeHoverCard.classList.remove("show");
			activeHoverCard = null;
		}
	}, true);
	function prependLrrMarker(titleElement, text, classNames, matchType, hits, searchQuery) {
		if (!titleElement || hasLrrMarker(titleElement)) return;
		setStatus(titleElement, matchType === "urlfinder" ? "downloaded" : matchType === "alt" ? "duplicate" : "error");
		hits = hits || [];
		const markerSpan = document.createElement("span");
		markerSpan.classList.add("lrr-marker-span");
		classNames.forEach(function(c) {
			markerSpan.classList.add(c);
		});
		markerSpan.textContent = matchType === "urlfinder" ? "✓" : matchType === "alt" ? "≃" : "!";
		markerSpan.title = matchType === "urlfinder" ? "已入库" : matchType === "alt" ? "疑似重复" : "检查失败";
		markerSpan.addEventListener("click", function(e) {
			e.preventDefault();
			e.stopPropagation();
			if (matchType === "alt" && searchQuery) window.open(CONFIG.lrrServerUrl + "/?sort=1&sortdir=desc&q=" + encodeURIComponent(searchQuery), "_blank");
			else if (hits.length > 0 && hits[0].id) window.open(CONFIG.lrrServerUrl + "/reader?id=" + encodeURIComponent(hits[0].id), "_blank");
		});
		const card = buildHoverCard(matchType, hits, searchQuery);
		markerSpan.addEventListener("mouseenter", function() {
			showHoverCard(markerSpan, card);
		});
		markerSpan.addEventListener("mouseleave", scheduleHide);
		card.addEventListener("mouseenter", cancelHide);
		card.addEventListener("mouseleave", scheduleHide);
		titleElement.prepend(markerSpan);
	}
	function getAuthorizationHeaderValue(apiKey) {
		if (!apiKey) return "";
		try {
			return "Bearer " + btoa(apiKey);
		} catch (e) {
			return "";
		}
	}
	function isUrlfinderHit(result) {
		if (!result) return false;
		if (result.success === 1 || result.success === true) return true;
		const data = result.data;
		return !!(data && (typeof data.id === "string" && data.id || typeof data.arcid === "string" && data.arcid));
	}
	function delay(ms) {
		return new Promise(function(resolve) {
			setTimeout(resolve, ms);
		});
	}
	function makeRequest(options) {
		return new Promise(function(resolve, reject) {
			GM_xmlhttpRequest({
				method: options.method,
				url: options.url,
				headers: options.headers || {},
				data: options.data,
				timeout: options.timeout != null ? options.timeout : CONFIG.requestTimeoutMs,
				onload: function(response) {
					if (!(typeof options.validateStatus === "function" ? options.validateStatus(response.status) : response.status >= 200 && response.status < 300)) {
						reject(/* @__PURE__ */ new Error("HTTP " + response.status + " " + (response.statusText || "")));
						return;
					}
					resolve(response);
				},
				onerror: function(error) {
					reject(error || /* @__PURE__ */ new Error("Network error"));
				},
				ontimeout: function() {
					reject(/* @__PURE__ */ new Error("Request timeout"));
				},
				onabort: function() {
					reject(/* @__PURE__ */ new Error("Request aborted"));
				}
			});
		});
	}
	async function processInBatches(items, processFn, batchSize) {
		const results = [];
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const batchResults = await Promise.all(batch.map(processFn));
			results.push.apply(results, batchResults);
		}
		return results;
	}
	async function processGallery(gallery) {
		if (gallery.generation !== generation) return;
		const requestGeneration = generation;
		const headers = {};
		if (CONFIG.lrrApiKey) headers["Authorization"] = getAuthorizationHeaderValue(CONFIG.lrrApiKey);
		const apiUrl = CONFIG.lrrServerUrl + "/api/plugins/use?plugin=urlfinder&arg=" + encodeURIComponent(gallery.galleryUrl);
		try {
			const response = await makeRequest({
				method: "POST",
				url: apiUrl,
				headers
			});
			try {
				const result = JSON.parse(response.responseText);
				if (requestGeneration !== generation) return;
				setCache(gallery.cacheKey, result);
				handleResponse(result, gallery.titleElement, gallery.galleryUrl);
				return {
					success: true,
					galleryUrl: gallery.galleryUrl
				};
			} catch (e) {
				if (requestGeneration !== generation) return;
				warn("Error parsing JSON for " + gallery.galleryUrl, e);
				prependLrrMarker(gallery.titleElement, "(LRR ❓)", ["lrr-marker-error"], "error", [], null);
				return {
					success: false,
					galleryUrl: gallery.galleryUrl,
					error: e
				};
			}
		} catch (error) {
			if (requestGeneration !== generation) return;
			warn("Network error checking " + gallery.galleryUrl, error);
			prependLrrMarker(gallery.titleElement, "(LRR ❓)", ["lrr-marker-error"], "error", [], null);
			return {
				success: false,
				galleryUrl: gallery.galleryUrl,
				error
			};
		}
	}
	async function fetchAltSearchHttp(searchQuery, altKey) {
		const requestGeneration = generation;
		const params = new URLSearchParams();
		params.set("filter", searchQuery);
		params.set("start", "0");
		params.set("groupby_tanks", "false");
		const searchUrl = CONFIG.lrrServerUrl + "/api/search?" + params.toString();
		const headers = {};
		if (CONFIG.lrrApiKey) headers["Authorization"] = getAuthorizationHeaderValue(CONFIG.lrrApiKey);
		const validateStatus = function(status) {
			return status >= 200 && status < 300 || status === 204;
		};
		let response = await makeRequest({
			method: "GET",
			url: searchUrl,
			headers,
			timeout: CONFIG.searchTimeoutMs,
			validateStatus
		});
		if (response.status === 204) {
			warn("GET /api/search returned 204, retrying in 2s");
			await delay(2e3);
			if (requestGeneration !== generation) return {
				hit: false,
				hits: []
			};
			response = await makeRequest({
				method: "GET",
				url: searchUrl,
				headers,
				timeout: CONFIG.searchTimeoutMs,
				validateStatus
			});
		}
		if (response.status === 204) throw new Error("标题搜索尚未就绪，请重试");
		const body = (response.responseText || "").trim();
		if (!body) throw new Error("标题搜索返回空响应");
		const searchResult = JSON.parse(body);
		if (!searchResult || !Array.isArray(searchResult.data)) throw new Error("标题搜索响应格式异常");
		const hasHits = typeof searchResult.recordsFiltered === "number" && searchResult.recordsFiltered > 0 || searchResult.data && searchResult.data.length > 0;
		const altHits = [];
		if (hasHits && searchResult.data) searchResult.data.forEach(function(item) {
			if (item) altHits.push(pickArchive(item));
		});
		if (requestGeneration === generation) setCache(altKey, {
			altHit: hasHits,
			altHits
		});
		return {
			hit: hasHits,
			hits: altHits
		};
	}
	async function performAlternativeSearch(searchQuery, titleElement) {
		if (hasLrrMarker(titleElement)) return {
			success: false,
			skipped: true
		};
		const requestGeneration = generation;
		const altKey = "lrr-checker-alt-" + simpleHash(searchQuery);
		const inflightKey = generation + ":" + searchQuery;
		const cached = getCache(altKey);
		if (cached && typeof cached.altHit === "boolean") {
			if (!cached.altHit) setStatus(titleElement, "missing");
			if (cached.altHit) prependLrrMarker(titleElement, "(LRR！)", ["lrr-marker-file"], "alt", cached.altHits || [], searchQuery);
			return {
				success: cached.altHit,
				cached: true
			};
		}
		if (!altSearchInflight.has(inflightKey)) {
			const p = runAltSearchLimited(function() {
				if (requestGeneration !== generation) return {
					hit: false,
					hits: []
				};
				return fetchAltSearchHttp(searchQuery, altKey);
			});
			altSearchInflight.set(inflightKey, p);
			p.catch(function() {}).finally(function() {
				altSearchInflight.delete(inflightKey);
			});
		}
		try {
			const result = await altSearchInflight.get(inflightKey);
			if (requestGeneration !== generation) return;
			if (!result?.hit) setStatus(titleElement, "missing");
			if (result && result.hit && !hasLrrMarker(titleElement)) prependLrrMarker(titleElement, "(LRR！)", ["lrr-marker-file"], "alt", result.hits || [], searchQuery);
			return { success: result ? result.hit : false };
		} catch (error) {
			if (requestGeneration !== generation) return;
			setStatus(titleElement, "error");
			warn("Network error during /api/search", error);
			return {
				success: false,
				error
			};
		}
	}
	function handleResponse(result, titleElement, galleryUrl) {
		if (hasLrrMarker(titleElement)) return;
		if (!result || result.data?.error && !/url not found/i.test(result.data.error)) {
			prependLrrMarker(titleElement, "(LRR ❓)", ["lrr-marker-error"], "error", [], null);
			return;
		}
		if (isUrlfinderHit(result)) {
			log("Found: " + galleryUrl);
			prependLrrMarker(titleElement, "(LRR ✔)", ["lrr-marker-downloaded"], "urlfinder", result.data ? [pickArchive(result.data)] : [], null);
			return;
		}
		log("Not found: " + galleryUrl);
		if (!CONFIG.enableAltSearch) {
			setStatus(titleElement, "missing");
			return;
		}
		const fullTitle = getGalleryTitlePlain(titleElement);
		const authorMatch = fullTitle.match(/\[((?!汉化|漢化|DL版|中国翻訳)[^\]]+)\]/);
		const author = authorMatch ? authorMatch[1] : null;
		if (!author) {
			setStatus(titleElement, "missing");
			return;
		}
		const titleMatch = fullTitle.match(/\]([^\[\]\(\)]+)/);
		const title = titleMatch ? titleMatch[1].trim() : null;
		if (!title || author === title) {
			setStatus(titleElement, "missing");
			return;
		}
		performAlternativeSearch(author + "," + title, titleElement);
	}
	var queueChecks = /* @__PURE__ */ new Map();
	async function checkQueue(urls, requestGeneration = generation) {
		const request = {};
		const queueUrl = CONFIG.queueServerUrl.replace(/\/$/, "");
		for (let offset = 0; offset < urls.length; offset += 500) {
			if (requestGeneration !== generation) return;
			const batch = urls.slice(offset, offset + 500);
			batch.forEach((url) => queueChecks.set(url, request));
			try {
				const response = await makeRequest({
					method: "POST",
					url: queueUrl + "/api/tasks/lookup",
					headers: { "Content-Type": "application/json" },
					data: JSON.stringify({ urls: batch })
				});
				const result = JSON.parse(response.responseText);
				if (!Array.isArray(result.items)) throw new Error("Invalid queue lookup response");
				if (requestGeneration !== generation) return;
				const tasks = new Map(result.items.map((task) => [task.url, task]));
				for (const url of batch) {
					if (queueChecks.get(url) !== request) continue;
					const task = tasks.get(url);
					const status = task?.status === "pending" ? "queued" : task?.status === "running" ? "downloading" : task?.status === "failed" && task.attempts < task.max_attempts ? "retrying" : task?.status === "failed" || task?.status === "dead" ? "queue-failed" : void 0;
					setQueueStatus(url, status, task ? [
						"尝试次数：" + task.attempts + " / " + task.max_attempts,
						status === "retrying" && task.next_attempt_at ? "计划重试：" + (/* @__PURE__ */ new Date(task.next_attempt_at * 1e3)).toLocaleString() : "",
						task.error ? "最近错误：" + task.error : ""
					].filter(Boolean).join("\n") : void 0);
				}
			} catch (error) {
				if (requestGeneration !== generation) return;
				batch.forEach((url) => {
					if (queueChecks.get(url) === request) setQueueStatus(url, "queue-unknown", "无法查询队列，不代表下载失败。请确认队列服务已更新且地址可达。\n" + queueUrl + "\n" + (error?.message || "网络请求失败"));
				});
				warn("Queue lookup failed", error);
			}
		}
	}
	function collectGalleriesFromDom() {
		collect();
		const queueUrls = [];
		document.querySelectorAll(".itg .gl1t a[href*=\"/g/\"]").forEach(function(linkElement) {
			const galleryUrl = linkElement.href;
			const titleElement = linkElement.querySelector(".glink");
			if (!galleryUrl || !titleElement) return;
			if (seenGalleryUrls.has(galleryUrl)) return;
			seenGalleryUrls.add(galleryUrl);
			queueUrls.push(galleryUrl);
			if (hasLrrMarker(titleElement)) return;
			const cacheKey = "lrr-checker-" + galleryUrl;
			const cachedData = getCache(cacheKey);
			if (cachedData) {
				handleResponse(cachedData, titleElement, galleryUrl);
				return;
			}
			galleriesToCheck.push({
				galleryUrl,
				titleElement,
				cacheKey,
				generation
			});
		});
		if (queueUrls.length) checkQueue(queueUrls);
	}
	function flushPendingRequests() {
		const batch = galleriesToCheck.splice(0, galleriesToCheck.length);
		if (batch.length === 0) return;
		log("Processing " + batch.length + " galleries");
		processInBatches(batch, processGallery, CONFIG.lrrConcurrency);
	}
	var mutationTimer = null;
	function setupChecker() {
		cleanupExpiredCache();
		collectGalleriesFromDom();
		flushPendingRequests();
		const galleryTable = document.querySelector(".itg");
		if (!galleryTable || typeof MutationObserver === "undefined") return;
		new MutationObserver(function() {
			clearTimeout(mutationTimer);
			mutationTimer = setTimeout(function() {
				collectGalleriesFromDom();
				flushPendingRequests();
				collect();
			}, MUTATION_DEBOUNCE_MS);
		}).observe(galleryTable, {
			childList: true,
			subtree: true
		});
	}
	var LANG_TOKENS = ["language:chinese", "language:japanese"];
	function setupSearchSuggest() {
		const input = document.getElementById("f_search");
		if (!input || document.getElementById("lrr-search-suggest")) return;
		const parent = input.parentNode;
		if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
		const box = document.createElement("div");
		box.id = "lrr-search-suggest";
		box.innerHTML = `
        <div class="lrr-suggest-group">
            <div class="lrr-suggest-label">语言</div>
            <div class="lrr-suggest-items">
                <button type="button" class="lrr-suggest-item" data-lang="language:chinese">仅中文</button>
                <button type="button" class="lrr-suggest-item" data-lang="language:japanese">仅日文</button>
            </div>
        </div>
        <div class="lrr-suggest-group">
            <div class="lrr-suggest-label">类型</div>
            <div class="lrr-suggest-items">
                <button type="button" class="lrr-suggest-item" data-cat="256">全年龄</button>
            </div>
        </div>
    `;
		parent.appendChild(box);
		function tokens() {
			return input.value.split(/\s+/).filter(Boolean);
		}
		const ALL_CAT_BITS = [
			1,
			2,
			4,
			8,
			16,
			32,
			64,
			128,
			256,
			512
		];
		const ALL_AGES_BIT = 256;
		const ALL_CATS = ALL_CAT_BITS.reduce(function(sum, bit) {
			return sum | bit;
		}, 0);
		const DEFAULT_EXCLUDE = ALL_AGES_BIT;
		let allAgesBase = null;
		let applyingCats = false;
		function getCats() {
			const el = document.getElementById("f_cats");
			return el ? parseInt(el.value, 10) || 0 : 0;
		}
		function isSelected(bit) {
			return (getCats() & bit) === 0;
		}
		function isExclusive(bit) {
			return isSelected(bit) && (getCats() | bit) === ALL_CATS;
		}
		function setCats(mask) {
			applyingCats = true;
			ALL_CAT_BITS.forEach(function(bit) {
				if ((getCats() & bit) !== 0 === ((mask & bit) !== 0)) return;
				const el = document.getElementById("cat_" + bit);
				if (el) el.click();
			});
			applyingCats = false;
		}
		function updateActive() {
			box.querySelectorAll("[data-lang]").forEach(function(btn) {
				btn.classList.toggle("active", tokens().some(function(t) {
					return t.toLowerCase() === btn.dataset.lang;
				}));
			});
			box.querySelectorAll("[data-cat]").forEach(function(btn) {
				btn.classList.toggle("active", isExclusive(parseInt(btn.dataset.cat, 10)));
			});
		}
		function uniqueTokens() {
			const seen = {};
			return tokens().filter(function(t) {
				const key = t.toLowerCase();
				if (seen[key]) return false;
				seen[key] = true;
				return true;
			});
		}
		function toggleLang(token) {
			const target = token.toLowerCase();
			const current = uniqueTokens();
			const present = current.some(function(t) {
				return t.toLowerCase() === target;
			});
			let next;
			if (present) next = current.filter(function(t) {
				return t.toLowerCase() !== target;
			});
			else {
				next = current.filter(function(t) {
					return LANG_TOKENS.indexOf(t.toLowerCase()) === -1;
				});
				next.push(token);
			}
			input.value = next.join(" ");
		}
		box.addEventListener("mousedown", function(e) {
			e.preventDefault();
		});
		box.addEventListener("click", function(e) {
			const langBtn = e.target.closest("[data-lang]");
			if (langBtn) {
				toggleLang(langBtn.dataset.lang);
				updateActive();
				return;
			}
			const catBtn = e.target.closest("[data-cat]");
			if (catBtn) {
				const bit = parseInt(catBtn.dataset.cat, 10);
				if (isExclusive(bit)) {
					setCats(allAgesBase !== null ? allAgesBase : DEFAULT_EXCLUDE);
					allAgesBase = null;
				} else {
					allAgesBase = getCats();
					setCats(ALL_CATS & ~bit);
				}
				updateActive();
			}
		});
		document.addEventListener("click", function(e) {
			if (applyingCats || allAgesBase === null) return;
			const el = e.target.closest && e.target.closest("[id^=\"cat_\"]");
			if (!el) return;
			const bit = parseInt(el.id.slice(4), 10);
			if (ALL_CAT_BITS.indexOf(bit) === -1) return;
			if ((getCats() & bit) !== 0) allAgesBase |= bit;
			else allAgesBase &= ~bit;
			const base = allAgesBase;
			allAgesBase = null;
			setCats(base);
			updateActive();
		});
		function open() {
			updateActive();
			box.classList.add("open");
		}
		function close() {
			box.classList.remove("open");
		}
		input.addEventListener("focus", open);
		document.addEventListener("mousedown", function(e) {
			if (!box.classList.contains("open")) return;
			if (e.target === input || box.contains(e.target)) return;
			close();
		});
		document.addEventListener("keydown", function(e) {
			if (e.key === "Escape") close();
		});
	}
	function recheck() {
		generation++;
		galleriesToCheck.length = 0;
		seenGalleryUrls.clear();
		altSearchInflight.clear();
		runAltSearchLimited = createPool(CONFIG.altSearchConcurrency);
		for (const gallery of galleries.values()) {
			gallery.title.querySelectorAll(".lrr-marker-span").forEach((marker) => marker.remove());
			setStatus(gallery.title, "checking");
		}
		collectGalleriesFromDom();
		flushPendingRequests();
	}
	function init() {
		mountPanel({
			config: CONFIG,
			defaults: DEFAULT_CONFIG,
			persist: gmSet,
			recheck,
			copy: (text) => GM_setClipboard(text),
			send: async (urls) => {
				const response = await makeRequest({
					method: "POST",
					url: CONFIG.queueServerUrl + "/add",
					headers: { "Content-Type": "application/json" },
					data: JSON.stringify({ urls }),
					timeout: 1e4
				});
				const result = JSON.parse(response.responseText);
				if (!result.ok || !Number.isInteger(result.added) || !Number.isInteger(result.duplicates)) throw new Error(result.error || "服务器响应异常");
				checkQueue(urls);
				return result;
			}
		});
		let pollingQueue = false;
		setInterval(async () => {
			if (document.hidden || pollingQueue) return;
			pollingQueue = true;
			try {
				await checkQueue([...galleries.keys()]);
			} finally {
				pollingQueue = false;
			}
		}, 3e4);
		setupChecker();
		setupSearchSuggest();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
	else init();
	//#endregion
})();
