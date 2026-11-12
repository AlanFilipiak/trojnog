/* Przygotowanie – hasło (blokada Skrutacji / całej aplikacji) i „Moje konto”:
   te same dane na kilku urządzeniach, szyfrowane hasłem (AES-GCM) przed wysłaniem do arkusza. */
(function () {
  'use strict';
  const C = window.crypto && window.crypto.subtle;
  const te = new TextEncoder(), td = new TextDecoder();
  const LOCAL_KEYS = ['konto', 'collapsed', 'zdjecia', 'seenVer', 'lastHello', 'bgVis', 'gcal', 'kasa', 'kasaSync', 'notatki', 'imiona', 'tut', 'welcomed'];          // nie wędrują między urządzeniami
  const CHUNK = 40000;

  function ensure() {
    S.konto = Object.assign({ login: '', on: false, ok: false, lock: 'off', salt: '', hash: '', changed: 0, synced: 0 }, S.konto || {});
    if (!S.konto.dev) {   // identyfikator tego urządzenia (nie wędruje – konto jest lokalne)
      S.konto.dev = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      S.konto.devName = A && A.desktop ? 'Komputer' : A && A.web ? 'iPhone' : Math.min(screen.width, screen.height) >= 600 ? 'Tablet' : 'Telefon';
    }
  }
  /** Skrót danych do porównania – automatyczne zapisy bez zmian w danych nie liczą się jako „zmiana na tym urządzeniu”. */
  function dataHash() {
    const o = payload(); delete o.devices; const t = JSON.stringify(o); let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    return String(h >>> 0) + ':' + t.length;
  }
  const isMain = () => !!S.mainDev && S.mainDev === S.konto.dev;
  ensure();

  const b64 = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function sha(t) { return b64(await C.digest('SHA-256', te.encode(t))); }
  async function pbkdf(pass, salt, bits) {
    const base = await C.importKey('raw', te.encode(String(pass).normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    return C.deriveBits({ name: 'PBKDF2', salt: te.encode(salt), iterations: 150000, hash: 'SHA-256' }, base, bits);
  }
  /* ---------- hasło lokalne (blokada) ---------- */
  async function setPassword(pass) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    S.konto.salt = salt; S.konto.hash = b64(await pbkdf(pass, salt, 256));
  }
  async function checkPassword(pass) {
    if (!S.konto.hash) return true;
    return b64(await pbkdf(pass, S.konto.salt, 256)) === S.konto.hash;
  }
  let unlocked = false, hiddenAt = 0;
  function needLock(scope) { return !unlocked && S.konto.hash && (S.konto.lock === 'app' || (scope === 'skr' && S.konto.lock === 'skr')); }

  function lockScreen(then, title) {
    const el = document.getElementById('lock');
    el.innerHTML = '<div class="lockbox"><img src="witraz.png" alt="" class="locklogo"><div class="lockt">' + esc(title || 'Trójnóg') + '</div>' +
      '<input type="password" id="lockPass" placeholder="Hasło" autocomplete="current-password">' +
      '<button class="btn full mt" data-act="lock-ok">Odblokuj</button>' +
      (S.konto.lock === 'skr' ? '<button class="btn text full" data-act="lock-cancel">Anuluj</button>' : '') +
      '<a class="link center" data-act="lock-forgot">Nie pamiętam hasła</a><div class="muted center" id="lockMsg"></div></div>';
    el.classList.remove('hidden');
    lockThen = then;
    setTimeout(() => { const i = document.getElementById('lockPass'); if (i) i.focus(); }, 80);
  }
  let lockThen = null;
  function hideLock() { const el = document.getElementById('lock'); el.classList.add('hidden'); el.innerHTML = ''; }

  // zamknięcie ekranu i powrót po minucie – znowu blokada
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 60000 && S.konto.hash && S.konto.lock !== 'off') {
      unlocked = false;
      if (S.konto.lock === 'app') lockScreen(null);
      else if (UI.view === 'skrutacja') { go('start'); }
    }
  });

  /* ---------- klucz szyfrujący konta ---------- */
  let KEY = null;
  async function deriveKey(login, pass) {
    const raw = await pbkdf(pass, 'przygotowanie-konto:' + login.trim().toLowerCase().normalize('NFC'), 256);
    if (A && A.saveText) A.saveText('konto.key', b64(raw));
    KEY = await C.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  async function loadKey() {
    if (KEY) return KEY;
    const t = A && A.loadText ? A.loadText('konto.key') : '';
    if (!t) return null;
    KEY = await C.importKey('raw', unb64(t), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return KEY;
  }
  async function accId() { return (await sha('przygotowanie-id:' + S.konto.login.trim().toLowerCase())).replace(/[^A-Za-z0-9]/g, '').slice(0, 32); }
  async function encrypt(obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await C.encrypt({ name: 'AES-GCM', iv: iv }, KEY, te.encode(JSON.stringify(obj)));
    return b64(iv) + ':' + b64(ct);
  }
  async function decrypt(s) {
    const p = s.split(':');
    return JSON.parse(td.decode(await C.decrypt({ name: 'AES-GCM', iv: unb64(p[0]) }, KEY, unb64(p[1]))));
  }

  /* ---------- synchronizacja konta ---------- */
  let pushT = null, busy = false, applying = false;
  function kStatus(t) { UI.kontoStatus = t; const el = document.getElementById('kontoStatus'); if (el) el.textContent = t; }
  function ready() { return S.konto.on && S.konto.login && wsReady() && C; }
  function payload() {
    const o = {};
    Object.keys(S).forEach(k => { if (LOCAL_KEYS.indexOf(k) < 0) o[k] = S[k]; });
    return o;
  }
  /** Rozpiski i skrutacje nie są nadpisywane całością – łączymy je osobno (nowsza wersja każdej rozpiski wygrywa). */
  function mergeExtra(loc, rem, preferLocal) {
    const m = window.RZ ? RZ.merge(loc.rozpiski, rem.rozpiski, loc.rozpiskiDel, rem.rozpiskiDel) : { rz: rem.rozpiski || loc.rozpiski, del: {}, changed: false };
    const sd = Object.assign({}, rem.skrDel || {}, loc.skrDel || {});
    const sk = {}, out = []; let ch = m.changed;
    (rem.skrutacje || []).forEach(x => { if (x && x.id) sk[x.id] = x; });
    (loc.skrutacje || []).forEach(x => { if (!x || !x.id) return; const y = sk[x.id]; if (!y) { sk[x.id] = x; ch = true; } else if ((x.ts || 0) > (y.ts || 0) || (preferLocal && JSON.stringify(x) !== JSON.stringify(y))) { sk[x.id] = x; ch = true; } });
    Object.keys(sk).forEach(k => { if (!sd[k]) out.push(sk[k]); });
    out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return { rozpiski: m.rz, rozpiskiDel: m.del, skrutacje: out, skrDel: sd, changed: ch };
  }
  function onSave() {
    if (applying) return;
    ensure();
    const h = dataHash(); if (h === S.konto.lastH) return;   // nic się nie zmieniło w danych
    S.konto.changed = Date.now();
    if (!ready()) return;
    clearTimeout(pushT); pushT = setTimeout(() => push(false), 4000);
  }
  async function push(manual) {
    if (!ready() || busy || !S.konto.ok) return;
    if (!(await loadKey())) { kStatus('Zaloguj się ponownie (brak klucza).'); return; }
    busy = true;
    try {
      S.devices = S.devices || {}; S.devices[S.konto.dev] = { n: S.konto.devName, t: Date.now() };
      const data = await encrypt(payload()), id = await accId(), ts = S.konto.changed || Date.now(), hNow = dataHash();
      const parts = []; for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
      httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'kontoPush', id: id, ts: ts, parts: parts }), (ok, text) => {
        busy = false;
        let r = null; try { r = JSON.parse(text); } catch (e) { r = null; }
        if (ok && r && r.ok && r.ts !== undefined) {
          if (r.stale) { pull(true); return; }
          S.konto.synced = ts; S.konto.lastH = hNow; saveQuiet(); kStatus('Wysłano o ' + hhmm(Date.now()) + '.');
        } else if (ok && r && r.ok) kStatus('W arkuszu jest starszy Sync.gs – wklej nowy i wdroż „Nowa wersja”.');
        else if (manual || true) kStatus('Nie wysłano: ' + (r && r.error ? r.error : 'brak połączenia') + '.');
      });
    } catch (e) { busy = false; kStatus('Błąd szyfrowania: ' + e.message); }
  }
  function saveQuiet() { applying = true; try { save(true); } finally { applying = false; } }
  async function pull(manual, first) {
    if (!ready() || busy) return;
    if (!(await loadKey())) return;
    busy = true;
    const id = await accId();
    httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'kontoPull', id: id }), async (ok, text) => {
      busy = false;
      let r = null; try { r = JSON.parse(text); } catch (e) { r = null; }
      if (!ok || !r || !r.ok) { if (manual) kStatus('Nie pobrano: ' + (r && r.error ? r.error : 'brak połączenia') + '.'); return; }
      if (!('ts' in r)) { kStatus('W arkuszu jest starszy Sync.gs – wklej nowy i wdroż „Nowa wersja”.'); return; }
      if (!r.data) { S.konto.ok = true; saveQuiet(); kStatus('Nowe konto – wysyłam dane z tego urządzenia.'); push(true); return; }
      if (r.ts <= (S.konto.synced || 0) && !first) { if (manual) kStatus('Masz aktualne dane.'); if ((S.konto.changed || 0) > (S.konto.synced || 0)) push(false); return; }
      let obj;
      try { obj = await decrypt(r.data); } catch (e) {
        S.konto.on = false; S.konto.ok = false; KEY = null; if (A && A.saveText) A.saveText('konto.key', '');
        saveQuiet(); kStatus('Złe hasło do tego loginu (albo hasło konta zmieniono na innym urządzeniu, albo login zajął ktoś inny). Nic nie zostało zmienione – zaloguj się aktualnym hasłem.');
        render(); return;
      }
      // zmiany tu i tam od ostatniej synchronizacji: wygrywa urządzenie główne (gdy jest ustawione), inaczej nowsze
      const localChanged = !first && (S.konto.changed || 0) > (S.konto.synced || 0), main = obj.mainDev !== undefined ? obj.mainDev : S.mainDev;
      const localNewer = localChanged && (main ? main === S.konto.dev : (S.konto.changed || 0) > r.ts);
      if (localChanged && !localNewer) kStatus('Zmiany z urządzenia głównego zastąpiły zmiany z tego urządzenia.');
      const mx = mergeExtra(S, obj, localNewer);
      if (localNewer) {
        applying = true;
        try { S.rozpiski = mx.rozpiski; S.rozpiskiDel = mx.rozpiskiDel; S.skrutacje = mx.skrutacje; S.skrDel = mx.skrDel; if (window.RZ) RZ.ensure(); save(true); } finally { applying = false; }
        S.konto.changed = Math.max(Date.now(), r.ts + 1);   // wersja tego urządzenia ma być nowsza niż ta w arkuszu (inaczej arkusz ją odrzuci)
        push(false); render(); return;
      }
      const keep = {}; LOCAL_KEYS.forEach(k => { keep[k] = S[k]; });
      Object.assign(obj, { rozpiski: mx.rozpiski, rozpiskiDel: mx.rozpiskiDel, skrutacje: mx.skrutacje, skrDel: mx.skrDel });
      applying = true;
      try {
        S = normalizeState(Object.assign(obj, keep));
        S.konto.synced = r.ts; S.konto.changed = mx.changed ? Date.now() : r.ts; S.konto.ok = true;
        if (window.RZ) RZ.ensure();
        save(true); S.konto.lastH = dataHash();
      } finally { applying = false; }
      if (mx.changed) push(false);   // tu były nowsze rozpiski – odsyłamy połączone
      if (window.KAL) { KAL.ensure(); KAL.syncReminders(); }
      kStatus('Pobrano dane konta (' + hhmm(r.ts) + ').');
      const ae = document.activeElement;
      if (document.getElementById('modal').classList.contains('hidden') && (!ae || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(ae.tagName) < 0)) render();
      if (manual || first) toast('Dane konta zaktualizowane.');
    });
  }
  setInterval(() => { if (document.visibilityState !== 'hidden') pull(false); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(false); });
  setTimeout(() => pull(false), 2500);

  /* ---------- karta w Ustawieniach ---------- */
  function card() {
    ensure();
    const k = S.konto;
    let h = '<div class="card"><h2>Hasło i moje konto</h2>';
    if (!C) return h + '<div class="muted">To urządzenie nie obsługuje szyfrowania.</div></div>';
    h += '<div class="sec">Hasło blokady – tylko w tym urządzeniu</div>' + (k.hash ? '<div class="row"><span class="grow">Ustawione ✓</span><button class="btn ghost" data-act="pw-set">Zmień</button>' +
      '<button class="btn text" data-act="pw-del">Usuń</button></div>' : '<button class="btn ghost full" data-act="pw-set">Ustaw hasło</button>') +
      '<label class="lbl">Blokada hasłem</label><div class="chips">' + [['off', 'Wyłączona'], ['skr', 'Tylko Skrutacja'], ['app', 'Cała aplikacja']].map(x =>
        '<button class="chip' + (k.lock === x[0] ? ' on' : '') + '" data-act="pw-lock" data-a="' + x[0] + '"' + (!k.hash && x[0] !== 'off' ? ' disabled' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
      '<div class="sec">Moje konto – te same dane na kilku urządzeniach</div>' +
      '<div class="muted">Hasło konta jest osobne od hasła blokady (może być takie samo, jeśli tak je ustawisz).</div>';
    if (k.on) {
      h += '<div>Zalogowany: <b>' + esc(k.login) + '</b>' + (typeof isSuper === 'function' && isSuper() ? ' <span class="rb">Administrator</span>' : '') + '</div>' +
        '<div class="row mt"><button class="btn ghost grow" data-act="acc-sync">⟳ Synchronizuj teraz</button><button class="btn text" data-act="acc-out">Wyloguj</button></div>' +
        '<div class="sec">Urządzenia – które jest główne</div><div class="muted">Gdy zmienisz coś na dwóch urządzeniach jednocześnie, wygrywa główne. Zmiany zrobione tylko na jednym urządzeniu zawsze przechodzą na pozostałe.</div>' +
        devRows() +
        '<button class="btn ghost full mt" data-act="acc-pass">🔑 Zmień hasło konta</button>';
    } else {
      h += '<div class="muted">Wpisz ten sam login i hasło na każdym swoim urządzeniu (telefon, tablet). Dane – w tym Skrutacja – są szyfrowane Twoim hasłem, zanim trafią do arkusza; bez hasła nikt ich nie odczyta.</div>' +
        '<input type="text" id="accLogin" class="mt" placeholder="Login (np. jan.kowalski)" value="' + esc(k.login || '') + '" autocomplete="username">' +
        '<div class="row mt"><input type="password" id="accPass" class="grow" placeholder="Hasło konta" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false">' +
        '<button class="btn ghost" data-act="acc-eye">👁</button></div>' +
        '<button class="btn full mt" data-act="acc-in"' + (wsReady() ? '' : ' disabled') + '>Zaloguj / utwórz konto</button>' +
        (wsReady() ? '' : '<div class="muted mt">Najpierw połącz aplikację z arkuszem (kod QR w „Wspólne przygotowanie”).</div>');
    }
    return h + '<div class="muted mt" id="kontoStatus">' + esc(UI.kontoStatus || '') + '</div>' +
      '<div class="muted mt">Zapomniane hasło do konta oznacza utratę kopii w arkuszu (dane w tym telefonie zostają).</div></div>';
  }

  function devRows() {
    const D = Object.assign({}, S.devices || {}); D[S.konto.dev] = Object.assign({}, D[S.konto.dev] || {}, { n: S.konto.devName });
    return Object.keys(D).sort((a, b) => (b === S.konto.dev) - (a === S.konto.dev)).map(id => {
      const d = D[id], me = id === S.konto.dev, main = S.mainDev === id;
      return '<div class="row chk"><button class="radio' + (main ? ' on' : '') + '" data-act="acc-main" data-a="' + esc(id) + '" title="Ustaw jako główne"></button><span class="grow"><b>' + esc(d.n || 'Urządzenie') + '</b>' + (me ? ' <span class="rb">to urządzenie</span>' : '') +
        (main ? ' <span class="tag">główne</span>' : '') + '<br><span class="muted">' + (me ? '' : 'ostatnio: ' + (d.t ? new Date(d.t).toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')) + '</span></span>' +
        (me ? '<button class="btn text sm" data-act="acc-devname">Nazwa</button>' : '<button class="icon" data-act="acc-devdel" data-a="' + esc(id) + '" title="Usuń z listy">✕</button>') + '</div>';
    }).join('') + (S.mainDev ? '<button class="btn text sm" data-act="acc-nomain">Bez urządzenia głównego (wygrywa nowsza zmiana)</button>' : '');
  }
  function pwDialog() {
    modalState = { kind: 'pw' };
    openModal(S.konto.hash ? 'Zmień hasło' : 'Ustaw hasło',
      (S.konto.hash ? '<label class="lbl">Obecne hasło</label><input type="password" id="pwOld">' : '') +
      '<label class="lbl">Nowe hasło</label><input type="password" id="pw1" autocomplete="new-password">' +
      '<label class="lbl">Powtórz</label><input type="password" id="pw2" autocomplete="new-password">' +
      '<div class="muted mt">Hasło blokuje Skrutację albo całą aplikację (wybierasz niżej).</div>',
      '<button class="btn" data-act="pw-ok">Zapisz</button>');
  }

  async function act(a, v, el) {
    switch (a) {
      case 'pw-set': pwDialog(); return true;
      case 'acc-main': S.mainDev = v; S.konto.changed = Date.now(); save(); render(); toast('Główne urządzenie: ' + (((S.devices || {})[v] || {}).n || S.konto.devName) + '.'); return true;
      case 'acc-nomain': S.mainDev = ''; S.konto.changed = Date.now(); save(); render(); return true;
      case 'acc-devdel': if (S.devices) delete S.devices[v]; if (S.mainDev === v) S.mainDev = ''; save(); render(); return true;
      case 'acc-devname': promptBox('Nazwa tego urządzenia', 'np. Telefon Alana, Tablet, Komputer', S.konto.devName || '', n => { n = n.trim(); if (n) { S.konto.devName = n; S.konto.changed = Date.now(); save(); render(); } }); return true;
      case 'pw-ok': {
        const o = document.getElementById('pwOld'), p1 = document.getElementById('pw1').value, p2 = document.getElementById('pw2').value;
        if (o && !(await checkPassword(o.value))) { toast('Złe obecne hasło.'); return true; }
        if (p1.length < 4) { toast('Hasło: co najmniej 4 znaki.'); return true; }
        if (p1 !== p2) { toast('Hasła się różnią.'); return true; }
        await setPassword(p1); unlocked = true; closeModal(); save(); render(); toast('Hasło zapisane.'); return true;
      }
      case 'pw-del':
        modalState = { kind: 'pwdel' };
        openModal('Usuń hasło', '<label class="lbl">Obecne hasło</label><input type="password" id="pwOld">', '<button class="btn" data-act="pw-del-ok">Usuń</button>');
        return true;
      case 'pw-del-ok':
        if (!(await checkPassword(document.getElementById('pwOld').value))) { toast('Złe hasło.'); return true; }
        S.konto.hash = ''; S.konto.salt = ''; S.konto.lock = 'off'; closeModal(); save(); render(); return true;
      case 'pw-lock': S.konto.lock = v; unlocked = true; save(); render(); return true;
      case 'lock-ok': {
        const ok = await checkPassword(document.getElementById('lockPass').value);
        if (!ok) { const m = document.getElementById('lockMsg'); if (m) m.textContent = 'Złe hasło.'; return true; }
        unlocked = true; hideLock(); const f = lockThen; lockThen = null; if (f) f(); return true;
      }
      case 'lock-cancel': hideLock(); lockThen = null; return true;
      case 'lock-forgot':
        if (S.konto.lock === 'skr') {
          confirmBox('Zapomniane hasło', 'Można usunąć hasło tylko razem z zapiskami Skrutacji w tym telefonie. Usunąć?', 'Usuń zapiski i hasło', () => {
            S.skrutacje = []; S.konto.hash = ''; S.konto.salt = ''; S.konto.lock = 'off'; hideLock(); save(); render();
          });
        } else {
          const m = document.getElementById('lockMsg');
          if (m) m.textContent = 'Jeśli masz Moje konto: wyczyść dane aplikacji w ustawieniach Androida i zaloguj się ponownie – dane wrócą z arkusza (hasło konta jest osobne).';
        }
        return true;
      case 'acc-in': {
        const login = document.getElementById('accLogin').value.trim(), pass = document.getElementById('accPass').value;
        if (login.length < 3 || pass.length < 6) { toast('Login min. 3 znaki, hasło min. 6 znaków.'); return true; }
        kStatus('Loguję…');
        await deriveKey(login, pass);
        S.konto.login = login; S.konto.on = true; S.konto.ok = false; S.konto.synced = 0;
        saveQuiet(); render();
        pull(true, true);
        return true;
      }
      case 'acc-sync': pull(true); return true;
      case 'acc-eye': { const i = document.getElementById('accPass'); if (i) i.type = i.type === 'password' ? 'text' : 'password'; return true; }
      case 'acc-pass':
        modalState = { kind: 'accpass' };
        openModal('Zmień hasło konta', '<div class="muted">Dane zostaną zaszyfrowane nowym hasłem i wysłane. Na pozostałych urządzeniach zaloguj się potem nowym hasłem.</div>' +
          '<label class="lbl">Nowe hasło konta</label><input type="text" id="ap1" autocapitalize="off" autocorrect="off" spellcheck="false">' +
          '<label class="lbl">Powtórz</label><input type="text" id="ap2" autocapitalize="off" autocorrect="off" spellcheck="false">',
          '<button class="btn" data-act="acc-pass-ok">Zmień</button>');
        return true;
      case 'acc-pass-ok': {
        const p1 = document.getElementById('ap1').value, p2 = document.getElementById('ap2').value;
        if (p1.length < 6) { toast('Hasło konta: min. 6 znaków.'); return true; }
        if (p1 !== p2) { toast('Hasła się różnią.'); return true; }
        closeModal();
        await deriveKey(S.konto.login, p1);
        S.konto.ok = true; S.konto.changed = Date.now(); saveQuiet();
        kStatus('Zmieniono hasło – wysyłam…'); push(true);
        return true;
      }
      case 'acc-out':
        confirmBox('Wylogować?', 'Dane zostaną w tym telefonie, ale przestaną się synchronizować.', 'Wyloguj', () => {
          S.konto.on = false; KEY = null; if (A && A.saveText) A.saveText('konto.key', ''); save(); render();
        });
        return true;
    }
    return false;
  }

  window.KONTO = {
    relock: function () { unlocked = false; },
    card: card, onSave: onSave, needLock: needLock, lockScreen: lockScreen, ensure: ensure,
    act: function (a, v, el) {
      if (['pw-set', 'pw-ok', 'pw-del', 'pw-del-ok', 'pw-lock', 'lock-ok', 'lock-cancel', 'lock-forgot', 'acc-in', 'acc-sync', 'acc-out', 'acc-eye', 'acc-pass', 'acc-pass-ok', 'acc-main', 'acc-nomain', 'acc-devdel', 'acc-devname'].indexOf(a) < 0) return false;
      act(a, v, el); return true;
    },
  };
  if (needLock('app')) lockScreen(null);
})();
