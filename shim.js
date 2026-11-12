/* Trójnóg na iPhone'a (aplikacja z przeglądarki): zamiast mostka Androida – pamięć przeglądarki (IndexedDB),
   pliki przez okno wyboru, udostępnianie systemowe. Interfejs i dane – te same co w telefonie z Androidem. */
(function () {
  'use strict';
  const DBN = 'trojnog', ST = ['kv', 'texts', 'pdf', 'photos'];
  let db = null;
  const T = {}, PH = {}, PDFB = {};               // pamięć podręczna: teksty, adresy zdjęć, ostatnio wybrane PDF
  let STATE = '';
  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => ST.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  const tx = (s, m) => db.transaction(s, m).objectStore(s);
  const idb = (s, m, f) => new Promise((res, rej) => { const q = f(tx(s, m)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  const put = (s, k, v) => idb(s, 'readwrite', o => o.put(v, k)).catch(() => {});
  const get = (s, k) => idb(s, 'readonly', o => o.get(k));
  const del = (s, k) => idb(s, 'readwrite', o => o.delete(k)).catch(() => {});
  function all(s) {
    return new Promise(res => {
      const out = {}, c = tx(s, 'readonly').openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); };
      c.onerror = () => res(out);
    });
  }
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* pełno */ } } };
  const toast = t => { if (window.toast) window.toast(t); };
  const cb = (fn, ...a) => setTimeout(() => { if (typeof window[fn] === 'function') window[fn](...a); }, 0);

  /** Wybór pliku – musi ruszyć w tym samym dotknięciu, więc bez czekania przed click(). */
  function pick(accept, multi, capture) {
    return new Promise(res => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = accept; if (multi) i.multiple = true; if (capture) i.capture = 'environment';
      i.style.display = 'none'; document.body.appendChild(i);
      i.onchange = () => { res(Array.from(i.files || [])); i.remove(); };
      i.click();
    });
  }
  async function saveFile(blob, name) {
    const f = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  /* ---- PDF ---- */
  const meta = () => { try { return JSON.parse(ls.get('pz_pdfmeta') || '{}'); } catch (e) { return {}; } };
  async function pdfjs() { if (!window.pdfjsLib) { await window.loadScript('lib/pdf.worker.min.js'); await window.loadScript('lib/pdf.min.js'); } return window.pdfjsLib; }
  const docs = {};
  async function bytes(key) { if (PDFB[key]) return PDFB[key]; const b = await get('pdf', key); if (!b) return null; const u = new Uint8Array(await b.arrayBuffer()); return u; }
  async function doc(key) { if (!docs[key]) docs[key] = (async () => (await pdfjs()).getDocument({ data: await bytes(key), isEvalSupported: false }).promise)(); return docs[key]; }
  /* ---- sieć: najpierw wprost; gdy strona nie pozwala (CORS) – przez arkusz wspólnoty ---- */
  async function viaSheet(url) {
    if (typeof S === 'undefined' || !S.syncUrl || !S.syncToken) throw new Error('brak połączenia z arkuszem');
    const r = await fetch(S.syncUrl, { method: 'POST', body: JSON.stringify({ token: S.syncToken, action: 'get', url: url }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    const j = JSON.parse(await r.text()); if (!j.ok) throw new Error(j.error || 'błąd'); return j.text;
  }
  async function http(url, body) {
    if (body === undefined) {
      try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); } catch (e) { return viaSheet(url); }
    }
    const r = await fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    const t = await r.text(); if (!r.ok) throw new Error('HTTP ' + r.status); return t;
  }
  const sync = (id, p) => p.then(t => cb('__syncCb', id, true, t), e => cb('__syncCb', id, false, String(e && e.message || e)));

  window.Android = {
    web: true,
    version: () => window.TROJNOG_VER || '',
    loadState: () => STATE,
    saveState: t => { STATE = t; ls.set('pz_state', t); put('kv', 'state', t); return true; },
    saveText: (n, t) => { T[n] = t; if (t) put('texts', n, t); else del('texts', n); return true; },
    loadText: n => T[n] || '',
    openUrl: u => { if (/^(tel|sms|mailto|whatsapp):/i.test(u)) location.href = u; else window.open(u, '_blank'); },
    share: t => { if (navigator.share) navigator.share({ text: t }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('Skopiowano do schowka.')); },
    exportFile: (t, n, m) => saveFile(new Blob([t], { type: m || 'text/plain' }), n),
    exportData: (t, n) => saveFile(new Blob([t], { type: 'application/json' }), n),
    importData: () => { pick('.json,application/json,text/plain', false).then(f => { if (f[0]) f[0].text().then(t => cb('onImport', t)); }); },
    printHtml: (h, title) => {
      const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
      document.body.appendChild(f); const d = f.contentWindow.document; d.open(); d.write(h); d.close();
      setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Drukowanie niedostępne.'); } setTimeout(() => f.remove(), 60000); }, 400);
    },
    pickPdf: key => {
      pick('application/pdf,.pdf', false).then(async f => {
        if (!f[0]) return;
        try {
          const u = new Uint8Array(await f[0].arrayBuffer());
          PDFB[key] = u; delete docs[key];
          if (key !== 'rzimp') await put('pdf', key, new Blob([u], { type: 'application/pdf' }));
          const d = await doc(key), m = meta(); m[key] = d.numPages; ls.set('pz_pdfmeta', JSON.stringify(m));
          cb('onPdfPicked', key, true);
        } catch (e) { cb('onPdfPicked', key, false); }
      });
    },
    pdfPages: key => meta()[key] || 0,
    pdfBytes: key => bytes(key),
    renderPdf: () => '',
    renderPdfAsync: async (key, index, width) => {
      const d = await doc(key), page = await d.getPage(index + 1);
      const v0 = page.getViewport({ scale: 1 }), sc = Math.max(400, Math.min(width, 2000)) / v0.width, vp = page.getViewport({ scale: sc });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, viewport: vp }).promise;
      return c.toDataURL('image/jpeg', 0.85);
    },
    openPdfExternal: key => { bytes(key).then(u => { if (u) window.open(URL.createObjectURL(new Blob([u], { type: 'application/pdf' })), '_blank'); }); return meta()[key] > 0; },
    takePhoto: () => addPhotos(pick('image/*', false, true)),
    pickPhotos: () => addPhotos(pick('image/*', true)),
    pickImage: target => { pick('image/*', false).then(f => { if (!f[0]) return; const r = new FileReader(); r.onload = () => cb('onImagePicked', target, r.result); r.readAsDataURL(f[0]); }); },
    photoSrc: u => PH[u] || '',
    openPhoto: u => { if (PH[u]) window.open(PH[u], '_blank'); },
    sharePhoto: u => { get('photos', u).then(b => { if (b) saveFile(b, 'zdjecie.jpg'); }); },
    sync: (url, body, id) => sync(id, http(url, body)),
    httpGet: (url, id) => sync(id, http(url))
  };
  async function addPhotos(p) {
    const files = await p;
    for (const f of files) {
      const id = 'idb:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const b = await shrink(f); await put('photos', id, b); PH[id] = URL.createObjectURL(b);
      cb('onPhoto', id);
    }
  }
  /** Zdjęcie do 2000 px (JPEG) – oszczędza miejsce w telefonie. */
  function shrink(f) {
    return new Promise(res => {
      const im = new Image(), u = URL.createObjectURL(f);
      im.onload = () => {
        const k = Math.min(1, 2000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u); c.toBlob(b => res(b || f), 'image/jpeg', 0.86);
      };
      im.onerror = () => { URL.revokeObjectURL(u); res(f); };
      im.src = u;
    });
  }

  /** Start: wczytaj dane z pamięci przeglądarki, potem uruchom aplikację (te same pliki co w Androidzie). */
  window.TROJNOG_BOOT = async function (scripts) {
    try {
      db = await open();
      STATE = (await get('kv', 'state')) || ls.get('pz_state') || '';
      Object.assign(T, await all('texts'));
      const ph = await all('photos'); Object.keys(ph).forEach(k => { PH[k] = URL.createObjectURL(ph[k]); });
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) { STATE = ls.get('pz_state') || ''; }
    document.documentElement.classList.add('web');
    for (const s of scripts) await new Promise((res, rej) => { const el = document.createElement('script'); el.src = s; el.onload = res; el.onerror = rej; document.body.appendChild(el); });
  };
})();
