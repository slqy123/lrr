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
// @version      1.2.3
// @updateURL    https://raw.githubusercontent.com/slqy123/lrr/main/lanraragi-checker.user.js
// @downloadURL  https://raw.githubusercontent.com/slqy123/lrr/main/lanraragi-checker.user.js
// ==/UserScript==

(function () {
    'use strict';

    const DEFAULT_CONFIG = {
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
    };

    function gmGet(key, fallback) {
        try {
            const value = GM_getValue(key, fallback);
            return value === undefined ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function gmSet(key, value) {
        try { GM_setValue(key, value); } catch (e) {}
    }

    const CONFIG = {};
    Object.keys(DEFAULT_CONFIG).forEach(function (key) {
        CONFIG[key] = gmGet(key, DEFAULT_CONFIG[key]);
    });

    function log(...args) { if (CONFIG.enableLogging) console.log('[LRR]', ...args); }
    function warn(...args) { if (CONFIG.enableLogging) console.warn('[LRR]', ...args); }

    GM_addStyle(`
        .lrr-marker-span {
            font-weight: bold;
            border-radius: 3px;
            padding: 0px 3px;
            margin-right: 4px;
            font-size: 0.9em;
            position: relative;
            display: inline-block;
            cursor: pointer;
        }

        .lrr-marker-not-marked { color: #999; background-color: #444; }
        .lrr-marker-downloaded { color: #28a745; background-color: #49995d; }
        .lrr-marker-file { color: #356ddc; background-color: #894ab0; }
        .lrr-marker-error { color: #dc3545; background-color: #fbe9ea; }

        /* Fixed to body: avoids both overflow clipping and inheriting the selected-title color. */
        .lrr-hover-card {
            position: fixed;
            z-index: 1000000;
            min-width: 320px;
            max-width: 440px;
            max-height: 400px;
            overflow-y: auto;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,.6);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 12px;
            font-weight: normal;
            line-height: 1.5;
            color: #ddd;
            text-align: left;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-4px);
            transition: opacity .12s ease, transform .12s ease, visibility .12s;
        }
        .lrr-hover-card.show { opacity: 1; visibility: visible; transform: translateY(0); }

        .lrr-hc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 10px;
            border-bottom: 1px solid #333;
            position: sticky;
            top: 0;
            background: #1a1a1a;
        }

        .lrr-hc-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border: 1px solid #2a5a37;
            border-radius: 4px;
            background: #12251a;
            color: #28a745;
        }

        .lrr-hc-count { font-size: 11px; color: #888; }

        .lrr-hc-item {
            display: flex;
            gap: 10px;
            padding: 8px 10px;
            border-bottom: 1px solid #262626;
        }
        .lrr-hc-item:last-child { border-bottom: none; }

        .lrr-hc-thumb {
            width: 56px;
            height: 80px;
            flex-shrink: 0;
            overflow: hidden;
            border: 1px solid #333;
            border-radius: 4px;
            background: #222;
        }
        .lrr-hc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .lrr-hc-info { flex: 1; min-width: 0; }
        .lrr-hc-title {
            font-size: 12px;
            font-weight: 600;
            color: #eee;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .lrr-hc-meta { font-size: 11px; color: #888; margin-top: 2px; }

        .lrr-hc-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
        .lrr-hc-tag {
            font-size: 10px;
            padding: 1px 5px;
            border: 1px solid #333;
            border-radius: 3px;
            background: #222;
            color: #aaa;
        }

        .lrr-hc-actions { display: flex; gap: 6px; margin-top: 6px; }
        .lrr-hc-btn {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-decoration: none;
        }
        .lrr-hc-btn-read { background: #28a745; color: #fff !important; }
        .lrr-hc-btn-edit { background: #333; color: #ddd !important; }

        .lrr-hc-footer { padding: 6px 10px; text-align: center; border-top: 1px solid #333; }
        .lrr-hc-searchall { font-size: 11px; color: #4a9eff !important; text-decoration: none; }
        .lrr-hc-searchall:hover { text-decoration: underline; }

        .lrr-floating-panel {
            position: fixed;
            right: 12px;
            bottom: 12px;
            box-sizing: border-box;
            width: 260px;
            max-width: calc(100vw - 24px);
            background: #161616;
            color: #ddd;
            border: 1px solid #333;
            border-radius: 10px;
            box-shadow: 0 6px 18px rgba(0,0,0,.5);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.4;
            overflow: hidden;
            transition: left .22s ease, top .22s ease, width .22s ease, border-radius .22s ease, border-color .22s ease, box-shadow .2s ease;
        }
        .lrr-floating-panel.dragging { transition: none; }

        .lrr-panel-header {
            display: flex;
            align-items: center;
            gap: 6px;
            height: 38px;
            padding: 0 10px;
            background: #1e1e1e;
            cursor: move;
            user-select: none;
            transition: background .22s ease, height .22s ease, padding .22s ease;
        }
        .lrr-panel-title { font-weight: 700; font-size: 13px; color: #fff; }
        .lrr-panel-count { margin-left: auto; font-size: 11px; color: #888; }
        .lrr-panel-icon { display: none; align-items: center; justify-content: center; color: #fff; }

        .lrr-panel-body {
            display: grid;
            grid-template-rows: 1fr;
            overflow: hidden;
            transition: grid-template-rows .22s ease;
        }
        .lrr-panel-body-inner {
            box-sizing: border-box;
            min-height: 0;
            max-height: calc(100vh - 64px);
            overflow-y: auto;
            padding: 10px;
            opacity: 1;
            transition: opacity .18s ease;
        }
        .lrr-panel-body-inner::-webkit-scrollbar { width: 6px; }
        .lrr-panel-body-inner::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        .lrr-settings-btn {
            background: transparent;
            border: none;
            color: #aaa;
            font-size: 15px;
            line-height: 1;
            padding: 0 2px;
            cursor: pointer;
            transition: color .15s ease;
        }
        .lrr-settings-btn:hover { color: #fff; }
        .lrr-settings-btn.active { color: #28a745; }

        .lrr-section { margin-bottom: 10px; }
        .lrr-section-title {
            font-size: 11px;
            font-weight: 700;
            color: #aaa;
            text-transform: uppercase;
            letter-spacing: .5px;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #2a2a2a;
        }

        .lrr-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .lrr-row label { display: flex; align-items: center; gap: 6px; flex: 1; cursor: pointer; }
        .lrr-row input[type="text"],
        .lrr-row input[type="number"] {
            flex: 1;
            min-width: 0;
            padding: 3px 6px;
            background: #111;
            border: 1px solid #333;
            border-radius: 4px;
            color: #ddd;
            font-size: 12px;
            font-family: monospace;
        }
        .lrr-row input[type="number"] { max-width: 84px; }
        .lrr-row input[type="checkbox"] { width: 14px; height: 14px; accent-color: #28a745; cursor: pointer; }
        .lrr-row input:focus { outline: none; border-color: #28a745; }

        .lrr-options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
        .lrr-options-grid label { display: flex; align-items: center; gap: 4px; cursor: pointer; }
        .lrr-options-grid input { accent-color: #28a745; }

        .lrr-btn {
            display: block;
            width: 100%;
            margin-top: 6px;
            padding: 6px 10px;
            background: #3a3a3a;
            color: #ddd;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: background .15s ease, transform .1s ease;
        }
        .lrr-btn:hover { background: #454545; }
        .lrr-btn:active { transform: scale(.98); }
        .lrr-btn-primary { background: #28a745; color: #fff; }
        .lrr-btn-primary:hover { background: #2fb350; }
        .lrr-btn-blue { background: #0366d6; color: #fff; }
        .lrr-btn-blue:hover { background: #0a76e8; }

        .lrr-actions { display: flex; gap: 6px; }
        .lrr-actions .lrr-btn { margin-top: 0; }

        .lrr-status { margin-top: 8px; min-height: 16px; font-size: 12px; color: #888; }

        .lrr-floating-panel.collapsed { width: 46px; border-radius: 50%; border-color: #28a745; }
        .lrr-floating-panel.collapsed .lrr-panel-header { height: 44px; padding: 0; justify-content: center; background: #28a745; }
        .lrr-floating-panel.collapsed .lrr-panel-header:hover { background: #2fb350; }
        .lrr-floating-panel.collapsed .lrr-panel-title { display: none; }
        .lrr-floating-panel.collapsed .lrr-panel-count { display: none; }
        .lrr-floating-panel.collapsed .lrr-settings-btn { display: none; }
        .lrr-floating-panel.collapsed .lrr-panel-icon { display: flex; }
        .lrr-floating-panel.collapsed .lrr-panel-body { grid-template-rows: 0fr; }
        .lrr-floating-panel.collapsed .lrr-panel-body-inner { opacity: 0; padding-top: 0; padding-bottom: 0; }

        .lrr-checkbox-wrapper { display: inline-block; margin-right: 4px; line-height: 1; }
        .lrr-item-checkbox { display: none; }
        .lrr-checkbox-label { display: inline-flex; align-items: center; vertical-align: middle; cursor: pointer; }
        .lrr-checkbox-custom {
            display: inline-block;
            width: 1em;
            height: 1em;
            margin-right: 4px;
            border: 1px solid #888;
            border-radius: 2px;
            background-color: #fff;
            vertical-align: -0.15em;
        }
        .lrr-item-checkbox:checked + .lrr-checkbox-label .lrr-checkbox-custom {
            background-color: #4a9eff;
            border-color: #2a7dd7;
        }
        .lrr-item-checkbox:checked + .lrr-checkbox-label .lrr-checkbox-custom::after {
            content: '✓';
            display: block;
            text-align: center;
            line-height: 1;
            color: #fff;
            font-size: 0.8em;
            font-weight: bold;
        }

        .lrr-title-selected { font-weight: bold; color: #28a745 !important; text-shadow: 0 0 5px rgba(40,167,69,.5); }
        .lrr-title-selected :not(.lrr-marker-span) { color: #28a745 !important; }

        #lrr-search-suggest {
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 100000;
            min-width: 220px;
            margin-top: 4px;
            display: block;
            padding: 8px;
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 8px;
            box-shadow: 0 6px 18px rgba(0,0,0,.5);
            color: #ddd;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-4px);
            transition: opacity .15s ease, transform .15s ease, visibility .15s;
        }
        #lrr-search-suggest.open { opacity: 1; visibility: visible; transform: translateY(0); }
        .lrr-suggest-group { margin-bottom: 8px; }
        .lrr-suggest-group:last-child { margin-bottom: 0; }
        .lrr-suggest-label { margin-bottom: 4px; color: #888; font-size: 11px; }
        .lrr-suggest-items { display: flex; flex-wrap: wrap; gap: 6px; }
        .lrr-suggest-item {
            padding: 3px 10px;
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            border-radius: 12px;
            color: #ccc;
            font-size: 12px;
            font-family: inherit;
            cursor: pointer;
            transition: background .15s ease, border-color .15s ease, color .15s ease;
        }
        .lrr-suggest-item:hover { border-color: #28a745; color: #fff; }
        .lrr-suggest-item.active { background: #28a745; border-color: #28a745; color: #fff; }
    `);

    /* ============================ Lanraragi checker ============================ */

    const CACHE_DURATION = 3 * 24 * 60 * 60 * 1000;
    const CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;
    const MAX_CACHE_ITEMS = 2000;
    const MUTATION_DEBOUNCE_MS = 400;

    const seenGalleryUrls = new Set();
    const altSearchInflight = new Map();
    const galleriesToCheck = [];

    function simpleHash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
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
            Promise.resolve(item.fn()).then(
                function (value) { active--; item.resolve(value); runNext(); },
                function (error) { active--; item.reject(error); runNext(); }
            );
        }
        return function run(fn) {
            return new Promise(function (resolve, reject) {
                queue.push({ fn: fn, resolve: resolve, reject: reject });
                runNext();
            });
        };
    }

    let runAltSearchLimited = createPool(CONFIG.altSearchConcurrency);

    function getCache(key) {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        try {
            const parsed = JSON.parse(cached);
            if (parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_DURATION) return parsed.data;
        } catch (e) {
            warn('Corrupted cache for ' + key + ', removing');
            localStorage.removeItem(key);
        }
        return null;
    }

    function setCache(key, data) {
        const item = { timestamp: Date.now(), data: minimizeCacheData(data) };
        try {
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e) {
            if (!isQuotaExceeded(e)) { warn('Error setting cache', e); return; }
            warn('Cache quota exceeded, cleaning up');
            cleanupExpiredCache();
            try {
                localStorage.setItem(key, JSON.stringify(item));
                return;
            } catch (e2) {
                if (enforceMaxCacheItems() === 0) purgeOldest(25);
                try { localStorage.setItem(key, JSON.stringify(item)); }
                catch (e3) { warn('Cache write failed even after cleanup', e3); }
            }
        }
    }

    function minimizeCacheData(original) {
        try {
            if (typeof original === 'object' && original && typeof original.altHit === 'boolean') {
                const altOut = { altHit: original.altHit };
                if (original.altHits) altOut.altHits = original.altHits;
                return altOut;
            }
            const out = {};
            if (typeof original === 'object' && original) {
                if ('success' in original) out.success = original.success;
                if (original.error) out.error = original.error;
                if (original.data) {
                    const d = original.data;
                    out.data = {};
                    if (d.id !== undefined) out.data.id = d.id;
                    if (d.arcid !== undefined) out.data.arcid = d.arcid;
                    if (d.title) out.data.title = d.title;
                    if (d.tags) out.data.tags = d.tags;
                    if (d.pagecount !== undefined) out.data.pagecount = d.pagecount;
                    if (d.filesize !== undefined) out.data.filesize = d.filesize;
                }
            }
            return out;
        } catch (_) {
            return original;
        }
    }

    function isQuotaExceeded(error) {
        return error && (error.name === 'QuotaExceededError' || error.code === 22);
    }

    function listCacheEntries() {
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('lrr-checker-')) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(key));
                    entries.push({ key: key, timestamp: parsed && parsed.timestamp ? parsed.timestamp : 0 });
                } catch (_) {
                    entries.push({ key: key, timestamp: 0 });
                }
            }
        }
        return entries;
    }

    function purgeOldest(count) {
        const entries = listCacheEntries().sort(function (a, b) { return a.timestamp - b.timestamp; });
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
        const lastCleanup = localStorage.getItem('lrr-cache-last-cleanup');
        const now = Date.now();
        if (lastCleanup && (now - parseInt(lastCleanup, 10)) <= CLEANUP_INTERVAL) return;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('lrr-checker-')) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    if (now - cacheData.timestamp > CACHE_DURATION) { localStorage.removeItem(key); i--; }
                } catch (e) {}
            }
        }
        localStorage.setItem('lrr-cache-last-cleanup', now.toString());
    }

    function getGalleryTitlePlain(titleElement) {
        const clone = titleElement.cloneNode(true);
        clone.querySelectorAll('.lrr-marker-span').forEach(function (el) { el.remove(); });
        return clone.textContent.replace(/\s+/g, ' ').trim();
    }

    function hasLrrMarker(titleElement) {
        return !!(titleElement && titleElement.querySelector('.lrr-marker-span'));
    }

    function pickArchive(data) {
        return {
            id: data.id || data.arcid || '',
            title: data.title || '',
            tags: data.tags || '',
            pagecount: data.pagecount || 0,
            filesize: data.filesize || 0,
        };
    }

    function formatLrrSize(bytes) {
        if (!bytes) return '';
        if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
        return bytes + ' B';
    }

    function buildHoverCard(matchType, hits, searchQuery) {
        const card = document.createElement('div');
        card.className = 'lrr-hover-card';

        const header = document.createElement('div');
        header.className = 'lrr-hc-header';
        const badge = document.createElement('span');
        badge.className = 'lrr-hc-badge';
        badge.textContent = matchType === 'urlfinder' ? 'URL 精确匹配'
            : matchType === 'error' ? '请求失败' : '标题搜索';
        const count = document.createElement('span');
        count.className = 'lrr-hc-count';
        count.textContent = matchType === 'error' ? '' : hits.length + ' 条结果';
        header.appendChild(badge);
        header.appendChild(count);
        card.appendChild(header);

        if (matchType === 'error') {
            const item = document.createElement('div');
            item.className = 'lrr-hc-item';
            item.textContent = '无法连接或解析 Lanraragi 响应。';
            card.appendChild(item);
            return card;
        }

        hits.forEach(function (hit) {
            const item = document.createElement('div');
            item.className = 'lrr-hc-item';

            if (hit.id) {
                const thumb = document.createElement('div');
                thumb.className = 'lrr-hc-thumb';
                const img = document.createElement('img');
                img.src = CONFIG.lrrServerUrl + '/api/archivethumbnail?id=' + encodeURIComponent(hit.id);
                img.alt = hit.id;
                img.loading = 'lazy';
                img.onerror = function () { thumb.remove(); };
                thumb.appendChild(img);
                item.appendChild(thumb);
            }

            const info = document.createElement('div');
            info.className = 'lrr-hc-info';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'lrr-hc-title';
            titleDiv.textContent = hit.title || hit.id || '(无标题)';
            titleDiv.title = hit.title || '';
            info.appendChild(titleDiv);

            const metaParts = [];
            if (hit.pagecount) metaParts.push(hit.pagecount + ' 页');
            if (hit.filesize) metaParts.push(formatLrrSize(hit.filesize));
            if (hit.id) metaParts.push('ID: ' + hit.id.substring(0, 12) + (hit.id.length > 12 ? '...' : ''));
            const meta = document.createElement('div');
            meta.className = 'lrr-hc-meta';
            meta.textContent = metaParts.join(' · ');
            info.appendChild(meta);

            if (hit.tags) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'lrr-hc-tags';
                hit.tags.split(/[,，]/).filter(function (t) { return t.trim(); }).slice(0, 6).forEach(function (t) {
                    const tag = document.createElement('span');
                    tag.className = 'lrr-hc-tag';
                    tag.textContent = t.trim();
                    tagsDiv.appendChild(tag);
                });
                info.appendChild(tagsDiv);
            }

            if (hit.id) {
                const actions = document.createElement('div');
                actions.className = 'lrr-hc-actions';
                const readBtn = document.createElement('a');
                readBtn.className = 'lrr-hc-btn lrr-hc-btn-read';
                readBtn.href = CONFIG.lrrServerUrl + '/reader?id=' + encodeURIComponent(hit.id);
                readBtn.target = '_blank';
                readBtn.rel = 'noopener';
                readBtn.textContent = '阅读器';
                const editBtn = document.createElement('a');
                editBtn.className = 'lrr-hc-btn lrr-hc-btn-edit';
                editBtn.href = CONFIG.lrrServerUrl + '/edit?id=' + encodeURIComponent(hit.id);
                editBtn.target = '_blank';
                editBtn.rel = 'noopener';
                editBtn.textContent = '编辑';
                actions.appendChild(readBtn);
                actions.appendChild(editBtn);
                info.appendChild(actions);
            }

            item.appendChild(info);
            card.appendChild(item);
        });

        if (matchType !== 'urlfinder' && searchQuery) {
            const footer = document.createElement('div');
            footer.className = 'lrr-hc-footer';
            const searchLink = document.createElement('a');
            searchLink.className = 'lrr-hc-searchall';
            searchLink.href = CONFIG.lrrServerUrl + '/?sort=1&sortdir=desc&q=' + encodeURIComponent(searchQuery);
            searchLink.target = '_blank';
            searchLink.rel = 'noopener';
            searchLink.textContent = '在 Lanraragi 中查看全部 →';
            footer.appendChild(searchLink);
            card.appendChild(footer);
        }

        return card;
    }

    let activeHoverCard = null;
    let hoverHideTimer = null;

    function showHoverCard(marker, card) {
        cancelHide();
        if (activeHoverCard && activeHoverCard !== card) activeHoverCard.classList.remove('show');
        activeHoverCard = card;
        if (!card.isConnected) document.body.appendChild(card);
        card.classList.add('show');
        const rect = marker.getBoundingClientRect();
        const width = card.offsetWidth;
        const height = card.offsetHeight;
        let top = rect.bottom + 4;
        if (top + height > window.innerHeight) top = Math.max(4, rect.top - height - 4);
        const left = Math.max(4, Math.min(rect.left, window.innerWidth - width - 4));
        card.style.left = left + 'px';
        card.style.top = top + 'px';
    }

    function scheduleHide() {
        clearTimeout(hoverHideTimer);
        hoverHideTimer = setTimeout(function () {
            if (activeHoverCard) activeHoverCard.classList.remove('show');
            activeHoverCard = null;
        }, 250);
    }

    function cancelHide() {
        clearTimeout(hoverHideTimer);
    }

    window.addEventListener('scroll', function (e) {
        if (activeHoverCard && !activeHoverCard.contains(e.target)) {
            activeHoverCard.classList.remove('show');
            activeHoverCard = null;
        }
    }, true);

    function prependLrrMarker(titleElement, text, classNames, matchType, hits, searchQuery) {
        if (!titleElement || hasLrrMarker(titleElement)) return;
        hits = hits || [];

        const markerSpan = document.createElement('span');
        markerSpan.classList.add('lrr-marker-span');
        classNames.forEach(function (c) { markerSpan.classList.add(c); });
        markerSpan.textContent = text;

        markerSpan.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (matchType === 'alt' && searchQuery) {
                window.open(CONFIG.lrrServerUrl + '/?sort=1&sortdir=desc&q=' + encodeURIComponent(searchQuery), '_blank');
            } else if (hits.length > 0 && hits[0].id) {
                window.open(CONFIG.lrrServerUrl + '/reader?id=' + encodeURIComponent(hits[0].id), '_blank');
            }
        });

        const card = buildHoverCard(matchType, hits, searchQuery);
        markerSpan.addEventListener('mouseenter', function () { showHoverCard(markerSpan, card); });
        markerSpan.addEventListener('mouseleave', scheduleHide);
        card.addEventListener('mouseenter', cancelHide);
        card.addEventListener('mouseleave', scheduleHide);

        titleElement.prepend(markerSpan);
    }

    function getAuthorizationHeaderValue(apiKey) {
        if (!apiKey) return '';
        try { return 'Bearer ' + btoa(apiKey); } catch (e) { return ''; }
    }

    function isUrlfinderHit(result) {
        if (!result) return false;
        if (result.success === 1 || result.success === true) return true;
        const data = result.data;
        return !!(data && ((typeof data.id === 'string' && data.id) || (typeof data.arcid === 'string' && data.arcid)));
    }

    function delay(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function makeRequest(options) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: options.method,
                url: options.url,
                headers: options.headers || {},
                timeout: options.timeout != null ? options.timeout : CONFIG.requestTimeoutMs,
                onload: function (response) {
                    const ok = typeof options.validateStatus === 'function'
                        ? options.validateStatus(response.status)
                        : (response.status >= 200 && response.status < 300);
                    if (!ok) { reject(new Error('HTTP ' + response.status + ' ' + (response.statusText || ''))); return; }
                    resolve(response);
                },
                onerror: function (error) { reject(error || new Error('Network error')); },
                ontimeout: function () { reject(new Error('Request timeout')); },
                onabort: function () { reject(new Error('Request aborted')); },
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
        const headers = {};
        if (CONFIG.lrrApiKey) headers['Authorization'] = getAuthorizationHeaderValue(CONFIG.lrrApiKey);
        const apiUrl = CONFIG.lrrServerUrl + '/api/plugins/use?plugin=urlfinder&arg=' + encodeURIComponent(gallery.galleryUrl);

        try {
            const response = await makeRequest({ method: 'POST', url: apiUrl, headers: headers });
            try {
                const result = JSON.parse(response.responseText);
                setCache(gallery.cacheKey, result);
                handleResponse(result, gallery.titleElement, gallery.galleryUrl);
                return { success: true, galleryUrl: gallery.galleryUrl };
            } catch (e) {
                warn('Error parsing JSON for ' + gallery.galleryUrl, e);
                prependLrrMarker(gallery.titleElement, '(LRR ❓)', ['lrr-marker-error'], 'error', [], null);
                return { success: false, galleryUrl: gallery.galleryUrl, error: e };
            }
        } catch (error) {
            warn('Network error checking ' + gallery.galleryUrl, error);
            prependLrrMarker(gallery.titleElement, '(LRR ❓)', ['lrr-marker-error'], 'error', [], null);
            return { success: false, galleryUrl: gallery.galleryUrl, error: error };
        }
    }

    async function fetchAltSearchHttp(searchQuery, altKey) {
        const params = new URLSearchParams();
        params.set('filter', searchQuery);
        params.set('start', '0');
        params.set('groupby_tanks', 'false');
        const searchUrl = CONFIG.lrrServerUrl + '/api/search?' + params.toString();

        const headers = {};
        if (CONFIG.lrrApiKey) headers['Authorization'] = getAuthorizationHeaderValue(CONFIG.lrrApiKey);

        const validateStatus = function (status) { return (status >= 200 && status < 300) || status === 204; };
        let response = await makeRequest({ method: 'GET', url: searchUrl, headers: headers, timeout: CONFIG.searchTimeoutMs, validateStatus: validateStatus });

        if (response.status === 204) {
            warn('GET /api/search returned 204, retrying in 2s');
            await delay(2000);
            response = await makeRequest({ method: 'GET', url: searchUrl, headers: headers, timeout: CONFIG.searchTimeoutMs, validateStatus: validateStatus });
        }
        if (response.status === 204) {
            setCache(altKey, { altHit: false, altHits: [] });
            return { hit: false, hits: [] };
        }

        const body = (response.responseText || '').trim();
        if (!body) {
            setCache(altKey, { altHit: false, altHits: [] });
            return { hit: false, hits: [] };
        }

        const searchResult = JSON.parse(body);
        const hasHits = (typeof searchResult.recordsFiltered === 'number' && searchResult.recordsFiltered > 0) ||
            (searchResult.data && searchResult.data.length > 0);
        const altHits = [];
        if (hasHits && searchResult.data) {
            searchResult.data.forEach(function (item) {
                if (item) altHits.push(pickArchive(item));
            });
        }
        setCache(altKey, { altHit: hasHits, altHits: altHits });
        return { hit: hasHits, hits: altHits };
    }

    async function performAlternativeSearch(searchQuery, titleElement) {
        if (hasLrrMarker(titleElement)) return { success: false, skipped: true };

        const altKey = 'lrr-checker-alt-' + simpleHash(searchQuery);
        const cached = getCache(altKey);
        if (cached && typeof cached.altHit === 'boolean') {
            if (cached.altHit) prependLrrMarker(titleElement, '(LRR！)', ['lrr-marker-file'], 'alt', cached.altHits || [], searchQuery);
            return { success: cached.altHit, cached: true };
        }

        if (!altSearchInflight.has(searchQuery)) {
            const p = runAltSearchLimited(function () { return fetchAltSearchHttp(searchQuery, altKey); });
            altSearchInflight.set(searchQuery, p);
            p.catch(function () {}).finally(function () { altSearchInflight.delete(searchQuery); });
        }

        try {
            const result = await altSearchInflight.get(searchQuery);
            if (result && result.hit && !hasLrrMarker(titleElement)) {
                prependLrrMarker(titleElement, '(LRR！)', ['lrr-marker-file'], 'alt', result.hits || [], searchQuery);
            }
            return { success: result ? result.hit : false };
        } catch (error) {
            warn('Network error during /api/search', error);
            return { success: false, error: error };
        }
    }

    function handleResponse(result, titleElement, galleryUrl) {
        if (hasLrrMarker(titleElement)) return;

        if (isUrlfinderHit(result)) {
            log('Found: ' + galleryUrl);
            const hits = result.data ? [pickArchive(result.data)] : [];
            prependLrrMarker(titleElement, '(LRR ✔)', ['lrr-marker-downloaded'], 'urlfinder', hits, null);
            return;
        }

        log('Not found: ' + galleryUrl);
        if (!CONFIG.enableAltSearch) return;

        const fullTitle = getGalleryTitlePlain(titleElement);
        const authorMatch = fullTitle.match(/\[((?!汉化|漢化|DL版|中国翻訳)[^\]]+)\]/);
        const author = authorMatch ? authorMatch[1] : null;
        if (!author) return;

        const titleMatch = fullTitle.match(/\]([^\[\]\(\)]+)/);
        const title = titleMatch ? titleMatch[1].trim() : null;
        if (!title || author === title) return;

        performAlternativeSearch(author + ',' + title, titleElement);
    }

    function collectGalleriesFromDom() {
        document.querySelectorAll('.itg .gl1t a[href*="/g/"]').forEach(function (linkElement) {
            const galleryUrl = linkElement.href;
            const titleElement = linkElement.querySelector('.glink');
            if (!galleryUrl || !titleElement) return;
            if (seenGalleryUrls.has(galleryUrl)) return;
            seenGalleryUrls.add(galleryUrl);
            if (hasLrrMarker(titleElement)) return;

            const cacheKey = 'lrr-checker-' + galleryUrl;
            const cachedData = getCache(cacheKey);
            if (cachedData) { handleResponse(cachedData, titleElement, galleryUrl); return; }
            galleriesToCheck.push({ galleryUrl: galleryUrl, titleElement: titleElement, cacheKey: cacheKey });
        });
    }

    function flushPendingRequests() {
        const batch = galleriesToCheck.splice(0, galleriesToCheck.length);
        if (batch.length === 0) return;
        log('Processing ' + batch.length + ' galleries');
        processInBatches(batch, processGallery, CONFIG.lrrConcurrency);
    }

    let mutationTimer = null;
    function setupChecker() {
        cleanupExpiredCache();
        collectGalleriesFromDom();
        flushPendingRequests();

        const galleryTable = document.querySelector('.itg');
        if (!galleryTable || typeof MutationObserver === 'undefined') return;
        const observer = new MutationObserver(function () {
            clearTimeout(mutationTimer);
            mutationTimer = setTimeout(function () {
                collectGalleriesFromDom();
                flushPendingRequests();
                addGalleryCheckboxes();
            }, MUTATION_DEBOUNCE_MS);
        });
        observer.observe(galleryTable, { childList: true, subtree: true });
    }

    /* ============================ Search suggestions ============================ */

    const LANG_TOKENS = ['language:chinese', 'language:japanese'];

    function setupSearchSuggest() {
        const input = document.getElementById('f_search');
        if (!input || document.getElementById('lrr-search-suggest')) return;

        const parent = input.parentNode;
        if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

        const box = document.createElement('div');
        box.id = 'lrr-search-suggest';
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

        function tokens() { return input.value.split(/\s+/).filter(Boolean); }

        const ALL_CAT_BITS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
        const ALL_AGES_BIT = 256;
        const ALL_CATS = ALL_CAT_BITS.reduce(function (sum, bit) { return sum | bit; }, 0);
        const DEFAULT_EXCLUDE = ALL_AGES_BIT;
        let allAgesBase = null;
        let applyingCats = false;

        function getCats() {
            const el = document.getElementById('f_cats');
            return el ? (parseInt(el.value, 10) || 0) : 0;
        }

        // f_cats is the excluded-categories mask: a set bit means the category is off.
        function isSelected(bit) {
            return (getCats() & bit) === 0;
        }

        // True only when `bit` is the sole selected category, i.e. the preset is actually applied.
        function isExclusive(bit) {
            return isSelected(bit) && (getCats() | bit) === ALL_CATS;
        }

        function setCats(mask) {
            applyingCats = true;
            ALL_CAT_BITS.forEach(function (bit) {
                if (((getCats() & bit) !== 0) === ((mask & bit) !== 0)) return;
                const el = document.getElementById('cat_' + bit);
                if (el) el.click();
            });
            applyingCats = false;
        }

        function updateActive() {
            box.querySelectorAll('[data-lang]').forEach(function (btn) {
                btn.classList.toggle('active', tokens().some(function (t) { return t.toLowerCase() === btn.dataset.lang; }));
            });
            box.querySelectorAll('[data-cat]').forEach(function (btn) {
                btn.classList.toggle('active', isExclusive(parseInt(btn.dataset.cat, 10)));
            });
        }

        function uniqueTokens() {
            const seen = {};
            return tokens().filter(function (t) {
                const key = t.toLowerCase();
                if (seen[key]) return false;
                seen[key] = true;
                return true;
            });
        }

        function toggleLang(token) {
            const target = token.toLowerCase();
            const current = uniqueTokens();
            const present = current.some(function (t) { return t.toLowerCase() === target; });
            let next;
            if (present) {
                next = current.filter(function (t) { return t.toLowerCase() !== target; });
            } else {
                next = current.filter(function (t) { return LANG_TOKENS.indexOf(t.toLowerCase()) === -1; });
                next.push(token);
            }
            input.value = next.join(' ');
        }

        box.addEventListener('mousedown', function (e) { e.preventDefault(); });
        box.addEventListener('click', function (e) {
            const langBtn = e.target.closest('[data-lang]');
            if (langBtn) { toggleLang(langBtn.dataset.lang); updateActive(); return; }
            const catBtn = e.target.closest('[data-cat]');
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

        // Manual category changes while the preset is active fold into its saved state and end the preset.
        document.addEventListener('click', function (e) {
            if (applyingCats || allAgesBase === null) return;
            const el = e.target.closest && e.target.closest('[id^="cat_"]');
            if (!el) return;
            const bit = parseInt(el.id.slice(4), 10);
            if (ALL_CAT_BITS.indexOf(bit) === -1) return;
            if ((getCats() & bit) !== 0) allAgesBase |= bit; else allAgesBase &= ~bit;
            const base = allAgesBase;
            allAgesBase = null;
            setCats(base);
            updateActive();
        });

        function open() { updateActive(); box.classList.add('open'); }
        function close() { box.classList.remove('open'); }

        input.addEventListener('focus', open);
        document.addEventListener('mousedown', function (e) {
            if (!box.classList.contains('open')) return;
            if (e.target === input || box.contains(e.target)) return;
            close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') close();
        });
    }

    /* ============================ Panel ============================ */

    let panelEl = null;
    let countEl = null;
    let statusEl = null;
    let itemCheckboxSeq = 0;
    let clampTimer = null;
    let panelPos = null;
    const PANEL_MARGIN = 12;

    function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

    function setStatus(text) {
        if (statusEl) statusEl.textContent = text || '';
    }

    function updateItemCheckboxStyle(checkbox) {
        const wrapper = checkbox.closest('.lrr-checkbox-wrapper');
        const titleEl = wrapper && wrapper.closest('.glink');
        if (titleEl) titleEl.classList.toggle('lrr-title-selected', checkbox.checked);
    }

    function collectLinks() {
        const links = [];
        document.querySelectorAll('.itg .gl1t a[href*="/g/"]').forEach(function (a) {
            const titleEl = a.querySelector('.glink');
            const checkbox = titleEl && titleEl.querySelector('.lrr-item-checkbox');
            if (checkbox && checkbox.checked) links.push(a.href);
        });
        return links;
    }

    function updateCount() {
        if (countEl) countEl.textContent = '已选 ' + collectLinks().length;
    }

    function addGalleryCheckboxes() {
        document.querySelectorAll('.itg .gl1t a[href*="/g/"]').forEach(function (a) {
            const titleEl = a.querySelector('.glink');
            if (!titleEl || titleEl.querySelector('.lrr-item-checkbox')) return;

            const checkboxId = 'lrr-item-' + (++itemCheckboxSeq);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.className = 'lrr-item-checkbox';
            checkbox.addEventListener('change', function () {
                updateItemCheckboxStyle(checkbox);
                updateCount();
            });

            const label = document.createElement('label');
            label.className = 'lrr-checkbox-label';
            label.htmlFor = checkboxId;
            const custom = document.createElement('span');
            custom.className = 'lrr-checkbox-custom';
            label.appendChild(custom);

            const wrapper = document.createElement('span');
            wrapper.className = 'lrr-checkbox-wrapper';
            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);

            titleEl.insertBefore(wrapper, titleEl.firstChild);
        });
    }

    function updateGalleryCheckboxes() {
        if (!panelEl) return;
        const selected = Array.from(panelEl.querySelectorAll('.lrr-options-grid input:checked')).map(function (i) { return i.value; });
        document.querySelectorAll('.itg .gl1t a[href*="/g/"]').forEach(function (a) {
            const titleEl = a.querySelector('.glink');
            if (!titleEl) return;
            const checkbox = titleEl.querySelector('.lrr-item-checkbox');
            if (!checkbox) return;

            const marker = titleEl.querySelector('.lrr-marker-span');
            const categories = [];
            if (!marker) {
                categories.push('not_marked');
            } else {
                if (marker.classList.contains('lrr-marker-downloaded')) categories.push('downloaded');
                if (marker.classList.contains('lrr-marker-file')) categories.push('possible_duplicate');
                if (marker.classList.contains('lrr-marker-error')) categories.push('error');
            }
            checkbox.checked = selected.some(function (s) { return categories.indexOf(s) !== -1; });
            updateItemCheckboxStyle(checkbox);
        });
        updateCount();
    }

    function resetAltSearchPool() {
        altSearchInflight.clear();
        runAltSearchLimited = createPool(CONFIG.altSearchConcurrency);
    }

    function fillConfigInputs() {
        if (!panelEl) return;
        panelEl.querySelector('#lrr-cfg-server').value = CONFIG.lrrServerUrl;
        panelEl.querySelector('#lrr-cfg-key').value = CONFIG.lrrApiKey;
        panelEl.querySelector('#lrr-cfg-conc').value = CONFIG.lrrConcurrency;
        panelEl.querySelector('#lrr-cfg-alt').checked = !!CONFIG.enableAltSearch;
        panelEl.querySelector('#lrr-cfg-altconc').value = CONFIG.altSearchConcurrency;
        panelEl.querySelector('#lrr-cfg-timeout').value = CONFIG.requestTimeoutMs;
        panelEl.querySelector('#lrr-cfg-stimeout').value = CONFIG.searchTimeoutMs;
        panelEl.querySelector('#lrr-cfg-log').checked = !!CONFIG.enableLogging;
        panelEl.querySelector('#lrr-cfg-queue').value = CONFIG.queueServerUrl;
    }

    function saveConfig() {
        CONFIG.lrrServerUrl = panelEl.querySelector('#lrr-cfg-server').value.trim() || DEFAULT_CONFIG.lrrServerUrl;
        CONFIG.lrrApiKey = panelEl.querySelector('#lrr-cfg-key').value.trim();
        CONFIG.lrrConcurrency = Math.max(1, parseInt(panelEl.querySelector('#lrr-cfg-conc').value, 10) || DEFAULT_CONFIG.lrrConcurrency);
        CONFIG.enableAltSearch = panelEl.querySelector('#lrr-cfg-alt').checked;
        CONFIG.altSearchConcurrency = Math.max(1, parseInt(panelEl.querySelector('#lrr-cfg-altconc').value, 10) || DEFAULT_CONFIG.altSearchConcurrency);
        CONFIG.requestTimeoutMs = Math.max(1000, parseInt(panelEl.querySelector('#lrr-cfg-timeout').value, 10) || DEFAULT_CONFIG.requestTimeoutMs);
        CONFIG.searchTimeoutMs = Math.max(1000, parseInt(panelEl.querySelector('#lrr-cfg-stimeout').value, 10) || DEFAULT_CONFIG.searchTimeoutMs);
        CONFIG.enableLogging = panelEl.querySelector('#lrr-cfg-log').checked;
        CONFIG.queueServerUrl = panelEl.querySelector('#lrr-cfg-queue').value.trim() || DEFAULT_CONFIG.queueServerUrl;

        Object.keys(DEFAULT_CONFIG).forEach(function (key) { gmSet(key, CONFIG[key]); });
        resetAltSearchPool();
        fillConfigInputs();
        setStatus('已保存');
    }

    function resetConfig() {
        Object.keys(DEFAULT_CONFIG).forEach(function (key) {
            if (key === 'panelCollapsed') return;
            CONFIG[key] = DEFAULT_CONFIG[key];
            gmSet(key, CONFIG[key]);
        });
        resetAltSearchPool();
        fillConfigInputs();
        setStatus('已恢复默认');
    }

    function setPanelPos(left, top) {
        panelEl.style.left = left + 'px';
        panelEl.style.top = top + 'px';
        panelEl.style.right = 'auto';
        panelEl.style.bottom = 'auto';
        panelPos = { left: left, top: top };
    }

    function clampPanelPosition() {
        if (!panelEl || !panelPos) return;
        setPanelPos(
            clamp(panelPos.left, PANEL_MARGIN, Math.max(PANEL_MARGIN, window.innerWidth - panelEl.offsetWidth - PANEL_MARGIN)),
            clamp(panelPos.top, PANEL_MARGIN, Math.max(PANEL_MARGIN, window.innerHeight - panelEl.offsetHeight - PANEL_MARGIN))
        );
        gmSet('panelPos', panelPos);
    }

    function collapseTo(x, y) {
        const size = 46;
        setPanelPos(
            clamp(x - size / 2, PANEL_MARGIN, window.innerWidth - size - PANEL_MARGIN),
            clamp(y - size / 2, PANEL_MARGIN, window.innerHeight - size - PANEL_MARGIN)
        );
        gmSet('panelPos', panelPos);
        setCollapsed(true);
    }

    function expandTo(x, y) {
        const width = Math.min(260, window.innerWidth - 2 * PANEL_MARGIN);
        // Transitions are paused so offsetHeight reports the expanded, not the collapsed, size.
        panelEl.classList.add('dragging');
        setCollapsed(false);
        const height = panelEl.offsetHeight;
        const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
        const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
        const top = y > window.innerHeight / 2
            ? clamp(y - height, PANEL_MARGIN, maxTop)
            : clamp(y, PANEL_MARGIN, maxTop);
        setPanelPos(clamp(x - width / 2, PANEL_MARGIN, maxLeft), top);
        gmSet('panelPos', panelPos);
        requestAnimationFrame(function () { panelEl.classList.remove('dragging'); });
    }

    function setCollapsed(collapsed) {
        panelEl.classList.toggle('collapsed', collapsed);
        CONFIG.panelCollapsed = collapsed;
        gmSet('panelCollapsed', collapsed);
    }

    let settingsViewShown = false;
    function toggleSettingsView() {
        if (!panelEl) return;
        settingsViewShown = !settingsViewShown;
        panelEl.querySelector('#lrr-view-main').style.display = settingsViewShown ? 'none' : '';
        panelEl.querySelector('#lrr-view-settings').style.display = settingsViewShown ? '' : 'none';
        const btn = panelEl.querySelector('#lrr-settings-btn');
        btn.textContent = settingsViewShown ? '←' : '⚙';
        btn.title = settingsViewShown ? '返回' : '设置';
        btn.classList.toggle('active', settingsViewShown);
        if (panelPos) {
            const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - panelEl.offsetHeight - PANEL_MARGIN);
            if (panelPos.top > maxTop) { setPanelPos(panelPos.left, maxTop); gmSet('panelPos', panelPos); }
        }
    }

    function makeDraggable(panel, header) {
        let dragging = false;
        let moved = false;
        let suppressClick = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;

        panel.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('.lrr-settings-btn')) return;
            const collapsed = panel.classList.contains('collapsed');
            if (!collapsed && !header.contains(e.target)) return;
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            moved = false;
            dragging = true;
            panel.classList.add('dragging');
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
            moved = true;
            setPanelPos(
                clamp(startLeft + dx, PANEL_MARGIN, window.innerWidth - panel.offsetWidth - PANEL_MARGIN),
                clamp(startTop + dy, PANEL_MARGIN, window.innerHeight - panel.offsetHeight - PANEL_MARGIN)
            );
        });

        document.addEventListener('mouseup', function () {
            if (!dragging) return;
            dragging = false;
            panel.classList.remove('dragging');
            if (!moved) return;
            suppressClick = true;
            // click fires before this 0ms timeout, so the same interaction consumes the flag.
            setTimeout(function () { suppressClick = false; }, 0);
            gmSet('panelPos', panelPos);
        });

        panel.addEventListener('click', function (e) {
            if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
            const settingsBtn = panel.querySelector('.lrr-settings-btn');
            if (settingsBtn && settingsBtn.contains(e.target)) { toggleSettingsView(); return; }
            if (panel.classList.contains('collapsed')) { expandTo(e.clientX, e.clientY); return; }
            if (header.contains(e.target)) collapseTo(e.clientX, e.clientY);
        });
    }

    function buildPanel() {
        const panel = document.createElement('div');
        panel.className = 'lrr-floating-panel';
        panel.innerHTML = `
            <div class="lrr-panel-header">
                <span class="lrr-panel-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line></svg>
                </span>
                <span class="lrr-panel-title">LRR</span>
                <span class="lrr-panel-count"></span>
                <button type="button" class="lrr-settings-btn" id="lrr-settings-btn" title="设置">⚙</button>
            </div>
            <div class="lrr-panel-body">
                <div class="lrr-panel-body-inner">
                <div class="lrr-view" id="lrr-view-main">
                    <div class="lrr-section">
                        <div class="lrr-section-title">按状态选择</div>
                        <div class="lrr-options-grid">
                            <label><input type="checkbox" value="not_marked"> <span class="lrr-marker-span lrr-marker-not-marked">○</span>未标记</label>
                            <label><input type="checkbox" value="downloaded"> <span class="lrr-marker-span lrr-marker-downloaded">✔</span>已下载</label>
                            <label><input type="checkbox" value="possible_duplicate"> <span class="lrr-marker-span lrr-marker-file">！</span>可能重复</label>
                            <label><input type="checkbox" value="error"> <span class="lrr-marker-span lrr-marker-error">❓</span>错误</label>
                        </div>
                    </div>
                    <button type="button" class="lrr-btn lrr-btn-primary" id="lrr-copy">复制链接</button>
                    <button type="button" class="lrr-btn" id="lrr-clear">清除选择</button>
                    <button type="button" class="lrr-btn lrr-btn-blue" id="lrr-send">发送到队列</button>
                    <button type="button" class="lrr-btn" id="lrr-open-backend">打开后端界面</button>
                </div>
                <div class="lrr-view" id="lrr-view-settings" style="display:none">
                    <div class="lrr-section">
                        <div class="lrr-section-title">Lanraragi</div>
                        <div class="lrr-row"><label>服务器<input type="text" id="lrr-cfg-server"></label></div>
                        <div class="lrr-row"><label>API Key<input type="text" id="lrr-cfg-key"></label></div>
                        <div class="lrr-row"><label>并发数<input type="number" id="lrr-cfg-conc" min="1"></label></div>
                        <div class="lrr-row"><label><input type="checkbox" id="lrr-cfg-alt"> 备用标题搜索</label></div>
                        <div class="lrr-row"><label>备用并发<input type="number" id="lrr-cfg-altconc" min="1"></label></div>
                        <div class="lrr-row"><label>请求超时<input type="number" id="lrr-cfg-timeout" min="1000"></label></div>
                        <div class="lrr-row"><label>搜索超时<input type="number" id="lrr-cfg-stimeout" min="1000"></label></div>
                        <div class="lrr-row"><label><input type="checkbox" id="lrr-cfg-log"> 控制台日志</label></div>
                    </div>
                    <div class="lrr-section">
                        <div class="lrr-section-title">队列服务器</div>
                        <div class="lrr-row"><label>地址<input type="text" id="lrr-cfg-queue"></label></div>
                    </div>
                    <div class="lrr-actions">
                        <button type="button" class="lrr-btn lrr-btn-primary" id="lrr-save">保存</button>
                        <button type="button" class="lrr-btn" id="lrr-reset">恢复默认</button>
                    </div>
                </div>
                <div class="lrr-status"></div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        panelEl = panel;
        countEl = panel.querySelector('.lrr-panel-count');
        statusEl = panel.querySelector('.lrr-status');
        const header = panel.querySelector('.lrr-panel-header');

        if (CONFIG.panelCollapsed) panel.classList.add('collapsed');
        const savedPos = gmGet('panelPos', null);
        if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
            setPanelPos(savedPos.left, savedPos.top);
        } else {
            const rect = panel.getBoundingClientRect();
            setPanelPos(rect.left, rect.top);
        }
        clampPanelPosition();
        window.addEventListener('resize', function () {
            clearTimeout(clampTimer);
            clampTimer = setTimeout(clampPanelPosition, 100);
        });

        fillConfigInputs();

        panel.querySelector('#lrr-save').addEventListener('click', saveConfig);
        panel.querySelector('#lrr-reset').addEventListener('click', function () {
            if (confirm('确定恢复所有配置到默认值？')) resetConfig();
        });

        panel.querySelectorAll('.lrr-options-grid input').forEach(function (checkbox) {
            checkbox.addEventListener('change', updateGalleryCheckboxes);
        });

        panel.querySelector('#lrr-copy').addEventListener('click', function () {
            const links = collectLinks();
            if (links.length === 0) { setStatus('未找到匹配链接'); return; }
            try {
                GM_setClipboard(links.join('\n'));
                setStatus('已复制 ' + links.length + ' 条链接');
            } catch (e) {
                setStatus('复制失败');
                warn('Copy failed', e);
            }
        });

        panel.querySelector('#lrr-clear').addEventListener('click', function () {
            panel.querySelectorAll('.lrr-options-grid input').forEach(function (cb) { cb.checked = false; });
            document.querySelectorAll('.lrr-item-checkbox').forEach(function (cb) {
                cb.checked = false;
                updateItemCheckboxStyle(cb);
            });
            updateCount();
            setStatus('');
        });

        panel.querySelector('#lrr-send').addEventListener('click', function () {
            const links = collectLinks();
            if (links.length === 0) { setStatus('未选择链接'); return; }
            setStatus('发送中...');
            GM_xmlhttpRequest({
                method: 'POST',
                url: CONFIG.queueServerUrl + '/add',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ urls: links }),
                timeout: 10000,
                onload: function (response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.ok) setStatus('已发送 ' + data.added + ' 条到队列');
                        else setStatus('发送失败: ' + (data.error || '未知错误'));
                    } catch (e) {
                        setStatus('服务器响应异常');
                    }
                },
                onerror: function () { setStatus('无法连接队列服务器'); },
                ontimeout: function () { setStatus('请求超时'); },
            });
        });

        panel.querySelector('#lrr-open-backend').addEventListener('click', function () {
            window.open(CONFIG.queueServerUrl, '_blank', 'noopener');
        });

        makeDraggable(panel, header);
        addGalleryCheckboxes();
        updateCount();
    }

    /* ============================ Init ============================ */

    function init() {
        buildPanel();
        setupChecker();
        setupSearchSuggest();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
