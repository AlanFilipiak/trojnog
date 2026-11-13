/* Biblia w aplikacji: czytnik do skrutacji (tekst + odnośniki z marginesu + przypisy).
 * Tekst NIE jest dołączony do aplikacji – każdy wczytuje własny plik (folder HTML na komputerze → biblia.json). */
(function () {
  'use strict';
  const A = window.Android;
  const ORDER = ['Rdz', 'Wj', 'Kpl', 'Lb', 'Pwt', 'Joz', 'Sdz', 'Rt', '1Sm', '2Sm', '1Krl', '2Krl', '1Krn', '2Krn', 'Ezd', 'Ne', 'Tb', 'Jdt', 'Est', '1Mch', '2Mch',
    'Hi', 'Ps', 'Prz', 'Koh', 'Pnp', 'Mdr', 'Syr', 'Iz', 'Jr', 'Lm', 'Ba', 'Ez', 'Dn', 'Oz', 'Jl', 'Am', 'Ab', 'Jon', 'Mi', 'Na', 'Ha', 'So', 'Ag', 'Za', 'Ml',
    'Mt', 'Mk', 'Lk', 'J', 'Dz', 'Rz', '1Kor', '2Kor', 'Ga', 'Ef', 'Flp', 'Kol', '1Tes', '2Tes', '1Tm', '2Tm', 'Tt', 'Flm', 'Hbr', 'Jk', '1P', '2P', '1J', '2J', '3J', 'Jud', 'Ap'];
  const NT = ORDER.indexOf('Mt');
  const ALIAS = { 'łk': 'Lk', 'kpł': 'Kpl', psalm: 'Ps', psalmy: 'Ps', jan: 'J', jn: 'J', ne: 'Ne', neh: 'Ne', tes: '1Tes', mat: 'Mt', mar: 'Mk', luk: 'Lk', ef: 'Ef', ap: 'Ap', apok: 'Ap' };
  const LC = {}; ORDER.forEach(k => { LC[k.toLowerCase()] = k; });
  let DB = null, NOTES = {};

  const stripTags = h => String(h).replace(/<[^>]*>/g, '');
  const ent = t => t.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
  const clean = h => ent(stripTags(h)).replace(/\s+/g, ' ').trim();
  const fname = n => 'bjn_' + n.toLowerCase().replace(/[^a-z0-9]/g, '') + '.json';

  function load() {
    if (DB) return DB;
    try { const t = A && A.loadText ? A.loadText('biblia.json') : ''; DB = t ? JSON.parse(t) : null; } catch (e) { DB = null; }
    if (DB && DB.fix !== 2) { repair(DB); try { A.saveText('biblia.json', JSON.stringify(DB)); } catch (e) { /* */ } }
    return DB || false;
  }
  function has() { return !!load(); }
  const TAIL = /\s((?:(?:[1-3]\s?)?[A-ZŁŚŻŹĆ][a-ząćęłńóśźż]{0,4}\s?\d{1,3}(?:\s?[,:]\s?\d{1,3}[a-z]?(?:\s?[-–]\s?\d{1,3}[a-z]?(?:,\d{1,3}[a-z]?)?)?)?(?:\s?[-–]\s?\d{1,3})?[+np]*[;,]?\s*)+)$/;
  /** Stary plik (przed 13.1): odnośniki z marginesu doklejone na końcu tekstu – przenieś je na margines. */
  function repair(db) {
    if (!db || db.fix >= 2) return false;
    let n = 0;
    Object.keys(db.b).forEach(b => db.b[b].forEach(ch => (ch || []).forEach(e => {
      if (!e || e[1]) return;
      const m = e[0].match(TAIL); if (!m) return;
      const toks = m[1].match(/(?:[1-3]\s?)?[A-ZŁŚŻŹĆ][a-ząćęłńóśźż]{0,4}(?=\s?\d)/g) || [];
      if (!toks.length || !toks.every(t => bookCode(t))) return;
      e[0] = e[0].slice(0, m.index).trim(); e[1] = m[1].trim().replace(/[;,]$/, ''); n++;
    })));
    db.fix = 2; return n;
  }
  function bookCode(tok) {
    if (!tok) return '';
    const k = String(tok).replace(/[\s.]/g, '').toLowerCase();
    return LC[k] || ALIAS[k] || '';
  }
  function chap(b, c) { const d = load(); return d && d.b[b] && d.b[b][c - 1] || null; }
  function verse(b, c, v) { const ch = chap(b, c); return ch && ch[v - 1] || null; }
  function notesOf(b) {
    if (NOTES[b] !== undefined) return NOTES[b];
    try { const t = A.loadText(fname(b)); NOTES[b] = t ? JSON.parse(t) : null; } catch (e) { NOTES[b] = null; }
    return NOTES[b];
  }

  /** Sygnatury: „Hi 15,7”, „Prz 8,22-31”, „Hi 38-39”, „J 8,12+”, „Rdz 1, 1-5”, „8,25” (księga z poprzedniej). */
  const RX = /((?:[1-3]\s?)?[A-Za-zŁŚŻŹĆłśżźćąęńó]{1,8})?\.?\s*(\d{1,3})(?![A-Za-zŁŚŻŹĆłśżźćąęńó\d])(?:\s*[,:]\s*(\d{1,3})[a-z]?(?:\s*[-–]\s*(\d{1,3})[a-z]?(?:\s*,\s*(\d{1,3}))?)?)?(?:\s*[-–]\s*(\d{1,3}))?/g;
  function parseRefs(str, ctx) {
    const out = []; let last = ctx || '', m; RX.lastIndex = 0; str = String(str || '');
    while ((m = RX.exec(str))) {
      if (!m[0].trim()) { RX.lastIndex++; continue; }
      let b = m[1] ? bookCode(m[1]) : '';
      if (m[1] && !b) continue;
      b = b || last; if (!b) continue; last = b;
      const c = +m[2], v1 = m[3] ? +m[3] : 0;
      let v2 = v1, c2 = c;
      if (m[3] && m[4] && m[5]) { c2 = +m[4]; v2 = +m[5]; } else if (m[3] && m[4]) v2 = +m[4];
      if (!m[3] && m[6]) c2 = +m[6];
      out.push({ b: b, c: c, v1: v1, v2: c2 === c ? v2 : 999, txt: m[0].trim() });
    }
    return out;
  }
  function refLabel(r) { return r.b + ' ' + r.c + (r.v1 ? ',' + r.v1 + (r.v2 && r.v2 !== r.v1 && r.v2 < 999 ? '-' + r.v2 : '') : ''); }

  /* ===== Konwersja: folder HTML „Biblia z marginaliami” ===== */
  function fromHtmlFiles(files) {
    const b = {}, n = {};
    let verses = 0, refs = 0;
    Object.keys(files).forEach(path => {
      const m = path.match(/^([^/]+)\/([^/]+)\.html?$/i); if (!m) return;
      if (!/^\d+$/.test(m[2]) && m[2].toLowerCase() !== m[1].toLowerCase()) return;   // wstępy, spisy
      const code = bookCode(m[1]) || m[1], c = /^\d+$/.test(m[2]) ? +m[2] : 1, t = files[path];
      if (!n[code]) { const tt = t.match(/<title>([^<]*)<\/title>/i); if (tt) n[code] = clean(tt[1]); }
      const ch = []; let head = '';
      t.split(/<tr[\s>]/i).forEach(row => {
        if (/class="?kl6/i.test(row)) { const h = clean(row.split(/<\/td>/i)[0]); if (h) head = h; return; }
        const tds = row.split(/<td[\s>]/i).slice(1); if (!tds.length) return;
        const cell = tds[0].split(/<\/td>/i)[0], rest = tds.slice(1).join(' ');
        const sups = []; const rs = /<sup>(?:\s*<[^>]+>)*\s*(\d+)\s*(?:<[^>]+>\s*)*<\/sup>/gi; let s;
        while ((s = rs.exec(cell))) sups.push({ v: +s[1], at: s.index, end: rs.lastIndex });
        if (!sups.length) return;
        const rf = []; const ra = /<a\s[^>]*href[^>]*>([\s\S]*?)<\/a>/gi; let a;
        if (/kl4/i.test(rest)) while ((a = ra.exec(rest))) { const x = clean(a[1]).replace(/[;,\s]+$/, ''); if (x) rf.push(x); }
        sups.forEach((sp, i) => {
          const txt = clean(cell.slice(sp.end, i + 1 < sups.length ? sups[i + 1].at : cell.length));
          const e = [txt, i === sups.length - 1 ? rf.join('; ') : ''];
          if (head && i === 0) { e.push(head); head = ''; }
          ch[sp.v - 1] = e; verses++;
        });
        refs += rf.length;
      });
      (b[code] = b[code] || [])[c - 1] = ch;
    });
    Object.keys(b).forEach(k => { for (let i = 0; i < b[k].length; i++) if (!b[k][i]) b[k][i] = []; });
    return { trojnogBiblia: 1, fix: 2, nazwa: 'Biblia z marginaliami', ts: Date.now(), n: n, b: b, stat: { ksiegi: Object.keys(b).length, wersety: verses, odnosniki: refs } };
  }
  function store(db) {
    const t = JSON.stringify(db);
    if (!A.saveText('biblia.json', t)) { toast('Nie udało się zapisać Biblii.'); return false; }
    DB = db; NOTES = {}; return true;
  }

  /* ===== Przypisy z PDF (BJ: „15,7 …”, komentarz: „15,7. …”) – tylko komputer ===== */
  function lines(items) {
    items.sort((p, q) => p.y - q.y || p.x - q.x);
    const out = [];
    items.forEach(i => {
      const L = out.length ? out[out.length - 1] : null;
      if (L && Math.abs(i.y - L.y) < 5) L.it.push(i); else out.push({ y: i.y, it: [i] });
    });
    return out.map(L => {
      L.it.sort((p, q) => p.x - q.x);
      let s = '', end = -1;
      L.it.forEach(i => { if (s && end >= 0 && i.x - end > 1 && !/\s$/.test(s) && !/^\s/.test(i.s)) s += ' '; s += i.s; end = i.x + (i.w || 0); });
      const zs = L.it.filter(i => i.s.trim()).map(i => Math.round(i.z * 2) / 2);
      return { y: L.y, x: Math.min.apply(null, L.it.filter(i => i.s.trim()).map(i => i.x).concat([999])), s: s.trim(), z: zs[0] || 0, zs: zs };
    }).filter(L => L.s);
  }
  async function notesFromPdf(key, onProg) {
    const pages = A.pdfPages(key), res = {}; let book = '', note = null, cnt = 0;
    for (let p = 0; p < pages; p++) {
      if (onProg && p % 25 === 0) onProg(p, pages);
      let it; try { it = await A.pdfTextAsync(key, p); } catch (e) { continue; }
      lines(it).forEach(L => {
        if (L.y < 40) return;                                             // nagłówek strony
        if (L.z >= 19) { const m = L.s.match(/^(.+?)\s+(\d+)\s*$/); if (m && bookCode(m[1])) book = bookCode(m[1]); note = null; return; }
        if (L.z >= 15) { note = null; return; }                         // tytuły działów, wstępy
        const isText = L.zs.some(z => z >= 13 || z <= 8.5);
        if (isText) { note = null; return; }                            // wiersz tekstu biblijnego
        if (L.x < 78) return;                                             // ciąg dalszy odnośników
        const m = L.x > 92 && L.s.match(/^(\d{1,3}),(\d{1,3})(?:\s*[-–]\s*\d{1,3})?(\.?)\s+/);
        if (m && book) {
          const k = m[1] + ',' + m[2]; note = [m[3] ? 'k' : 'bj', L.s];
          ((res[book] = res[book] || {})[k] = res[book][k] || []).push(note); cnt++; return;
        }
        if (note) note[1] += (/^[—–-]\s/.test(L.s) && L.x > 92 ? '\n' : ' ') + L.s;
      });
    }
    return { res: res, cnt: cnt };
  }


  /* ===== Katechizm (KKK): własny PDF → akapity 1…2865 ===== */
  let KKK = null;
  function kkk() { if (KKK) return KKK; try { const t = A.loadText('kkk.json'); KKK = t ? JSON.parse(t) : null; } catch (e) { KKK = null; } return KKK || false; }
  async function kkkFromPdf(key, onProg) {
    const pages = A.pdfPages(key), all = [], freq = {};
    for (let p = 0; p < pages; p++) {
      if (onProg && p % 10 === 0) onProg(p, pages);
      let it; try { it = await A.pdfTextAsync(key, p); } catch (e) { continue; }
      lines(it).forEach(L => { const k = L.s.replace(/\d+/g, '#'); freq[k] = (freq[k] || 0) + 1; all.push(L.s); });
    }
    const out = []; let cur = null, last = 0;
    all.forEach(s => {
      if ((s.length < 70 && freq[s.replace(/\d+/g, '#')] > 15) || /^\d+$/.test(s)) return;   // nagłówki stron, numery stron
      const m = s.match(/^(\d{1,4})\.?\s+(.*)$/);
      if (m && +m[1] === last + 1) { last = +m[1]; cur = [last, m[2]]; out.push(cur); return; }
      if (cur) cur[1] += (/-$/.test(cur[1]) ? '' : ' ') + s;
    });
    out.forEach(x => { x[1] = x[1].replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ').trim(); });
    return { trojnogKKK: 1, ts: Date.now(), p: out };
  }

  /* ===== Opcje widoku ===== */
  const GRP = [['pk', 'Pięcioksiąg', ['Rdz', 'Wj', 'Kpl', 'Lb', 'Pwt']], ['hist', 'Historyczne', ['Joz', 'Sdz', 'Rt', '1Sm', '2Sm', '1Krl', '2Krl', '1Krn', '2Krn', 'Ezd', 'Ne', 'Tb', 'Jdt', 'Est', '1Mch', '2Mch']],
    ['ps', 'Psalmy', ['Ps']], ['madr', 'Mądrościowe', ['Hi', 'Prz', 'Koh', 'Pnp', 'Mdr', 'Syr']], ['pr', 'Prorocy', ['Iz', 'Jr', 'Lm', 'Ba', 'Ez', 'Dn', 'Oz', 'Jl', 'Am', 'Ab', 'Jon', 'Mi', 'Na', 'Ha', 'So', 'Ag', 'Za', 'Ml']],
    ['ew', 'Ewangelie', ['Mt', 'Mk', 'Lk', 'J']], ['li', 'Dzieje i Listy', ['Dz', 'Rz', '1Kor', '2Kor', 'Ga', 'Ef', 'Flp', 'Kol', '1Tes', '2Tes', '1Tm', '2Tm', 'Tt', 'Flm', 'Hbr', 'Jk', '1P', '2P', '1J', '2J', '3J', 'Jud']], ['ap', 'Apokalipsa', ['Ap']]];
  function opt() {
    const o = S.bibOpt = S.bibOpt || {};
    if (!o.r) o.r = 'm'; if (!o.n) o.n = 'm'; if (!o.k) o.k = 'tip';
    if (o.q === undefined) o.q = true; if (!o.qg) o.qg = ['ps', 'madr', 'ew', 'li'];
    return o;
  }
  function optDialog() {
    const o = opt(), ch = (k, v, l) => '<button class="chip sm' + (o[k] === v ? ' on' : '') + '" data-act="bib-opt" data-a="' + k + '" data-b="' + v + '">' + l + '</button>';
    openModal('Widok Biblii',
      '<div class="sec">Odnośniki (marginalia)</div><div class="chips">' + ch('r', 'm', 'na marginesie po prawej') + ch('r', 'pod', 'pod wersetem') + ch('r', 'off', 'ukryte') + '</div>' +
      '<div class="sec">Przypisy BJ</div><div class="chips">' + ch('n', 'm', 'na marginesie po prawej') + ch('n', 'pod', 'pod wersetem (rozwijane)') + ch('n', 'okno', 'w okienku') + ch('n', 'off', 'ukryte') + '</div>' +
      '<div class="sec">Komentarz</div><div class="chips">' + ch('k', 'tip', 'dymek po najechaniu / dotknięciu') + ch('k', 'pod', 'pod wersetem (rozwijany)') + ch('k', 'off', 'ukryty') + '</div>' +
      '',
      '<button class="btn" data-act="bib-optok">Gotowe</button>');
  }

  /* ===== Cytat dnia ===== */
  function quote(day) {
    const d = load(), o = opt(); if (!d) return null;
    const bks = [].concat.apply([], GRP.filter(g => o.qg.indexOf(g[0]) >= 0).map(g => g[2])).filter(b => d.b[b]);
    if (!bks.length) return null;
    let h = 2166136261; for (const c of day) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909); return ((h >>> 0) % 1e6) / 1e6; };
    for (let i = 0; i < 60; i++) {
      const b = bks[Math.floor(rnd() * bks.length)], B = d.b[b], c = Math.floor(rnd() * B.length), C = B[c] || [];
      const v = Math.floor(rnd() * C.length), e = C[v];
      if (e && e[0].length >= 40 && e[0].length <= 260) return { ref: b + ' ' + (c + 1) + ',' + (v + 1), t: e[0] };
    }
    return null;
  }
  function qgChips() { const o = opt(); return '<div class="chips">' + GRP.map(g => '<button class="chip sm' + (o.qg.indexOf(g[0]) >= 0 ? ' on' : '') + '" data-act="bib-qg" data-a="' + g[0] + '">' + g[1] + '</button>').join('') + '</div>'; }
  function quoteCard() {
    if (!has()) return '';
    const q = quote(today()); if (!q) return '';
    return '<div class="card qday"><div class="qt">„' + esc(q.t) + '”</div><div class="row"><span class="grow muted">' + esc(q.ref) + '</span><button class="btn text sm" data-act="bib-goto" data-a="' + esc(q.ref) + '">📖 Otwórz</button></div></div>';
  }

  /* ===== Skrutacja: drzewo zapisków ===== */
  function skrOf(id) { return id && S.skrutacje.find(x => x.id === id); }
  function addNode() {
    const s = st(); if (!s.sel) return;
    const e = verse(s.b, s.c, s.sel); if (!e) return;
    let x = skrOf(s.skr);
    const ref = s.b + ' ' + s.c + ',' + s.sel;
    if (!x) { x = newSkrutacja(); x.fragment = ref; S.skrutacje.push(x); s.skr = x.id; s.cur = null; }
    x.nodes = x.nodes || [];
    if (s.cur && !x.nodes.some(n => n.id === s.cur)) s.cur = null;
    const n = { id: uuid(), ref: ref, txt: s.selTxt || e[0], note: '', p: s.cur || '' };
    x.nodes.push(n); s.cur = n.id; x.ts = Date.now(); save();
    s.next = { ref: ref, r: e[1] || '' }; s.sel = null; s.selTxt = ''; render();
  }
  function treeHtml(x) {
    const nodes = x.nodes || []; if (!nodes.length) return '';
    const ids = new Set(nodes.map(n => n.id));
    const kids = p => nodes.filter(n => (n.p && ids.has(n.p) ? n.p : '') === p);
    const one = (n, d) => '<div class="snode" style="--d:' + d + '"><div class="snl"><button class="bref" data-act="skr-ngo" data-a="' + n.id + '">' + esc(n.ref) + '</button><div class="snt">„' + esc(n.txt) + '”</div></div>' +
      '<div class="snr"><textarea rows="2" data-in="skr-node" data-a="' + n.id + '" placeholder="Co Bóg mówi do mnie…">' + esc(n.note || '') + '</textarea></div>' +
      '<button class="icon snx" data-act="skr-ndel" data-a="' + n.id + '" title="Usuń">✕</button></div>' + kids(n.id).map(k => one(k, d + 1)).join('');
    return '<div class="card"><h2>Drzewo skrutacji (' + nodes.length + ')</h2><div class="muted">Lewa strona – zaznaczony tekst, prawa – co Bóg mówi do mnie. Gałąź powstaje, gdy wrócisz (◀) i pójdziesz innym odnośnikiem.</div>' +
      '<div class="stree">' + kids('').map(n => one(n, 0)).join('') + '</div></div>';
  }
  function treeText(x) {
    const nodes = x.nodes || []; if (!nodes.length) return '';
    const ids = new Set(nodes.map(n => n.id)), out = ['', 'DRZEWO SKRUTACJI'];
    const walk = (p, d) => nodes.filter(n => (n.p && ids.has(n.p) ? n.p : '') === p).forEach(n => {
      const pad = '  '.repeat(d); out.push(pad + '• ' + n.ref + ' – „' + n.txt + '”'); if (n.note) out.push(pad + '  → ' + n.note); walk(n.id, d + 1);
    });
    walk('', 0); return out.join('\n');
  }

  /* ===== Widok ===== */
  function st() { if (!UI.bib) UI.bib = { b: 'Rdz', c: 1, hl: null, back: [], path: [], open: {} }; return UI.bib; }
  function bookName(b) { const d = load(); return (d && d.n && d.n[b]) || b; }
  function books() { const d = load(); return d ? ORDER.filter(k => d.b[k]).concat(Object.keys(d.b).filter(k => ORDER.indexOf(k) < 0)) : []; }
  function nChap(b) { const d = load(); return d && d.b[b] ? d.b[b].length : 0; }

  function viewEmpty() {
    const desk = A && A.desktop;
    return '<div class="card"><h2>Biblia do skrutacji</h2>' +
      '<p class="muted">Czytnik z odnośnikami z marginesu: klikasz odnośnik → przechodzisz do miejsca; zaznaczony tekst dodajesz do drzewa skrutacji. Tekstu Biblii nie ma w aplikacji – wczytujesz własny plik.</p>' +
      (desk ? '<ol class="steps"><li>Rozpakuj „Biblia_Jerozolimska_w_HTML.exe” (powstanie folder „Biblia z marginaliami”).</li><li>Kliknij „Wczytaj z folderu” i wskaż ten folder.</li><li>Na telefon: „Zapisz plik Biblii” → wczytaj go w telefonie.</li></ol>' +
        '<button class="btn full" data-act="bib-dir">📁 Wczytaj z folderu</button>' : '<p class="muted">Plik <b>biblia.json</b> zrobisz w Trójnogu na komputerze (Skrutacja → Biblia → „Zapisz plik Biblii”).</p>') +
      '<button class="btn ghost full mt" data-act="bib-file">⇪ Wczytaj plik biblia.json</button></div>';
  }
  function noteBox(v, x, mode, open) {
    const id = v + x[0], txt = x[1].replace(/^\d{1,3},\d{1,3}(?:\s*[-–]\s*\d{1,3})?\.?\s*/, '');
    if (mode === 'm') return '<div class="bmn' + (open ? ' open' : '') + '" data-act="bib-note" data-a="' + id + '">' + esc(txt).replace(/\n/g, '<br>') + '</div>';
    return open ? '<div class="bnote ' + x[0] + '">' + esc(txt).replace(/\n/g, '<br>') + '</div>' : '';
  }
  function view() {
    if (!has()) return viewEmpty();
    if (st().skr && !skrOf(st().skr)) st().skr = null;
    const s = st(), o = opt(), ch = chap(s.b, s.c) || [], nt = notesOf(s.b), skr = skrOf(s.skr);
    const marg = !s.hideM && (o.r === 'm' || (o.n === 'm' && nt));
    let h = '<div class="card bibtop"><div class="row">' +
      (s.back.length ? '<button class="btn ghost sm" data-act="bib-back" title="Wróć">◀</button>' : '') +
      '<button class="btn ghost grow bibsel" data-act="bib-pick">' + esc(bookName(s.b)) + ' <b>' + s.c + '</b> ▾</button>' +
      '<button class="btn ghost sm" data-act="bib-ch" data-a="-1"' + (s.c > 1 ? '' : ' disabled') + '>‹</button><button class="btn ghost sm" data-act="bib-ch" data-a="1"' + (s.c < nChap(s.b) ? '' : ' disabled') + '>›</button>' +
      (o.r === 'm' || o.n === 'm' ? '<button class="btn ghost sm' + (s.hideM ? '' : ' on') + '" data-act="bib-marg" title="Pokaż / schowaj margines">▥</button>' : '') +
      '<button class="btn ghost sm" data-act="bib-optdlg" title="Widok">⚙</button></div>' +
      '<div class="row mt"><input type="search" id="bibq" class="grow" placeholder="Sygnatura (Hi 15,7) albo słowo" value="' + esc(s.q || '') + '"><button class="btn sm" data-act="bib-go">Szukaj</button></div>';
    if (skr) h += '<div class="skrmode"><div class="grow"><b>✎ Skrutacja</b> <span class="muted">' + plDate(skr.date) + ' · zapisków: ' + ((skr.nodes || []).length) + '</span>' +
      '<div class="muted">Dotknij wersetu albo zaznacz fragment → „＋ Do skrutacji”, potem idź dalej za odnośnikiem.</div></div><button class="btn sm" data-act="bib-skr">Gotowe ✓</button></div>';
    h += '</div>';
    if (s.res) {
      h += '<div class="card"><h2><span class="grow">Wyniki (' + (s.res.length >= 300 ? '300+' : s.res.length) + ')</span><button class="btn text" data-act="bib-resx">✕</button></h2>' +
        (s.res.length ? s.res.map(r => '<div class="hist" data-act="bib-goto" data-a="' + esc(r[0]) + '"><div class="h">' + esc(r[0]) + '</div><div class="muted">' + r[1] + '</div></div>').join('') : '<div class="muted">Nic nie znaleziono.</div>') + '</div>';
      return h;
    }
    const inTree = new Set(((skr && skr.nodes) || []).filter(n => n.ref.indexOf(s.b + ' ' + s.c + ',') === 0).map(n => +n.ref.split(',')[1]));
    h += '<div class="card bibtext' + (marg ? ' marg' : '') + '"><h2>' + esc(bookName(s.b)) + ' – rozdział ' + s.c + '</h2>';
    ch.forEach((e, i) => {
      if (!e) return;
      const v = i + 1, hl = s.hl && v >= s.hl[0] && v <= s.hl[1], nn = (nt && nt[s.c + ',' + v]) || [];
      const bj = nn.filter(x => x[0] === 'bj'), km = nn.filter(x => x[0] === 'k');
      const refs = e[1] && o.r !== 'off' ? '<div class="brefs">' + parseRefs(e[1], s.b).map(r => '<button class="bref" data-act="bib-ref" data-a="' + esc(refLabel(r)) + '" data-b="' + v + '">' + esc(r.txt) + '</button>').join('') + '</div>' : '';
      let main = '<sup>' + v + '</sup> <span class="bvt" data-act="bib-v" data-a="' + v + '">' + esc(e[0]) + '</span>' + (inTree.has(v) ? ' <span class="bin" title="W skrutacji">✎</span>' : '');
      if (km.length && o.k === 'tip') main += ' <span class="ktip" data-act="bib-kpop" data-a="' + v + '">K<span class="kpop">' + esc(km.map(x => x[1]).join('\n\n')).replace(/\n/g, '<br>') + '</span></span>';
      let under = '', side = '';
      if (o.r === 'pod' || (o.r === 'm' && !marg)) under += refs; else if (o.r === 'm') side += refs;
      const chipsB = [];
      if (bj.length && (o.n === 'pod' || o.n === 'okno' || (o.n === 'm' && !marg))) chipsB.push('<button class="chip sm' + (s.open[v + 'bj'] ? ' on' : '') + '" data-act="' + (o.n === 'okno' ? 'bib-nwin' : 'bib-note') + '" data-a="' + v + 'bj">Przypis BJ</button>');
      if (km.length && o.k === 'pod') chipsB.push('<button class="chip sm' + (s.open[v + 'k'] ? ' on' : '') + '" data-act="bib-note" data-a="' + v + 'k">Komentarz</button>');
      if (chipsB.length) under += '<div class="bnbtn">' + chipsB.join('') + '</div>';
      if (o.n === 'pod' || (o.n === 'm' && !marg)) bj.forEach(x => { under += noteBox(v, x, 'pod', s.open[v + 'bj']); });
      if (o.n === 'm' && marg) bj.forEach(x => { side += noteBox(v, x, 'm', s.open[v + 'bj']); });
      if (o.k === 'pod') km.forEach(x => { under += noteBox(v, x, 'pod', s.open[v + 'k']); });
      if (e[2]) h += '<h4 class="bper">' + esc(e[2]) + '</h4>';
      h += '<div class="bv' + (hl ? ' hl' : '') + (s.sel === v ? ' sel' : '') + '" id="bv-' + v + '" data-v="' + v + '"><div class="bmain">' + main + under + '</div>' + (marg ? '<div class="bside">' + side + '</div>' : '') + '</div>';
    });
    if (!ch.length) h += '<div class="muted">Brak tekstu tego rozdziału w pliku.</div>';
    h += '<div class="row mt"><button class="btn ghost grow" data-act="bib-ch" data-a="-1"' + (s.c > 1 ? '' : ' disabled') + '>‹ Poprzedni</button><button class="btn ghost grow" data-act="bib-ch" data-a="1"' + (s.c < nChap(s.b) ? '' : ' disabled') + '>Następny ›</button></div></div>';
    h += '<div class="card"><h2>Plik Biblii</h2><div class="muted">' + esc(load().nazwa || '') + ' · ' + books().length + ' ksiąg' + (load().notes ? ' · przypisy: ' + load().notes : '') + '' + '</div>' +
      (A.desktop ? '<button class="btn ghost full mt" data-act="bib-export">💾 Zapisz plik Biblii (na telefon)</button><button class="btn ghost full mt" data-act="bib-pdf">📄 Dodaj przypisy z PDF</button>' +
        '<button class="btn text full" data-act="bib-dir">📁 Wczytaj ponownie Biblię z folderu</button>'
        : '<button class="btn ghost full mt" data-act="bib-file">⇪ Wczytaj nowszy plik Biblii</button>') + '</div>';
    if (!skr) s.next = null;
    h += '<div id="bibbar" class="bibbar' + (s.sel || s.next ? '' : ' hidden') + '">' + barHtml() + '</div>';
    return h;
  }
  function barHtml() {
    const s = st();
    if (!s.sel && s.next) {
      const rs = parseRefs(s.next.r, s.b);
      return '<div class="grow"><b>✓ Dodano ' + esc(s.next.ref) + '</b><div class="brefs">' + (rs.length ? '<span class="muted">Idź dalej:</span> ' + rs.map(r => '<button class="bref" data-act="bib-ref" data-a="' + esc(refLabel(r)) + '" data-b="' + esc(s.next.ref.split(',')[1]) + '">' + esc(r.txt) + '</button>').join('') : '<span class="muted">Ten werset nie ma odnośników – zaznacz inny albo wróć ◀.</span>') + '</div></div>' +
        '<button class="btn text sm" data-act="bib-nextx">✕</button>';
    }
    if (!s.sel) return '';
    const t = s.selTxt || ((verse(s.b, s.c, s.sel) || [''])[0]);
    return '<div class="grow"><b>' + esc(s.b + ' ' + s.c + ',' + s.sel) + '</b> <span class="muted">„' + esc(t.length > 70 ? t.slice(0, 70) + '…' : t) + '”</span></div>' +
      '<button class="btn sm" data-act="bib-add">＋ Do skrutacji</button><button class="btn text sm" data-act="bib-unsel">✕</button>';
  }
  function bar() {
    const el = document.getElementById('bibbar'), s = st(); if (!el) return;
    el.classList.toggle('hidden', !s.sel && !s.next); el.innerHTML = barHtml();
    document.querySelectorAll('.bv.sel').forEach(x => x.classList.remove('sel'));
    if (s.sel) { const v = document.getElementById('bv-' + s.sel); if (v) v.classList.add('sel'); }
  }
  document.addEventListener('selectionchange', () => {
    if (UI.view !== 'biblia' || !skrOf(st().skr)) return;
    const sel = window.getSelection(); if (!sel || sel.isCollapsed) return;
    const n = sel.anchorNode, el = n && (n.nodeType === 3 ? n.parentElement : n).closest('.bvt'); if (!el) return;
    const s = st(); s.sel = +el.dataset.a; s.next = null; s.selTxt = sel.toString().replace(/\s+/g, ' ').trim(); bar();
  });

  function viewKKK() {
    const K = kkk(), s = st();
    if (!K) return '<div class="card"><h2>Katechizm Kościoła Katolickiego</h2><p class="muted">Wczytaj własny plik PDF Katechizmu w Trójnogu na komputerze (Biblia → Pliki → „Wczytaj Katechizm z PDF”), potem „Zapisz plik Katechizmu” i wczytaj go w telefonie.</p>' +
      (A.desktop ? '<button class="btn full" data-act="kkk-pdf">📘 Wczytaj Katechizm z PDF</button>' : '<button class="btn ghost full" data-act="bib-file">⇪ Wczytaj plik Katechizmu</button>') + '</div>';
    let h = '<div class="card bibtop"><div class="row"><input type="search" id="kkkq" class="grow" placeholder="Numer (np. 1324) albo słowo" value="' + esc(s.kq || '') + '"><button class="btn sm" data-act="kkk-go">Szukaj</button>' +
'</div></div>';
    if (s.kres) return h + '<div class="card"><h2>Wyniki (' + (s.kres.length >= 300 ? '300+' : s.kres.length) + ')</h2>' + (s.kres.length ? s.kres.map(r => '<div class="hist" data-act="kkk-n" data-a="' + r[0] + '"><div class="h">KKK ' + r[0] + '</div><div class="muted">' + r[1] + '</div></div>').join('') : '<div class="muted">Nic nie znaleziono.</div>') + '</div>';
    const n = s.kn || 1, i = K.p.findIndex(x => x[0] === n), part = K.p.slice(Math.max(0, i - 1), i + 4);
    h += '<div class="card bibtext"><h2>Katechizm – punkt ' + n + '</h2>' + part.map(x => '<div class="bv' + (x[0] === n ? ' hl' : '') + '"><div class="bmain"><sup>' + x[0] + '</sup> ' + esc(x[1]) + '</div></div>').join('') +
      '<div class="row mt"><button class="btn ghost grow" data-act="kkk-n" data-a="' + Math.max(1, n - 5) + '">‹ Wcześniej</button><button class="btn ghost grow" data-act="kkk-n" data-a="' + (n + 5) + '">Dalej ›</button></div></div>';
    h += '<div class="card"><h2>Plik Katechizmu</h2><div class="muted">' + K.p.length + ' punktów</div>' +
      (A.desktop ? '<button class="btn full mt" data-act="kkk-export">💾 Zapisz plik Katechizmu (katechizm.json – na telefon)</button><button class="btn text full" data-act="kkk-pdf">📘 Wczytaj ponownie z PDF</button>'
        : '<button class="btn ghost full mt" data-act="bib-file">⇪ Wczytaj nowszy plik</button>') + '</div>';
    return h;
  }
  function kkkSearch(q) {
    const s = st(), K = kkk(); q = q.trim(); s.kq = q;
    if (!q) { s.kres = null; render(); return; }
    if (/^\d{1,4}$/.test(q)) { s.kn = +q; s.kres = null; render(); return; }
    const qq = q.toLowerCase(), res = [];
    for (const x of K.p) { const i = x[1].toLowerCase().indexOf(qq); if (i >= 0) { res.push([x[0], esc(x[1].slice(Math.max(0, i - 60), i)) + '<mark>' + esc(x[1].substr(i, q.length)) + '</mark>' + esc(x[1].slice(i + q.length, i + q.length + 90))]); if (res.length >= 300) break; } }
    s.kres = res; render();
  }

  function scrollTo(v) { setTimeout(() => { const el = document.getElementById('bv-' + v); if (el) el.scrollIntoView({ block: 'center' }); }, 40); }
  function goRef(ref, push) {
    const s = st(), r = parseRefs(ref, s.b)[0];
    if (!r || !chap(r.b, r.c)) { toast('Nie znaleziono: ' + ref); return false; }
    if (push) s.back.push({ b: s.b, c: s.c, hl: s.hl, cur: s.cur });
    s.b = r.b; s.c = r.c; s.hl = r.v1 ? [r.v1, r.v2 || r.v1] : null; s.res = null; s.sel = null; s.next = null;
    if (UI.view !== 'biblia') go('biblia'); else render();
    if (r.v1) scrollTo(r.v1); else document.getElementById('main').scrollTop = 0;
    return true;
  }
  function addPath(ref) {
    const s = st(); if (s.path[s.path.length - 1] === ref) return;
    s.path.push(ref);
    const x = skrOf(s.skr);
    if (x) { x.odnosniki = (x.odnosniki ? x.odnosniki + ' → ' : '') + ref; x.ts = Date.now(); save(); }
  }
  /** Otwórz sygnaturę (przyciski 📖, skrutacja). skrId – pracuj w tej skrutacji. */
  function open(ref, skrId) {
    const s = st();
    if (skrId !== undefined) {
      s.skr = skrId || null; s.path = []; s.back = []; s.cur = null;
      const x = skrOf(skrId); if (x && x.nodes && x.nodes.length) s.cur = x.nodes[x.nodes.length - 1].id;
    }
    const r = parseRefs(ref, s.b)[0];
    if (r) { s.path = [refLabel(r)]; return goRef(ref, false); }
    go('biblia'); return true;
  }
  function search(q) {
    const s = st(); q = q.trim(); s.q = q;
    if (!q) { s.res = null; render(); return; }
    if (parseRefs(q).length && /\d/.test(q) && goRef(q, true)) return;
    const qq = q.toLowerCase(), res = [], d = load();
    outer: for (const b of books()) {
      const B = d.b[b];
      for (let c = 0; c < B.length; c++) for (let v = 0; v < (B[c] || []).length; v++) {
        const e = B[c][v]; if (!e) continue;
        const i = e[0].toLowerCase().indexOf(qq);
        if (i >= 0) { res.push([b + ' ' + (c + 1) + ',' + (v + 1), esc(e[0].slice(Math.max(0, i - 50), i)) + '<mark>' + esc(e[0].substr(i, q.length)) + '</mark>' + esc(e[0].slice(i + q.length, i + q.length + 70))]); if (res.length >= 300) break outer; }
      }
    }
    s.res = res; render();
  }
  function pickBook() {
    const bk = books(), btn = k => '<button class="chip" data-act="bib-book" data-a="' + esc(k) + '">' + esc(k) + '</button>';
    openModal('Księga', '<div class="sec">Stary Testament</div><div class="chips">' + bk.filter(k => ORDER.indexOf(k) < NT).map(btn).join('') + '</div>' +
      '<div class="sec">Nowy Testament</div><div class="chips">' + bk.filter(k => ORDER.indexOf(k) >= NT).map(btn).join('') + '</div>', '');
  }
  function pickChap(b) {
    openModal(bookName(b), '<div class="chips bibch">' + Array.from({ length: nChap(b) }, (x, i) => '<button class="chip" data-act="bib-chap" data-a="' + esc(b) + '" data-b="' + (i + 1) + '">' + (i + 1) + '</button>').join('') + '</div>', '');
  }
  async function importDir() {
    if (!A.pickBibleDir) return;
    const files = await A.pickBibleDir();
    if (!files) return;
    if (!Object.keys(files).length) { toast('W tym folderze nie ma Biblii (szukam podfolderów Rdz, Mt…).'); return; }
    toast('Przerabiam…');
    setTimeout(() => {
      const db = fromHtmlFiles(files), old = load();
      if (old && old.notes) { db.notes = old.notes; db.noteBooks = old.noteBooks; }
      if (store(db)) { toast('Wczytano: ' + db.stat.ksiegi + ' ksiąg, ' + db.stat.wersety + ' wersetów, ' + db.stat.odnosniki + ' odnośników.'); go('biblia'); }
    }, 30);
  }
  /** PDF → przetwarzanie z paskiem postępu (key: bjpdf | kkkpdf). */
  function withPdf(key, title, work) {
    const prev = window.onPdfPicked;
    window.onPdfPicked = async (k, ok) => {
      window.onPdfPicked = prev;
      if (k !== key) { if (prev) prev(k, ok); return; }
      if (!ok) { toast('Nie wczytano PDF.'); return; }
      openModal(title, '<div id="bibprog" class="muted">Czytam strony…</div>', '');
      try { await work((p, n) => { const el = document.getElementById('bibprog'); if (el) el.textContent = 'Strona ' + p + ' z ' + n + '…'; }); }
      catch (e) { closeModal(); toast('Błąd czytania PDF: ' + e.message); }
    };
    A.pickPdf(key);
  }
  function importPdf() {
    withPdf('bjpdf', 'Przypisy z PDF', async prog => {
      const r = await notesFromPdf('bjpdf', prog);
      const bks = Object.keys(r.res); let bad = 0;
      bks.forEach(b => { if (!A.saveText(fname(b), JSON.stringify(r.res[b]))) bad++; });
      const d = load(); d.notes = r.cnt; d.noteBooks = bks; store(d);
      closeModal(); toast('Dodano ' + r.cnt + ' przypisów i komentarzy (' + bks.length + ' ksiąg)' + (bad ? ', błędy zapisu: ' + bad : '') + '.'); render();
    });
  }
  function importKkkPdf() {
    withPdf('kkkpdf', 'Katechizm z PDF', async prog => {
      const K = await kkkFromPdf('kkkpdf', prog);
      closeModal();
      if (K.p.length < 20) { toast('Rozpoznano tylko ' + K.p.length + ' punktów – układ PDF inny niż oczekiwany. Wyślij mi kilka stron.'); return; }
      A.saveText('kkk.json', JSON.stringify(K)); KKK = K;
      toast('Wczytano Katechizm: ' + K.p.length + ' punktów' + (K.p.length < 2865 ? ' (pełny ma 2865)' : '') + '.'); go('kkk');
    });
  }
  function exportFile() {
    const d = load(); if (!d) return;
    const out = Object.assign({}, d, { przypisy: {} });
    (d.noteBooks || []).forEach(b => { const n = notesOf(b); if (n) out.przypisy[b] = n; });
    if (!Object.keys(out.przypisy).length) delete out.przypisy;
    A.exportData(JSON.stringify(out), 'biblia.json');
  }
  /** Wczytany plik (onImport): Biblia albo Katechizm. */
  function importObj(obj) {
    if (obj && obj.trojnogKKK && obj.p) { A.saveText('kkk.json', JSON.stringify(obj)); KKK = obj; toast('Wczytano Katechizm (' + obj.p.length + ' punktów).'); go('kkk'); return true; }
    if (!obj || !obj.trojnogBiblia || !obj.b) return false;
    const pr = obj.przypisy || {}; delete obj.przypisy;
    Object.keys(pr).forEach(b => A.saveText(fname(b), JSON.stringify(pr[b])));
    obj.noteBooks = Object.keys(pr).length ? Object.keys(pr) : obj.noteBooks;
    if (store(obj)) { toast('Wczytano Biblię (' + Object.keys(obj.b).length + ' ksiąg' + (obj.notes ? ', z przypisami' : '') + ').'); UI.bib = null; go('biblia'); }
    return true;
  }
  function noteText(v, k) { const s = st(), nn = ((notesOf(s.b) || {})[s.c + ',' + v] || []).filter(x => x[0] === k); return nn.map(x => x[1]).join('\n\n'); }

  function act(act, a, el) {
    if (act.indexOf('bib-') !== 0 && act.indexOf('kkk-') !== 0 && act.indexOf('skr-n') !== 0) return false;
    const s = st();
    switch (act) {
      case 'bib-dir': importDir(); break;
      case 'bib-file': if (A.importData) A.importData(); break;
      case 'bib-export': exportFile(); break;
      case 'bib-pdf': importPdf(); break;
      case 'bib-pick': pickBook(); break;
      case 'bib-book': pickChap(a); break;
      case 'bib-chap': closeModal(); s.back.push({ b: s.b, c: s.c, hl: s.hl, cur: s.cur }); s.b = a; s.c = +el.dataset.b; s.hl = null; s.res = null; s.sel = null; render(); document.getElementById('main').scrollTop = 0; break;
      case 'bib-ch': { const c = s.c + (+a); if (c >= 1 && c <= nChap(s.b)) { s.c = c; s.hl = null; s.sel = null; render(); document.getElementById('main').scrollTop = 0; } break; }
      case 'bib-ref': {
        if (!s.path.length) s.path.push(s.b + ' ' + s.c + ',' + el.dataset.b);
        if (goRef(a, true)) addPath(a);
        break;
      }
      case 'bib-goto': goRef(a, true); break;
      case 'bib-back': { const p = s.back.pop(); if (p) { s.b = p.b; s.c = p.c; s.hl = p.hl; s.cur = p.cur; s.res = null; s.sel = null; render(); if (p.hl) scrollTo(p.hl[0]); } break; }
      case 'bib-go': { const q = document.getElementById('bibq'); search(q ? q.value : ''); break; }
      case 'bib-resx': s.res = null; s.q = ''; render(); break;
      case 'bib-note': s.open[a] = !s.open[a]; render(); break;
      case 'bib-nwin': openModal('Przypis BJ – ' + s.b + ' ' + s.c + ',' + parseInt(a, 10), '<div class="bnote">' + esc(noteText(parseInt(a, 10), 'bj')).replace(/\n/g, '<br>') + '</div>', ''); break;
      case 'bib-kpop': openModal('Komentarz – ' + s.b + ' ' + s.c + ',' + a, '<div class="bnote k">' + esc(noteText(+a, 'k')).replace(/\n/g, '<br>') + '</div>', ''); break;
      case 'bib-v': {
        if (!skrOf(s.skr)) return true;
        const t = (window.getSelection() || '').toString().trim();
        s.next = null; if (t) { s.sel = +a; s.selTxt = t.replace(/\s+/g, ' '); } else if (s.sel === +a && !s.selTxt) s.sel = null; else { s.sel = +a; s.selTxt = ''; }
        bar(); break;
      }
      case 'bib-add': addNode(); break;
      case 'bib-nextx': s.next = null; bar(); break;
      case 'bib-unsel': s.sel = null; s.selTxt = ''; try { window.getSelection().removeAllRanges(); } catch (e) { /* */ } bar(); break;
      case 'bib-marg': s.hideM = !s.hideM; render(); break;
      case 'bib-optdlg': optDialog(); break;
      case 'bib-opt': { const o = opt(); o[a] = a === 'q' ? el.dataset.b === '1' : el.dataset.b; save(true); optDialog(); break; }
      case 'bib-qg': { const o = opt(), i = o.qg.indexOf(a); if (i >= 0) o.qg.splice(i, 1); else o.qg.push(a); save(true); if (document.getElementById('modal').classList.contains('hidden')) render(); else optDialog(); break; }
      case 'bib-optok': closeModal(); render(); break;
      case 'bib-clr': s.path = []; render(); break;
      case 'bib-skr': UI.skr = s.skr; s.skr = null; s.cur = null; s.sel = null; s.back = []; s.path = []; go('skrutacja'); break;
      case 'bib-skrx': s.skr = null; s.cur = null; s.path = []; render(); break;
      case 'kkk-pdf': importKkkPdf(); break;
      case 'kkk-export': if (kkk()) A.exportData(JSON.stringify(kkk()), 'katechizm.json'); break;
      case 'kkk-go': { const q = document.getElementById('kkkq'); kkkSearch(q ? q.value : ''); break; }
      case 'kkk-n': s.kn = Math.max(1, +a); s.kres = null; render(); document.getElementById('main').scrollTop = 0; break;
      case 'skr-ngo': {
        const x = S.skrutacje.find(y => y.id === UI.skr), n = x && (x.nodes || []).find(y => y.id === a); if (!n) return true;
        s.skr = x.id; s.cur = n.id; s.back = []; s.path = []; goRef(n.ref, false); break;
      }
      case 'skr-ndel': {
        const x = S.skrutacje.find(y => y.id === UI.skr); if (!x) return true;
        confirmBox('Usunąć zapisek?', 'Zapiski „pod nim” przejdą piętro wyżej.', 'Usuń', () => {
          const n = x.nodes.find(y => y.id === a); if (!n) return;
          x.nodes.forEach(y => { if (y.p === a) y.p = n.p; }); x.nodes = x.nodes.filter(y => y.id !== a); x.ts = Date.now(); save(); render();
        });
        break;
      }
      default: return false;
    }
    return true;
  }
  function nodeInput(el) { const x = S.skrutacje.find(y => y.id === UI.skr), n = x && (x.nodes || []).find(y => y.id === el.dataset.a); if (n) { n.note = el.value; x.ts = Date.now(); save(); } }
  function back() {
    if (UI.view === 'kkk') { const s = st(); if (s.kres) { s.kres = null; render(); return true; } return false; }
    if (UI.view !== 'biblia') return false;
    const s = st();
    if (s.sel) { act('bib-unsel', '', null); return true; }
    if (s.res) { s.res = null; render(); return true; }
    if (s.back.length) { act('bib-back', '', null); return true; }
    if (skrOf(s.skr)) { act('bib-skr', '', null); return true; }
    return false;
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target) return;
    if (e.target.id === 'bibq') { e.preventDefault(); search(e.target.value); }
    if (e.target.id === 'kkkq') { e.preventDefault(); kkkSearch(e.target.value); }
  });

  function plain() { const s = st(); s.skr = null; s.cur = null; s.sel = null; s.path = []; }
  window.BIB = { repair: repair, plain: plain, has: has, view: view, viewKKK: viewKKK, act: act, open: open, back: back, importObj: importObj, parseRefs: parseRefs, fromHtmlFiles: fromHtmlFiles,
    notesFromPdf: notesFromPdf, kkkFromPdf: kkkFromPdf, lines: lines, treeHtml: treeHtml, treeText: treeText, nodeInput: nodeInput, quoteCard: quoteCard, qgChips: qgChips, quote: quote };
})();
