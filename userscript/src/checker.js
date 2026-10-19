import { CONFIG, DEFAULT_CONFIG, gmGet, gmSet } from './config'
import galleryStyles from './gallery.css?inline'
import { mountPanel } from './panel'
import { collect, setStatus as setGalleryStatus, galleries } from './state'

let generation = 0
function cacheNamespace() { return 'lrr-checker-v2-' + simpleHash(CONFIG.lrrServerUrl + CONFIG.lrrApiKey) + '-' }
function log(...args) { if (CONFIG.enableLogging) console.log('[LRR]', ...args); }
function warn(...args) { if (CONFIG.enableLogging) console.warn('[LRR]', ...args); }

GM_addStyle(galleryStyles);


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
    if (generation > 0) return null;
    key = cacheNamespace() + key;
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
    key = cacheNamespace() + key;
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
    clone.querySelectorAll('.lrr-marker-span, .lrr-check-state, .lrr-item-checkbox').forEach(function (el) { el.remove(); });
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
    setGalleryStatus(titleElement, matchType === 'urlfinder' ? 'downloaded' : matchType === 'alt' ? 'duplicate' : 'error');
    hits = hits || [];

    const markerSpan = document.createElement('span');
    markerSpan.classList.add('lrr-marker-span');
    classNames.forEach(function (c) { markerSpan.classList.add(c); });
    markerSpan.textContent = matchType === 'urlfinder' ? '✓' : matchType === 'alt' ? '≃' : '!';
    markerSpan.title = matchType === 'urlfinder' ? '已入库' : matchType === 'alt' ? '疑似重复' : '检查失败';

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
            data: options.data,
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
    if (gallery.generation !== generation) return;
    const requestGeneration = generation;
    const headers = {};
    if (CONFIG.lrrApiKey) headers['Authorization'] = getAuthorizationHeaderValue(CONFIG.lrrApiKey);
    const apiUrl = CONFIG.lrrServerUrl + '/api/plugins/use?plugin=urlfinder&arg=' + encodeURIComponent(gallery.galleryUrl);

    try {
        const response = await makeRequest({ method: 'POST', url: apiUrl, headers: headers });
        try {
            const result = JSON.parse(response.responseText);
            if (requestGeneration !== generation) return;
            setCache(gallery.cacheKey, result);
            handleResponse(result, gallery.titleElement, gallery.galleryUrl);
            return { success: true, galleryUrl: gallery.galleryUrl };
        } catch (e) {
            if (requestGeneration !== generation) return;
            warn('Error parsing JSON for ' + gallery.galleryUrl, e);
            prependLrrMarker(gallery.titleElement, '(LRR ❓)', ['lrr-marker-error'], 'error', [], null);
            return { success: false, galleryUrl: gallery.galleryUrl, error: e };
        }
    } catch (error) {
        if (requestGeneration !== generation) return;
        warn('Network error checking ' + gallery.galleryUrl, error);
        prependLrrMarker(gallery.titleElement, '(LRR ❓)', ['lrr-marker-error'], 'error', [], null);
        return { success: false, galleryUrl: gallery.galleryUrl, error: error };
    }
}

async function fetchAltSearchHttp(searchQuery, altKey) {
    const requestGeneration = generation;
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
        if (requestGeneration !== generation) return { hit: false, hits: [] };
        response = await makeRequest({ method: 'GET', url: searchUrl, headers: headers, timeout: CONFIG.searchTimeoutMs, validateStatus: validateStatus });
    }
    if (response.status === 204) throw new Error('标题搜索尚未就绪，请重试');

    const body = (response.responseText || '').trim();
    if (!body) throw new Error('标题搜索返回空响应');

    const searchResult = JSON.parse(body);
    if (!searchResult || !Array.isArray(searchResult.data)) throw new Error('标题搜索响应格式异常');
    const hasHits = (typeof searchResult.recordsFiltered === 'number' && searchResult.recordsFiltered > 0) ||
        (searchResult.data && searchResult.data.length > 0);
    const altHits = [];
    if (hasHits && searchResult.data) {
        searchResult.data.forEach(function (item) {
            if (item) altHits.push(pickArchive(item));
        });
    }
    if (requestGeneration === generation) setCache(altKey, { altHit: hasHits, altHits: altHits });
    return { hit: hasHits, hits: altHits };
}

async function performAlternativeSearch(searchQuery, titleElement) {
    if (hasLrrMarker(titleElement)) return { success: false, skipped: true };

    const requestGeneration = generation;
    const altKey = 'lrr-checker-alt-' + simpleHash(searchQuery);
    const inflightKey = generation + ':' + searchQuery;
    const cached = getCache(altKey);
    if (cached && typeof cached.altHit === 'boolean') {
        if (!cached.altHit) setGalleryStatus(titleElement, 'missing');
        if (cached.altHit) prependLrrMarker(titleElement, '(LRR！)', ['lrr-marker-file'], 'alt', cached.altHits || [], searchQuery);
        return { success: cached.altHit, cached: true };
    }

    if (!altSearchInflight.has(inflightKey)) {
        const p = runAltSearchLimited(function () {
            if (requestGeneration !== generation) return { hit: false, hits: [] };
            return fetchAltSearchHttp(searchQuery, altKey);
        });
        altSearchInflight.set(inflightKey, p);
        p.catch(function () {}).finally(function () { altSearchInflight.delete(inflightKey); });
    }

    try {
        const result = await altSearchInflight.get(inflightKey);
        if (requestGeneration !== generation) return;
        if (!result?.hit) setGalleryStatus(titleElement, 'missing');
        if (result && result.hit && !hasLrrMarker(titleElement)) {
            prependLrrMarker(titleElement, '(LRR！)', ['lrr-marker-file'], 'alt', result.hits || [], searchQuery);
        }
        return { success: result ? result.hit : false };
    } catch (error) {
        if (requestGeneration !== generation) return;
        setGalleryStatus(titleElement, 'error');
        warn('Network error during /api/search', error);
        return { success: false, error: error };
    }
}

function handleResponse(result, titleElement, galleryUrl) {
    if (hasLrrMarker(titleElement)) return;
    if (!result || (result.data?.error && !/url not found/i.test(result.data.error))) {
        prependLrrMarker(titleElement, '(LRR ❓)', ['lrr-marker-error'], 'error', [], null);
        return;
    }

    if (isUrlfinderHit(result)) {
        log('Found: ' + galleryUrl);
        const hits = result.data ? [pickArchive(result.data)] : [];
        prependLrrMarker(titleElement, '(LRR ✔)', ['lrr-marker-downloaded'], 'urlfinder', hits, null);
        return;
    }

    log('Not found: ' + galleryUrl);
    if (!CONFIG.enableAltSearch) { setGalleryStatus(titleElement, 'missing'); return; }

    const fullTitle = getGalleryTitlePlain(titleElement);
    const authorMatch = fullTitle.match(/\[((?!汉化|漢化|DL版|中国翻訳)[^\]]+)\]/);
    const author = authorMatch ? authorMatch[1] : null;
    if (!author) { setGalleryStatus(titleElement, 'missing'); return; }

    const titleMatch = fullTitle.match(/\]([^\[\]\(\)]+)/);
    const title = titleMatch ? titleMatch[1].trim() : null;
    if (!title || author === title) { setGalleryStatus(titleElement, 'missing'); return; }

    performAlternativeSearch(author + ',' + title, titleElement);
}

function collectGalleriesFromDom() {
    collect();
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
        galleriesToCheck.push({ galleryUrl: galleryUrl, titleElement: titleElement, cacheKey: cacheKey, generation: generation });
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
            collect();
        }, MUTATION_DEBOUNCE_MS);
    });
    observer.observe(galleryTable, { childList: true, subtree: true });
}


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


function recheck() {
    generation++;
    galleriesToCheck.length = 0;
    seenGalleryUrls.clear();
    altSearchInflight.clear();
    runAltSearchLimited = createPool(CONFIG.altSearchConcurrency);
    for (const gallery of galleries.values()) {
        gallery.title.querySelectorAll('.lrr-marker-span').forEach(marker => marker.remove());
        setGalleryStatus(gallery.title, 'checking');
    }
    collectGalleriesFromDom();
    flushPendingRequests();
}
function init() {
    mountPanel({ config: CONFIG, defaults: DEFAULT_CONFIG, persist: gmSet, recheck,
        copy: text => GM_setClipboard(text),
        send: async urls => {
            const response = await makeRequest({ method: 'POST', url: CONFIG.queueServerUrl + '/add',
                headers: { 'Content-Type': 'application/json' }, data: JSON.stringify({ urls }), timeout: 10000 });
            const result = JSON.parse(response.responseText);
            if (!result.ok || !Number.isInteger(result.added) || !Number.isInteger(result.duplicates)) throw new Error(result.error || '服务器响应异常');
            return result;
        }
    });
    setupChecker();
    setupSearchSuggest();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
