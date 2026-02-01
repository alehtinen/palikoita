/* Optional debug helper for All Links and general site debugging
 * Drop or include this file on your server when you need verbose diagnostics.
 * Usage: include <script src="/debug.js"></script> on the page (after app.js or before, either is fine).
 * This file exposes a small toolbox of helpers that are only active when this file is loaded.
 */

// Enable/disable flags
window.ALLLINKS_DEBUG = true;
window.DEBUG = true;
// Controls whether raw/unmasked logs are kept and can be exported. Default: false.
// WARNING: enabling raw logs may include sensitive data like full URLs or tokens.
window.DEBUG_ALLOW_RAW = false;
// Compact mode options: set to true or 'badge' to enable badge-only compact UI.
// You can toggle at runtime: window.DEBUG_COMPACT = 'badge' or false
window.DEBUG_COMPACT = false;


// Structured logging helpers + console capture
(function(){
  // keep original console methods
  const __origConsole = {
    log: console && console.log ? console.log.bind(console) : function() {},
    warn: console && console.warn ? console.warn.bind(console) : function() {},
    error: console && console.error ? console.error.bind(console) : function() {},
    info: console && console.info ? console.info.bind(console) : function() {},
    debug: console && console.debug ? console.debug.bind(console) : (console && console.log ? console.log.bind(console) : function() {})
  };

  // internal buffer for logs
  window._debugLogs = window._debugLogs || [];
  const MAX_LOGS = 3000;

  function formatArg(a){
    try {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      return JSON.stringify(a);
    } catch (e) { return String(a); }
  }

  // Mask sensitive pieces before storing/exporting logs
  function maskSensitive(s){
    try{
      if (!s) return s;
      let out = String(s);
      // Mask Authorization Bearer tokens
      out = out.replace(/(Bearer\s+)[A-Za-z0-9\-_.]{8,}/gi, '$1[REDACTED]');
      // Mask email local-part (show first char + ***)
      out = out.replace(/([a-zA-Z0-9._%+-]{1,})@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, function(m, user, domain){ return user.charAt(0) + '***@' + domain; });
      // Mask long tokens (>=20 characters)
      out = out.replace(/([A-Za-z0-9_\-]{20,})/g, function(m){ return m.slice(0,6) + '…' + m.slice(-4); });
      // Replace full URLs with protocol+host only
      out = out.replace(/https?:\/\/[^\s'"<>]+/gi, function(m){ try{ const u = new URL(m); return u.protocol + '//' + u.host + '/…'; }catch(e){ return '[URL]'; } });
      return out;
    } catch(e){ return s; }
  }

  function pushLog(level, args){
    try{
      const ts = new Date().toISOString();
      const rawMsg = args.map(formatArg).join(' ');
      const sanitizedMsg = maskSensitive(rawMsg);
      const sanitizedArgs = args.map(a => maskSensitive(formatArg(a)));
      const entry = { ts, level, msg: sanitizedMsg, args: sanitizedArgs };
      if (window.DEBUG_ALLOW_RAW) entry.rawArgs = args.map(formatArg);
      window._debugLogs.push(entry);
      if (window._debugLogs.length > MAX_LOGS) window._debugLogs.shift();
      // update panel counts if present
      try { window._updateDebugPanelCounts && window._updateDebugPanelCounts(); } catch(e){}
      return entry;
    } catch (e) { __origConsole.error('[debug.pushLog error]', e); }
  }

  // Primary logging function. Usage: DEBUG_LOG('error', ...), or DEBUG_LOG(...args) for info
  window.DEBUG_LOG = function(levelOrArg, ...rest){
    if (!window.DEBUG) return;
    let level = 'info';
    let args = [];
    if (typeof levelOrArg === 'string' && /^(error|warn|warning|info|debug|trace)$/i.test(levelOrArg)){
      level = levelOrArg.toLowerCase();
      args = rest;
    } else {
      args = [levelOrArg, ...rest];
    }

    // call original console method by level
    try{
      switch(level){
        case 'error': __origConsole.error('[DEBUG][ERROR]', ...args); break;
        case 'warn': case 'warning': __origConsole.warn('[DEBUG][WARN]', ...args); break;
        case 'info': __origConsole.info('[DEBUG][INFO]', ...args); break;
        case 'debug': case 'trace': __origConsole.debug('[DEBUG][DEBUG]', ...args); break;
        default: __origConsole.log('[DEBUG]', ...args); break;
      }
    } catch (e) { /* swallow */ }

    pushLog(level, args);
  };

  // Convenience methods
  window.DEBUG_ERROR = function(...a){ window.DEBUG_LOG('error', ...a); };
  window.DEBUG_WARN = function(...a){ window.DEBUG_LOG('warn', ...a); };
  window.DEBUG_INFO = function(...a){ window.DEBUG_LOG('info', ...a); };
  window.DEBUG_TRACE = function(...a){ window.DEBUG_LOG('debug', ...a); };

  // Dump and export helpers
  window.DEBUG_DUMP = function(limit = 200){
    const data = window._debugLogs.slice(-limit);
    try { __origConsole.table && __origConsole.table(data); } catch(e){}
    return data;
  };
  window.DEBUG_DUMP_TO_FILE = function(opts = { raw: false }){
    try{
      const rawRequested = !!(opts && opts.raw);
      if (rawRequested && !window.DEBUG_ALLOW_RAW) { window.DEBUG_LOG('warn', 'raw export requested but DEBUG_ALLOW_RAW is not true; exporting sanitized logs'); }
      const toExport = (window._debugLogs || []).map(entry => {
        if (rawRequested && window.DEBUG_ALLOW_RAW) return entry;
        return { ts: entry.ts, level: entry.level, msg: entry.msg, args: entry.args };
      });
      window.DUMP_TO_FILE && window.DUMP_TO_FILE('debug_logs', toExport);
    }catch(e){ window.DEBUG_LOG('error','DEBUG_DUMP_TO_FILE error', e) }
  };

  window.DEBUG_CLEAR = function(){ window._debugLogs = []; window._updateDebugPanelCounts && window._updateDebugPanelCounts(); };

  // Re-route ALLLINKS_LOG into DEBUG_LOG for unified UI
  window.ALLLINKS_LOG = function(...args){ if (!window.ALLLINKS_DEBUG) return; window.DEBUG_LOG('info', '[ALLLINKS]', ...args); };

  // Capture console.* events and push into our buffer (without creating recursion)
  try{
    console.error = function(...a){ __origConsole.error(...a); pushLog('error', a); };
    console.warn = function(...a){ __origConsole.warn(...a); pushLog('warn', a); };
    console.info = function(...a){ __origConsole.info(...a); pushLog('info', a); };
    console.debug = function(...a){ __origConsole.debug(...a); pushLog('debug', a); };
    console.log = function(...a){ __origConsole.log(...a); pushLog('info', a); };
  } catch (e) { __origConsole.error('[debug.capture error]', e); }

})();

// Download helper for debug data
window.DUMP_TO_FILE = function(name, obj) {
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.DEBUG_LOG('[DEBUG] dumped', name);
  } catch (e) {
    window.DEBUG_LOG('[DEBUG] DUMP_TO_FILE error', e);
  }
};

// Fetch raw content.md for inspection
window.FETCH_RAW_CONTENT = async function() {
  try {
    const r = await fetch('content.md');
    const txt = await r.text();
    window.DEBUG_LOG('[DEBUG] content.md length', txt.length);
    console.log(txt.split('\n').slice(0,200).join('\n'));
    return txt;
  } catch (e) {
    window.DEBUG_LOG('[DEBUG] FETCH_RAW_CONTENT error', e);
    return null;
  }
};

// Parser dump that prints a compact rows array and also exposes a downloadable JSON
window.PARSER_DUMP = function() {
  if (!window.contentData) return window.DEBUG_LOG('[DEBUG] no contentData');
  const rows = [];
  window.contentData.forEach(item => {
    const title = (item.title && (item.title.fi || item.title.en)) || item.title || 'untitled';
    if (item.url) rows.push({ type: 'primary', title, url: (typeof item.url === 'string' ? item.url : (item.url && (item.url.fi || item.url.en)) || '') });
    const gather = (linkarr) => (linkarr || []).forEach(l => { rows.push({ type: 'additional', title, url: (typeof l.url === 'string' ? l.url : (l.url && (l.url.fi || l.url.en)) || '') , name: (l.name && (l.name.fi || l.name.en)) || '' }); });
    gather(item.links);
    gather(item.linksFI);
    gather(item.linksEN);
    if (item.linkSections) item.linkSections.forEach(sec => gather(sec.links.map(x => ({ url: x.url && (x.url.fi || x.url.en), name: x.name && (x.name.fi || x.name.en) }))))
  });
  console.log('[DEBUG] parser dump rows count=', rows.length);
  console.table(rows.slice(0,200));
  window.DUMP_TO_FILE('parser_dump', rows);
  return rows;
};

// Parser dump as JSON (without automatic download)
window.PARSER_DUMP_JSON = function() {
  if (!window.contentData) return window.DEBUG_LOG('[DEBUG] no contentData');
  const obj = { items: window.contentData.length, mainTags: Object.keys(window.mainTagDefinitions || {}).length, tagDefs: Object.keys(window.tagDefinitions || {}).length, rows: window.PARSER_DUMP && window.PARSER_DUMP() };
  console.log('[DEBUG] parser dump summary', obj);
  return obj;
};

// Measure parse time by fetching and re-parsing using the site's parser
window.TIME_PARSE = async function() {
  try {
    if (typeof performance === 'undefined') globalThis.performance = { now: Date.now };
    const txt = await window.FETCH_RAW_CONTENT();
    if (!txt) return null;
    if (typeof window.parseMarkdownContent !== 'function') return window.DEBUG_LOG('[DEBUG] parseMarkdownContent not available');
    const t0 = performance.now();
    const parsed = window.parseMarkdownContent(txt);
    const dt = performance.now() - t0;
    const summary = { ms: dt, items: (parsed && parsed.content && parsed.content.length) || 0, mainTags: Object.keys(parsed.mainTagDefinitions || {}).length };
    window.DEBUG_LOG('[DEBUG] TIME_PARSE', summary);
    window._lastParse = parsed;
    window._lastParseTime = dt;
    return summary;
  } catch (e) {
    window.DEBUG_LOG('[DEBUG] TIME_PARSE error', e);
    return null;
  }
};

// Parser-level validation: runs only when debug.js is loaded
window.PARSER_VALIDATE = function(parsed) {
    try {
        const items = parsed?.content || window.contentData || (window._lastParse && window._lastParse.content) || [];
        const invalidUrls = [];
        const siteRoot = [];
        const missingName = [];
        const anomalies = [];
        const origin = window.location && window.location.origin;
        const isValidUrl = (u) => typeof u === 'string' && (/^https?:\/\//i.test(u) || /^mailto:/i.test(u) || /^tel:/i.test(u));

        items.forEach((item, i) => {
            const title = (item.title && (item.title.fi || item.title.en)) || item.title || 'untitled';
            // check main URL
            if (item.url) {
                const url = typeof item.url === 'string' ? item.url : (item.url && (item.url.fi || item.url.en)) || '';
                try {
                    const u = new URL(url, origin);
                    if (!isValidUrl(url)) invalidUrls.push({ i, title, field: 'item.url', url });
                    if (url === SITE_URL || (origin && u.origin === origin)) siteRoot.push({ i, title, field: 'item.url', url });
                } catch (e) { invalidUrls.push({ i, title, field: 'item.url', url }); }
            }

            // helper to check link-like objects
            const checkLink = (link, ctx) => {
                if (!link) return;
                const url = (typeof link.url === 'string') ? link.url : (link.url && (link.url.fi || link.url.en)) || '';
                const name = (link.name && (link.name.fi || link.name.en)) || link.name || '';
                if (!url || !isValidUrl(url)) invalidUrls.push({ i, title, field: ctx, url, name });
                else {
                    try {
                        const u = new URL(url, origin);
                        if (url === SITE_URL || (origin && u.origin === origin)) siteRoot.push({ i, title, field: ctx, url, name });
                    } catch (e) { invalidUrls.push({ i, title, field: ctx, url, name }); }
                }
                if (!name || name.trim().length < 3) missingName.push({ i, title, field: ctx, url, name });
            };

            // old-style array links
            (item.links || []).forEach((l, idx) => checkLink(l, `links[${idx}]`));
            (item.linksFI || []).forEach((l, idx) => checkLink(l, `linksFI[${idx}]`));
            (item.linksEN || []).forEach((l, idx) => checkLink(l, `linksEN[${idx}]`));
            // YAML-style linkSections
            (item.linkSections || []).forEach((sec, sidx) => {
                (sec.links || []).forEach((l, idx) => checkLink(l, `linkSections[${sidx}].links[${idx}]`));
            });
        });

        const summary = { totalItems: items.length, invalidUrls: invalidUrls.length, missingName: missingName.length, siteRoot: siteRoot.length };
        window.DEBUG_LOG('[PARSER_VALIDATE] summary', summary);
        if (invalidUrls.length) window.DEBUG_LOG('warn','PARSER_INVALID_URLS', invalidUrls.slice(0,50));
        if (missingName.length) window.DEBUG_LOG('warn','PARSER_MISSING_NAMES', missingName.slice(0,50));
        if (siteRoot.length) window.DEBUG_LOG('warn','PARSER_SITE_ROOT_URLS', siteRoot.slice(0,50));

        // Update UI badge in debug panel when debug.js is loaded
        try {
            const badge = document.getElementById('dbg-parse-warning');
            if (badge) {
                const totalIssues = invalidUrls.length + missingName.length + siteRoot.length;
                const parts = [];
                if (invalidUrls.length) parts.push(`invalid URLs: ${invalidUrls.length}`);
                if (missingName.length) parts.push(`missing names: ${missingName.length}`);
                if (siteRoot.length) parts.push(`site-root URLs: ${siteRoot.length}`);
                const tooltip = parts.length ? parts.join('; ') : 'No parser issues';

                if (totalIssues > 0) {
                    badge.style.display = 'block';
                    badge.textContent = `PARSER: ${totalIssues} issue${totalIssues===1? '':'s'}`;
                    badge.style.background = invalidUrls.length ? '#7f1d1d' : (missingName.length ? '#92400e' : '#1e40af');
                    badge.title = tooltip;
                    badge.setAttribute('aria-label', tooltip);
                } else {
                    badge.style.display = 'none';
                    badge.textContent = 'PARSER: 0 issues';
                    badge.title = 'No parser issues';
                    badge.setAttribute('aria-label', 'No parser issues');
                }
            }
        } catch (e) { window.DEBUG_LOG && window.DEBUG_LOG('warn','update parse badge failed', e); }

        return { summary, invalidUrls, missingName, siteRoot };
    } catch (e) {
        window.DEBUG_LOG('error','PARSER_VALIDATE error', e);
        return null;
    }
};

// Auto-run parser validation when debug.js is loaded and content becomes available
window.addEventListener && window.addEventListener('contentLoaded', function(e){
    try {
        // run shortly after event to allow other debug-friendly hooks to attach
        setTimeout(() => { window.PARSER_VALIDATE && window.PARSER_VALIDATE(e && e.detail ? e.detail : null); window._updateDebugPanelCounts && window._updateDebugPanelCounts(); }, 20);
    } catch (err) { window.DEBUG_LOG('error','contentLoaded validation error', err); }
});
window.ALLLINKS_VALIDATE = function() {
  try {
    const links = window._currentAllLinks || window.ALLLINKS_DUMP() || [];
    const invalidProtocol = [];
    const siteRoot = [];
    const missingName = [];
    const duplicates = [];
    const seen = new Map();
    const origin = window.location && window.location.origin;

    links.forEach((l, i) => {
      const url = (l.url || '').trim();
      try {
        const u = new URL(url, origin);
        if (!/^https?:/i.test(u.protocol) && !/^mailto:|^tel:/i.test(url)) invalidProtocol.push({ i, url, name: l.name });
        if (url === SITE_URL || (origin && u.origin === origin)) siteRoot.push({ i, url, name: l.name });
      } catch (e) {
        invalidProtocol.push({ i, url, name: l.name });
      }
      if (!l.name || !l.name.trim() || l.name.trim().length < 3) missingName.push({ i, url, name: l.name });
      const key = (url || '').toLowerCase();
      if (seen.has(key)) {
        duplicates.push({ first: seen.get(key), dup: i, url });
      } else {
        seen.set(key, i);
      }
    });

    console.group('[DEBUG][ALLLINKS] validation');
    console.log('total links', links.length);
    if (invalidProtocol.length) console.warn('invalidProtocol', invalidProtocol.slice(0,20));
    if (siteRoot.length) console.warn('siteRoot', siteRoot.slice(0,20));
    if (missingName.length) console.warn('missingName', missingName.slice(0,20));
    if (duplicates.length) console.warn('duplicates', duplicates.slice(0,20));
    console.groupEnd();

    return { total: links.length, invalidProtocol, siteRoot, missingName, duplicates };
  } catch (e) {
    window.ALLLINKS_LOG('[DEBUG] ALLLINKS_VALIDATE error', e);
    return null;
  }
};

// Global error capture
window.addEventListener && window.addEventListener('error', function(e) {
  window.DEBUG_LOG('[ERROR]', e && e.message, e && e.filename, e && e.lineno, e && e.error && e.error.stack);
});
window.addEventListener && window.addEventListener('unhandledrejection', function(e) {
  window.DEBUG_LOG('[UNHANDLED]', e && e.reason);
});

// Enhanced on-page debug panel with severity indicators and detailed viewer
(function createDebugPanel(){
  if (!window.ALLLINKS_DEBUG) return;
  try {
    const panelId = 'debug-panel';
    if (document.getElementById(panelId)) return;

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.style.cssText = 'position:fixed;right:12px;bottom:12px;background:linear-gradient(180deg,#0f172a,#0b1220);color:#fff;padding:10px;border-radius:10px;border-left:4px solid transparent;font-family:Arial,sans-serif;font-size:13px;z-index:99999;min-width:200px;box-shadow:0 8px 30px rgba(2,6,23,0.6);';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <strong style="font-size:12px">DEBUG</strong>
        <div style="display:flex;align-items:center;gap:6px">
          <span id="dbg-badge-error" aria-label="Errors: Number of error-level logs (click LOGS to inspect)" title="Errors: Number of error-level logs (click LOGS to inspect)" style="min-width:30px;padding:4px 8px;border-radius:999px;background:#7f1d1d;color:#fff;font-weight:600;text-align:center;font-size:12px;display:inline-flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17h.01" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.73 3h16.9a2 2 0 001.73-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" stroke-width="0.6" fill="rgba(0,0,0,0.08)"/></svg><span class="dbg-badge-count">0</span></span>
          <span id="dbg-badge-warn" aria-label="Warnings: Non-fatal issues (click LOGS to inspect)" title="Warnings: Non-fatal issues (click LOGS to inspect)" style="min-width:30px;padding:4px 8px;border-radius:999px;background:#92400e;color:#fff;font-weight:600;text-align:center;font-size:12px;display:inline-flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 001.73 3h16.9a2 2 0 001.73-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" stroke-width="0.6" fill="rgba(0,0,0,0.04)"/><path d="M12 9v4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17h.01" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="dbg-badge-count">0</span></span>
          <span id="dbg-badge-info" aria-label="Info: Informational messages (click LOGS to inspect)" title="Info: Informational messages (click LOGS to inspect)" style="min-width:30px;padding:4px 8px;border-radius:999px;background:#1e40af;color:#fff;font-weight:600;text-align:center;font-size:12px;display:inline-flex;align-items:center;gap:6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="0.8" fill="rgba(255,255,255,0.02)"/><path d="M11 10h2M11 14h2" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="dbg-badge-count">0</span></span>
          <button id="debug-panel-toggle" style="background:transparent;border:none;color:#fff;cursor:pointer;font-size:14px;padding:4px 6px">✕</button>
        </div>
      </div>
      <div id="debug-panel-body" style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div id="dbg-counts" style="font-size:12px;opacity:0.95">items: - | links: -</div>
          <div id="dbg-status" style="font-size:11px;opacity:0.8">Compact: OFF</div>
          <div id="dbg-parse-warning" style="font-size:12px;margin-top:6px;display:none;cursor:pointer;padding:6px;border-radius:6px;background:#7f1d1d;color:#fff;">PARSER: 0 issues</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button id="dbg-pdump" style="padding:6px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">PARSER</button>
          <button id="dbg-ldump" style="padding:6px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">ALLLINKS</button>
          <button id="dbg-validate" style="padding:6px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">VALID</button>
          <button id="dbg-show-logs" style="padding:6px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">LOGS</button>
          <button id="dbg-export-logs" style="padding:6px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">EXPORT</button>
          <button id="dbg-clear-logs" style="padding:6px;border-radius:6px;background:#7f1d1d;border:none;color:#fff;cursor:pointer">CLEAR</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    // compact toggle button - switch to badge-only compact mode
    const compactBtn = document.createElement('button');
    compactBtn.id = 'dbg-compact-toggle';
    compactBtn.title = 'Toggle compact (badge-only) mode';
    compactBtn.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,0.04);color:#fff;border-radius:6px;padding:4px 6px;cursor:pointer;margin-right:6px;font-size:12px';
    compactBtn.textContent = 'Compact';
    // insert compactBtn before the close button
    const headerRight = panel.querySelector('div > div:last-child');
    if (headerRight) headerRight.insertBefore(compactBtn, headerRight.querySelector('#debug-panel-toggle'));

    document.getElementById('debug-panel-toggle').onclick = () => panel.remove();
    document.getElementById('dbg-pdump').onclick = () => { window.PARSER_DUMP && window.PARSER_DUMP(); updateCounts(); };
    document.getElementById('dbg-ldump').onclick = () => { window.ALLLINKS_DUMP && window.ALLLINKS_DUMP(); updateCounts(); };
    document.getElementById('dbg-validate').onclick = () => { window.PARSER_VALIDATE && window.PARSER_VALIDATE(); window.ALLLINKS_VALIDATE && window.ALLLINKS_VALIDATE(); };
    document.getElementById('dbg-export-logs').onclick = () => { window.DEBUG_DUMP_TO_FILE && window.DEBUG_DUMP_TO_FILE(); };
    document.getElementById('dbg-clear-logs').onclick = () => { window.DEBUG_CLEAR && window.DEBUG_CLEAR(); updateCounts(); };

    // Create expandable log overlay (hidden by default)
    const overlay = document.createElement('div');
    overlay.id = 'debug-log-overlay';
    overlay.style.cssText = 'position:fixed;right:12px;bottom:70px;max-height:60vh;overflow:auto;width:580px;background:#071028;border-radius:8px;padding:12px;color:#fff;box-shadow:0 12px 40px rgba(2,6,23,0.7);z-index:999999;display:none;font-family:monospace;font-size:13px;';
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <strong>Debug logs</strong>
          <button data-filter="all" style="padding:4px 8px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">All</button>
          <button data-filter="error" style="padding:4px 8px;border-radius:6px;background:#7f1d1d;border:none;color:#fff;cursor:pointer">Error</button>
          <button data-filter="warn" style="padding:4px 8px;border-radius:6px;background:#92400e;border:none;color:#fff;cursor:pointer">Warn</button>
          <button data-filter="info" style="padding:4px 8px;border-radius:6px;background:#1e40af;border:none;color:#fff;cursor:pointer">Info</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="dbg-download" style="padding:6px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">Download</button>
          <button id="dbg-close" style="padding:4px 8px;border-radius:6px;background:#0b1220;border:1px solid #1f2937;color:#fff;cursor:pointer">Close</button>
        </div>
      </div>
      <div id="dbg-log-rows" style="display:flex;flex-direction:column;gap:6px;">
        <div style="opacity:0.7;font-size:12px">No logs yet</div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('dbg-show-logs').onclick = () => {
      overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
      renderLogRows(currentFilter);
    };

    // Clicking the parser warning badge opens logs and filters to warnings
    const parseWarningEl = document.getElementById('dbg-parse-warning');
    if (parseWarningEl) {
      parseWarningEl.onclick = () => {
        // ensure logs overlay is visible and set filter to 'warn'
        document.getElementById('dbg-show-logs').click();
        setTimeout(() => {
          try {
            const warnBtn = document.querySelector('#debug-log-overlay button[data-filter="warn"]');
            if (warnBtn) warnBtn.click();
          } catch (e) { window.DEBUG_LOG && window.DEBUG_LOG('warn','parseWarning click handler failed', e); }
        }, 80);
      };
    }
    document.getElementById('dbg-download').onclick = () => { window.DEBUG_DUMP_TO_FILE && window.DEBUG_DUMP_TO_FILE(); };
    document.getElementById('dbg-close').onclick = () => { overlay.style.display = 'none'; };

    // filter buttons in overlay
    let currentFilter = 'all';
    overlay.querySelectorAll('button[data-filter]').forEach(btn => {
      btn.onclick = () => { currentFilter = btn.getAttribute('data-filter'); renderLogRows(currentFilter); };
    });

    // Compact mode toggle handler
    function setCompactMode(on){
      try{
        window.DEBUG_COMPACT = on ? 'badge' : false;
        const body = document.getElementById('debug-panel-body');
        const statusEl = document.getElementById('dbg-status');
        const compactBtnEl = document.getElementById('dbg-compact-toggle');
        if (!body) return;
        if (on){
          body.style.display = 'none';
          panel.style.minWidth = 'auto';
          panel.setAttribute('data-compact','1');
          if (statusEl) statusEl.textContent = 'Compact: ON';
          if (compactBtnEl) { compactBtnEl.textContent = 'Compact ✓'; compactBtnEl.setAttribute('aria-pressed','true'); }
        } else {
          body.style.display = '';
          panel.style.minWidth = '200px';
          panel.removeAttribute('data-compact');
          if (statusEl) statusEl.textContent = 'Compact: OFF';
          if (compactBtnEl) { compactBtnEl.textContent = 'Compact'; compactBtnEl.setAttribute('aria-pressed','false'); }
        }
      }catch(e){ window.DEBUG_LOG('warn','setCompactMode error', e); }
    }

    compactBtn.onclick = () => { const on = !(window.DEBUG_COMPACT === 'badge'); setCompactMode(on); };

    // clicking a badge when compact will open the panel (and reveal logs)
    ['dbg-badge-error','dbg-badge-warn','dbg-badge-info'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.cursor = 'pointer';
      el.onclick = (e) => {
        if (window.DEBUG_COMPACT === 'badge') {
          setCompactMode(false);
          // open logs viewer to show relevant entries
          document.getElementById('dbg-show-logs').click();
        } else {
          // if not compact, open logs and filter by level
          const lvl = id.includes('error') ? 'error' : (id.includes('warn') ? 'warn' : 'info');
          overlay.style.display = 'block';
          currentFilter = lvl;
          renderLogRows(currentFilter);
        }
      };
    });

    // Add pulse animation CSS
    const styleEl = document.createElement('style');
    styleEl.textContent = `@keyframes dbgPulse { 0% { transform: scale(1); } 30% { transform: scale(1.14); } 60% { transform: scale(0.98); } 100% { transform: scale(1); } } .dbg-pulse { animation: dbgPulse 850ms cubic-bezier(.2,.8,.2,1); }`;
    document.head.appendChild(styleEl);

    // helper to pulse a badge when new entries arrive while compact
    function pulseBadge(id){
      try{
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('dbg-pulse');
        // force reflow
        void el.offsetWidth;
        el.classList.add('dbg-pulse');
        setTimeout(() => el.classList.remove('dbg-pulse'), 1000);
      } catch(e){}
    }

    // integrate pulse on new errors detection in updateCounts (uses _prevDebugCounts)
    window._prevDebugCounts = window._prevDebugCounts || { err:0, warn:0, info:0 };
    const origUpdate = window._updateDebugPanelCounts;
    window._updateDebugPanelCounts = function(){
      try{
        const prev = window._prevDebugCounts || { err:0, warn:0, info:0 };
        origUpdate();
        const err = (window._debugLogs || []).filter(l => l.level === 'error').length;
        const warn = (window._debugLogs || []).filter(l => l.level === 'warn').length;
        const info = (window._debugLogs || []).filter(l => l.level === 'info').length;
        if (window.DEBUG_COMPACT === 'badge' && err > prev.err) pulseBadge('dbg-badge-error');
        if (window.DEBUG_COMPACT === 'badge' && warn > prev.warn) pulseBadge('dbg-badge-warn');
        if (window.DEBUG_COMPACT === 'badge' && info > prev.info) pulseBadge('dbg-badge-info');
        window._prevDebugCounts = { err, warn, info };
      } catch(e){ window.DEBUG_LOG('warn','updateCounts wrapper error', e); }
    };
    // ensure initial compact mode respects window.DEBUG_COMPACT
    if (window.DEBUG_COMPACT === 'badge') setCompactMode(true);

    function renderLogRows(filter){
      const rowsContainer = document.getElementById('dbg-log-rows');
      if (!rowsContainer) return;
      const logs = (window._debugLogs || []).slice(-500).reverse();
      const filtered = filter === 'all' ? logs : logs.filter(r => r.level === filter);
      if (filtered.length === 0){ rowsContainer.innerHTML = '<div style="opacity:0.7;font-size:12px">No logs for this filter</div>'; return; }
      rowsContainer.innerHTML = '';
      filtered.forEach(l => {
        const entry = document.createElement('div');
        entry.style.cssText = 'padding:8px;border-radius:6px;background:rgba(255,255,255,0.02);display:flex;gap:8px;align-items:flex-start;';
        const levelColor = l.level === 'error' ? '#7f1d1d' : (l.level === 'warn' ? '#92400e' : (l.level === 'info' ? '#1e40af' : '#374151'));
        const iconSvg = l.level === 'error' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17h.01" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.73 3h16.9a2 2 0 001.73-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" stroke-width="0.6" fill="rgba(0,0,0,0.06)"/></svg>' : (l.level === 'warn' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.29 3.86L1.82 18a2 2 0 001.73 3h16.9a2 2 0 001.73-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#fff" stroke-width="0.6" fill="rgba(0,0,0,0.04)"/><path d="M12 9v4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17h.01" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="0.8" fill="rgba(255,255,255,0.02)"/><path d="M11 10h2M11 14h2" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        const levelPill = `<span style="min-width:64px;display:inline-flex;align-items:center;gap:8px;padding:4px 8px;border-radius:6px;background:${levelColor};font-weight:600;font-size:11px;text-align:center;margin-right:8px">${iconSvg}<span style="font-weight:700">${l.level.toUpperCase()}</span></span>`;
        entry.innerHTML = `${levelPill}<div style="flex:1"><div style="font-size:11px;opacity:0.7">${l.ts}</div><div style="white-space:pre-wrap;margin-top:6px">${escapeHtml(l.msg)}</div></div>`;
        entry.onclick = () => { copyToClipboard(l.msg); }; // click to copy
        rowsContainer.appendChild(entry);
      });
    }

    function escapeHtml(s){ return (s || '').toString().replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; }); }
    function copyToClipboard(text){ try{ navigator.clipboard && navigator.clipboard.writeText(text); window.DEBUG_LOG('info','copied to clipboard'); } catch(e){ window.DEBUG_LOG('warn','copy failed', e); } }

    // counters: items & links & by severity
    window._updateDebugPanelCounts = function(){
      try{
        const items = (window.contentData && window.contentData.length) || 0;
        const links = (window._currentAllLinks && window._currentAllLinks.length) || 0;
        const err = (window._debugLogs || []).filter(l => l.level === 'error').length;
        const warn = (window._debugLogs || []).filter(l => l.level === 'warn').length;
        const info = (window._debugLogs || []).filter(l => l.level === 'info').length;
        document.getElementById('dbg-counts').textContent = `items: ${items} | links: ${links}`;
        // update badge counts
        const be = document.getElementById('dbg-badge-error'); if (be) be.querySelector('.dbg-badge-count').textContent = String(err);
        const bw = document.getElementById('dbg-badge-warn'); if (bw) bw.querySelector('.dbg-badge-count').textContent = String(warn);
        const bi = document.getElementById('dbg-badge-info'); if (bi) bi.querySelector('.dbg-badge-count').textContent = String(info);

        // Determine highest severity present and colorize the panel border-left accordingly
        const panelEl = document.getElementById('debug-panel');
        if (panelEl) {
          if (err > 0) {
            panelEl.style.borderLeftColor = '#7f1d1d';
            panelEl.style.boxShadow = '0 10px 36px rgba(127,29,29,0.25)';
          } else if (warn > 0) {
            panelEl.style.borderLeftColor = '#92400e';
            panelEl.style.boxShadow = '0 10px 36px rgba(146,64,14,0.18)';
          } else if (info > 0) {
            panelEl.style.borderLeftColor = '#1e40af';
            panelEl.style.boxShadow = '0 10px 36px rgba(30,64,175,0.12)';
          } else {
            panelEl.style.borderLeftColor = 'transparent';
            panelEl.style.boxShadow = '0 8px 30px rgba(2,6,23,0.6)';
          }
          // update compact status text if present
          try {
            const statusEl = document.getElementById('dbg-status');
            if (statusEl) statusEl.textContent = window.DEBUG_COMPACT === 'badge' ? 'Compact: ON' : 'Compact: OFF';
          } catch(e){}
        }

      } catch (e) { /* ignore */ }
    };

    // render logs every time panel opens and periodically update counts
    setInterval(() => { window._updateDebugPanelCounts(); if (overlay.style.display === 'block') renderLogRows(currentFilter); }, 1500);
    setTimeout(() => { window._updateDebugPanelCounts(); }, 400);

  } catch (e) { window.DEBUG_LOG && window.DEBUG_LOG('error','[DEBUG PANEL ERROR]', e); }
})();

// End of debug helpers

