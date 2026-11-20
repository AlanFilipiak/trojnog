/* Trójnóg – Biblioteka (Mszalik, Pesach, Tematy z czytaniami) z wyszukiwarką + transpozycja akordów w Śpiewniku.
   Pliki PDF wskazuje użytkownik (jak Śpiewnik i Słownik) – aplikacja ich nie zawiera ani nie rozsyła. */
(function () {
  'use strict';
  const DOCS = {
    mszalik: { t: 'Mszalik', d: 'wypisy z Mszału i Rytuału', full: true },
    pesach: { t: 'Pesach', d: 'ABC judaizmu – Pascha', full: true },
    tematy: { t: 'Tematy', d: 'czytania do haseł Słownika, prekatechumenat', full: false },
    nuty: { t: 'Śpiewnik z nutami', d: 'nuty pieśni – szukaj po tekście', full: true },
  };
  const OWN = { songbook: 'Śpiewnik', slownik: 'Słownik' };   // mają własne widoki – w Bibliotece jako zakładki
  /** Własne książki użytkownika (dowolny PDF) – klucz b_xxxx. */
  function syncBooks() {
    Object.keys(DOCS).forEach(k => { if (DOCS[k].own) delete DOCS[k]; });
    (S.books || []).forEach(b => { DOCS[b.k] = { t: b.t, d: 'moja książka', full: true, own: true }; });
    Object.keys(DOCS).forEach(k => { PDF_NAMES[k] = '„' + DOCS[k].t + '”'; });
  }
  syncBooks();
  /** Kafelki książek na ekranie głównym (S.libTiles[klucz] = 1). */
  function tiles() { syncBooks(); const T = S.libTiles || {}; return Object.keys(T).filter(k => T[k] && DOCS[k]).map(k => ['lib:' + k, DOCS[k].t, 'Biblioteka']); }
  const letterIcon = t => '<rect class="f" x="9" y="7" width="30" height="35" rx="3"/><path d="M14 7v35"/><text x="27" y="32" text-anchor="middle" font-size="20" font-family="Georgia,serif" font-weight="700" fill="currentColor" stroke="none">' + esc((t || '?').trim().charAt(0).toUpperCase()) + '</text>';
  const LD = {};   // dane po skanowaniu: { pages:[], toc:[{t,p}], pre:[{n,t,h,p}], idx:{HASŁO:p} }
  const ld = k => { if (LD[k] === undefined) { try { LD[k] = JSON.parse((A && A.loadText ? A.loadText('lib_' + k + '.json') : localStorage.getItem('pz_lib_' + k + '.json')) || 'null'); } catch (e) { LD[k] = null; } } return LD[k]; };
  const keep = (k, d) => { LD[k] = d; const t = JSON.stringify(d); try { if (A && A.saveText) A.saveText('lib_' + k + '.json', t); else localStorage.setItem('pz_lib_' + k + '.json', t); } catch (e) { /* brak miejsca */ } };

  /* ---------- pdf.js: dokument w pamięci ---------- */
  const DOC = {};
  async function bytesOf(key) {
    if (A.pdfBytes) return A.pdfBytes(key);
    const b64 = A.pdfBase64 ? A.pdfBase64(key) : '';
    if (!b64) throw new Error('nie można odczytać pliku');
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  async function doc(key) {
    if (!window.pdfjsLib) { await loadScript('lib/pdf.worker.min.js'); await loadScript('lib/pdf.min.js'); }
    if (!DOC[key]) DOC[key] = (A.pdfStream || A.renderPdfAsync   // telefon (nowy most) i komputer: plik po adresie, częściami – duże PDF-y nie zapychają pamięci
      ? pdfjsLib.getDocument({ url: 'https://app.przygotowanie/pdf/' + key + '.pdf', isEvalSupported: false, disableAutoFetch: true, rangeChunkSize: 262144 }).promise
      : bytesOf(key).then(b => pdfjsLib.getDocument({ data: b, isEvalSupported: false }).promise)).catch(e => { delete DOC[key]; throw e; });
    return DOC[key];
  }
  /** Tekst strony w liniach (grupowanie po wysokości) – do spisów treści. */
  async function pageLines(pdf, i) {
    const tc = await (await pdf.getPage(i + 1)).getTextContent(), rows = [];
    tc.items.forEach(it => {
      if (!it.str.trim()) return;
      const y = it.transform[5], r = rows.find(z => Math.abs(z.y - y) < 2.5);
      (r || (rows.push({ y: y, a: [] }), rows[rows.length - 1])).a.push([it.transform[4], it.str]);
    });
    return rows.sort((a, b) => b.y - a.y).map(r => r.a.sort((a, b) => a[0] - b[0]).map(x => x[1]).join(' ').replace(/\s+/g, ' ').trim());
  }
  const TOCRX = /([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż„][^.]{1,90}?)\s*(?:\.\s?){3,}\s*(\d{1,4})(?!\d)/g;
  const cmp = s => norm(s).replace(/[^\p{L}\p{N}]/gu, '');
  /** Przesunięcie: numer strony w spisie → indeks strony PDF. */
  function findOffset(texts, toc) {
    const score = {};
    toc.slice(0, 12).forEach(e => {
      const key = cmp(e.t).slice(0, 14); if (key.length < 4) return;
      texts.forEach((t, i) => { if (t && cmp(t.slice(0, 400)).indexOf(key) >= 0) { const o = i - e.p; score[o] = (score[o] || 0) + 1; } });
    });
    const best = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
    return best === undefined ? 0 : +best;
  }
  const msg = t => { UI.libMsg = t; const m = document.getElementById('libMsg'); if (m) m.textContent = t; };
  async function scan(key) {
    if (UI.libBusy) return;
    UI.libBusy = key; msg('Czytam plik…'); render();
    try {
      const pdf = await doc(key), n = pdf.numPages, lim = DOCS[key].full ? n : Math.min(n, 70), lines = [];
      for (let i = 0; i < lim; i++) {
        lines.push(await pageLines(pdf, i));
        if (i % 5 === 0) { msg('Czytam plik… ' + Math.round(100 * i / lim) + '%'); await new Promise(r => setTimeout(r, 0)); }
      }
      const texts = lines.map(l => l.join(' ').replace(/[\u{1D400}-\u{1D7FF}]/gu, ' '));
      const toc = [], pre = [];
      lines.slice(0, 14).forEach(L => L.forEach(l => {
        const m = l.match(/^(\d{1,3})\s+(.+?)\s*(?:\.\s?){2,}\s*([A-ZĄĆĘŁŃÓŚŹŻ][^.]+?)\s*(?:\.\s?){2,}\s*(\d{1,4})$/);
        if (m) { pre.push({ n: +m[1], t: m[2].trim(), h: m[3].trim(), p: +m[4] }); return; }
        let x; TOCRX.lastIndex = 0;
        while ((x = TOCRX.exec(l))) { const t = x[1].replace(/\s+/g, ' ').trim(); if (!/^(Spis|Tematy prekatechumenatu)/.test(t) && !toc.some(e => e.t === t)) toc.push({ t: t, p: +x[2] }); }
      }));
      const outl = [];   // zakładki PDF (jeśli są) – dokładniejsze niż spis z tekstu
      try {
        const walk = async (L, dep) => { for (const o of L || []) { if (outl.length > 4000) return; const p = o.dest ? await destPage(pdf, o.dest).catch(() => -1) : -1; if (p >= 0 && o.title && !/^(Strona tytułowa|Spis treści)$/i.test(o.title.trim())) outl.push({ t: o.title.trim(), p: p, l: dep }); await walk(o.items, dep + 1); } };
        await walk(await pdf.getOutline(), 0);
      } catch (e) { /* bez zakładek */ }
      const off = findOffset(texts, toc), d = { n: n, off: off, toc: outl.length >= 3 ? outl : toc.map(e => ({ t: e.t, p: e.p + off })), pre: pre.map(e => Object.assign(e, { p: e.p + off })) };
      if (DOCS[key].full) d.pages = texts;
      if (key === 'nuty') { d.sp = {}; texts.forEach((t, i) => { const re = /piewnik[^,]{0,10},\s*str\.?\s*(\d+)/g; let m; while ((m = re.exec(t))) if (d.sp[m[1]] === undefined) d.sp[m[1]] = i; }); }
      keep(key, d);
      msg('Gotowe: ' + (d.pages ? d.pages.length + ' stron do szukania' : 'spis ' + d.toc.length + ' haseł') + (d.toc.length && key !== 'tematy' ? ', spis treści: ' + d.toc.length : '') + (pre.length ? ', tematów prekatechumenatu: ' + pre.length : '') + '.');
    } catch (e) { msg('Nie udało się odczytać pliku (' + (e && e.message || e) + ').'); }
    UI.libBusy = null; render();
  }

  /* ---------- widok Biblioteki ---------- */
  function view() {
    syncBooks();
    const k = DOCS[UI.libK] || OWN[UI.libK] ? UI.libK : 'mszalik', D = DOCS[k], d = ld(k), n = pdfPages(k);
    let h = '<div class="chips">' + Object.keys(OWN).concat(Object.keys(DOCS)).map(x => '<button class="chip' + (x === k ? ' on' : '') + '" data-act="lib-k" data-a="' + x + '">' + (OWN[x] || DOCS[x].t) + '</button>').join('') +
      '<button class="chip" data-act="lib-add">＋ Książka</button></div>';
    if (OWN[k]) return h + (k === 'songbook' ? viewSpiewnik() : viewSlownik());
    const T = S.libTiles || {};
    h += '<label class="row mt"><input type="checkbox" data-ch="lib-tile" data-a="' + k + '"' + (T[k] ? ' checked' : '') + '><span class="grow">Ikona „' + esc(D.t) + '” na ekranie głównym</span></label>' +
      (D.own ? '<button class="btn text sm" data-act="lib-del" data-a="' + k + '">Usuń z biblioteki</button>' : '');
    h += '<div class="card"><h2>' + D.t + '</h2><div class="muted">' + D.d + '</div><div class="row mt"><span class="grow muted">' + (n ? 'Plik wskazany (' + n + ' stron)' : 'Wskaż plik PDF zapisany w telefonie / komputerze.') + '</span>' +
      '<button class="btn ghost" data-act="pick-pdf" data-a="' + k + '">' + (n ? 'Zmień plik' : 'Wskaż plik') + '</button></div>' +
      (n ? '<button class="btn full mt" data-act="lib-open" data-a="0">📖 Otwórz</button><div class="row mt"><span class="grow muted" id="libMsg">' + esc(UI.libBusy === k || UI.libMsgK === k ? UI.libMsg || '' : d ? 'Plik zeskanowany.' : 'Zeskanuj plik, żeby działało szukanie' + (k === 'tematy' ? ' i spis haseł' : '') + '.') + '</span>' +
        '<button class="btn ghost" data-act="lib-scan" data-a="' + k + '"' + (UI.libBusy ? ' disabled' : '') + '>Skanuj</button></div>' : '') + '</div>';
    if (!n) return h;
    h += '<input type="search" id="libq" placeholder="' + (k === 'tematy' ? 'Szukaj hasła…' : 'Szukaj w tekście: słowo, fragment, rubryka…') + '" value="' + esc(UI.libq || '') + '" data-in="libq">' +
      '<div class="list mt" id="liblist">' + list() + '</div>';
    return h;
  }
  function list() {
    const k = UI.libK || 'mszalik', d = ld(k), q = norm((UI.libq || '').trim());
    if (!d) return '<div class="empty-info">Najpierw „Skanuj”.</div>';
    const row = (p, title, sub, nr) => '<div class="opt" data-act="lib-open" data-a="' + p + '"><span class="grow">' + (nr ? '<span class="nr">' + nr + '</span>' : '') + esc(title) + (sub ? '<br><span class="muted">' + sub + '</span>' : '') + '</span><span class="eye">👁</span></div>';
    let h = '';
    if (!q) {
      if (k === 'tematy' && d.pre && d.pre.length) h += '<div class="sec">Tematy prekatechumenatu (' + d.pre.length + ')</div>' + d.pre.map(e => row(e.p, e.t, e.h !== e.t.toUpperCase() ? esc(e.h) : '', e.n)).join('');
      if (d.toc.length) h += '<div class="sec">' + (k === 'tematy' ? 'Wszystkie hasła' : 'Spis treści') + '</div>' + d.toc.map(e => row(e.p, e.t, '', 's. ' + (e.p + 1))).join('');
      return h || '<div class="empty-info">Wpisz, czego szukasz.</div>';
    }
    const tocHits = d.toc.filter(e => norm(e.t).indexOf(q) >= 0).concat((d.pre || []).filter(e => norm(e.t).indexOf(q) >= 0).map(e => ({ t: e.n + '. ' + e.t, p: e.p })));
    if (tocHits.length) h += '<div class="sec">W spisie</div>' + tocHits.slice(0, 40).map(e => row(e.p, e.t, '', 's. ' + (e.p + 1))).join('');
    if (d.pages && q.length >= 3) {
      const words = q.split(/\s+/).filter(Boolean), hits = [];
      d.pages.forEach((t, i) => { const nt = norm(t); if (words.every(w => nt.indexOf(w) >= 0)) hits.push([i, nt.indexOf(words[0])]); });
      if (hits.length) h += '<div class="sec">W tekście (' + hits.length + ' stron)</div>' + hits.slice(0, 80).map(x => {
        const t = d.pages[x[0]], a = Math.max(0, x[1] - 50), b = Math.min(t.length, x[1] + q.length + 70), sec = d.toc.filter(e => e.p <= x[0]).pop();
        return row(x[0], '…' + t.slice(a, b) + '…', sec ? esc(sec.t) : '', 's. ' + (x[0] + 1));
      }).join('');
    }
    return h || '<div class="empty-info">Brak wyników.</div>';
  }
  /** Odnośnik „Wj 4,27-31” → klucz księga|rozdział|pierwszy werset. */
  function refKey(r) {
    const m = String(r).replace(/\s+/g, ' ').trim().match(/^(\d?\s?[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)\s*(\d+)(?:,(\d+))?/);
    return m ? [m[1].replace(/\s/g, '').toLowerCase(), m[2], m[3] || ''] : null;
  }
  /** Tabela hasła: odnośnik → strona z czytaniem (z linków w PDF), liczone raz na hasło. */
  async function refMap(name) {
    const d = ld('tematy'), p0 = temPage(name); if (p0 < 0) return [];
    d.refs = d.refs || {}; if (d.refs[name]) return d.refs[name];
    const pdf = await doc('tematy'), out = [];
    for (let p = p0; p < Math.min(pdf.numPages, p0 + 8); p++) {
      const page = await pdf.getPage(p + 1), tc = await page.getTextContent(), ans = (await page.getAnnotations()).filter(a => a.subtype === 'Link' && a.dest);
      if (p > p0 && !ans.length) break;
      for (const an of ans) {
        const [x1, y1, x2, y2] = an.rect, txt = tc.items.filter(it => { const x = it.transform[4] + it.width / 2, y = it.transform[5] + 2; return x >= x1 - 1 && x <= x2 + 1 && y >= y1 - 1 && y <= y2 + 1; }).map(it => it.str).join(' ').trim();
        const k = refKey(txt), dp = await destPage(pdf, an.dest).catch(() => -1);
        if (k && dp >= 0 && dp !== p) out.push({ t: txt, k: k, p: dp });
      }
    }
    if (!out.length) {   // plik bez linków: nagłówki czytań po tabeli (ostatnie wystąpienie odnośnika w zakresie hasła)
      const nx = d.toc.map(e => e.p).filter(x => x > p0).sort((a, b) => a - b)[0], end = Math.min(pdf.numPages - 1, nx ? nx - 1 : p0 + 40, p0 + 60);
      for (let p = p0; p <= end; p++) {
        const tc = await (await pdf.getPage(p + 1)).getTextContent();
        tc.items.forEach(it => { const t = it.str.trim(); if (/^\d?\s?[A-ZŁŚŻ][a-ząćęłńóśźż]{0,4}\s\d+(,[\dn.,\-–]+)?$/.test(t)) { const k = refKey(t); if (k) out.push({ t: t, k: k, p: p }); } });
      }
      const last = {}; out.forEach(x => { last[x.t] = x; }); out.length = 0; Object.keys(last).forEach(t => { if (last[t].p !== p0) out.push(last[t]); });
    }
    d.refs[name] = out; keep('tematy', d); return out;
  }
  async function openRef(name, ref) {
    try {
      const L = await refMap(name), k = refKey(ref); if (!k) return;
      const hit = L.find(x => x.k[0] === k[0] && x.k[1] === k[1] && x.k[2] === k[2]) || L.find(x => x.k[0] === k[0] && x.k[1] === k[1] && (!k[2] || !x.k[2])) || L.find(x => x.k[0] === k[0] && x.k[1] === k[1]);
      if (hit) openPdfPage('tematy', hit.p, ref + ' – ' + name);
      else { toast('Nie znalazłem „' + ref + '” w tabeli hasła – otwieram tabelę.'); openPdfPage('tematy', temPage(name), 'Tematy – ' + name); }
    } catch (e) { toast('Nie udało się otworzyć pliku „Tematy”.'); }
  }
  const temOk = name => temPage(name) >= 0;
  /** Strona hasła w „Tematach” (indeks PDF) albo -1. */
  function temPage(name) {
    const d = ld('tematy'); if (!d || !pdfPages('tematy')) return -1;
    const c = cmp(name), e = d.toc.find(x => cmp(x.t) === c); return e ? e.p : -1;
  }
  function secOf(k, p) { const d = ld(k); let b = null; (d ? d.toc : []).forEach(e => { if (e.p <= p && (!b || e.p >= b.p)) b = e; }); return b; }
  const titleOf = (k, p) => { const sec = secOf(k, p); return DOCS[k].t + (sec ? ' – ' + sec.t : ''); };
  function openDoc(k, p) { openPdfPage(k, p, titleOf(k, p)); }

  /* ---------- odnośniki w PDF (spis treści, hasło → tabela → czytanie) ---------- */
  async function destPage(pdf, dest) {
    if (typeof dest === 'string') dest = await pdf.getDestination(dest);
    if (!Array.isArray(dest) || !dest[0]) return -1;
    return typeof dest[0] === 'number' ? dest[0] : pdf.getPageIndex(dest[0]);
  }
  async function links(key, idx) {
    const pdf = await doc(key), page = await pdf.getPage(idx + 1), vp = page.getViewport({ scale: 1 }), out = [];
    for (const an of await page.getAnnotations()) {
      if (an.subtype !== 'Link' || !an.rect) continue;
      const r = pdfjsLib.Util.normalizeRect(vp.convertToViewportRectangle(an.rect)), box = [r[0] / vp.width, r[1] / vp.height, (r[2] - r[0]) / vp.width, (r[3] - r[1]) / vp.height];
      if (an.url) out.push({ b: box, url: an.url });
      else if (an.dest) { const p = await destPage(pdf, an.dest).catch(() => -1); if (p >= 0) out.push({ b: box, p: p, r: an.rect }); }
    }
    return out;
  }
  async function overlay() {
    if (!PV || !pdfPages(PV.key) || (PV.key === 'songbook' && !(A.pdfStream || A.renderPdfAsync))) return;
    const key = PV.key, idx = PV.idx;
    if (DOCS[key]) { const t = document.querySelector('#viewer .pvbar b'); if (t) { PV.title = titleOf(key, idx); t.textContent = PV.title; } }
    let L; try { L = await links(key, idx); } catch (e) { return; }
    const box = document.getElementById('pvlinks'); if (!box || !PV || PV.idx !== idx || PV.key !== key) return;
    box.innerHTML = L.map(l => '<a class="pvlink" style="left:' + (l.b[0] * 100) + '%;top:' + (l.b[1] * 100) + '%;width:' + (l.b[2] * 100) + '%;height:' + (l.b[3] * 100) + '%" data-act="pv-link" data-a="' + (l.url ? esc(l.url) : l.p) + '"></a>').join('');
  }

  /* ---------- transpozycja akordów (Śpiewnik: akordy zapisane znakami 𝒞 𝑎 ℋ7 ℱ♯ …) ---------- */
  const MAJ = { '𝒜': 9, 'ℬ': 10, '𝒞': 0, '𝒟': 2, 'ℰ': 4, 'ℱ': 5, '𝒢': 7, 'ℋ': 11 };
  const MIN = { '𝑎': 9, '𝑏': 10, '𝑐': 0, '𝑑': 2, '𝑒': 4, '𝑓': 5, '𝑔': 7, 'ℎ': 11 };
  const NM = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B', 'H'], Nm = ['c', 'c♯', 'd', 'e♭', 'e', 'f', 'f♯', 'g', 'g♯', 'a', 'b', 'h'];
  const OK_CH = /^[\s0-9IV♯♭⟨⟩(),∶:/−\-+.𝑜]$/u;
  const plain = c => { const p = c.codePointAt(0); if (p >= 0x1D44E && p <= 0x1D467) return String.fromCharCode(97 + p - 0x1D44E); if (p >= 0x1D434 && p <= 0x1D44D) return String.fromCharCode(65 + p - 0x1D434); return c === '∶' ? ':' : c === '−' ? '-' : c; };
  const isChordStr = s => { const a = Array.from(s); return a.some(c => MAJ[c] !== undefined || MIN[c] !== undefined) && a.every(c => MAJ[c] !== undefined || MIN[c] !== undefined || OK_CH.test(c)); };
  /** Dzieli napis na kawałki [indeks znaku, tekst do narysowania]. */
  function trParts(s, n) {
    const a = Array.from(s), out = [];
    for (let i = 0; i < a.length; i++) {
      const c = a[i], maj = MAJ[c] !== undefined;
      if (!maj && MIN[c] === undefined) { out.push([i, plain(c)]); continue; }
      let pc = maj ? MAJ[c] : MIN[c], j = i + 1, suf = '';
      if (a[j] === '♯' || a[j] === '♭') { pc += a[j] === '♯' ? 1 : -1; j++; }
      else { let k = j; while (k < a.length && /[0-9]/.test(a[k])) k++; if (k > j && (a[k] === '♯' || a[k] === '♭')) { pc += a[k] === '♯' ? 1 : -1; suf = a.slice(j, k).join(''); j = k + 1; } }
      const t = ((pc + n) % 12 + 24) % 12;
      out.push([i, (maj ? NM : Nm)[t] + suf]); i = j - 1;
    }
    return out;
  }
  const keyName = n => n === 0 ? 'oryginał' : (n > 0 ? '+' : '−') + Math.abs(n);
  /** Strona PDF jako obraz z podmienionymi akordami (data URL). */
  async function renderTr(key, idx, n, width) {
    const pdf = await doc(key), page = await pdf.getPage(idx + 1), v1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(4, width / v1.width) });
    const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    if (n) {
      const tc = await page.getTextContent();
      tc.items.forEach(it => {
        if (!it.str || !isChordStr(it.str)) return;
        const t = pdfjsLib.Util.transform(vp.transform, it.transform), fs = Math.hypot(t[2], t[3]), x = t[4], y = t[5], w = it.width * vp.scale;
        const font = 'italic 600 ' + fs + 'px "EB Garamond", Georgia, serif';
        g.font = font; const a = Array.from(it.str), tot = g.measureText(it.str).width || 1, k = w / tot;
        const pre = i => g.measureText(a.slice(0, i).join('')).width * k;
        g.fillStyle = '#fff'; g.fillRect(x - fs * 0.1, y - fs * 0.85, w + fs * 0.4, fs * 1.08);
        g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
        const parts = trParts(it.str, n).filter(p => p[1].trim()), pos = parts.map(p => x + pre(p[0]));
        parts.forEach((p, i) => {
          const m = p[1].match(/^([A-Ha-h])([♯♭]?)(.*)$/) || [0, p[1], '', ''], small = 'italic 600 ' + fs * 0.62 + 'px "EB Garamond", Georgia, serif';
          g.font = font; const w1 = g.measureText(m[1]).width, w3 = g.measureText(m[3]).width; g.font = small; const w2 = m[2] ? g.measureText(m[2]).width + fs * 0.04 : 0;
          const tw = w1 + w2 + w3, room = i + 1 < parts.length ? pos[i + 1] - pos[i] - fs * 0.12 : 1e9, sx = tw > room ? Math.max(0.55, room / tw) : 1;
          g.save(); g.translate(pos[i], y); g.scale(sx, 1);   // ciaśniej, gdy nowy akord jest szerszy; krzyżyk/bemol mniejszy i w górze
          g.font = font; g.fillText(m[1], 0, 0);
          if (m[2]) { g.font = small; g.fillText(m[2], w1 + fs * 0.02, -fs * 0.32); }
          if (m[3]) { g.font = font; g.fillText(m[3], w1 + w2, 0); }
          g.restore();
        });
      });
    }
    return cv.toDataURL('image/jpeg', 0.9);
  }
  /** Strony pieśni: od początku do strony przed następną pieśnią (max 4). */
  function songPages(nr) {
    const st = songPage(nr); let end = st;
    if (typeof SPMAP !== "undefined" && SPMAP) { const nx = Object.keys(SPMAP).map(k => SPMAP[k]).filter(p => p > st).sort((a, b) => a - b)[0]; if (nx !== undefined) end = Math.min(nx - 1, st + 3); }
    const r = []; for (let p = st; p <= end; p++) r.push(p); return r;
  }
  async function printSong() {
    if (!PV) return;
    const n = PV.tr || 0, pages = PV.nr ? songPages(PV.nr) : [PV.idx], title = PV.title + (n ? ' (tonacja ' + keyName(n) + ')' : '');
    toast('Przygotowuję wydruk…');
    try {
      const imgs = []; for (const p of pages) imgs.push(await renderTr(PV.key, p, n, 1400));
      const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>@page{margin:8mm}body{margin:0}img{width:100%;display:block;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>' + imgs.map(u => '<img src="' + u + '">').join('') + '</body></html>';
      if (A && A.printHtml) A.printHtml(html, title);
      else { const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); } else toast('Drukowanie niedostępne.'); }
    } catch (e) { toast('Nie udało się przygotować wydruku.'); }
  }
  /** Po narysowaniu podglądu: podmiana obrazu, gdy wybrano inną tonację. */
  function afterViewer() {
    overlay();
    if (!PV || PV.key !== 'songbook' || !PV.tr) return;
    const idx = PV.idx, n = PV.tr, im = document.getElementById('pvimg'); if (im) im.style.opacity = '.35';
    renderTr('songbook', idx, n, Math.round(window.innerWidth * (window.devicePixelRatio || 2) * 1.4)).then(u => { const m = document.getElementById('pvimg'); if (m && PV && PV.idx === idx && PV.tr === n) { m.src = u; m.style.opacity = ''; } })
      .catch(() => { toast('Nie udało się zmienić tonacji tej strony.'); const m = document.getElementById('pvimg'); if (m) m.style.opacity = ''; });
  }
  function bar() {
    if (PV && PV.back && PV.back.length) return '<button class="pvb" data-act="pv-back" title="Wróć do poprzedniej strony">↩</button>' + (PV.key === 'songbook' ? trBar() : '');
    return PV && PV.key === 'songbook' ? trBar() : '';
  }
  /** Strona z nutami dla pieśni o numerze nr (plik „Śpiewnik z nutami”, odnośnik „Śpiewnik αβ, str. N”). */
  function notesPage(nr) { const d = ld('nuty'); return d && d.sp && d.sp[nr] !== undefined && pdfPages('nuty') ? d.sp[nr] : -1; }
  function trBar() {
    const np = PV.nr ? notesPage(PV.nr) : -1;
    return (np >= 0 ? '<button class="pvb" data-act="notes" data-a="' + np + '" title="Nuty tej pieśni">♫ Nuty</button>' : '') + '<button class="pvb" data-act="tr" data-a="-1" title="Obniż o pół tonu">♭</button><span class="pvtr">' + keyName(PV.tr || 0) + '</span><button class="pvb" data-act="tr" data-a="1" title="Podwyższ o pół tonu">♯</button>' +
      '<button class="pvb" data-act="tr-print" title="Drukuj w tej tonacji">🖨</button>';
  }

  function act(a, v) {
    switch (a) {
      case 'lib-k': UI.libK = v; UI.libq = ''; render(); return true;
      case 'lib-add': addBook(); return true;
      case 'lib-addok': {
        const t = (document.getElementById('libNm').value || '').trim(); if (!t) { toast('Wpisz nazwę.'); return true; }
        const k = 'b_' + Math.random().toString(36).slice(2, 8);
        S.books = (S.books || []).concat({ k: k, t: t }); save(true); syncBooks(); closeModal(); UI.libK = k; render();
        if (A && A.pickPdf) A.pickPdf(k); else toast('Wskaż plik w aplikacji na telefonie lub komputerze.');
        return true;
      }
      case 'lib-del': confirmBox('Usunąć „' + (DOCS[v] ? DOCS[v].t : '') + '” z biblioteki?', 'Plik w telefonie zostaje – znika tylko z aplikacji.', 'Usuń', () => {
        S.books = (S.books || []).filter(b => b.k !== v); if (S.libTiles) delete S.libTiles[v]; keep(v, null); save(true); syncBooks(); UI.libK = 'mszalik'; render(); }); return true;
      case 'lib-tile': syncBooks(); UI.libK = v; go('biblioteka'); return true;
      case 'lib-scan': UI.libMsgK = v; scan(v); return true;
      case 'lib-open': openDoc(UI.libK || 'mszalik', +v); return true;
      case 'lib-tem': { const p = temPage(v); if (p >= 0) openPdfPage('tematy', p, 'Tematy – ' + v); return true; }
      case 'tr': {
        if (!PV) return true;
        PV.tr = ((PV.tr || 0) + (+v) + 18) % 12 - 6 || 0;   // zakres −6…+5
        if (PV.nr) { S.trSong = S.trSong || {}; if (PV.tr) S.trSong[PV.nr] = PV.tr; else delete S.trSong[PV.nr]; save(true); }
        renderViewer(); return true;
      }
      case 'tr-print': printSong(); return true;
      case 'notes': { const t = PV ? PV.title : 'Nuty'; openPdfPage('nuty', +v, '♫ ' + t); return true; }
      case 'pv-link': { if (!PV) return true; if (/^\d+$/.test(v)) { PV.back = (PV.back || []).concat(PV.idx); PV.idx = +v; renderViewer(); } else openUrl(v); return true; }
      case 'pv-back': { if (PV && PV.back && PV.back.length) { PV.idx = PV.back.pop(); renderViewer(); } return true; }
      case 'lib-ref': openRef(S.haslo, v); return true;
    }
    return false;
  }
  function input(id, v) { if (id !== 'libq') return false; UI.libq = v; const l = document.getElementById('liblist'); if (l) l.innerHTML = list(); return true; }
  function addBook() {
    modalState = { kind: 'libadd' };
    openModal('Nowa książka', '<label class="lbl">Nazwa</label><input type="text" id="libNm" maxlength="40" placeholder="np. Katecheza Kiko, Nuty, Rytuał…">' +
      '<div class="muted mt">Potem wskażesz plik PDF. Książka dostanie ikonę z pierwszą literą nazwy – możesz ją dodać do ekranu głównego.</div>',
      '<button class="btn" data-act="lib-addok">Dalej – wskaż PDF</button>');
  }
  function change(ch, v, el) {
    if (ch !== 'lib-tile') return false;
    S.libTiles = S.libTiles || {}; if (el.checked) S.libTiles[v] = 1; else delete S.libTiles[v]; save(true); return true;
  }
  function picked(key) { if (!DOCS[key]) return false; delete DOC[key]; LD[key] = null; keep(key, null); UI.libK = key; UI.libMsgK = key; scan(key); return true; }

  window.LIB = { tiles: tiles, letterIcon: letterIcon, change: change, syncBooks: syncBooks, view: view, act: act, input: input, picked: picked, temPage: temPage, notesPage: notesPage, temOk: temOk, openRef: openRef, bar: bar, afterViewer: afterViewer, renderTr: renderTr, trParts: trParts, isChordStr: isChordStr, DOCS: DOCS };
})();
