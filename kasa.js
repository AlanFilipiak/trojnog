/* Trójnóg – kasa wspólnoty (wpływy i wydatki). Widoczna dla Odpowiedzialnego, Drugiego odpowiedzialnego i Współodpowiedzialnego danej wspólnoty.
   Dane: S.kasa[idWspólnoty] (lokalnie). Wspólna kasa: szyfrowana kodem kasy (AES-GCM) i trzymana w arkuszu (App_Konta, akcje kontoPush/kontoPull).
   Kto nie ma kodu – nie odczyta, nawet z tokenem arkusza albo z samodzielnie wpisaną funkcją. */
(function () {
  'use strict';
  const IN_CAT = ['Kolekta z Eucharystii', 'Kolekta z Liturgii Słowa', 'Kolekta z konwiwencji', 'Darowizna', 'Inny wpływ'];
  const OUT_CAT = ['Kwiaty', 'Chleb', 'Wino', 'Świece', 'Agapa', 'Wynajem sali', 'Inny wydatek'];
  const MIES = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  let st = null;   // stan formularza
  const fromIso = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };

  /** Tylko Odpowiedzialny, Drugi odpowiedzialny i Współodpowiedzialny tej wspólnoty (bez wyjątków). */
  function allowed(w) {
    if (!w || !S.owner) return false;
    const r = wspData(w.id).role[S.owner] || [];
    return r.indexOf('Odpowiedzialny') >= 0 || r.indexOf('Drugi odpowiedzialny') >= 0 || r.indexOf('Współodpowiedzialny') >= 0;
  }
  function list() { return S.wspolnoty.filter(allowed); }
  function any() { const ok = list().length > 0; if (S.kasaOk !== ok) S.kasaOk = ok; return ok; }   // zapamiętane – kafelek od razu po starcie
  function curK() {
    const ws = list(); if (!ws.length) return null;
    if (!UI.kasaW || !ws.some(w => w.id === UI.kasaW)) UI.kasaW = (ws.find(w => w.id === S.wspAktywna) || ws[0]).id;
    return ws.find(w => w.id === UI.kasaW);
  }
  function all(w) { S.kasa = S.kasa || {}; return (S.kasa[w.id] = S.kasa[w.id] || []); }   // z usuniętymi (znacznik del – potrzebny do synchronizacji)
  function entries(w) { return all(w).filter(e => !e.del && e.typ !== 'skip'); }
  /* ---------- wydarzenia z kalendarza i zdjęcia paragonów ---------- */
  const KOLEKTA = ['eu', 'pascha'];
  const evs = () => (window.KAL ? KAL.alive() : []).filter(e => e.data);
  function evName(e) { return e ? (KAL.TY[e.typ] || { n: 'Wydarzenie' }).n + ' ' + plDate(e.data).slice(0, 5) : ''; }
  function evById(id) { return id ? evs().find(e => e.id === id) : null; }
  /** Wydarzenia do powiązania: tej wspólnoty lub wspólne, od 60 dni wstecz do 14 dni naprzód (bez przygotowań). */
  function evChoices(w) {
    const a = isoAdd(-60), b = isoAdd(14);
    return evs().filter(e => (e.wsp === w.id || e.wsp === 'all') && (KAL.TY[e.typ] || {}).kind !== 'p' && e.data >= a && e.data <= b).sort((x, y) => y.data.localeCompare(x.data));
  }
  function isoAdd(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /** Kolekty do wpisania: minione Eucharystie (do 45 dni), które przygotowywała ta wspólnota, bez wpisu. */
  function pendingKolekty(w) {
    const a = isoAdd(-45), t = todayIso(), linked = new Set(all(w).filter(e => !e.del && e.ev).map(e => e.ev));
    return evs().filter(e => KOLEKTA.indexOf(e.typ) >= 0 && e.data >= a && e.data <= t && !linked.has(e.id) && KAL.preparedBy(e) === w.id)
      .sort((x, y) => y.data.localeCompare(x.data));
  }
  const phSrc = (u, px) => photoUrl(u, px || 360);
  let photoFor = false;
  const origPhoto = window.onPhoto;
  window.onPhoto = function (uri) {
    if (photoFor && st) { photoFor = false; st.e.foto = uri; dialog(); return; }
    if (origPhoto) origPhoto(uri);
  };
  const sign = e => e.typ === 'out' ? -e.kwota : e.kwota;
  const zl = gr => (gr < 0 ? '−' : '') + (Math.abs(gr) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
  function parseZl(t) {
    const s = String(t || '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
    if (!s || isNaN(+s)) return 0;
    return Math.round(+s * 100);
  }
  const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  /* ---------- wspólna kasa: szyfrowanie kodem kasy ---------- */
  const C = window.crypto && window.crypto.subtle, te = new TextEncoder(), td = new TextDecoder();
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b64 = buf => { let x = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 8192) x += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(x); };
  const unb64 = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
  const keys = {}, busy = {}, lastPull = {};
  let pushT = null;
  const normCode = c => String(c || '').toUpperCase().replace(/^TROJNOG-KASA:/, '').replace(/[^A-Z0-9]/g, '');
  const fmtCode = c => c.replace(/(.{4})(?=.)/g, '$1-');
  function newCode() { const r = crypto.getRandomValues(new Uint8Array(20)); return Array.from(r).map(x => ABC[x % 32]).join(''); }
  function cfg(w) { S.kasaSync = S.kasaSync || {}; return S.kasaSync[w.id] || null; }
  async function keyFor(code) {
    if (keys[code]) return keys[code];
    const base = await C.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveKey']);
    keys[code] = await C.deriveKey({ name: 'PBKDF2', salt: te.encode('trojnog-kasa'), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return keys[code];
  }
  async function rowId(code) { const h = new Uint8Array(await C.digest('SHA-256', te.encode('trojnog-kasa-id:' + code))); return 'K' + Array.from(h).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 39); }
  async function enc(code, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); return b64(iv) + ':' + b64(await C.encrypt({ name: 'AES-GCM', iv: iv }, await keyFor(code), te.encode(JSON.stringify(obj)))); }
  async function dec(code, x) { const p = x.split(':'); return JSON.parse(td.decode(await C.decrypt({ name: 'AES-GCM', iv: unb64(p[0]) }, await keyFor(code), unb64(p[1])))); }
  /** Łączenie: każdy wpis po id, wygrywa nowsza zmiana (ts). */
  function merge(a, b) {
    const m = {};
    a.concat(b).forEach(e => { if (!e || !e.id) return; if (!m[e.id] || String(e.ts) > String(m[e.id].ts)) m[e.id] = e; });
    return Object.keys(m).map(k => m[k]);
  }
  const sig = arr => JSON.stringify(arr.slice().sort((x, y) => x.id < y.id ? -1 : 1).map(e => [e.id, String(e.ts)]));
  function msg(t) { UI.kasaMsg = t; const el = document.getElementById('kasaMsg'); if (el) el.textContent = t; }
  function post(body, cb) { httpPost(S.syncUrl, JSON.stringify(Object.assign({ token: S.syncToken }, body)), (ok, text) => { let r = null; try { r = JSON.parse(text); } catch (e) { r = null; } cb(ok && r && r.ok ? r : null, r); }); }
  async function syncNow(w, manual) {
    const c = cfg(w);
    if (!c || !c.code || !allowed(w) || !wsReady() || !C || busy[w.id]) return;
    busy[w.id] = true; lastPull[w.id] = Date.now();
    if (manual) msg('Synchronizuję…');
    try {
      const id = await rowId(c.code);
      post({ action: 'kontoPull', id: id }, async (r, raw) => {
        try {
          if (!r) { busy[w.id] = false; msg('Brak połączenia z arkuszem' + (raw && raw.error ? ': ' + raw.error : '') + '.'); return; }
          if (!('ts' in r)) { busy[w.id] = false; msg('W arkuszu jest starszy Sync.gs (bez „Mojego konta”).'); return; }
          let remote = [];
          if (!r.data && c.joining) { busy[w.id] = false; delete S.kasaSync[w.id]; save(true); UI.kasaMsg = ''; render(); toast('Pod tym kodem nie ma kasy – sprawdź kod.'); return; }
          if (r.data) {
            try { remote = (await dec(c.code, r.data)).e || []; }
            catch (e) { busy[w.id] = false; msg('Zły kod kasy – nie da się odczytać danych.'); return; }
          }
          delete c.joining;
          const merged = merge(all(w), remote), changedLocal = sig(merged) !== sig(all(w)), changedRemote = sig(merged) !== sig(remote);
          if (changedLocal) { S.kasa[w.id] = merged; save(true); if (UI.view === 'wydatki' && !modalState) render(); }
          if (!changedRemote) { busy[w.id] = false; c.ts = Date.now(); msg('Aktualne · ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })); return; }
          const data = await enc(c.code, { v: 1, e: merged }), parts = [];
          for (let i = 0; i < data.length; i += 40000) parts.push(data.slice(i, i + 40000));
          post({ action: 'kontoPush', id: id, ts: Math.max(Date.now(), (r.ts || 0) + 1), parts: parts }, p => {
            busy[w.id] = false;
            if (p && p.stale) { syncNow(w, manual); return; }
            if (p) { c.ts = Date.now(); msg('Wysłano · ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })); }
            else msg('Nie wysłano – brak połączenia.');
          });
        } catch (e) { busy[w.id] = false; msg('Błąd: ' + e.message); }
      });
    } catch (e) { busy[w.id] = false; msg('Błąd: ' + e.message); }
  }
  function changed(w) { clearTimeout(pushT); pushT = setTimeout(() => syncNow(w, false), 1200); }
  function syncCard(w) {
    const c = cfg(w);
    if (!wsReady()) return '<div class="card"><h2>Wspólna kasa</h2><div class="muted">Żeby druga osoba widziała kasę na bieżąco, najpierw połącz aplikację z arkuszem (Ustawienia → Bezpieczeństwo i synchronizacja).</div></div>';
    if (!c) return '<div class="card"><h2>Wspólna kasa</h2><div class="muted">Druga osoba odpowiedzialna (np. żona) widzi kasę na bieżąco – każda zmiana od razu się synchronizuje. ' +
      'W arkuszu kasa jest zaszyfrowana kodem kasy: bez kodu nikt jej nie odczyta, nawet z dostępem do arkusza albo po wpisaniu sobie funkcji.</div>' +
      '<button class="btn full mt" data-act="kasa-on">Włącz wspólną kasę (nowy kod)</button>' +
      '<label class="lbl">Albo mam kod od drugiej osoby</label><div class="row"><input type="text" id="kasaCode" class="grow" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocapitalize="characters">' +
      '<button class="btn" data-act="kasa-join">Połącz</button></div><button class="btn ghost full mt" data-act="kasa-scan">📷 Skanuj kod QR</button></div>';
    return '<div class="card"><h2>Wspólna kasa</h2><div class="row"><span class="grow">🔒 Synchronizacja włączona</span><button class="btn ghost sm" data-act="kasa-sync">↻</button></div>' +
      '<div class="muted" id="kasaMsg">' + esc(UI.kasaMsg || '') + '</div>' +
      '<button class="btn ghost full mt" data-act="kasa-code">Pokaż kod dla drugiej osoby</button>' +
      '<button class="btn text full" data-act="kasa-off">Odłącz ten telefon od wspólnej kasy</button></div>';
  }
  async function showCode(w) {
    const c = cfg(w); if (!c) return;
    if (!window.qrcode) await loadScript('lib/qrcode.js');
    const q = qrcode(0, 'M'); q.addData('TROJNOG-KASA:' + c.code); q.make();
    modalState = { kind: 'kasacode' };
    openModal('Kod kasy – ' + w.nazwa, '<div class="qr">' + q.createSvgTag(6, 12) + '</div><div class="kasa-code">' + fmtCode(c.code) + '</div>' +
      '<p class="muted">Druga osoba odpowiedzialna: Start → Kasetka → „Wspólna kasa” → Skanuj kod QR albo wpisz kod. Nie wysyłaj kodu nikomu innemu – kto ma kod, widzi kasę.</p>');
  }
  function join(w, code) {
    const k = normCode(code);
    if (k.length !== 20) { toast('Kod kasy ma 20 znaków.'); return; }
    S.kasaSync = S.kasaSync || {}; S.kasaSync[w.id] = { code: k, ts: 0, joining: true }; save(true); msg('Łączę…'); render(); syncNow(w, true);
  }
  /** Wynik skanera QR – jeśli to kod kasy, łączy aktywną (wybraną) wspólnotę. */
  function scan(text) {
    if (!/^TROJNOG-KASA:/i.test(String(text || ''))) return false;
    const w = curK(); if (!w) { toast('Kasę widzi tylko osoba odpowiedzialna wspólnoty.'); return true; }
    go('wydatki'); join(w, text); return true;
  }
  setTimeout(() => { try { list().forEach(w => syncNow(w, false)); } catch (e) { /* */ } }, 4000);
  setInterval(() => { if (UI.view === 'wydatki' && !modalState && document.visibilityState !== 'hidden') { const w = curK(); if (w && cfg(w)) syncNow(w, false); } }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') try { list().forEach(w => syncNow(w, false)); } catch (e) { /* */ } });

  function sorted(w) { return entries(w).slice().sort((a, b) => (a.data + a.ts).localeCompare(b.data + b.ts)); }
  function balance(w) { return entries(w).reduce((s, e) => s + sign(e), 0); }

  function view() {
    const w = curK();
    if (!w) return '<div class="card"><h2>Kasetka</h2><div class="muted">Kasę widzi tylko Odpowiedzialny i Współodpowiedzialny wspólnoty.</div></div>';
    const ws = list(), es = sorted(w), bal = balance(w);
    const now = todayIso().slice(0, 7);
    const mIn = es.filter(e => e.data.slice(0, 7) === now && e.typ === 'in').reduce((s, e) => s + e.kwota, 0);
    const mOut = es.filter(e => e.data.slice(0, 7) === now && e.typ === 'out').reduce((s, e) => s + e.kwota, 0);
    let h = (ws.length > 1 ? '<div class="chips">' + ws.map(x => '<button class="chip' + (x.id === w.id ? ' on' : '') + '" data-act="kasa-w" data-a="' + x.id + '">' + esc(x.nazwa) + '</button>').join('') + '</div>' : '') +
      '<div class="kasa-top' + (bal < 0 ? ' neg' : '') + '"><div class="muted">Stan kasy · ' + esc(w.nazwa) + '</div><div class="kasa-bal">' + zl(bal) + '</div>' +
      (es.length ? '<div class="kasa-sum"><span>Ten miesiąc: <b class="kin">+' + zl(mIn) + '</b></span><span><b class="kout">−' + zl(mOut) + '</b></span><span>różnica <b>' + zl(mIn - mOut) + '</b></span></div>' : '') + '</div>';
    if (cfg(w) && Date.now() - (lastPull[w.id] || 0) > 20000) setTimeout(() => syncNow(w, false), 0);
    if (!es.length) {
      return h + syncCard(w) + '<div class="card"><h2>Pierwszy wpis</h2><div class="muted">Wpisz aktualny stan kasy – od niego liczą się kolejne wpływy i wydatki.</div>' +
        '<label class="lbl">Stan kasy na dziś (zł)</label><input type="text" inputmode="decimal" id="kasaStart" placeholder="np. 350,00">' +
        '<button class="btn full mt" data-act="kasa-start">Zapisz stan początkowy</button></div>';
    }
    const pk = pendingKolekty(w);
    if (pk.length) h += '<div class="card kasa-pk"><h2>Kolekta do wpisania</h2><div class="muted">Przygotowywała to nasza wspólnota – kolekta trafia do naszej kasy.</div>' +
      pk.map(e => '<div class="row chk"><span class="grow">' + esc(evName(e)) + (e.gdzie ? ' <span class="muted">· ' + esc(e.gdzie) + '</span>' : '') + '</span>' +
        '<button class="btn sm" data-act="kasa-kol" data-a="' + e.id + '">＋ Wpisz</button><button class="btn text sm" data-act="kasa-skip" data-a="' + e.id + '">Nie było</button></div>').join('') + '</div>';
    h += '<div class="row kasa-btns"><button class="btn grow kbin" data-act="kasa-new" data-a="in">＋ Wpływ</button><button class="btn grow kbout" data-act="kasa-new" data-a="out">− Wydatek</button></div>';
    let run = 0; const rows = es.map(e => { run += sign(e); return { e: e, run: run }; }).reverse();
    let lastM = '';
    h += '<div class="card"><h2>Historia</h2>' + rows.map(r => {
      const e = r.e, m = e.data.slice(0, 7);
      let x = '';
      if (m !== lastM) {
        lastM = m; const d = fromIso(e.data);
        const sIn = es.filter(z => z.data.slice(0, 7) === m && z.typ === 'in').reduce((s, z) => s + z.kwota, 0), sOut = es.filter(z => z.data.slice(0, 7) === m && z.typ === 'out').reduce((s, z) => s + z.kwota, 0);
        x += '<div class="kasa-m"><b>' + MIES[d.getMonth()].charAt(0).toUpperCase() + MIES[d.getMonth()].slice(1) + ' ' + d.getFullYear() + '</b><span class="muted">+' + zl(sIn) + ' / −' + zl(sOut) + '</span></div>';
      }
      return x + '<div class="kasa-row" data-act="kasa-edit" data-a="' + e.id + '"><div class="grow"><div>' + esc(e.opis || (e.typ === 'in' ? 'Wpływ' : 'Wydatek')) + '</div>' +
        '<div class="muted">' + plDate(e.data).slice(0, 5) + (e.ev && evById(e.ev) ? ' · ' + esc(evById(e.ev).data === e.data ? (KAL.TY[evById(e.ev).typ] || { n: '' }).n : evName(evById(e.ev))) : '') + (e.foto ? ' · 📎' : '') + (e.by ? ' · ' + esc(e.by) : '') + ' · stan: ' + zl(r.run) + '</div></div>' +
        '<b class="' + (e.typ === 'out' ? 'kout' : 'kin') + '">' + (e.typ === 'out' ? '−' : '+') + zl(e.kwota) + '</b></div>';
    }).join('') + '</div>' +
      '<button class="btn ghost full" data-act="kasa-csv">⇩ Eksport do arkusza (CSV)</button>' +
      syncCard(w);
    return h;
  }

  function dialog() {
    const e = st.e, cats = e.typ === 'in' ? IN_CAT : OUT_CAT;
    modalState = { kind: 'kasa' };
    openModal(st.isNew ? (e.typ === 'in' ? 'Nowy wpływ' : 'Nowy wydatek') : (e.typ === 'start' ? 'Stan początkowy' : e.typ === 'in' ? 'Wpływ' : 'Wydatek'),
      (e.typ === 'start' ? '' : '<label class="lbl">' + (e.typ === 'in' ? 'Skąd' : 'Na co') + '</label><div class="chips">' + cats.map(c =>
        '<button class="chip' + (e.opis === c ? ' on' : '') + '" data-act="kasa-cat" data-a="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>') +
      '<label class="lbl">Opis' + (e.typ === 'out' ? ' (np. kwiaty na Eucharystię)' : '') + '</label><input type="text" id="kasaOpis" value="' + esc(e.opis) + '">' +
      '<div class="row"><div class="grow"><label class="lbl">Kwota (zł)</label><input type="text" inputmode="decimal" id="kasaKw" value="' + (e.kwota ? (e.kwota / 100).toFixed(2).replace('.', ',') : '') + '" placeholder="0,00"></div>' +
      '<div class="grow"><label class="lbl">Data</label><input type="date" id="kasaData" value="' + esc(e.data) + '"></div></div>' +
      (e.typ === 'start' ? '' : '<label class="lbl">Powiązane wydarzenie z kalendarza</label><select id="kasaEv"><option value="">— brak —</option>' +
        (function () { const ch = evChoices(curK()), cur = evById(e.ev); if (cur && !ch.some(x => x.id === cur.id)) ch.unshift(cur); return ch; })().map(x =>
          '<option value="' + x.id + '"' + (e.ev === x.id ? ' selected' : '') + '>' + esc(evName(x) + (x.gdzie ? ' · ' + x.gdzie : '')) + '</option>').join('') + '</select>' +
        '<label class="lbl">' + (e.typ === 'out' ? 'Zdjęcie paragonu' : 'Zdjęcie (opcjonalnie)') + '</label>' + (e.foto ? '<div class="row"><button class="kasa-ph" data-act="kasa-ph-open"><img src="' + phSrc(e.foto) + '" alt="paragon"></button>' +
          '<button class="btn text sm" data-act="kasa-ph-del">Usuń zdjęcie</button></div>' : '') +
        '<div class="row"><button class="btn ghost grow" data-act="kasa-ph" data-a="take">📷 ' + (e.foto ? 'Zmień' : 'Zrób zdjęcie') + '</button><button class="btn ghost grow" data-act="kasa-ph" data-a="pick">🖼 Z galerii</button></div>'),
      (st.isNew ? '' : '<button class="btn text" data-act="kasa-del">Usuń</button>') + '<button class="btn" data-act="kasa-ok">Zapisz</button>');
  }
  function grab() {
    const v = id => { const x = document.getElementById(id); return x ? x.value.trim() : ''; };
    if (!document.getElementById('kasaKw')) return;
    st.e.opis = v('kasaOpis'); st.e.kwota = parseZl(v('kasaKw')); st.e.data = v('kasaData') || st.e.data;
    const ev = document.getElementById('kasaEv'); if (ev) st.e.ev = ev.value;
  }

  function act(a, v) {
    if (a.indexOf('kasa-') !== 0) return false;
    const w = curK(); if (!w) return true;
    switch (a) {
      case 'kasa-w': UI.kasaW = v; render(); return true;
      case 'kasa-start': {
        const k = parseZl(document.getElementById('kasaStart').value);
        all(w).push({ id: uuid(), ts: String(Date.now()), typ: 'start', kwota: k, opis: 'Stan początkowy kasy', data: todayIso(), by: S.owner });
        save(true); render(); changed(w); return true;
      }
      case 'kasa-new': st = { isNew: true, e: { id: uuid(), ts: String(Date.now()), typ: v, kwota: 0, opis: '', data: todayIso(), by: S.owner } }; dialog(); return true;
      case 'kasa-edit': { const e = entries(w).find(x => x.id === v); if (!e) return true; st = { isNew: false, e: JSON.parse(JSON.stringify(e)) }; dialog(); return true; }
      case 'kasa-cat': grab(); st.e.opis = v; dialog(); return true;
      case 'kasa-ok': {
        grab(); const e = st.e;
        if (!e.kwota && e.typ !== 'start') { toast('Wpisz kwotę.'); return true; }
        if (e.typ === 'out' && !e.opis) { toast('Wpisz, na co był wydatek.'); return true; }
        e.ts = String(Date.now());
        const es = all(w), i = es.findIndex(x => x.id === e.id);
        if (i >= 0) es[i] = e; else es.push(e);
        closeModal(); save(true); render(); changed(w); return true;
      }
      case 'kasa-del': {
        const es = all(w), i = es.findIndex(x => x.id === st.e.id);
        if (i >= 0) es[i] = { id: st.e.id, del: true, ts: String(Date.now()) };
        closeModal(); save(true); render(); changed(w); return true;
      }
      case 'kasa-kol': { const e = evById(v); if (!e) return true;
        st = { isNew: true, e: { id: uuid(), ts: String(Date.now()), typ: 'in', kwota: 0, opis: e.typ === 'eu' ? 'Kolekta z Eucharystii' : 'Kolekta – ' + evName(e), data: e.data, ev: e.id, by: S.owner } }; dialog(); return true; }
      case 'kasa-skip': all(w).push({ id: uuid(), ts: String(Date.now()), typ: 'skip', kwota: 0, opis: '', data: todayIso(), ev: v, by: S.owner }); save(true); render(); changed(w); return true;
      case 'kasa-ph': grab(); photoFor = true;
        if (v === 'take' && A && A.takePhoto) A.takePhoto(); else if (A && A.pickPhotos) A.pickPhotos(); else { photoFor = false; toast('Dostępne w aplikacji na telefonie.'); }
        return true;
      case 'kasa-ph-open': if (st && st.e.foto && A && A.openPhoto) A.openPhoto(st.e.foto); return true;
      case 'kasa-ph-del': grab(); delete st.e.foto; dialog(); return true;
      case 'kasa-on': S.kasaSync = S.kasaSync || {}; S.kasaSync[w.id] = { code: newCode(), ts: 0 }; save(true); msg('Wysyłam…'); render(); syncNow(w, true); showCode(w); return true;
      case 'kasa-join': join(w, (document.getElementById('kasaCode') || {}).value); return true;
      case 'kasa-scan': openScanner(); return true;
      case 'kasa-sync': syncNow(w, true); return true;
      case 'kasa-code': showCode(w); return true;
      case 'kasa-off': delete S.kasaSync[w.id]; UI.kasaMsg = ''; save(true); render(); toast('Odłączono. Wpisy zostały na tym telefonie.'); return true;
      case 'kasa-csv': {
        let run = 0;
        const rows = [['Data', 'Rodzaj', 'Opis', 'Kwota', 'Stan', 'Wpisał(a)', 'Wydarzenie']].concat(sorted(w).map(e => {
          run += sign(e);
          return [e.data, e.typ === 'out' ? 'wydatek' : e.typ === 'in' ? 'wpływ' : 'stan początkowy', e.opis, (sign(e) / 100).toFixed(2).replace('.', ','), (run / 100).toFixed(2).replace('.', ','), e.by || '', evName(evById(e.ev))];
        }));
        const csv = '﻿' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(';')).join('\r\n');
        const name = 'Kasa_' + w.nazwa.replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/g, '_') + '_' + todayIso() + '.csv';
        if (A && A.exportFile) A.exportFile(csv, name, 'text/csv'); else toast('Eksport działa w aplikacji.');
        return true;
      }
    }
    return false;
  }

  if (UI.view === 'start' || UI.view === 'wydatki') setTimeout(render, 0);   // pierwszy widok narysowano przed wczytaniem tego modułu
  window.KASA = { view: view, act: act, any: any, allowed: allowed, scan: scan };
})();
