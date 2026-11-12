/* Przygotowanie – Alan Solutions. Logika aplikacji (WebView). */
'use strict';

const CAT_NAMES = ['HISTORYCZNE', 'PROROCKIE', 'POZAEWANGELICZNE', 'EWANGELIE'];
const READ_LABELS = ['O', '1', '2', '3', '4'];
const READ_DESC = ['Wstęp ogólny', 'Historyczne', 'Prorockie', 'Apostoł', 'Ewangelia'];
const SONG_LABELS = ['Wejście', 'Po 1. czytaniu', 'Po 2. czytaniu', 'Po 3. czytaniu', 'Po 4. czytaniu', 'Wyjście'];
const GENERAL_ROLES = ['Pieśń', 'Czytania', 'E (Ewangelia)', 'Modlitwa wiernych', 'Chleb', 'Kwiaty'];
const EU_ROLES = ['Wstęp ogólny', 'Czytanie 1', 'Czytanie 2', 'Ewangelia', 'Modlitwa wiernych', 'Kwiaty', 'Chleb'];
const EU_SONGS = ['Wejście', 'Znak pokoju – przygotowanie darów', 'Komunia (1)', 'Komunia (2)', 'Wyjście'];
const SLOT_CATS = {
  s0: ['Pieśni na wejście'], s5: ['Pieśni na zakończenie'],
  e0: ['Pieśni na wejście'], e1: ['Znak pokoju — przygotowanie darów'],
  e2: ['Łamanie i Komunia Chleba', 'Komunia Kielicha'], e3: ['Łamanie i Komunia Chleba', 'Komunia Kielicha'], e4: ['Pieśni na zakończenie'],
};
function slotTitle(slot) {
  if (!slot) return 'Śpiewnik';
  return slot[0] === 's' ? 'Słowo – ' + SONG_LABELS[+slot.slice(1)] : 'Eucharystia – ' + EU_SONGS[+slot.slice(1)];
}
const CAT_SHORT = ['H', 'P', 'A', 'E'];
const CAT_LABEL = ['Historyczne', 'Prorockie', 'Apostoł', 'Ewangelia'];
const WISDOM = ['Hi', 'Prz', 'Koh', 'Mdr', 'Syr'];
const NAV_OF = { start: 'start', temat: 'przyg', czytania: 'przyg', slowo: 'przyg', eucharystia: 'przyg', wiecej: 'wiecej', przyg: 'przyg', moje: 'przyg',
  skrutacja: 'start', wspolnota: 'wspolnota', spiewnik: 'start', slownik: 'start', archiwum: 'przyg', kalendarz: 'kalendarz', zdjecia: 'start', rozpiska: 'przyg', katechezy: 'start' };
const LIT_TABS = [['temat', 'Temat'], ['czytania', 'Czytania'], ['slowo', 'Liturgia Słowa']];
function subnavToggle(show) {
  const sn = document.getElementById('subnav');
  if (!sn) return;
  const on = show === undefined ? sn.classList.contains('hidden') : show;
  sn.classList.toggle('hidden', !on);
  sn.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.a === UI.view));
}
const TITLES = { przyg: 'Przygotowania', moje: 'Moje przygotowania', notatnik: 'Notatnik', wydatki: 'Kasetka', oapp: 'O aplikacji', start: 'Pokój Wam', temat: 'Temat', czytania: 'Czytania', slowo: 'Liturgia Słowa', eucharystia: 'Eucharystia',
  wiecej: 'Ustawienia', skrutacja: 'Moja skrutacja', wspolnota: 'Wspólnota', spiewnik: 'Śpiewnik', slownik: 'Słownik Teologii Biblijnej', archiwum: 'Archiwum', kalendarz: 'Kalendarz', zdjecia: 'Zdjęcia', rozpiska: 'Rozpiska', katechezy: 'Katechezy' };
const LINKS = [
  ['Droga Neokatechumenalna – Polska', 'https://neocatechumenaleiter.org/pl/'],
  ['Droga Neokatechumenalna – na świecie', 'https://neocatechumenaleiter.org/'],
  ['Biblia Jerozolimska (PDF)', 'https://kazimierz.archibial.pl/docs/biblia_jerozolimska.pdf'],
  ['Słownik Teologii Biblijnej', 'https://docer.pl/doc/xe11ccn'],
];
const CONTACT = 'pliki@alansolutions.pl';

const A = window.Android || null;
/** Adres zdjęcia do <img>: Android/komputer – przez aplikację; iPhone (przeglądarka) – z pamięci przeglądarki. */
function photoUrl(u, w) { return A && A.photoSrc ? A.photoSrc(u, w) : 'https://app.przygotowanie/photo?' + (w ? 'w=' + w + '&' : '') + 'u=' + encodeURIComponent(u); }
const D = window.DATA || { hasla: [], piesni: [], bracia: [], przerobione: [] };
const BY_NAME = {};
D.hasla.forEach(h => { BY_NAME[h.n] = h; });
const COLL = new Intl.Collator('pl', { sensitivity: 'base' });

/* ---------- stan ---------- */

function newCelebration(przydzialy) {
  return {
    readings: ['Wstęp ogólny', '', '', '', ''], pages: ['', '', '', '', ''], who: ['', '', '', '', ''],
    songs: ['', '', '', '', '', ''], general: {}, przydzialy: przydzialy !== false, locked: [false, false, false, false, false],
  };
}

function defaultState() {
  const done = {};
  return {
    zPsalmami: false, haslo: '', bracia: [], obecni: [], done: done, extraHasla: [],
    celebration: newCelebration(true), history: [], deletedHistory: [],
    syncUrl: '', syncToken: '', lastSync: 0, braciaZArkusza: true, ignoreDiacritics: true, spiewnikUrl: 'http://andrzej.odyniec.info/sp/SpiewnikNeokatechumenalnyAlpha.pdf',
    telefony: {}, kolejnosc: [], eucharystia: newEucharystia(), skrutacje: [], theme: 'auto',
    owner: '', filtry: { madr: false, pnp: false, ap: false }, wspolne: { rola: 'off', ts: 0 },
  };
}

function newEucharystia() { return { data: '', godzina: '', obecni: [], who: {}, locked: {}, songs: ['', '', '', '', ''] }; }

function normalizeState(s) {
  const d = defaultState();
  const st = Object.assign(d, s || {});
  st.celebration = Object.assign(newCelebration(true), st.celebration || {});
  const c = st.celebration;
  ['readings', 'pages', 'who'].forEach(k => { while (c[k].length < 5) c[k].push(''); });
  while (c.songs.length < 6) c.songs.push('');
  if (!c.general || typeof c.general !== 'object') c.general = {};
  if (!Array.isArray(c.locked)) c.locked = [false, false, false, false, false];
  if (!Array.isArray(st.skrutacje)) st.skrutacje = [];
  ['bracia', 'obecni', 'extraHasla', 'history', 'deletedHistory'].forEach(k => { if (!Array.isArray(st[k])) st[k] = []; });
  if (!st.done || typeof st.done !== 'object') st.done = {};
  if (!st.telefony || typeof st.telefony !== 'object') st.telefony = {};
  if (!st.role || typeof st.role !== 'object') st.role = {};
  if (!st.kolory || typeof st.kolory !== 'object') st.kolory = {};
  if (!Array.isArray(st.grupy)) st.grupy = [];
  st.drive = Object.assign({ apk: '', org: '', pl: '' }, st.drive || {});
  if (!st.audio || typeof st.audio !== 'object') st.audio = { org: [], pl: [] };
  if (!Array.isArray(st.wspolnoty) || !st.wspolnoty.length) {
    const id = uuid();
    st.wspolnoty = [{ id: id, nazwa: 'Moja wspólnota' }];
    st.wspAktywna = id; st.wspSync = id;
  }
  if (st.wspAktywna !== 'ALL' && !st.wspolnoty.some(w => w.id === st.wspAktywna)) st.wspAktywna = st.wspolnoty[0].id;
  if (!st.wspolnoty.some(w => w.id === st.wspSync)) st.wspSync = st.wspAktywna;
  if (!st.wspMig) {   // 5.0: każda wspólnota synchronizuje się osobno; dotychczasowa 🔗 = lista „główna” (klucz '')
    const w0 = st.wspolnoty[0];
    w0.key = ''; w0.sync = { ts: st.wspSync === w0.id ? (st.wspolnota || {}).ts || 0 : 0, by: st.wspSync === w0.id ? (st.wspolnota || {}).by || '' : '' };
    st.wspMig = 1;
  }
  st.wspolnota = Object.assign({ ts: 0, by: '', tel: true }, st.wspolnota || {});
  if (!Array.isArray(st.kolejnosc)) st.kolejnosc = [];
  if (!st.spiewnikUrl) st.spiewnikUrl = 'http://andrzej.odyniec.info/sp/SpiewnikNeokatechumenalnyAlpha.pdf';
  st.eucharystia = Object.assign(newEucharystia(), st.eucharystia || {});
  if (!Array.isArray(st.eucharystia.obecni)) st.eucharystia.obecni = [];
  if (!st.eucharystia.who || typeof st.eucharystia.who !== 'object') st.eucharystia.who = {};
  if (!st.eucharystia.locked || typeof st.eucharystia.locked !== 'object') st.eucharystia.locked = {};
  if (!Array.isArray(st.eucharystia.songs)) st.eucharystia.songs = ['', '', '', '', ''];
  while (st.eucharystia.songs.length < 5) st.eucharystia.songs.push('');
  ['who', 'locked'].forEach(k => {          // 1.x: „Czytanie 3” → „Ewangelia”
    const m = st.eucharystia[k];
    if (m['Czytanie 3'] !== undefined) { if (m['Ewangelia'] === undefined) m['Ewangelia'] = m['Czytanie 3']; delete m['Czytanie 3']; }
  });
  st.filtry = Object.assign({ madr: false, pnp: false, ap: false }, st.filtry || {});
  st.wspolne = Object.assign({ rola: 'off', ts: 0 }, st.wspolne || {});
  if (typeof st.owner !== 'string') st.owner = '';
  if (s && !(st.roleV >= 2)) {   // role sprzed 10.9: „Kantor” → „Kantor główny”, „Drugi kantor” → „Kantor”
    const mig = role => { Object.keys(role || {}).forEach(b => { role[b] = (role[b] || []).map(r => r === 'Kantor' ? 'Kantor główny' : r === 'Drugi kantor' ? 'Kantor' : r); }); };
    mig(st.role); (st.wspolnoty || []).forEach(w => { if (w.id !== st.wspAktywna) mig(w.role); });
  }
  st.roleV = 2;
  if (s && s.owner && st.welcomed === undefined) { st.welcomed = 1; st.tut = { start: 1, przyg: 1, kalendarz: 1, wspolnota: 1, wiecej: 1 }; }   // dotychczasowi użytkownicy – bez samouczka (jest w „O aplikacji”)
  return st;
}

function loadState() {
  try {
    const t = A ? A.loadState() : localStorage.getItem('przygotowanie');
    if (t) return normalizeState(JSON.parse(t));
  } catch (e) { /* uszkodzony zapis – start od zera */ }
  return normalizeState(null);
}

let S = loadState();

function save(noPublish) {
  if (window.RZ && RZ.stamp) { RZ.stamp(); }
  storeActive();
  const t = JSON.stringify(S);
  try { if (A) A.saveState(t); else localStorage.setItem('przygotowanie', t); } catch (e) { /* brak miejsca */ }
  if (!noPublish && typeof schedulePublish === 'function') schedulePublish();
  if (typeof scheduleCommunity === 'function') scheduleCommunity();
  if (window.KAL) KAL.remSoon();
  if (window.KONTO) KONTO.onSave();
  syncMark();
}

const UI = { view: 'start', query: '', filter: 0, mine: '', openHist: null, syncStatus: '', syncing: false, pop: false, skr: null,
  spq: '', slq: '', slH: null, prev: [] };

/* ---------- pomocnicze ---------- */

const PL = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
function norm(s) {
  const low = String(s || '').toLowerCase();
  return S.ignoreDiacritics ? low.replace(/[ąćęłńóśźż]/g, c => PL[c]) : low;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function plDate(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (iso || '');
}
function uuid() {
  return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function allNames() {
  const set = new Set(D.hasla.map(h => h.n).concat(S.extraHasla));
  return Array.from(set).sort(COLL.compare);
}
function isDone(n) { return !!(S.done[n] && S.done[n].done); }
function bookOf(ref) {
  const m = String(ref).match(/^\s*(\d?\s?[A-ZŁŚŻĆa-ząćęłńóśźż]+)/);
  return m ? m[1].replace(/\s/g, '') : '';
}
function allowedRef(ref) {
  const b = bookOf(ref), f = S.filtry;
  if (f.madr && WISDOM.indexOf(b) >= 0) return false;
  if (f.pnp && b === 'Pnp') return false;
  if (f.ap && b === 'Ap') return false;
  return true;
}
function filtersOn() { return S.filtry.madr || S.filtry.pnp || S.filtry.ap; }
function readings(n) {
  const h = BY_NAME[n === undefined ? S.haslo : n];
  if (!h) return [[], [], [], []];
  const src = S.zPsalmami ? h.z : h.b;
  return [0, 1, 2, 3].map(i => ((src && src[i]) || []).filter(allowedRef));
}

/** Rozdział po kolei, w kółko; kolejna kategoria zaczyna od osoby po ostatniej z poprzedniej. */
function roundRobin(cats, people) {
  let i = 0;
  return cats.map(c => c.map(() => (people.length ? people[(i++) % people.length] : '')));
}

/** Każda osoba inna; gdy osób mniej niż funkcji – kolejna runda (powtórzenia). */
function drawAssignments(people, slots) {
  if (!people.length) return new Array(slots).fill('');
  let out = [];
  while (out.length < slots) out = out.concat(shuffle(people));
  return out.slice(0, slots);
}

function persons() { return S.obecni.length ? S.obecni : S.bracia; }

/** Losuje tylko wolne (niezablokowane) funkcje. Każde wolne miejsce dostaje losowo jedna z osób,
 *  które mają w tej chwili najmniej funkcji – więc chętni (zablokowani) nie dostają dodatkowych, dopóki inni czekają. */
function drawWithLocks(people, current, locked) {
  const out = current.slice(), cnt = {};
  people.forEach(p => { cnt[p] = 0; });
  current.forEach((p, i) => { if (locked[i] && p && cnt[p] !== undefined) cnt[p]++; });
  shuffle(current.map((p, i) => i).filter(i => !(locked[i] && current[i]))).forEach(i => {
    if (!people.length) { out[i] = ''; return; }
    const min = Math.min.apply(null, people.map(p => cnt[p]));
    const cand = people.filter(p => cnt[p] === min);
    const pick = cand[Math.floor(Math.random() * cand.length)];
    out[i] = pick; cnt[pick]++;
  });
  return out;
}

const NO_ARM = ['draw-who', 'rz-draw'];   // tu losowanie bez „odblokuj” (zostają kłódki przy osobach)
/** Przycisk losowania zabezpieczony: działa dopiero po zaznaczeniu „odblokuj”; po użyciu blokuje się znowu. */
function drawBtn(act, label, enabled, cls) {
  if (NO_ARM.indexOf(act) >= 0) return '<div class="row mt"><button class="btn grow' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (enabled ? '' : ' disabled') + '>' + label + '</button></div>';
  const armed = !!(UI.armed && UI.armed[act]);
  return '<div class="row mt drawrow"><label class="arm"><input type="checkbox" data-ch="arm" data-a="' + act + '"' + (armed ? ' checked' : '') + '>' +
    '<span>odblokuj</span></label><button class="btn grow' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' +
    (armed && enabled ? '' : ' disabled') + '>' + label + '</button></div>';
}

function pinBtn(on, act, a) {
  return '<button class="pin' + (on ? ' on' : '') + '" data-act="' + act + '" data-a="' + esc(a) + '" title="' +
    (on ? 'Zablokowane – nie losuje się' : 'Wolne – losuje się') + '">' + (on ? '🔒' : '🔓') + '</button>';
}

/** Kolejność do rozdziału czytań: zapamiętana (po „Losuj kolejność”), nowi obecni na końcu. */
function readingOrder() {
  const k = S.kolejnosc.filter(p => S.obecni.indexOf(p) >= 0);
  return k.concat(S.obecni.filter(p => k.indexOf(p) < 0));
}

/** Zamiana imienia / usunięcie osoby we wszystkich miejscach stanu (nowe = null → usuń). */
function replacePerson(old, nw) {
  const map = arr => arr.map(b => (b === old ? nw : b)).filter(b => b !== null);
  S.bracia = map(S.bracia); S.obecni = map(S.obecni); S.kolejnosc = map(S.kolejnosc);
  S.eucharystia.obecni = map(S.eucharystia.obecni);
  const c = S.celebration;
  c.who = c.who.map(b => (b === old ? (nw || '') : b));
  Object.keys(c.general).forEach(k => { if (c.general[k] === old) c.general[k] = nw || ''; });
  Object.keys(S.eucharystia.who).forEach(k => { if (S.eucharystia.who[k] === old) S.eucharystia.who[k] = nw || ''; });
  if (S.telefony[old] !== undefined) {
    if (nw) S.telefony[nw] = S.telefony[old];
    delete S.telefony[old];
  }
  if (S.role[old] !== undefined) {
    if (nw) S.role[nw] = S.role[old];
    delete S.role[old];
  }
  (S.grupy || []).forEach(g => { g.osoby = g.osoby.map(b => (b === old ? nw : b)).filter(Boolean); });
  if (S.kolory[old] !== undefined) {
    if (nw) S.kolory[nw] = S.kolory[old];
    delete S.kolory[old];
  }
  ['maile', 'nieakt', 'ice'].forEach(k => { if (S[k] && S[k][old] !== undefined) { if (nw) S[k][nw] = S[k][old]; delete S[k][old]; } });
  const mz = curW() && curW().malz;
  if (mz && mz[old] !== undefined) { const sp = mz[old]; delete mz[old]; if (nw) { mz[nw] = sp; mz[sp] = nw; } else delete mz[sp]; }
}

function phoneDigits(t) {
  let d = String(t || '').replace(/[^0-9+]/g, '');
  if (d.charAt(0) === '+') return d.slice(1);
  if (d.indexOf('00') === 0) return d.slice(2);
  return d.length === 9 ? '48' + d : d;
}

function personSelect(value, ch, a, list) {
  const opts = (list || persons()).slice();
  if (value && opts.indexOf(value) < 0) opts.unshift(value);
  return '<select class="person' + (value ? '' : ' empty') + (value && value === S.owner ? ' me' : '') + '" data-ch="' + ch + '" data-a="' + esc(a) + '">' +
    '<option value="">wybierz</option>' +
    opts.map(p => '<option' + (p === value ? ' selected' : '') + ' value="' + esc(p) + '">' + esc(p) + '</option>').join('') +
    '<option value="__inna__">✎ Inna osoba…</option></select>';
}

let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}
window.toast = toast;

/* ---------- render ---------- */

function applyTheme() {
  const z = S.fontScale || 1;
  document.documentElement.style.setProperty('--z', z);
  const cb = S.theme === 'cb', bc = S.theme === 'bc';
  document.documentElement.classList.toggle('cb', cb || bc);
  document.body.classList.toggle('cb', cb);
  document.body.classList.toggle('bc', bc);
  const dark = bc || !cb && (S.theme === 'ciemny' || (S.theme !== 'jasny' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches));
  document.body.classList.toggle('dark', !!dark);
}

/* ---------- Pismo Święte: skopiuj sygnaturę i otwórz aplikację ---------- */
const BIBLE_PKGS = ['com.pmp.biblia'];
function bibleBtn(ref) { if (!/\d/.test(String(ref))) return ''; return '<button class="icon bib" data-act="bible" data-a="' + esc(ref) + '" title="Otwórz w aplikacji Pismo Święte">📖</button>'; }
function openBible(ref) {
  const r = String(ref || '').trim();
  try { if (A && A.copyText) A.copyText(r); else if (navigator.clipboard) navigator.clipboard.writeText(r).catch(() => {}); } catch (e) { /* */ }
  if (A && A.openApp && A.openApp(JSON.stringify(BIBLE_PKGS))) { toast('Skopiowano „' + r + '” – wklej w wyszukiwarce Pisma Świętego.'); return; }
  if (A && A.openApp) { confirmBox('Brak aplikacji „Pismo Święte”', 'Skopiowałem „' + r + '”. Nie znalazłem aplikacji Pismo Święte – otworzyć ją w Sklepie Play?', 'Sklep Play', () => openUrl('market://details?id=' + BIBLE_PKGS[0])); return; }
  toast('Skopiowano „' + r + '”.');
}

/* ---------- kopie automatyczne (raz dziennie, 14 ostatnich) + wysyłka na Gmail ---------- */
const KOP_IDX = 'kopie_idx.json';
function kopIdx() { return loadJson(KOP_IDX) || []; }
function autoBackup(force) {
  if (!A || !A.saveText || A.desktop) return;   // komputer ma własne kopie co godzinę
  const d = today().replace(/-/g, ''), idx = kopIdx();
  if (!force && idx.length && idx[0].d === d) return;
  storeActive();
  const name = 'kopia_' + d + '.json', t = JSON.stringify(S);
  if (!A.saveText(name, t)) return;
  const nx = [{ d: d, n: name, s: t.length, t: Date.now() }].concat(idx.filter(x => x.d !== d));
  nx.slice(14).forEach(x => { try { A.saveText(x.n, ''); } catch (e) { /* */ } });
  A.saveText(KOP_IDX, JSON.stringify(nx.slice(0, 14)));
}
setTimeout(() => autoBackup(false), 6000);
function kopieHtml() {
  const idx = kopIdx();
  return '<div class="card"><h2>Kopie automatyczne</h2><div class="muted">Telefon sam zapisuje kopię wszystkich danych raz dziennie (14 ostatnich dni). Możesz też wysłać kopię na e-mail – zostaje wtedy także w folderze Pobrane/Trojnog.</div>' +
    (idx.length ? idx.map(x => '<div class="row chk"><span class="grow">' + plDate(x.d.slice(0, 4) + '-' + x.d.slice(4, 6) + '-' + x.d.slice(6)) + ' <span class="muted">' + Math.round(x.s / 1024) + ' KB</span></span>' +
      '<button class="btn sm ghost" data-act="kop-rest" data-a="' + x.n + '">Przywróć</button><button class="icon" data-act="kop-mail" data-a="' + x.n + '" title="Wyślij">✉</button></div>').join('') : '<div class="muted mt">Pierwsza kopia zapisze się za chwilę.</div>') +
    '<div class="row mt"><button class="btn grow" data-act="kop-gmail">✉ Wyślij kopię na Gmail</button><button class="btn ghost" data-act="kop-now">Zapisz teraz</button></div></div>';
}

/* ---------- pierwsze uruchomienie i samouczek (chmurki na głównych ekranach) ---------- */
const TUT = {
  start: [['.hello', 'To Twój ekran startowy – powitanie, okres liturgiczny i najważniejsze rzeczy na dziś.'],
    ['.week, .card .kup', 'Ten tydzień: co jest w kalendarzu i gdzie Ty coś robisz (wyróżnione).'],
    ['.tiles', 'Kafelki prowadzą do wszystkich części aplikacji. Które widać, ustawisz w Ustawienia → Wygląd.'],
    ['#syncDot', 'Kropka synchronizacji: zielona – wszystko wysłane, żółta – trwa wysyłanie.'],
    ['#nav', 'Dolny pasek: Start, Przygotowania, Kalendarz, Wspólnota i Ustawienia.']],
  przyg: [['.tiles', 'Nowe przygotowanie: wybierz, co przygotowujesz – Liturgię Słowa, Eucharystię albo rozpiskę.'],
    ['.mojerow, .card:nth-of-type(2)', 'Tu widzisz przygotowania, w których bierzesz udział.']],
  kalendarz: [['.kgrid, .cal, .card', 'Kalendarz wspólnoty – dotknij dzień, żeby zobaczyć lub dodać wydarzenie.'],
    ['[data-act="kal-new"], [data-act="kal-add"]', 'Dodaj wydarzenie: celebrację, przygotowanie, katechezę.'],
    ['[data-act="plan-open"], [data-act="kal-plan"]', 'Rozpiska spotkań – wyślij wszystkim plan na najbliższe dni.']],
  wspolnota: [['.glegend, .sortbar', 'Sortowanie i kolory grup – dotknij grupę, żeby pokazać tylko ją.'],
    ['.plist .punit', 'Dotknij osobę, żeby zmienić dane, funkcję, małżeństwo, kontakt SOS. Uchwyt ⠿ – przeciąganie.'],
    ['[data-act="brat-add"]', 'Tu dodasz nową osobę (także z kontaktów telefonu).']],
  wiecej: [['.grp, .card', 'Ustawienia w grupach: Ogólne, Wygląd, Źródła, Bezpieczeństwo i synchronizacja, O aplikacji.'],
    ['[data-act="stan"]', '„Sprawdź stan” pokaże, czy wszystko jest podłączone i zsynchronizowane.']]
};
let tutStep = null;
function tutStart(v, force) {
  if (!TUT[v] || !S.owner) return;
  S.tut = S.tut || {};
  if (S.tut[v] && !force) return;
  const steps = TUT[v].filter(x => document.querySelector(x[0]));
  if (!steps.length) return;
  tutStep = { v: v, i: 0, steps: steps }; tutShow();
}
function tutShow() {
  document.querySelectorAll('.tutov').forEach(x => x.remove());
  if (!tutStep) return;
  const st = tutStep.steps[tutStep.i], el = document.querySelector(st[0]);
  if (!el) { tutNext(); return; }
  el.scrollIntoView({ block: 'center' });
  setTimeout(() => {
    const r = el.getBoundingClientRect(), pad = 6, vh = window.innerHeight;
    const ov = document.createElement('div'); ov.className = 'tutov';
    const below = r.top + r.height / 2 < vh / 2;
    const L = r.left - pad, T = r.top - pad, W = r.width + 2 * pad, H = Math.min(r.height, vh * 0.6) + 2 * pad;
    const dim = (l, t, w, h) => '<div class="tutdim" style="left:' + l + 'px;top:' + t + 'px;width:' + w + 'px;height:' + h + 'px"></div>';
    ov.innerHTML = dim(0, 0, window.innerWidth, Math.max(0, T)) + dim(0, T + H, window.innerWidth, Math.max(0, vh - T - H)) + dim(0, T, Math.max(0, L), H) + dim(L + W, T, Math.max(0, window.innerWidth - L - W), H) +
      '<div class="tuthole" style="left:' + L + 'px;top:' + T + 'px;width:' + W + 'px;height:' + H + 'px"></div>' +
      '<div class="tutbub" style="' + (below ? 'top:' + Math.min(vh - 170, r.top + Math.min(r.height, vh * 0.6) + 16) : 'bottom:' + Math.min(vh - 170, vh - r.top + 16)) + 'px">' +
      '<div>' + esc(st[1]) + '</div><div class="row mt"><span class="muted grow">' + (tutStep.i + 1) + ' / ' + tutStep.steps.length + '</span>' +
      '<button class="btn text sm" data-act="tut-skip">Pomiń</button><button class="btn sm" data-act="tut-next">' + (tutStep.i < tutStep.steps.length - 1 ? 'Dalej ›' : 'Gotowe') + '</button></div></div>';
    document.body.appendChild(ov);
  }, 250);
}
function tutNext() { if (!tutStep) return; tutStep.i++; if (tutStep.i >= tutStep.steps.length) tutEnd(); else tutShow(); }
function tutEnd() { if (tutStep) { S.tut = S.tut || {}; S.tut[tutStep.v] = 1; save(true); } tutStep = null; document.querySelectorAll('.tutov').forEach(x => x.remove()); }
/** Pierwsze uruchomienie: 3 ekrany powitalne. */
function welcomeDialog(i) {
  i = i || 0;
  const P = [['Pokój Tobie!', 'Trójnóg pomaga przygotować Liturgię Słowa, Eucharystię i rozpiski (konwiwencja, Pascha, liturgia pokutna) – razem ze wspólnotą.'],
    ['Twoja wspólnota', 'Odpowiedzialny daje kod połączenia (QR) – zeskanujesz go w Ustawienia → Bezpieczeństwo i synchronizacja → Wspólne przygotowanie. Wtedy widzisz listę osób, kalendarz i swoje zadania.'],
    ['Twoje dane', 'Wszystko jest na Twoim telefonie; „Moje konto” przenosi dane między Twoimi urządzeniami, a kopia zapisuje się codziennie. Za chwilę pokażę najważniejsze miejsca.']];
  const p = P[i];
  modalState = { kind: 'welcome' };
  openModal(p[0], '<div class="welc"><div class="welcdots">' + P.map((x, k) => '<i' + (k === i ? ' class="on"' : '') + '></i>').join('') + '</div><p>' + esc(p[1]) + '</p></div>',
    (i < P.length - 1 ? '<button class="btn text" data-act="welc-end">Pomiń</button><button class="btn" data-act="welc" data-a="' + (i + 1) + '">Dalej ›</button>' : '<button class="btn" data-act="welc-end">Zaczynamy</button>'));
}

/* ---------- osoby nieaktywne i krótkie imiona („Kasia Sz.”) ---------- */
const isAkt = b => !(S.nieakt && S.nieakt[b]);
function aktywni() { return S.bracia.filter(isAkt); }
const DWU = /^(Sz|Cz|Ch|Dz|Dż|Dź|Rz)/i;
/** „Katarzyna Szymańska” → „Katarzyna Sz.”, „Kasia Chmiel” → „Kasia Ch.”. */
function shortName(n) {
  const w = String(n || '').trim().split(/\s+/); if (w.length < 2) return String(n || '');
  const l = w[w.length - 1], m = l.match(DWU), ini = m ? m[1].charAt(0).toUpperCase() + m[1].charAt(1).toLowerCase() : l.charAt(0).toUpperCase();
  return w[0] + ' ' + ini + '.';
}
function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
function nameMode() { return S.imiona || (A && A.desktop ? 'full' : 'short'); }
let NMAP = null, NKEY = '';
/** Mapa pełne imię → krótkie (gdy dwa skróty się pokrywają, zostaje pełne). */
function nameMap() {
  const all = new Set(S.bracia); (S.wspolnoty || []).forEach(w => (w.bracia || []).forEach(b => all.add(b)));
  const key = Array.from(all).join('|'); if (NMAP && key === NKEY) return NMAP;
  const cnt = {}; all.forEach(b => { const k = shortName(b); cnt[k] = (cnt[k] || 0) + 1; });
  const m = {}; all.forEach(b => { const k = shortName(b); if (k !== b && cnt[k] === 1) m[b] = k; });
  const ks = Object.keys(m).sort((a, b) => b.length - a.length).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  NMAP = { m: m, re: ks.length ? new RegExp('(^|[^\\p{L}])(' + ks.join('|') + ')(?![\\p{L}])', 'gu') : null }; NKEY = key;
  return NMAP;
}
/** Skraca imiona w wyświetlanym tekście (nie w polach do wpisywania ani w liście „Wspólnota”). */
function shortenIn(root) {
  if (nameMode() !== 'short' || !root) return;
  const nm = nameMap(); if (!nm.re) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: t => {
    const p = t.parentElement; if (!p || p.closest('textarea,input,select[data-full],[contenteditable],.fullnames,script,style')) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; } });
  const list = []; while (tw.nextNode()) list.push(tw.currentNode);
  list.forEach(t => { const v = t.nodeValue; nm.re.lastIndex = 0; if (!nm.re.test(v)) return; nm.re.lastIndex = 0; t.nodeValue = v.replace(nm.re, (x, pre, n) => pre + nm.m[n]); });
}
new MutationObserver(ms => { if (nameMode() !== 'short') return; ms.forEach(mu => mu.addedNodes.forEach(n => { if (n.nodeType === 1) shortenIn(n); else if (n.nodeType === 3 && n.parentElement) shortenIn(n.parentElement); })); })
  .observe(document.documentElement, { childList: true, subtree: true });

/** Komputer: w bocznym menu także pozostałe ekrany (kafelki ze Startu). */
let DXKEY = '';
function deskNav(v) {
  if (!A || !A.desktop) return;
  const main = ['przyg', 'kalendarz', 'wspolnota'];
  const list = tilesOrdered().filter(t => !(S.hiddenTiles || {})[t[0]] && main.indexOf(t[0]) < 0);
  const key = list.map(t => t[0]).join(','); if (key === DXKEY) return; DXKEY = key;
  const nav = document.getElementById('nav'); nav.querySelectorAll('.dx').forEach(x => x.remove());
  nav.insertAdjacentHTML('beforeend', '<div class="dx dxsep"></div>' + list.map(t => '<button class="dx" data-act="' + (TILE_ACT[t[0]] || 'tab') + '" data-a="' + t[0] + '">' + icon(t[0]) + '<span>' + esc(t[1]) + '</span></button>').join(''));
}
/** Komputer, szerokie okno: karty w dwóch kolumnach (lista wspólnoty, ustawienia). */
function deskCols(main, v) {
  if (!A || !A.desktop || ['wspolnota'].indexOf(v) < 0) return;
  const w = document.createElement('div'); w.className = 'dcols';
  Array.from(main.children).forEach(c => { if (!c.classList.contains('littabs') && !c.classList.contains('hello')) w.appendChild(c); });
  main.appendChild(w);
}
/* ---------- Sprawdź stan: źródła, hasła, konto, połączenia – z datami ---------- */
function stanLoad() { return loadJson('stan.json') || {}; }
function stanMark(k) { const st = stanLoad(); st[k] = Date.now(); try { if (A && A.saveText) A.saveText('stan.json', JSON.stringify(st)); } catch (e) { /* */ } }
window.stanMark = stanMark;
function kiedy(ts) {
  if (!ts) return 'nigdy';
  const d = new Date(ts), dn = Math.floor((Date.now() - ts) / 60000);
  if (dn < 1) return 'przed chwilą';
  if (dn < 60) return dn + ' min temu';
  return d.toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', hour: '2-digit', minute: '2-digit' });
}
function stanHtml(live) {
  const st = stanLoad(), k = S.konto || {}, rows = [];
  const row = (ok, name, txt, act, a) => rows.push('<div class="strow"><span class="stic ' + (ok === true ? 'ok' : ok === false ? 'bad' : 'nn') + '">' + (ok === true ? '✓' : ok === false ? '!' : '–') + '</span>' +
    '<span class="grow"><b>' + name + '</b><br><span class="muted">' + txt + '</span></span>' + (act ? '<button class="btn text sm" data-act="stan-go" data-a="' + act + '" data-b="' + (a || '') + '">' + (ok === false ? 'Napraw ›' : 'Przejdź ›') + '</button>' : '') + '</div>');
  rows.push('<div class="sec">Źródła</div>');
  [['songbook', 'Śpiewnik', 'fulltext.json'], ['slownik', 'Słownik Teologii Biblijnej', 'slownik_txt.json']].forEach(x => {
    const n = pdfPages(x[0]), sc = !!loadJson(x[2]);
    row(n > 0 ? (sc ? true : null) : false, x[1], n > 0 ? 'Plik podłączony – ' + n + ' str.' + (sc ? ', zeskanowany (wyszukiwanie działa)' : ', jeszcze nie zeskanowany') : 'Nie wskazano pliku PDF', 'zr');
  });
  rows.push('<div class="sec">Hasła i konto</div>');
  row(k.hash ? true : null, 'Hasło blokady', k.hash ? 'Ustawione · blokada: ' + ({ off: 'wyłączona', skr: 'tylko Skrutacja', app: 'cała aplikacja' }[k.lock || 'off']) : 'Nieustawione (niewymagane)', 'bez');
  row(k.on ? true : false, 'Moje konto', k.on ? 'Zalogowany: ' + esc(k.login) + ' · ostatnia synchronizacja: ' + kiedy(k.synced) + ((k.changed || 0) > (k.synced || 0) ? ' · są niewysłane zmiany' : '') : 'Niezalogowany – dane nie przechodzą między Twoimi urządzeniami', 'bez');
  rows.push('<div class="sec">Połączenia</div>');
  row(!wsReady() ? false : live === undefined ? null : live.ok, 'Arkusz (adres i token)', !wsReady() ? 'Nie połączono' : live === undefined ? 'Sprawdzam połączenie…' : live.ok ? 'Działa – odpowiedź w ' + live.ms + ' ms' : 'Błąd: ' + esc(live.err), 'bez');
  const rola = (S.wspolne || {}).rola || 'off';
  row(rola === 'off' ? null : true, 'Wspólne przygotowanie', rola === 'off' ? 'Wyłączone' : rola === 'prowadze' ? 'Prowadzę · ostatnio wysłano: ' + kiedy(st.pub) : 'Pobieram · ostatnio pobrano: ' + kiedy(st.pull), 'bez');
  (S.wspolnoty || []).forEach(w => {
    const sh = wsReady() && typeof wspShared === 'function' && wspShared(w);
    row(sh ? (st['wsp:' + w.id] && Date.now() - st['wsp:' + w.id] < 86400000 ? true : null) : null, 'Wspólnota „' + esc(w.nazwa) + '”', sh ? (wspSends(w) ? 'Wysyła i pobiera' : 'Pobiera') + ' · ostatnio sprawdzona: ' + kiedy(st['wsp:' + w.id]) + ' · wersja listy: ' + kiedy((w.sync || {}).ts) : 'Lista tylko na tym urządzeniu (bez synchronizacji)', 'wsp');
  });
  row(wsReady() ? (st.kal ? true : null) : null, 'Kalendarz wspólnoty', wsReady() ? 'Ostatnia synchronizacja: ' + kiedy(st.kal) : 'Bez arkusza – tylko na tym urządzeniu', 'kal');
  const ks = S.kasaSync || {}, kk = Object.keys(ks);
  if (kk.length) kk.forEach(id => { const w = (S.wspolnoty || []).find(x => x.id === id); row(true, 'Kasetka' + (w ? ' „' + esc(w.nazwa) + '”' : ''), 'Wspólna (kod) · ostatnio: ' + kiedy(ks[id].ts), 'kasa'); });
  else row(null, 'Kasetka', 'Tylko na tym urządzeniu', 'kasa');
  rows.push('<div class="sec">Przypomnienia i kalendarz Google</div>');
  const P = S.przyp || {};
  row(P.on ? true : null, 'Przypomnienia', P.on ? 'Włączone · ' + Object.keys(P.kan || {}).filter(x => P.kan[x]).map(x => ({ app: 'w aplikacji', tel: 'powiadomienie', gcal: 'Kalendarz Google' }[x] || x)).join(', ') : 'Wyłączone', 'og');
  const g = S.gcal || {};
  row(A && A.desktop ? null : g.on && g.cal ? true : null, 'Kalendarz Google', A && A.desktop ? 'Wysyła telefon (na komputerze niedostępne)' : g.on && g.cal ? 'Włączony · ostatnio wysłano: ' + kiedy(g.ts) : 'Wyłączony', 'kal');
  rows.push('<div class="muted mt">Trójnóg ' + esc(A && A.version ? A.version() : '') + (A && A.desktop ? ' (komputer)' : '') + ' · sprawdzono ' + new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + '</div>');
  return rows.join('');
}
function stanDialog() {
  openModal('Stan aplikacji', '<div id="stanBody">' + stanHtml() + '</div>', '<button class="btn ghost" data-act="stan-run">⟳ Sprawdź ponownie</button>');
  modalState = { kind: 'stan' };
  if (!wsReady()) return;
  const t0 = Date.now();
  httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'pull' }), (ok, text) => {
    let r = null; try { r = JSON.parse(text); } catch (e) { r = null; }
    const live = ok && r && r.ok ? { ok: true, ms: Date.now() - t0 } : { ok: false, err: r && r.error ? r.error : ok ? 'nieczytelna odpowiedź' : String(text || 'brak połączenia').slice(0, 80) };
    const el = document.getElementById('stanBody'); if (el) el.innerHTML = stanHtml(live);
  });
}

function render() {
  setTimeout(syncDot, 0);
  document.body.classList.toggle('noprep', !(window.RZ && RZ.resp()));
  applyTheme();
  applySeason();
  const main = document.getElementById('main');
  const keep = main.scrollTop;
  const v = UI.view;
  document.getElementById('hdrSub').textContent = (v === 'start' && isOktawa() ? 'Chrystus zmartwychwstał!' : TITLES[v] || '') + (S.haslo && ['temat', 'czytania', 'slowo'].indexOf(v) >= 0 ? ' · ' + S.haslo : '');
  deskNav(v);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.classList.contains('dx') ? b.dataset.a === v : b.dataset.a === NAV_OF[v] && !document.querySelector('#nav .dx[data-a="' + v + '"]')));
  subnavToggle(false);
  const litBar = ['temat', 'czytania', 'slowo'].indexOf(v) >= 0 ? '<div class="littabs">' + LIT_TABS.map(t => '<button class="' + (t[0] === v ? 'on' : '') + '" data-act="tab" data-a="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' : '';
  main.innerHTML = litBar + ({ start: viewStart, temat: viewTemat, czytania: viewCzytania, slowo: viewCelebracja, eucharystia: viewEucharystia,
    wiecej: viewWiecej, skrutacja: viewSkrutacja, wspolnota: viewWspolnota, spiewnik: viewSpiewnik, slownik: viewSlownik, archiwum: viewArchiwum, kalendarz: () => window.KAL ? KAL.view() : '', zdjecia: () => window.ZDJ ? ZDJ.view() : '', rozpiska: () => window.RZ ? RZ.view() : '', katechezy: () => window.KAT ? KAT.view() : '', wydatki: () => window.KASA ? KASA.view() : '', oapp: viewOApp, notatnik: viewNotatnik, przyg: viewPrzyg, moje: viewMoje }[v] || viewStart)();
  deskCols(main, v);
  mainBtn();
  setTimeout(() => {   // pierwsze uruchomienie: powitanie, potem chmurki na głównych ekranach (raz na ekran)
    if (document.querySelector('#modal:not(.hidden)') || tutStep) return;
    if (!S.welcomed) { if (v === 'start' && !window.__tutArmed) welcomeDialog(0); return; }
    if (TUT[v] && !(S.tut || {})[v]) tutStart(v);
  }, 700);
  main.querySelectorAll('.card').forEach((c, i) => {
    const h = c.querySelector('h2');
    if (!h) return;
    const key = v + ':' + (h.textContent.replace(/[▾▸]/g, '').replace(/\(.*?\)/g, '').trim().slice(0, 30) || i);
    c.dataset.key = key;
    c.classList.add('fold');
    if (S.collapsed && S.collapsed[key]) c.classList.add('collapsed');
    else if (c.dataset.def === 'c' && !(S.collapsed && S.collapsed[key] === false)) c.classList.add('collapsed');
  });
  main.scrollTop = keep;
  UI.pop = false;
}

function go(v) {
  if (v === 'skrutacja' && window.KONTO && KONTO.needLock('skr')) { KONTO.lockScreen(() => go('skrutacja'), 'Skrutacja'); return; }
  if (v === 'wydatki' && window.KASA && !KASA.any()) v = 'start';
  UI.view = v;
  document.getElementById('main').scrollTop = 0;
  render();
}

/* ===== ROK LITURGICZNY ===== */

function easter(y) {   // algorytm Meeusa/Jonesa/Butchera
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function adventStart(y) {   // 4. niedziela przed Bożym Narodzeniem
  const xmas = new Date(y, 11, 25), dow = xmas.getDay();
  return addDays(xmas, -(dow === 0 ? 7 : dow) - 21);
}
/** Okres liturgiczny, kolor szat i cykl czytań na dany dzień. */
function liturgy(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const y = d.getFullYear();
  const adv = adventStart(y), ea = easter(y);
  const ash = addDays(ea, -46), pent = addDays(ea, 49), holyThu = addDays(ea, -3);
  const ep = new Date(y, 0, 6), baptism = addDays(ep, 7 - ep.getDay() === 7 ? 7 : 7 - ep.getDay());   // niedziela po 6 I
  const ly = d >= adv ? y + 1 : y;   // rok, w którym kończy się rok liturgiczny
  const cycle = ['C', 'A', 'B'][ly % 3], weekday = ly % 2 === 0 ? 'II' : 'I';
  let name, color, col, cat = '';
  const sunday = d.getDay() === 0;
  if (d >= adv && d < new Date(y, 11, 25)) {
    name = 'Adwent'; cat = 'Adwent';
    const third = addDays(adv, 14);
    if (sunday && d.getTime() === third.getTime()) { color = 'różowe'; col = '#D9799A'; } else { color = 'fioletowe'; col = '#6B3A8C'; }
  } else if (d >= new Date(y, 11, 25) || d <= baptism) {
    name = 'Okres Bożego Narodzenia'; color = 'białe'; col = '#E9DDB8'; cat = 'Boże Narodzenie';
  } else if (d >= ash && d < holyThu) {
    name = 'Wielki Post'; cat = 'Wielki Post';
    if (sunday && d.getTime() === addDays(ash, 25).getTime()) { color = 'różowe'; col = '#D9799A'; } else { color = 'fioletowe'; col = '#6B3A8C'; }
  } else if (d >= holyThu && d < ea) {
    name = 'Triduum Paschalne'; cat = 'Okres Wielkanocny';
    if (d.getTime() === addDays(ea, -2).getTime()) { color = 'czerwone'; col = '#B3261E'; } else { color = 'białe'; col = '#E9DDB8'; }
  } else if (d >= ea && d <= pent) {
    if (d.getTime() === pent.getTime()) { name = 'Zesłanie Ducha Świętego'; color = 'czerwone'; col = '#B3261E'; cat = 'Zesłanie Ducha Świętego'; }
    else { name = 'Okres Wielkanocny'; color = 'białe'; col = '#E9DDB8'; cat = 'Okres Wielkanocny'; }
  } else {
    name = 'Okres zwykły'; color = 'zielone'; col = '#3F7A3A';
  }
  return { name: name, color: color, col: col, cycle: cycle, weekday: weekday, cat: cat };
}
/** Oktawa Zmartwychwstania: od 4:00 w Niedzielę Zmartwychwstania do końca Niedzieli Miłosierdzia (8 dni). */
function isOktawa(now) {
  now = now || new Date();
  const e = easter(now.getFullYear()), od = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 4, 0, 0), doK = addDays(new Date(e.getFullYear(), e.getMonth(), e.getDate()), 8);
  return now >= od && now < doK;
}
/** Pozdrowienie: „Pokój” albo w oktawie „Chrystus zmartwychwstał”. */
function pokoj() { return isOktawa() ? 'Chrystus zmartwychwstał' : 'Pokój'; }
function applySeason() {
  const L = liturgy(new Date()), ok = isOktawa();
  document.documentElement.style.setProperty('--season', ok ? '#D4A72C' : L.col);
  document.body.classList.toggle('oktawa', ok);
  return L;
}

/* ===== CO NOWEGO (tylko większe zmiany) ===== */
const CHANGES = [
  ['12.5', ['Ustawienia → Ogólne: „Uruchom samouczek przy następnym otwarciu” – ekrany powitalne i chmurki od nowa, dane zostają']],
  ['12.4', ['Nowa funkcja: Didaskal', 'Korona obok kropki synchronizacji: złota – to urządzenie jest główne; pusta – dotknij, żeby przejąć', 'Zaproszenie na przygotowanie Eucharystii: z godziną zbiórki']],
  ['12.3', ['Moje konto: lista urządzeń i wybór urządzenia głównego – przy zmianach na dwóch urządzeniach naraz wygrywa główne', 'Naprawa synchronizacji: urządzenie, na którym nic nie zmieniałeś (np. leżący tablet), nie nadpisuje już zmian z innego urządzenia', 'Nazwa urządzenia do zmiany (Telefon / Tablet / Komputer)']],
  ['12.2', ['🎁 Pakiet startowy dla innej osoby: zaznaczasz, co przekazać (wspólnoty, kalendarz, rozpiski, archiwum, tematy i linki; połączenie z arkuszem i wygląd – opcjonalnie) i wysyłasz plik', '„Uzupełnij z kopii”: wczytuje pakiet albo pełną kopię i dopisuje zaznaczone części do Twoich danych (bez kasowania); pełną kopią można też zastąpić wszystko']],
  ['12.1', ['Rozpiska: „✓ Odbyło się – do archiwum” (po terminie aplikacja sama podpowiada); odbyte przygotowania w Archiwum i w Moich przygotowaniach, z możliwością przywrócenia']],
  ['12.0', ['Kopie automatyczne: telefon codziennie zapisuje kopię wszystkich danych (14 dni), z przywracaniem; „✉ Wyślij kopię na Gmail” (zostaje też w Pobranych/Trojnog) – Ustawienia → Bezpieczeństwo',
    'Pierwsze uruchomienie: 3 ekrany powitalne i samouczek – chmurki na Starcie, Przygotowaniach, Kalendarzu, Wspólnocie i Ustawieniach (ponownie: O aplikacji)',
    'Start: „Ten tydzień” – 7 dni z kalendarza, wyróżnione, gdzie Ty coś robisz (Twoja funkcja / czytasz)',
    '📖 przy czytaniach: kopiuje sygnaturę i otwiera aplikację „Pismo Święte”', 'iPhone: poprawione otwieranie SMS']],
  ['11.8', ['Wspólnota – sortowanie: Funkcje (od odpowiedzialnego, potem drugi odp., współodp., kantor główny, kantor, ostiariusz), Grupy, A–Z; zawieszeni zawsze na końcu', 'Filtr: dotknij grupę w legendzie, żeby pokazać tylko ją („bez grupy” – osoby bez grupy, „✕ wszyscy” – cała lista)']],
  ['11.7', ['Lista wspólnoty: każda grupa ma swój kolor (pasek z boku i tło), legenda grup z liczbą osób; małżeństwo oznaczone ikoną obrączek; równe wiersze – imię z funkcjami, pod spodem numer']],
  ['11.6', ['Wspólnota: przyciski telefonu/SMS/WhatsApp wyrównane do prawej; zamiast strzałek ⠿ – przytrzymaj i przeciągnij (małżeństwo razem)', 'Małżeństwo ma wspólną grupę (pokazaną raz, w ramce pary)', 'Osoba: kontakt w nagłej sytuacji (ktoś spoza Drogi) – na liście przycisk SOS']],
  ['11.5', ['SMS z przygotowania – wybór „Co wysłać”: Zaproszenie na przygotowanie (najpierw spotkanie, potem Eucharystia / Liturgia Słowa), Podsumowanie przygotowania (kto co robi), Zaproszenie na Eucharystię / celebrację', 'Pole „Dodaj czytania do treści” przy zaproszeniach', 'Kalendarz: rozpiska wielu wydarzeń – tylko co, kiedy, gdzie; „✉ Wyślij info o tym wydarzeniu” – szczegółowo (do której Eucharystii, kiedy przygotowanie, co zabrać, agapa)', '„Proszę o potwierdzenie odczytania.”']],
  ['11.4', ['SMS: „Proszę o potwierdzenie.” do zaznaczenia (jak „Pokój, imię”) – zapamiętuje się']],
  ['11.3', ['SMS: nowe „▶ Wyślij po kolei” – otwiera SMS z gotową treścią dla każdej osoby, po powrocie do aplikacji czeka następna (działa na każdym telefonie); wysyłka w tle jako druga opcja']],
  ['11.2', ['SMS „Wyślij wszystkim”: kolejna osoba czeka, aż poprzednia wiadomość wyjdzie (także gdy telefon pyta o zgodę)', 'Opcja „Bez polskich znaków” (domyślnie włączona) – SMS-y 2× krótsze, telefon nie pyta o „wiele SMS-ów”', 'Wiadomość Eucharystii bez dopisku „(wigilia)”']],
  ['11.1', ['SMS „Wyślij wszystkim”: wysyła z właściwej karty SIM (także przy dwóch kartach), pokazuje prawdziwy wynik z sieci i powód, gdy telefon zablokuje wysyłkę (z przyciskiem do ustawień aplikacji); jedno potwierdzenie zamiast dwóch']],
  ['11.0', ['SMS Eucharystii i Liturgii Słowa: dopisuje się kiedy i gdzie jest spotkanie przygotowania (z kalendarza), a przy Liturgii Słowa także termin celebracji']],
  ['10.9', ['Wspólnota: „↕ Sortuj” – funkcje, małżeństwa, single, zawieszeni; w każdej części po nazwisku (bez nazwiska – po imieniu)', 'Role: nowy „Ostiariusz”; „Kantor główny” i „Kantor” (dawny „Kantor” → główny, „Drugi kantor” → Kantor)', 'SMS: przed wysłaniem podgląd – do kogo (grupa / wybrani) i treść dla każdej osoby; „Wyślij wszystkim” z potwierdzeniem']],
  ['10.8', ['Kalendarz: „Przygotowanie Eucharystii / Liturgii Słowa” wskazuje, której celebracji dotyczy (data i godzina albo wybór z kalendarza; brakującą Eucharystię dodaje sama)', 'W wydarzeniu przygotowania: „Czytania, funkcje, zbiórka ›” – otwiera przygotowanie na dzień tej celebracji', 'W wydarzeniu Eucharystii / Liturgii Słowa: widać spotkanie przygotowania albo „Przygotowanie jeszcze nie zaplanowane – ＋ Zaplanuj”']],
  ['10.7', ['Kalendarz ↔ przygotowanie: w wydarzeniu Eucharystii / Liturgii Słowa przycisk „Przygotowanie ›” (termin przechodzi do przygotowania); w przygotowaniu „W kalendarzu … pokaż ›” albo „＋ Dodaj do kalendarza wspólnoty”; zmiana godziny i miejsca uaktualnia wydarzenie']],
  ['10.6', ['Eucharystia: godzina Eucharystii i miejsce (obok zbiórki) – także w wiadomości', 'Liturgia Słowa: „Kiedy i gdzie” – data, godzina i miejsce celebracji, dopisywane do wiadomości z czytaniami']],
  ['10.5', ['Osoba: „Małżeństwo z” – para jest na liście wspólnoty razem (wspólna ramka) i przesuwa się razem; synchronizuje się z arkuszem']],
  ['10.4', ['Osoba: „＋ Dodaj do kontaktów w telefonie” – imię, telefon i e-mail z aplikacji trafiają do książki kontaktowej']],
  ['10.3', ['Naprawa scalania wspólnot: kopia sprzed scalenia zapisuje się poprawnie, przycisk „Cofnij ostatnie scalenie”, scalona lista nie jest podmieniana starszą z arkusza', 'Lista wspólnoty: przy osobie jej grupy', 'Wiadomość do wspólnoty: wybór grupy – „★ Moja grupa” i pozostałe']],
  ['10.2', ['Wspólnota: „Scal dwie wspólnoty w jedną” – osoby, role, telefony, grupy, kalendarz i kasetka razem, z nową nazwą', 'Wydruk / PDF / Word rozpiski: każdy dzień od nowej strony']],
  ['10.1', ['Nowy porządek: dział „Przygotowania” – nowe przygotowanie: Liturgia Słowa (temat, czytania, celebracja), Eucharystia, Liturgia pokutna, Pascha, Konwiwencja, Własna rozpiska; dolny pasek: Start · Przygotowania · Kalendarz · Wspólnota · Ustawienia',
    'Moje przygotowania: wszystko, w czym biorę udział (ekipa, przydziały), najbliższe na górze, niżej archiwum',
    'Rozpiska dla ekipy: idzie razem z wydarzeniem w kalendarzu – ekipa widzi podgląd i swoje zadania; edycja po 4-cyfrowym kodzie od przygotowującego',
    'Rozpiska: grupa „Liturgia pokutna” na fioletowo (jak Eucharystia); własna rozpiska z dniami i godzinami jak konwiwencja',
    'Ustawienia → Ogólne → Sprawdź stan: śpiewnik, słownik, hasła, konto, arkusz (test na żywo), synchronizacje z datami',
    'Oktawa Zmartwychwstania: od 4:00 w Wielkanoc jasny, złoty wygląd i „Chrystus zmartwychwstał!” zamiast „Pokój”',
    'Plik rozpiski nazwany tytułem i datą (np. „Konwiwencja 06.11.2026”); osoba: e-mail, nieaktywni tylko wyszarzeni']],
  ['10.0', ['Komputer: układ na szerokie okno – menu z boku ze wszystkimi ekranami, kafelki w kilku kolumnach, okna na środku, Wspólnota i Ustawienia w dwóch kolumnach']],
  ['9.9', ['Osoba nieaktywna (zawieszona): zaznaczasz w oknie osoby – znika z obecnych, losowania i rozpisek, zostaje na liście', 'Imiona w aplikacji jako „Kasia Sz.” / „Alan F.” albo pełne – do wyboru w Wygląd (osobno na telefonie i komputerze)', 'Lista „Wspólnota” z pełnymi imionami i nazwiskami, przy sobie „(Ja)”; powitanie samym imieniem', 'Wersja na komputer (Windows): aktualizacje z folderu na dysku']],
  ['9.8', ['Naprawa: synchronizacja „Mojego konta” nie nadpisuje już rozpisek – każda rozpiska łączy się osobno (wygrywa nowsza), usunięcia też się przenoszą', 'Rozpiska → Historia zmian: kopie każdej wersji w telefonie, przywracanie jednym dotknięciem', 'Rozpiska → Odzyskaj z PDF: wczytuje rozpiskę z PDF wygenerowanego w aplikacji']],
  ['9.7', ['Proklamacja jak czytanie: kto wprowadza i kto czyta (wstęp opcjonalny), krótkie / długie', 'Czytanie i proklamacja: ▾ – wybór czytania z tematu / Liturgii Słowa', 'Nowy blok: Ewangelia (osobno od czytania)']],
  ['9.6', ['Nowa część „Liturgia” – jak Eucharystia, od razu ze „Śpiewem na wyjście”; starsze Eucharystie same dostają „Śpiew na wyjście”']],
  ['9.5', ['Eucharystia jeszcze ciemniejsza, nieobsadzone bloki całe na czerwono, Śpiew w blokach Eucharystii']],
  ['9.4', ['Eucharystia w ciemniejszym kolorze okresu; blok Responsorium; zwykły Psalm także w Eucharystii']],
  ['9.3', ['Psalm responsoryjny i Echo Słowa także poza Eucharystią (np. jutrznia, liturgia Słowa)']],
  ['9.2', ['Eucharystia w rozpisce jako osobna część w kolorze okresu – od „Eucharystia” do „Śpiewu na wyjście”, z własnymi blokami (wprowadzenie, psalm responsoryjny, aklamacja, echo Słowa, homilia, prefacja, Święty, modlitwa eucharystyczna, Baranku Boży, śpiew na Ciało i Krew, modlitwa, wołania z listą do zaznaczenia)', 'Nowe bloki: Kerygmat, Proklamacja, Ojcze nasz; „Modlitwa ślepca” z wstępem lub bez; czytanie krótkie / długie', 'Zmiana rodzaju bloku (⇄) bez usuwania; bloki bez przypisanej osoby na czerwono', 'Pieśń: po dodaniu od razu lista pieśni, „✎ Inna pieśń” – własny tytuł']],
  ['9.1', ['Rozpiska: „Pieśń” (wstęp wybierasz przy bloku), nowy blok „Psalm” – czytany albo śpiewany, z wstępem lub bez', '„Modlitwa z ręki” to teraz po prostu „Modlitwa”']],
  ['9.0', ['Blok rozpiski w jednej linii: uchwyt do przeciągania, godzina, tytuł, start, czas, strzałki i kosz; na tablecie osoby też w tej samej linii']],
  ['8.9', ['Kolejność kafelków w Wyglądzie: przeciąganie za ⠿']],
  ['8.8', ['Bloki: przeciąganie za ⠿, większe strzałki z prawej, kosz zamiast ✕', 'Czas trwania domyślnie brak – następny blok ma „cd.” zamiast godziny, aż do bloku z godziną startu', 'Pieśń: z wstępem / bez wstępu, kto wprowadza i kto śpiewa (też w okienku po wybraniu pieśni)', 'Kto przygotowuje: wybór osób z różnych wspólnot – tylko one są na listach i w losowaniu, stają się ekipą wydarzenia']],
  ['8.7', ['Przygotowania (rozpiski) widzą tylko odpowiedzialni i osoby z ekipy danego wydarzenia', 'Rozpiski: „＋” pod każdym blokiem – lista z działami (Słowo, Celebracje, Posiłki, Dzień); nowe bloki: film, skrutacja, kwestionariusz, Eucharystia, agapa', 'Własny zegar: minuty co 15 albo wpisane ręcznie', 'Czas „cd.” – bloki wypełniają czas do najbliższej godziny startu lub posiłku', 'Przy bloku: Wprowadza / Czyta / bez osoby, przy czytaniu „bez wstępu” – losowanie pomija puste role', 'Wspólnota: region / diecezja']],
  ['8.6', ['Konwiwencja: dni, bloki z godziną startu i czasem trwania, posiłki i przerwy (zielone), osoby prowadzące; dni same zaznaczają się w kalendarzu', 'Rozpiska z datą sama pojawia się w kalendarzu; z wydarzenia w kalendarzu przejście „Przygotowanie – rozpiska”', 'Liturgia pokutna: zaznacz „Byłem/am”, licznik dni na Starcie (można ukryć w Wyglądzie)']],
  ['8.5', ['Notatnik prywatny – tylko na tym telefonie; wysyłka do Google Keep i zapis do .txt']],
  ['8.4', ['Liturgia → Liturgia pokutna i Przygotowanie konwiwencji: gotowe układy w blokach', 'Nowe bloki: Katecheza, Magisterium Kościoła, Wstęp do modlitwy ślepca', '„Szukaj rozważań do wstępów”: 10 wyszukiwań do tematu albo czytania', 'Notatnik: prywatne zapiski']],
  ['8.3', ['Poprawka: „Didaskal” w Przygotowaniu Paschy']],
  ['8.2', ['Same ikony: z małym podpisem i w nowym stylu', 'Ustawienia: Ogólne i O aplikacji też jako podkategorie z ikonami', 'Wskaźnik synchronizacji pokazuje „czeka” tylko podczas wysyłania']],
  ['8.1', ['Wybór układu: same ikony po 3, 4 albo 5 w rzędzie', 'Mieszek bez litery, przyciski sugestii i pomocy bez emotek']],
  ['8.0', ['Kasetka (dawniej Wydatki) z nową ikoną mieszka', 'Kafelek „O aplikacji”: zgłoś sugestię albo poproś o pomoc (e-mail z numerem wersji)', 'Wygląd → Ekrany: układ „Same ikony” – 3, 4 albo 5 w rzędzie, bez podpisów']],
  ['7.9', ['Przypomnienia w Ustawienia → Ogólne: o czym, kiedy (można kilka) i jak – monit w aplikacji, powiadomienie, Kalendarz Google', 'Wydatki: zdjęcie paragonu, powiązanie z wydarzeniem, „Kolekta do wpisania” gdy nasza wspólnota przygotowywała Eucharystię', 'Wskaźnik synchronizacji w nagłówku (✓ / ↻ / ✕)', 'Kafelek Wydatki od razu po starcie']],
  ['7.8', ['Wspólna kasa: zmiany synchronizują się od razu między osobami odpowiedzialnymi; w arkuszu zaszyfrowana kodem kasy (bez kodu nikt nie odczyta)', 'Kasę widzi też Drugi odpowiedzialny']],
  ['7.7', ['Wydatki – kasa wspólnoty (wpływy, np. kolekta, i wydatki, np. kwiaty), stan i różnica u góry; widzi tylko Odpowiedzialny i Współodpowiedzialny tej wspólnoty']],
  ['7.6', ['Nowa nazwa aplikacji: Trójnóg', 'Kalendarz Google: wysyłanie wydarzeń z aplikacji do wybranego kalendarza w telefonie (jednostronnie)']],
  ['7.5', ['Rozpiska spotkań: zakres „wybrane daty” (od–do)']],
  ['7.4', ['Kafelek „Linki”: strona Drogi w Polsce i na świecie, własne skróty do dodania']],
  ['7.3', ['Tryb biało-czarny (czarne tło, biały tekst)', 'Nowe strzałki rozwijania „>” – wszystkie po prawej, obracają się przy otwieraniu']],
  ['7.2', ['Kolejność kafelków na Starcie (▲▼ w Ustawienia → Wygląd)', 'Tryb czarno-biały (Jasność → Czarno-biały)', 'Kafelek „Zadzwoń do katechistów” z wyborem osoby', 'Ikony podkategorii ustawień w stylu Startu, strzałki jak w innych kartach']],
  ['7.1', ['Ustawienia w podkategoriach: Wygląd, Źródła, Bezpieczeństwo i synchronizacja', 'Wybór, które kafelki widać na Starcie', '„Zaznacz wszystkich” pod listą osób']],
  ['7.0', ['Rozpiska SMS pisana po ludzku: jedno spotkanie jako zwykłe zdania, daty „od piątku 6.11 do niedzieli 8.11”', 'W wydarzeniu: Pismo Święte, wyjazdowe (dni i noce liczą się same), odświętny strój, agapa i „poza tym”', 'Powitanie samym imieniem albo „Pokój, bracia!”; ekipa tylko gdy zaznaczysz']],
  ['6.9', ['Wybór rodzaju wydarzenia jako czytelna lista z wyraźnymi działami', 'Mniejsze rozmiary tekstu: „Mniejsza” i „Bardzo mała”']],
  ['6.8', ['Kalendarz: dzień z kilkoma wydarzeniami dzieli się na 2, 3 lub 4 części w ich kolorach']],
  ['6.7', ['Bezpieczniejsza synchronizacja list: telefon ze starą lub domyślną listą nie nadpisze aktualnej', 'Nowa instalacja startuje bez przykładowych osób']],
  ['6.6', ['Kalendarz: dwa szybkie dotknięcia dnia dodają wydarzenie']],
  ['6.5', ['Rozpiska spotkań z kalendarza: także jeden wybrany dzień, cieplejsza treść, katechezy cykliczne rozpisane dzień po dniu', 'Nowe wydarzenie: Brak Eucharystii']],
  ['6.4', ['Powitanie „Pokój Tobie!” przy pierwszym otwarciu w danym dniu', 'Własna ikona (zdjęcie z kadrowaniem) w nagłówku i jako skrót na ekranie głównym', 'Zdjęcie w tle za mgłą, z ustawianiem kadru i widoczności']],
  ['6.3', ['Katechezy: mapa nie zasłania okna dodawania; osobna, zwijana karta „Mapa głoszeń”']],
  ['6.2', ['Katechezy: mapa głoszeń, najbliższe katechezy, zaproszenie SMS / WhatsApp dla kogoś spoza Drogi', 'Głoszenie katechez cykliczne (np. wt i czw 18:30, od–do)', 'Katechiści wspólnoty z kontaktami', 'Witraż w nagłówku zamiast baranka']],
  ['6.1', ['Rozpiska: „Inne” pyta o nazwę bloku', 'Rozpiska do dokumentu (Word / Dokumenty Google) i do druku lub PDF']],
  ['6.0', ['Przygotowanie Paschy w blokach: wstęp ogólny, 7 czytań z pieśniami, Epistoła, Ewangelia, rozmowa z dziećmi, liturgia chrzcielna („jest chrzest”), modlitwa wiernych', 'Własna rozpiska – dowolne bloki (czytanie, pieśń, pieśń z wprowadzeniem, modlitwa z ręki…)', 'Etap wspólnoty na Drodze (informacja na starcie)', 'Nowa ikona aplikacji – witraż']],
  ['5.6', ['Nowe menu na dole: Start, Liturgia (rozwija Temat, Czytania, Liturgię Słowa), Eucharystia, Kalendarz, Ustawienia (zębatka)', 'Przełącznik Temat / Czytania / Liturgia Słowa na górze tych ekranów']],
  ['5.5', ['Wszystkie wspólnoty w arkuszu w jednym miejscu (App_Wspolnoty), każda ze swoim identyfikatorem i podglądem listy']],
  ['5.4', ['Zakładka „Lista ręczna” w arkuszu: wpisujesz tam osoby (wspólnota, imię i nazwisko, telefon, opcjonalnie funkcja i grupa), aplikacja je pobiera']],
  ['5.3', ['Każda nowa udostępniona wspólnota ma zawsze własne miejsce w arkuszu', 'Karta synchronizacji pokazuje, gdzie w arkuszu jest lista, i ostrzega, gdy dwie wspólnoty mają to samo miejsce', 'Kody QR i zaproszenia zawsze dotyczą wybranej wspólnoty']],
  ['5.2', ['SMS: treść do poprawienia i dopisek przed wysłaniem', '„⚡ Wyślij wszystkim” – każdy osobno jednym przyciskiem; „👥 Razem” – jedna wiadomość grupowa', 'Ekipa: „wszyscy” tylko gdy zaznaczono wszystkich, bez wyboru – nic']],
  ['5.1', ['Wysyłać listę wspólnoty mogą tylko odpowiedzialni, współodpowiedzialni i administrator (konto Alan Filipiak)', 'Role w udostępnionej wspólnocie ustawia tylko osoba uprawniona']],
  ['5.0', ['Każda wspólnota synchronizuje się osobno – własny kod QR wspólnoty (zamiast łańcuszka 🔗)', 'Wklejanie listy osób z arkusza (imię, telefon, grupa, rola)', 'Wiadomość do wspólnoty: wybór wspólnoty, potem osób', 'Plan z kalendarza: zaznaczanie, komu wysłać', 'Zdjęcia tylko z kafelka na stronie startowej']],
  ['4.9', ['Ekipa w kalendarzu jako drzewko: grupy → osoby, z wyszukiwarką', 'Lista zmian w „O aplikacji”']],
  ['4.8', ['Kalendarz: wybór roku i miesiąca po dotknięciu nazwy miesiąca', 'Zdjęcia: aparat, galeria, album, przypisanie do wydarzenia']],
  ['4.6', ['Wysyłka planu z kalendarza (zakres, wybór wspólnot, każdy osobno)']],
  ['4.5', ['Kalendarz: „Ekipa – kto przygotowuje”; celebracje dla całej wspólnoty']],
  ['4.3', ['Hasło: blokada Skrutacji lub całej aplikacji', 'Moje konto: te same dane na kilku urządzeniach (szyfrowane)']],
  ['4.2', ['Pascha, Konwiwencja początku roku, katechezy w kalendarzu', 'Odliczanie do Paschy na stronie startowej', 'Agapa – ikona dwóch ryb']],
  ['4.0', ['Grupy i grupy robocze, okres łączony wspólnot', 'Kalendarz ze świętami, okresami i przypomnieniami']],
  ['3.6', ['Wiadomość do wspólnoty']],
  ['3.4', ['Kilka wspólnot, kolory osób, telefon z kontaktów', 'Aktualizacje z Dysku Google, nagrania pieśni']],
  ['3.3', ['Czytania mszalne na wybraną datę, Wigilia']],
  ['3.0', ['Role we wspólnocie i lista od odpowiedzialnego']],
];
function changesHtml(n) {
  return CHANGES.slice(0, n || CHANGES.length).map(c => '<div class="chg"><b>' + c[0] + '</b><ul>' + c[1].map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>').join('');
}
function showNewsOnce() {
  const v = A && A.version ? A.version() : CHANGES[0][0];
  if (!S.seenVer) { S.seenVer = v; save(true); return; }   // pierwsza instalacja – bez listy
  if (S.seenVer === v) return;
  const prev = S.seenVer; S.seenVer = v; save(true);
  const fresh = CHANGES.filter(c => verNum(c[0]) && verNum(prev) && verCmp(verNum(c[0]), verNum(prev)) > 0);
  if (!fresh.length) return;
  modalState = { kind: 'news' };
  openModal('Co nowego – wersja ' + v, fresh.map(c => '<div class="chg"><b>' + c[0] + '</b><ul>' + c[1].map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>').join(''), '');
}

/* ===== START ===== */

/* Ikony kafelków – rysowane kreską, z filtrem „szkicu” (definicja w index.html). */
const ICONS = {
  notatnik: '<rect class="f" x="11" y="7" width="26" height="35" rx="3"/><path d="M8 13h6M8 20h6M8 27h6M8 34h6"/><path d="M17 15h14M17 21h14M17 27h9"/><path d="M33 31l6-6 3 3-6 6-4 1z" class="fl"/>',
  set_og: '<circle class="f" cx="18" cy="16" r="7"/><path class="f" d="M5 40c1-8 6-13 13-13s12 5 13 13z"/><path d="M33 17h9M33 24h9M33 31h6"/><circle class="fl" cx="36" cy="17" r="1.6"/><circle class="fl" cx="39" cy="24" r="1.6"/>',
  wydatki: '<path class="f" d="M17 18c-6 4-10 10-10 16 0 6 7 9 17 9s17-3 17-9c0-6-4-12-10-16z"/><path d="M17 18c-3-3-4-7-2-10 3 2 6 2 9 0 3 2 6 2 9 0 2 3 1 7-2 10"/><path d="M15 18c4 1.5 14 1.5 18 0"/><path d="M33 18l4-3" opacity=".7"/><path d="M14 31c2 5 6 7 10 7" opacity=".5"/>',
  oapp: '<circle class="f" cx="22" cy="22" r="15"/><path d="M22 19v11"/><circle class="fl" cx="22" cy="13.5" r="1.8"/><path d="M33 33l7 7M31 39h9v-9" opacity=".75"/>',
  linki: '<path class="f" d="M20 28l8-8"/><path class="f" d="M22 14l4-4a8 8 0 0 1 11 11l-4 4"/><path class="f" d="M26 34l-4 4a8 8 0 0 1-11-11l4-4"/><circle cx="37" cy="37" r="5" class="fl"/><path d="M37 34v6M34 37h6"/>',
  katechisci: '<path class="f" d="M12 7l7 1 2 9-5 3c2 5 6 9 11 11l3-5 9 2 1 7c-1 4-5 6-9 5C19 37 11 29 8 16c-1-4 1-8 4-9z"/><path d="M29 7c6 1 10 5 11 11M28 13c3 1 5 3 6 6"/>',
  set_wyg: '<path class="f" d="M24 7C13 7 6 15 6 24c0 9 7 17 16 17 3 0 4-2 3-4-1-3 1-5 4-5h5c5 0 8-3 8-8C42 14 34 7 24 7z"/><circle cx="15" cy="22" r="2.6" class="fl"/><circle cx="21" cy="14.5" r="2.6"/><circle cx="30" cy="14.5" r="2.6" class="fl"/><circle cx="35.5" cy="21.5" r="2.6"/>',
  set_zr: '<path class="f" d="M5 15h14l4 4h20v20H5z"/><path d="M5 15v-3h12l3 3"/><path d="M13 26h22M13 32h16"/><path d="M33 31l3 3 6-7" opacity=".6"/>',
  set_bez: '<rect class="f" x="11" y="21" width="22" height="19" rx="3"/><path d="M15 21v-6a7 7 0 0 1 14 0v6"/><circle cx="22" cy="29" r="2.2" class="fl"/><path d="M22 31v4"/><path d="M37 12a9 9 0 0 1 4 9M41 21l-3-2M41 21l1.5-3.3"/>',
  temat: '<path class="f" d="M6 13c7-3 13-2 18 2 5-4 11-5 18-2v24c-7-3-13-2-18 2-5-4-11-5-18-2z"/><path d="M24 15v24"/><path d="M33 18v11M29 21.5h8"/><path d="M10 19c3-1 7-1 10 1M10 24c3-1 7-1 10 1M10 29c3-1 7-1 10 1"/>',
  slowo: '<path class="f" d="M19 22h10v17h-10z"/><path d="M24 9c-5 6-4 9 0 11 4-2 5-5 0-11z" class="fl"/><path d="M24 20v2"/><path d="M14 40h20M16 43h16"/><path d="M22 26v9" opacity=".5"/>',
  eucharystia: '<ellipse class="f" cx="24" cy="27" rx="18" ry="11"/><path d="M6.5 27c1 5 8 9 17.5 9s16.5-4 17.5-9"/><path d="M14 20l20 14M34 20L14 34"/><path d="M24 16.5v21" opacity=".55"/><circle cx="17" cy="26" r=".9"/><circle cx="31" cy="27" r=".9"/><circle cx="24" cy="21" r=".9"/>',
  skrutacja: '<path class="f" d="M12 10h22c3 0 4 2 4 4v24c0 2-1 3-3 3H15c-2 0-3-1-3-3z"/><path d="M12 14c-3 0-4-2-4-3s1-2 4-1"/><path d="M17 18h15M17 23h15M17 28h10"/><path d="M41 6L28 33l-1 4 3-3L43 8z" class="fl"/>',
  slownik: '<path class="f" d="M11 8h24a3 3 0 0 1 3 3v29H14a3 3 0 0 1-3-3z"/><path d="M11 37a3 3 0 0 1 3-3h24"/><path d="M30 8v12l3-2 3 2V8"/><path d="M17 15h9M17 20h7"/><path d="M19 27l3-6 3 6M20 25h4" opacity=".7"/>',
  spiewnik: '<path class="f" d="M17 26c-6 0-9 4-9 8 0 6 5 9 11 9 5 0 8-2 10-6 2-3 1-6-1-8 1-3 0-6-4-7-3-1-5 1-7 4z"/><circle cx="19" cy="33" r="3.2"/><path d="M22 30L38 12"/><path d="M36 8l6 6-3 3-6-6z" class="fl"/><path d="M12 38l7-7M14 40l7-7" opacity=".5"/>',
  wspolnota: '<circle class="f" cx="24" cy="15" r="5"/><circle class="f" cx="12" cy="19" r="4"/><circle class="f" cx="36" cy="19" r="4"/><path d="M14 38c0-7 4-12 10-12s10 5 10 12"/><path d="M4 37c0-5 3-9 8-9 2 0 3 .5 4 1.5M44 37c0-5-3-9-8-9-2 0-3 .5-4 1.5"/>',
  archiwum: '<path class="f" d="M7 17h34v22H7z"/><path d="M5 11h38v6H5z"/><path d="M19 23h10v4H19z"/><path d="M11 33h26" opacity=".5"/>',
};
ICONS.kalendarz = '<rect class="f" x="8" y="11" width="32" height="29" rx="3"/><path d="M8 19h32M16 7v8M32 7v8"/><path d="M15 26h4M22 26h4M29 26h4M15 32h4M22 32h4"/>';
ICONS.zdjecia = '<rect class="f" x="6" y="14" width="36" height="24" rx="4"/><path d="M17 14l3-5h8l3 5"/><circle cx="24" cy="26" r="7"/><circle cx="35" cy="19" r="1.2"/>';
ICONS.katechezy = '<path class="f" d="M24 6c-7 0-12 5-12 12 0 9 12 22 12 22s12-13 12-22c0-7-5-12-12-12z"/><path d="M24 11v13M19 16h10"/><path d="M8 42h32" opacity=".6"/>';
ICONS.wiadomosc = '<path class="f" d="M7 12h34v21H20l-8 7v-7H7z"/><path d="M13 19h22M13 25h15"/>';
ICONS.przyg = '<path class="f" d="M6 10c6-2 12-2 17 2v28c-5-4-11-4-17-2z"/><path class="f" d="M42 10c-6-2-12-2-17 2v28c5-4 11-4 17-2z"/><circle cx="36" cy="36" r="7" class="fl"/><path d="M36 32v8M32 36h8"/>';
ICONS.moje = '<rect class="f" x="9" y="7" width="26" height="34" rx="3"/><path d="M15 16l2.5 2.5L22 14M15 26l2.5 2.5L22 24"/><path d="M25 16h5M25 26h5M15 34h12"/><circle cx="36" cy="35" r="6" class="fl"/><path d="M33 35l2 2 4-4"/>';
ICONS.p_pok = '<path class="f" d="M24 6v36M14 16h20"/><path class="f" d="M10 30c4 6 10 9 14 9s10-3 14-9"/><path d="M17 25c2 2 4 3 7 3s5-1 7-3" opacity=".7"/>';
ICONS.p_pascha = '<rect class="f" x="18" y="16" width="12" height="25" rx="2"/><path class="fl" d="M24 5c3 4 3 7 0 9-3-2-3-5 0-9z"/><path d="M24 21v10M20 25h8"/><path d="M14 43h20"/>';
ICONS.p_konw = '<path class="f" d="M6 40l18-30 18 30z"/><path d="M24 10v30M18 40l6-10 6 10"/><circle cx="10" cy="12" r="3" class="fl"/>';
ICONS.p_niest = '<rect class="f" x="8" y="8" width="32" height="8" rx="2"/><rect class="f" x="8" y="20" width="32" height="8" rx="2"/><rect class="f" x="8" y="32" width="20" height="8" rx="2"/><path d="M36 33v8M32 37h8"/>';

/* ---------- Przygotowania: nowe przygotowanie + moje ---------- */
function viewPrzyg() {
  const R0 = window.RZ && RZ.resp();
  const opts = [['tab', 'temat', 'slowo', 'Liturgia Słowa', 'temat, czytania, celebracja'], ['tab', 'eucharystia', 'eucharystia', 'Eucharystia', 'czytania, funkcje, śpiewy']]
    .concat(R0 ? [['rz-open', 'pokutna', 'p_pok', 'Liturgia pokutna', 'schemat w blokach'], ['rz-open', 'pascha', 'p_pascha', 'Pascha', 'Wigilia Paschalna'],
      ['rz-open', 'konw', 'p_konw', 'Konwiwencja', 'dni, bloki, posiłki'], ['rz-open', 'niest', 'p_niest', 'Własna rozpiska', 'dowolne dni i bloki']] : []);
  let h = '<div class="card"><h2>Nowe przygotowanie</h2><div class="tiles">' + opts.map(o => '<button class="tile" data-act="' + o[0] + '" data-a="' + o[1] + '"><span class="ti">' + icon(o[2]) + '</span><b>' + o[3] + '</b><span class="muted">' + o[4] + '</span></button>').join('') + '</div>' +
    (R0 ? '' : '<div class="muted mt">Rozpiski (konwiwencja, Pascha, liturgia pokutna) przygotowują odpowiedzialni – zobaczysz je w „Moich przygotowaniach”, gdy będziesz w ekipie.</div>') + '</div>';
  const up = mojeItems().filter(x => !x.past).slice(0, 4);
  h += '<div class="card"><h2>Moje najbliższe</h2>' + (up.length ? up.map(mojeRow).join('') : '<div class="muted">Na razie nic – gdy ktoś przydzieli Ci zadanie albo dopisze do ekipy, pojawi się tutaj.</div>') +
    '<button class="btn ghost full mt" data-act="tab" data-a="moje">Wszystkie moje przygotowania i archiwum ›</button></div>';
  return h;
}
/** Wszystko, w czym biorę udział: rozpiski (ekipa / przydział), wydarzenia z kalendarza, bieżąca Liturgia Słowa i Eucharystia. */
function mojeItems() {
  const me = S.owner, td = today(), out = [], evSeen = {};
  if (!me) return out;
  (window.RZ ? RZ.mine() : []).forEach(x => {
    const r = S.rozpiski[x.k]; if (r && r.ev) evSeen[r.ev] = 1;
    out.push({ d: x.od, d2: x.doD, t: x.tytul, sub: (x.roles.length ? 'Twoje: ' + x.roles.slice(0, 4).join(', ') + (x.roles.length > 4 ? ' i ' + (x.roles.length - 4) + ' więcej' : '') : 'W ekipie') + (x.gdzie ? ' · ' + x.gdzie : ''),
      act: 'moje-rz', a: x.k, past: x.done || (x.doD || x.od) < td });
  });
  if (window.KAL) KAL.alive().forEach(e => {
    if (evSeen[e.id] || !KAL.inTeam(e) || !e.data || KAL.isCyclic(e)) return;
    out.push({ d: e.data, d2: e.dataDo || e.data, t: (KAL.TY[e.typ] || { n: 'Wydarzenie' }).n, sub: 'W ekipie' + (e.gdzie ? ' · ' + e.gdzie : '') + (e.godz ? ' · ' + e.godz : ''), act: 'kal-edit', a: e.id, past: (e.dataDo || e.data) < td });
  });
  const c = S.celebration || {}, rd = (c.who || []).map((w, i) => w === me ? (c.readings && c.readings[i]) || 'czytanie' : null).filter(Boolean);
  if (rd.length && S.haslo) out.push({ d: c.data || td, d2: c.data || td, t: 'Liturgia Słowa – ' + S.haslo, sub: 'Twoje: ' + rd.join(', ') + (c.godz ? ' · godz. ' + c.godz : ''), act: 'tab', a: 'slowo', past: false, now: !c.data });
  const eu = S.eucharystia && S.eucharystia.who ? Object.keys(S.eucharystia.who).filter(k => S.eucharystia.who[k] === me) : [];
  const E = S.eucharystia || {};
  if (eu.length) out.push({ d: E.data || td, d2: E.data || td, t: 'Eucharystia', sub: 'Twoje: ' + eu.join(', ') + (E.godzEu ? ' · godz. ' + E.godzEu : ''), act: 'tab', a: 'eucharystia', past: false, now: !E.data });
  out.sort((x, y) => x.past !== y.past ? (x.past ? 1 : -1) : x.past ? y.d.localeCompare(x.d) : x.d.localeCompare(y.d));
  return out;
}
function mojeRow(x) {
  const dt = x.now ? 'bieżące' : plDate(x.d).slice(0, 5) + (x.d2 && x.d2 !== x.d ? '–' + plDate(x.d2).slice(0, 5) : '');
  return '<button class="mojerow' + (x.past ? ' past' : '') + '" data-act="' + x.act + '" data-a="' + esc(x.a) + '"><span class="mjd">' + esc(dt) + '</span><span class="grow"><b>' + esc(x.t) + '</b><br><span class="muted">' + esc(x.sub) + '</span></span><span class="chev"></span></button>';
}
function viewMoje() {
  if (!S.owner) return '<div class="card"><h2>Moje przygotowania</h2><div class="muted">Najpierw wybierz siebie (Ustawienia → Ogólne → Jestem).</div></div>';
  const all = mojeItems(), up = all.filter(x => !x.past), past = all.filter(x => x.past);
  return '<div class="card"><h2>Moje przygotowania (' + up.length + ')</h2>' + (up.length ? up.map(mojeRow).join('') : '<div class="muted">Nic zaplanowanego.</div>') + '</div>' +
    '<div class="card"><h2>Archiwum (' + past.length + ')</h2>' + (past.length ? past.slice(0, 40).map(mojeRow).join('') : '<div class="muted">Jeszcze nic minionego.</div>') +
    '<button class="btn ghost full mt" data-act="tab" data-a="archiwum">Archiwum Liturgii Słowa ›</button></div>';
}

function icon(k) { return '<svg viewBox="0 0 48 48" class="sk"><g filter="url(#sketch)">' + ICONS[k] + '</g></svg>'; }

const TILES = [
  ['przyg', 'Przygotowania', 'nowe: Liturgia, Eucharystia, rozpiski'],
  ['moje', 'Moje przygotowania', 'w czym biorę udział'],
  ['skrutacja', 'Skrutacja', 'moje zapiski ze Słowem'],
  ['slownik', 'Słownik', 'Teologii Biblijnej'],
  ['spiewnik', 'Śpiewnik', 'pieśni i wyszukiwarka'],
  ['kalendarz', 'Kalendarz', 'celebracje, przygotowania, święta'],
  ['katechezy', 'Katechezy', 'głoszenia na mapie, zaproszenia'],
  ['zdjecia', 'Zdjęcia', 'aparat i album'],
  ['wiadomosc', 'Wiadomość do wspólnoty', 'SMS / WhatsApp do wszystkich lub wybranych'],
  ['katechisci', 'Zadzwoń do katechistów', 'wybierz, do kogo'],
  ['linki', 'Linki', 'strony Drogi i własne skróty'],
  ['wydatki', 'Kasetka', 'kasa wspólnoty: wpływy i wydatki'],
  ['oapp', 'O aplikacji', 'sugestie i pomoc'],
  ['wspolnota', 'Wspólnota', 'bracia i telefony'],
  ['notatnik', 'Notatnik', 'prywatne zapiski'],
  ['archiwum', 'Archiwum', 'przygotowania'],
];

const TILE_SHORT = { przyg: 'Przygotowania', moje: 'Moje', temat: 'Temat', slowo: 'Słowo', eucharystia: 'Eucharystia', skrutacja: 'Skrutacja', slownik: 'Słownik', spiewnik: 'Śpiewnik', kalendarz: 'Kalendarz',
  katechezy: 'Katechezy', zdjecia: 'Zdjęcia', wiadomosc: 'Wiadomość', katechisci: 'Katechiści', linki: 'Linki', notatnik: 'Notatnik', wydatki: 'Kasetka', oapp: 'O aplikacji', wspolnota: 'Wspólnota', archiwum: 'Archiwum' };
const TILE_ACT = { wiadomosc: 'msg-open', katechisci: 'kc-open', linki: 'lnk-open' };
/** Linki: stałe + własne skróty (S.myLinks = [[nazwa, url]]). */
function linksDialog() {
  const my = S.myLinks || [];
  modalState = { kind: 'lnk' };
  openModal('Linki', LINKS.map(l => '<a class="link" data-act="link" data-a="' + esc(l[1]) + '">' + esc(l[0]) + ' ↗</a>').join('') +
    (S.spiewnikUrl ? '<a class="link" data-act="link" data-a="' + esc(S.spiewnikUrl) + '">Śpiewnik ↗</a>' : '') +
    '<div class="sec">Moje skróty</div>' + (my.length ? my.map((l, i) => '<div class="row"><a class="link grow" data-act="link" data-a="' + esc(l[1]) + '">' + esc(l[0]) + ' ↗</a>' +
      '<button class="icon" data-act="lnk-del" data-a="' + i + '">🗑</button></div>').join('') : '<div class="muted">Brak – dodaj poniżej.</div>') +
    '<label class="lbl">Nazwa</label><input type="text" id="lnkN" placeholder="np. Parafia św. Katarzyny">' +
    '<label class="lbl">Adres strony</label><input type="url" id="lnkU" placeholder="https://…">' +
    '<button class="btn full mt" data-act="lnk-add">＋ Dodaj własny skrót</button>');
}
/** Kafelki w kolejności ustawionej przez użytkownika (nowe dopisują się na końcu). */
function tilesOrdered() {
  const okT = t => t[0] !== 'wydatki' || (window.KASA ? KASA.any() : !!S.kasaOk);   // przed wczytaniem kasa.js – ostatnio zapamiętane uprawnienie
  const ord = (S.tileOrder || []).filter(id => TILES.some(t => t[0] === id));
  const nowe = TILES.filter(t => ord.indexOf(t[0]) < 0), first = nowe.filter(t => t[0] === 'przyg' || t[0] === 'moje');
  return first.concat(ord.map(id => TILES.find(t => t[0] === id))).concat(nowe.filter(t => first.indexOf(t) < 0)).filter(okT);
}
/** Wybór katechisty do telefonu / SMS – ze wszystkich wspólnot. */
function kcDialog() {
  const ws = S.wspAktywna === 'ALL' || S.wspolnoty.length < 2 ? S.wspolnoty : [curW()].concat(S.wspolnoty.filter(w => w !== curW()));
  const any = ws.some(w => w && (w.katechisci || []).length);
  modalState = { kind: 'kc' };
  openModal('Zadzwoń do katechistów', any ? ws.filter(w => w && (w.katechisci || []).length).map(w =>
    (S.wspolnoty.length > 1 ? '<div class="sec">' + esc(w.nazwa) + '</div>' : '') + w.katechisci.map((k, i) => {
      const id = esc(w.id + '|' + i);
      return '<div class="person-row"><div class="grow"><div class="pn">' + esc(k.n) + '</div><div class="muted">' + esc(k.tel || 'brak numeru') + '</div></div>' +
        (k.tel ? '<button class="btn sm" data-act="kcx" data-a="' + id + '" data-b="call">✆ Zadzwoń</button><button class="icon" data-act="kcx" data-a="' + id + '" data-b="sms">✉</button><button class="icon wa" data-act="kcx" data-a="' + id + '" data-b="wa">W</button>' : '') +
        (k.mail ? '<button class="icon" data-act="kcx" data-a="' + id + '" data-b="mail">@</button>' : '') + '</div>';
    }).join('')).join('')
    : '<div class="muted">Nie ma jeszcze katechistów. Dodasz ich w ekranie „Wspólnota” → Katechiści.</div><button class="btn full mt" data-act="tab" data-a="wspolnota">Otwórz Wspólnotę</button>');
}
/** O aplikacji: wersja, nowości, sugestia / prośba o pomoc (e-mail). */
function mailUrl(kind) {
  const ver = A && A.version ? A.version() : '', dev = (navigator.userAgent.match(/Android [\d.]+/) || [''])[0];
  const subj = (kind === 'pomoc' ? 'Trójnóg – prośba o pomoc' : 'Trójnóg – sugestia') + (ver ? ' (wersja ' + ver + ')' : '');
  const body = (kind === 'pomoc' ? 'Opisz, co się dzieje i w którym miejscu aplikacji:\n\n\n' : 'Moja sugestia:\n\n\n') +
    '—\nWersja: ' + (ver || '?') + (dev ? '\nTelefon: ' + dev : '') + (S.owner ? '\nOd: ' + S.owner : '');
  return 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
}
function helpButtons() {
  return '<div class="row mt"><button class="btn grow" data-act="link" data-a="' + esc(mailUrl('sugestia')) + '">Zgłoś sugestię</button>' +
    '<button class="btn ghost grow" data-act="link" data-a="' + esc(mailUrl('pomoc')) + '">Poproś o pomoc</button></div>' +
    '<div class="muted center mt">Otworzy się e-mail do ' + CONTACT + ' z numerem wersji – dopisz tylko treść.</div>';
}
function viewOApp() {
  const ver = A && A.version ? A.version() : '';
  return '<div class="card center oapp"><img src="witraz.png" alt="" class="oapp-logo"><div class="oapp-n">Trójnóg</div>' +
    '<div class="muted">' + (ver ? 'wersja ' + esc(ver) : '') + '</div>' + helpButtons() + '<button class="btn text full" data-act="tut-again">▶ Pokaż samouczek jeszcze raz</button></div>' +
    '<div class="card"><h2>Co nowego</h2>' + changesHtml() + '</div>' +
    '<div class="card"><h2>O aplikacji</h2><p>Pomoc we wspólnotowym przygotowaniu Liturgii Słowa i Eucharystii: temat ze Słownika Teologii Biblijnej, rozdział czytań, pieśni, kalendarz wspólnoty, przypomnienia i kasetka.</p>' +
    '<div class="notice">Aplikacja nie jest oficjalnym programem Drogi Neokatechumenalnej. Tworzona non-profit.</div>' +
    '<p><b>Alan Solutions</b><a class="link" data-act="link" data-a="mailto:' + CONTACT + '">' + CONTACT + '</a></p></div>';
}
/* ---- rozważania: wyszukiwania do tematu / czytania (pomoc przy wstępach) ---- */
function rozwQs() {
  const out = [];
  if (S.haslo) out.push(S.haslo);
  S.celebration.readings.slice(1).forEach(r => { r = String(r || '').split(/\n/)[0].trim(); if (r && out.indexOf(r) < 0) out.push(r); });
  return out;
}
function rozwLinks(q) {
  const G = x => 'https://www.google.com/search?q=' + encodeURIComponent(x), verse = /\d/.test(q);
  return [
    ['Rozważania', G('rozważanie ' + q)],
    [verse ? 'Komentarz do fragmentu' : 'Komentarz biblijny do tematu', G((verse ? 'komentarz do ' : 'komentarz biblijny ') + q)],
    ['Deon.pl', G('site:deon.pl ' + q)],
    ['Mateusz.pl', G('site:mateusz.pl ' + q)],
    ['Wiara.pl', G('site:wiara.pl ' + q)],
    ['Opoka', G('site:opoka.org.pl ' + q)],
    ['Brewiarz.pl', G('site:brewiarz.pl ' + q)],
    ['Ewangelia na co dzień (Evangelizo)', G('site:evangelizo.org ' + q)],
    ['Katechizm i dokumenty Kościoła', G('Katechizm Kościoła Katolickiego ' + q)],
    ['Homilie (YouTube)', 'https://www.youtube.com/results?search_query=' + encodeURIComponent('homilia ' + q)],
  ];
}
function rozwDialog(q) {
  const qs = rozwQs(); q = q || qs[0] || '';
  modalState = { kind: 'rozw', q: q };
  openModal('Rozważania do wstępów', (qs.length > 1 ? '<div class="chips">' + qs.map(x => '<button class="chip' + (x === q ? ' on' : '') + '" data-act="rozw-q" data-a="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' : '') +
    '<div class="row mt"><input type="text" id="rozwQ" class="grow" value="' + esc(q) + '" placeholder="słowo albo werset, np. J 3, 16"><button class="btn" data-act="rozw-go">Szukaj</button></div>' +
    (q ? (BY_NAME[q] ? '<a class="link" data-act="rozw-sl" data-a="' + esc(q) + '">Słownik Teologii Biblijnej: „' + esc(q) + '” ›</a>' : '') +
      rozwLinks(q).map((l, i) => '<a class="link" data-act="link" data-a="' + esc(l[1]) + '">' + (i + 1) + '. ' + esc(l[0]) + ' ↗</a>').join('') : '') +
    '<div class="muted mt">Otwierają się wyszukiwania (Google / YouTube) dla wybranego słowa albo fragmentu – wybierz, co pasuje do wstępu.</div>');
}
/* ---- przeciąganie list (uchwyt ⠿): kontener data-dlist, elementy data-did ---- */
const DLIST = { tiles: ids => { S.tileOrder = ids; save(true); } };
let dg = null;
document.addEventListener('pointerdown', ev => {
  const h = ev.target.closest('.dh'), it = h && h.closest('[data-did]'), list = it && it.closest('[data-dlist]');
  if (!list) return;
  ev.preventDefault();
  const r = it.getBoundingClientRect();
  dg = { it: it, list: list, y0: ev.clientY, top0: r.top, ph: document.createElement('div') };
  dg.ph.className = 'dlph'; dg.ph.style.height = r.height + 'px';
  it.classList.add('dlmove'); it.style.width = r.width + 'px'; it.style.left = r.left + 'px'; it.style.top = r.top + 'px';
  list.insertBefore(dg.ph, it); document.body.appendChild(it);
});
document.addEventListener('pointermove', ev => {
  if (!dg) return;
  ev.preventDefault();
  dg.it.style.top = (dg.top0 + ev.clientY - dg.y0) + 'px';
  let before = null;
  for (const x of dg.list.querySelectorAll('[data-did]')) { const r = x.getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { before = x; break; } }
  if (before) dg.list.insertBefore(dg.ph, before); else dg.list.appendChild(dg.ph);
  const m = document.getElementById('main'), mr = m.getBoundingClientRect();
  if (ev.clientY < mr.top + 50) m.scrollTop -= 12; else if (ev.clientY > mr.bottom - 50) m.scrollTop += 12;
}, { passive: false });
function dgEnd() {
  if (!dg) return;
  const d = dg; dg = null;
  d.list.insertBefore(d.it, d.ph); d.ph.remove();
  d.it.classList.remove('dlmove'); d.it.style.width = d.it.style.top = d.it.style.left = '';
  const f = DLIST[d.list.dataset.dlist]; if (f) f(Array.from(d.list.querySelectorAll('[data-did]')).map(x => x.dataset.did));
  render();
}
document.addEventListener('pointerup', dgEnd);
document.addEventListener('pointercancel', dgEnd);
function viewStart() {
  if (!S.owner) {
    return '<div class="hello">' + (isOktawa() ? 'Chrystus zmartwychwstał!' : 'Pokój Tobie!') + '</div>' +
      '<div class="card"><h2>Kim jesteś?</h2><div class="muted">Wybierz siebie z listy wspólnoty albo wpisz imię. Twoje czytania i funkcje będą wyróżnione.</div>' +
      '<div class="chips mt">' + S.bracia.map(b => '<button class="chip" data-act="set-owner" data-a="' + esc(b) + '">' + esc(b) + '</button>').join('') + '</div>' +
      '<div class="row mt"><input type="text" id="ownerNew" placeholder="Moje imię" class="grow"><button class="btn" data-act="owner-add">OK</button></div></div>';
  }
  const e = S.eucharystia;
  const mine = S.owner && S.haslo && S.obecni.indexOf(S.owner) >= 0 ? myReadings(S.owner) : null;
  const myEu = EU_ROLES.filter(r => e.who[r] === S.owner);
  const L = applySeason();
  const cwS = curW(), etS = etapOf(cwS);
  let h = '<div class="hello">' + (isOktawa() ? 'Chrystus zmartwychwstał, ' : 'Pokój Tobie, ') + esc(firstName(S.owner)) + '!</div>' +
    (etS || (cwS && cwS.region) ? '<div class="etap center"><span class="muted">' + esc(cwS.nazwa) + (cwS.region ? ' · ' + esc(cwS.region) : '') + (etS ? ' · etap:' : '') + '</span>' + (etS ? ' <b>' + esc(etS) + '</b>' : '') + '</div>' : '') + wsNote() +
    '<div class="season"><span class="sw"></span><div><b>' + esc(L.name) + '</b> · szaty ' + esc(L.color) +
    '<div class="muted">Rok ' + L.cycle + ' (niedziele) · rok ' + L.weekday + ' (dni powszednie)</div></div></div>' +
    (window.KAL ? KAL.paschaCard() : '') + (window.POK ? POK.card() : '');
  const last = S.history.find(x => x.tryb !== 'Eucharystia');
  if (S.haslo || e.data || last) {
    h += '<div class="card now">' +
      (S.haslo ? '<div><span class="muted">Ostatni temat:</span> <b>' + esc(S.haslo) + '</b>' + (mine ? ' · Twoje czytania: ' + mine.flat.length : '') + '</div>'
        : last ? '<div><span class="muted">Ostatni temat:</span> <b>' + esc(last.haslo) + '</b> <span class="muted">(' + plDate(last.date) + ')</span></div>' : '') +
      (e.data ? '<div><span class="muted">Eucharystia:</span> ' + plDate(e.data) + (e.godzEu ? ', godz. ' + esc(e.godzEu) : '') + (e.godzina ? ', zbiórka ' + esc(e.godzina) : '') +
        (myEu.length ? ' · <b>' + myEu.map(esc).join(', ') + '</b>' : '') + '</div>' : '') + '</div>';
  }
  if (window.KAL) h += KAL.startCard();
  h += '<div class="tiles' + (S.tilesMin ? ' min c' + (S.tilesCols || 4) : '') + '">' + tilesOrdered().filter(t => !(S.hiddenTiles || {})[t[0]]).map(t => '<button class="tile" aria-label="' + esc(t[1]) + '" data-act="' + (TILE_ACT[t[0]] || 'tab') + '" data-a="' + t[0] + '"><span class="ti">' + icon(t[0]) + '</span>' +
    '<b>' + t[1] + '</b><span class="muted">' + t[2] + '</span><small class="tl">' + (TILE_SHORT[t[0]] || t[1]) + '</small></button>').join('') + '</div>';
  return h;
}

/* ===== TEMAT ===== */

function viewTemat() {
  const names = allNames();
  const remaining = names.filter(n => !isDone(n)).length;
  const d = S.done[S.haslo];
  const hasDict = S.haslo && BY_NAME[S.haslo] && BY_NAME[S.haslo].s && BY_NAME[S.haslo].s.length;
  return '' +
    '<div class="card"><h2>Temat</h2>' +
    '<div class="topic' + (S.haslo ? '' : ' empty') + (UI.pop ? ' pop' : '') + '">' + (S.haslo ? esc(S.haslo) : '— wybierz lub wylosuj temat —') + '</div>' +
    (d && d.done && S.haslo ? '<div class="ok center">Przerobiony' + (d.date ? ' ' + plDate(d.date) : '') + (d.by ? ' · prowadził(a): ' + esc(d.by) : '') + '</div>' : '') +
    (S.haslo ? '<div class="center">' + countsHtml(S.haslo) + '</div>' : '') +
    (S.haslo ? '<button class="btn ghost full mt" data-act="rozw-open">🔎 Szukaj rozważań do wstępów</button>' : '') +
    drawBtn('draw-topic', '↻ Losuj temat', true) +
    '<button class="btn ghost full mt" data-act="clear-topic"' + (S.haslo ? '' : ' disabled') + '>✕ Wyczyść temat</button>' +
    (hasDict ? '<button class="btn text full mt" data-act="dict">Hasło w układzie Słownika</button>' : '') +
    '<div class="count">' + remaining + ' do przerobienia z ' + names.length + '</div>' +
    '</div>' +
    '<div class="card"><h2>Lista haseł</h2>' +
    '<input type="search" id="q" placeholder="Szukaj hasła…" value="' + esc(UI.query) + '" data-in="query">' +
    '<div class="chips mt">' +
    ['Nieprzerobione', 'Przerobione', 'Wszystkie'].map((t, i) =>
      '<button class="chip' + (UI.filter === i ? ' on' : '') + '" data-act="filter" data-a="' + i + '">' + t + '</button>').join('') +
    '</div>' +
    '<div class="muted mt">Liczba czytań: suma · H historyczne · P prorockie · A apostoł · E ewangelia (' +
    (S.zPsalmami ? 'z Psalmami' : 'bez Psalmów') + (filtersOn() ? ', z filtrem etapu' : '') + ')</div>' +
    '<div class="list mt" id="hlist">' + topicList() + '</div></div>';
}

function countsHtml(n) {
  const c = readings(n).map(x => x.length), t = c[0] + c[1] + c[2] + c[3];
  return '<span class="cnt"><b>' + t + '</b>' + c.map((x, i) => '<i>' + CAT_SHORT[i] + ' ' + x + '</i>').join('') + '</span>';
}

function topicList() {
  const q = norm(UI.query.trim());
  let list = allNames().filter(n => {
    const ok = UI.filter === 0 ? !isDone(n) : UI.filter === 1 ? isDone(n) : true;
    return ok && (!q || norm(n).indexOf(q) >= 0);
  });
  if (UI.filter === 2) list = list.filter(n => !isDone(n)).concat(list.filter(isDone));
  if (!list.length) return '<div class="empty-info">Brak haseł dla tego filtra.</div>';
  return list.map(n => {
    const dn = isDone(n), d = S.done[n];
    return '<div class="item' + (dn ? ' done' : '') + (n === S.haslo ? ' sel' : '') + '">' +
      '<input type="checkbox" data-ch="done" data-a="' + esc(n) + '"' + (dn ? ' checked' : '') + '>' +
      '<div class="name" data-act="select-h" data-a="' + esc(n) + '">' + esc(n) +
      (dn && d && d.date ? '<span class="meta">' + plDate(d.date) + (d.by ? ' · ' + esc(d.by) : '') + '</span>' : '') +
      countsHtml(n) + '</div>' + (n === S.haslo ? '<span style="color:var(--gold)">✠</span>' : '') + '</div>';
  }).join('');
}

/* ===== CZYTANIA ===== */

function viewCzytania() {
  const people = S.obecni;
  const all = people.length >= aktywni().length && people.length > 0;
  const f = S.filtry, pre = f.madr && f.pnp && f.ap;
  let h = '<div class="card"><h2>Źródło czytań</h2><div class="chips">' +
    '<button class="chip' + (!S.zPsalmami ? ' on' : '') + '" data-act="mode" data-a="0">Bez Psalmów</button>' +
    '<button class="chip' + (S.zPsalmami ? ' on' : '') + '" data-act="mode" data-a="1">Z Psalmami</button></div>' +
    '<label class="lbl mt">Księgi pokazywane (zaznaczone = w czytaniach)</label><div class="chips">' +
    [['madr', 'Mądrościowe'], ['pnp', 'Pieśń nad Pieśniami'], ['ap', 'Apokalipsa']].map(x =>
      '<button class="chip' + (f[x[0]] ? '' : ' on') + '" data-act="ksiega" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div class="muted mt">Mądrościowe: Hi, Prz, Koh, Mdr, Syr</div>' +
    '<div class="chips mt"><button class="chip' + (pre ? ' on' : '') + '" data-act="preset" data-a="' + (pre ? 'off' : 'pre') + '">Etap: prekatechumenat</button></div></div>';
  h = wsNote() + h;
  h += '<div class="card"><h2>Obecni na przygotowaniu</h2>' +
    (S.bracia.length ? '' : '<div class="muted">Dodaj braci w ekranie „Wspólnota”.</div>') +
    '<div class="chips">' + aktywni().map(b =>
      '<button class="chip' + (people.indexOf(b) >= 0 ? ' on' : '') + (b === S.owner ? ' me' : '') + '" data-act="present" data-a="' + esc(b) + '">' + dot(b) + esc(b) + '</button>').join('') + '</div>' + (window.KAL ? KAL.groupChips('slowo') : '') + '<div>' +
    '</div><div class="row mt"><span class="grow muted">Zaznaczonych: ' + people.length + '</span><button class="btn ghost sm" data-act="all-present">' + (all ? 'Odznacz wszystkich' : '✓ Zaznacz wszystkich') + '</button></div></div>';

  if (!S.haslo) return h + '<div class="empty-info">Najpierw wybierz temat w zakładce „Temat”.</div>';

  const cats = readings();
  const order = readingOrder();
  const who = roundRobin(cats, order);
  const total = cats.reduce((a, c) => a + c.length, 0);
  const mine = people.indexOf(UI.mine) >= 0 ? UI.mine : '';
  const counts = {};
  who.forEach(l => l.forEach(p => { if (p) counts[p] = (counts[p] || 0) + 1; }));
  h += '<div class="card"><h2>' + esc(S.haslo) + (S.zPsalmami ? ' · z Psalmami' : ' · bez Psalmów') + '</h2>' +
    '<div class="stats">' + CAT_NAMES.map((c, i) => '<div><b>' + cats[i].length + '</b><span>' + c.slice(0, 4) + '.</span></div>').join('') +
    '<div><b>' + total + '</b><span>Suma</span></div>' +
    '<div><b>' + (people.length ? (total / people.length).toFixed(1).replace('.', ',') : '—') + '</b><span>Na osobę</span></div></div>';
  if (people.length) {
    h += '<label class="lbl mt">Kolejność rozdziału i liczba czytań:</label><div class="muted">' +
      order.map((p, i) => (i + 1) + '. ' + esc(p) + ' (' + (counts[p] || 0) + ')').join(' · ') + '</div>' +
      drawBtn('shuffle-order', '↻ Losuj kolejność', true, 'ghost') +
      '<label class="lbl mt">Moje czytania:</label><div class="chips">' +
      '<button class="chip' + (mine ? '' : ' on') + '" data-act="mine" data-a="">Wszyscy</button>' +
      order.map(p => '<button class="chip' + (mine === p ? ' on' : '') + '" data-act="mine" data-a="' + esc(p) + '">' + esc(p) + '</button>').join('') +
      '</div>';
  }
  h += '</div>';
  if (people.length) {
    h += '<div class="card"><h2>Wyślij czytania</h2><div class="muted">Każdy dostaje SMS tylko ze swoimi czytaniami.</div>' +
      order.map(p => '<div class="who"><span class="t">' + esc(p) + ' <span class="muted">(' + (counts[p] || 0) + ')</span></span>' +
        '<button class="icon" data-act="send-mine" data-a="' + esc(p) + '" data-b="sms" title="SMS">✉</button>' +
        '<button class="icon wa" data-act="send-mine" data-a="' + esc(p) + '" data-b="wa" title="WhatsApp">W</button></div>').join('') +
      '</div>';
  }
  CAT_NAMES.forEach((cn, ci) => {
    const rows = cats[ci].map((r, ri) => ri).filter(ri => !mine || who[ci][ri] === mine);
    h += '<div class="card"><h2>' + cn + ' (' + cats[ci].length + ')</h2>' +
      (rows.length ? rows.map(ri => '<div class="rd' + (S.owner && who[ci][ri] === S.owner ? ' me' : '') + '"><span class="no">' + (ri + 1) + '.</span><span class="ref">' + esc(cats[ci][ri]) + '</span>' +
        (who[ci][ri] ? '<span class="tag' + (who[ci][ri] === S.owner ? ' me' : '') + '">' + esc(who[ci][ri]) + '</span>' : '') + '</div>').join('')
        : '<div class="muted">' + (cats[ci].length ? 'Brak czytań dla tej osoby.' : 'Brak czytań w tej kategorii.') + '</div>') +
      '</div>';
  });
  return h;
}

/* ===== CELEBRACJA ===== */

function wsNote() {
  return S.wspolne.rola === 'pobieram' ? '<div class="wsnote">⟳ Przygotowanie od ' + esc(S.wspolne.by || 'prowadzącego') +
    (S.wspolne.ts ? ' (' + hhmm(S.wspolne.ts) + ')' : '') + ' – Twoje zmiany zastąpi następna aktualizacja.</div>' : '';
}

function viewCelebracja() {
  const c = S.celebration;
  const cats = readings();
  let h = wsNote() + '<div class="topic' + (S.haslo ? '' : ' empty') + '" style="text-align:left">' + (S.haslo ? esc(S.haslo) : 'Temat nie wybrany') + '</div>';
  h += '<div class="card"><h2>Kiedy i gdzie</h2><div class="row">' +
    '<div class="grow"><label class="lbl">Data celebracji</label><input type="date" data-in="cel-t" data-a="data" value="' + esc(c.data || '') + '"></div>' +
    '<div class="grow"><label class="lbl">Godzina</label><input type="time" data-in="cel-t" data-a="godz" value="' + esc(c.godz || '') + '"></div></div>' +
    '<label class="lbl">Miejsce (opcjonalnie)</label><input type="text" data-in="cel-t" data-a="gdzie" value="' + esc(c.gdzie || '') + '" placeholder="np. salka, kościół">' +
    (window.KAL ? KAL.prepBar('slowo') : '') + '</div>';

  h += '<div class="card"><h2>Czytania</h2>';
  for (let i = 0; i < 5; i++) {
    const opts = i === 0 ? [] : cats[i - 1];
    h += '<div class="slot"><div class="num">' + READ_LABELS[i] + '</div><div class="body">' +
      '<label class="lbl">' + READ_DESC[i] + (opts.length ? ' · ' + opts.length + ' na liście' : '') + '</label>' +
      '<div class="inp"><textarea rows="1" data-in="reading" data-a="' + i + '">' + esc(c.readings[i]) + '</textarea>' +
      (opts.length ? '<button data-act="read-menu" data-a="' + i + '">▾</button>' : '') + '</div></div>' +
      '<div class="pg"><label class="lbl">str.</label><input type="text" inputmode="numeric" data-in="page" data-a="' + i + '" value="' + esc(c.pages[i]) + '"></div></div>';
  }
  h += '<div class="muted">▾ wybiera z listy („+” dopisuje kolejne czytanie); pole można też edytować ręcznie.</div>' +
    '<button class="btn ghost full mt" data-act="rozw-open">🔎 Szukaj rozważań do wstępów</button></div>';

  h += '<div class="card"><h2>Kto wprowadza</h2>';
  {
    for (let i = 0; i < 5; i++) {
      h += '<div class="who"><span class="n">' + READ_LABELS[i] + '</span><span class="t" id="whoT' + i + '">' +
        esc(c.readings[i] || READ_DESC[i]) + '</span>' + (c.readings[i] ? bibleBtn(c.readings[i]) : '') + personSelect(c.who[i], 'who', i) + pinBtn(c.locked[i] && c.who[i], 'lock-who', i) + '</div>';
    }
    h += '<div class="muted mt">Wybrana ręcznie osoba (chętny) zostaje 🔒 – „Losuj” uzupełnia tylko wolne miejsca.</div>' +
      drawBtn('draw-who', '↻ Losuj', S.obecni.length > 0) +
      (S.obecni.length ? '' : '<div class="muted mt">Zaznacz obecnych braci w zakładce „Czytania”.</div>');
  }
  h += '</div>';

  h += '<div class="card"><h2><span class="grow">Pieśni</span><button class="btn text act" data-act="spiewnik-open">Szukaj w śpiewniku</button></h2>' + SONG_LABELS.map((l, i) =>
    '<div class="song" data-act="song" data-a="' + i + '"><label class="lbl" style="margin:0">' + l + '</label>' +
    '<div class="v' + (c.songs[i] ? '' : ' empty') + '">' + (c.songs[i] ? esc(c.songs[i]) : 'dotknij, aby wybrać') + '</div></div>').join('') + '</div>';


  h += '<div class="card"><h2>Wyślij i zapisz</h2><button class="btn full" data-act="share">⇪ Udostępnij (WhatsApp / SMS)</button>' +
    '<button class="btn ghost full mt" data-act="sms-all">✉ Podsumowanie SMS (obecni / nieobecni)</button>' +
    '<button class="btn ghost full mt" data-act="finish"' + (S.haslo ? '' : ' disabled') + '>✓ Dodaj do archiwum</button>' +
    '<button class="btn text full mt" data-act="reset">Nowe przygotowanie (wyczyść układ)</button></div>';
  return h;
}

/* ===== WIĘCEJ ===== */

/** Podkategoria ustawień – rozwijana belka z kartami w środku. */
function setGrp(id, ic, title, sub, inner) {
  const o = UI.setGrp === id;
  return '<div class="grp' + (o ? ' open' : '') + '"><button class="grph" data-act="set-grp" data-a="' + id + '"><span class="gi">' + icon(ic) + '</span><span class="grow"><b>' + title + '</b><br><span class="muted">' + sub + '</span></span><span class="chev' + (o ? ' down' : '') + '"></span></button>' +
    (o ? '<div class="grpb">' + inner + '</div>' : '') + '</div>';
}
function viewWiecej() {
  const og = '<div class="grpin"><div class="row"><span class="grow">' +
    (S.owner ? 'Jestem: <b>' + esc(S.owner) + '</b>' : 'Nie ustawiono') + '</span>' +
    '<button class="btn ghost" data-act="owner-change">Zmień</button></div>' +
    '<label class="row mt"><span class="grow">Wyszukiwanie bez polskich znaków</span><input type="checkbox" data-ch="ignoreDiacritics"' + (S.ignoreDiacritics ? ' checked' : '') + '></label>' +
    (window.KAL && KAL.remSettings ? KAL.remSettings() : '') + '</div>';
  let h = setGrp('og', 'set_og', 'Ogólne', 'kim jestem, wyszukiwanie, przypomnienia, sprawdź stan', og.replace(/<\/div>$/, '') + '<label class="row chk mt"><input type="checkbox" data-ch="tut-arm"' + (!S.welcomed ? ' checked' : '') + '><span class="grow">Uruchom samouczek przy następnym otwarciu<br><span class="muted">Ekrany powitalne i chmurki pokażą się od nowa – dane zostają.</span></span></label>' +
    '<button class="btn ghost full mt" data-act="stan">🩺 Sprawdź stan</button><div class="muted">Czy podłączone są śpiewnik i słownik, hasła, konto, arkusz i kiedy była ostatnia synchronizacja.</div></div>');

  const hid = S.hiddenTiles || {};
  const wyg = '<div class="card"><h2>Ekrany na stronie startowej</h2>' +
    '<label class="lbl">Układ kafelków</label><div class="chips">' + [['0', 'Z podpisami'], ['3', 'Same ikony · 3'], ['4', 'Same ikony · 4'], ['5', 'Same ikony · 5']].map(x =>
      '<button class="chip' + ((S.tilesMin ? String(S.tilesCols || 4) : '0') === x[0] ? ' on' : '') + '" data-act="tiles-cols" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    '<label class="row mt"><span class="grow">Licznik od ostatniej liturgii pokutnej</span><input type="checkbox" data-ch="pok-show"' + (S.pokShow !== false ? ' checked' : '') + '></label>' +
    '<div class="muted mt">✓ – widoczny na Starcie. Kolejność: przeciągnij za ⠿ albo ▲▼. „Otwórz” działa zawsze.</div><div data-dlist="tiles">' +
    tilesOrdered().map((t, i, all) => '<div class="row chk tord" data-did="' + t[0] + '"><span class="dh" aria-label="Przeciągnij">⠿</span><label class="row grow"><input type="checkbox" data-ch="tile-vis" data-a="' + t[0] + '"' + (hid[t[0]] ? '' : ' checked') + '><span class="grow">' + t[1] + '</span></label>' +
      '<button class="icon mv" data-act="tile-mv" data-a="' + t[0] + '" data-b="-1"' + (i ? '' : ' disabled') + '>▲</button><button class="icon mv" data-act="tile-mv" data-a="' + t[0] + '" data-b="1"' + (i < all.length - 1 ? '' : ' disabled') + '>▼</button>' +
      '<button class="btn text sm" data-act="' + (TILE_ACT[t[0]] || 'tab') + '" data-a="' + t[0] + '">Otwórz ›</button></div>').join('') + '</div>' +
    '<button class="btn text full" data-act="tile-reset">Przywróć domyślną kolejność</button></div>' +
    '<div class="card"><h2>Tekst i kolory</h2><label class="lbl">Wielkość tekstu</label><div class="chips">' +
    [[0.8, 'Bardzo mała'], [0.9, 'Mniejsza'], [1, 'Normalna'], [1.15, 'Większa'], [1.3, 'Duża'], [1.5, 'Bardzo duża']].map(t =>
      '<button class="chip' + ((S.fontScale || 1) === t[0] ? ' on' : '') + '" data-act="font" data-a="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
    '<label class="lbl mt">Imiona w aplikacji (na tym urządzeniu)</label><div class="chips">' +
    [['short', 'Imię i inicjał (Kasia Sz.)'], ['full', 'Pełne imię i nazwisko']].map(t =>
      '<button class="chip' + (nameMode() === t[0] ? ' on' : '') + '" data-act="imiona" data-a="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
    '<div class="muted">Lista „Wspólnota” zawsze pokazuje pełne imiona i nazwiska, powitanie – samo imię.</div>' +
    '<label class="lbl mt">Jasność (motyw)</label><div class="chips">' +
    [['auto', 'Jak w telefonie'], ['jasny', 'Jasny'], ['ciemny', 'Ciemny'], ['cb', 'Czarno-biały'], ['bc', 'Biało-czarny']].map(t =>
      '<button class="chip' + (S.theme === t[0] ? ' on' : '') + '" data-act="theme" data-a="' + t[0] + '">' + t[1] + '</button>').join('') + '</div></div>' +
    (window.WYG ? WYG.card() : '');

  const zr = pdfCard('songbook') + pdfCard('slownik') +
    '<div class="card"><h2>Muzyka – nagrania pieśni (Google Drive)</h2>' +
    '<div class="muted">Foldery udostępnione „Każdy z linkiem”. Nazwa pliku: numer pieśni ze śpiewnika lub tytuł (np. „145 Abba Ojcze.mp3”).</div>' +
    '<label class="lbl">Folder – pieśni oryginalne</label><input type="url" id="drvOrg" value="' + esc(S.drive.org) + '" placeholder="https://drive.google.com/drive/folders/…">' +
    '<label class="lbl">Folder – pieśni po polsku</label><input type="url" id="drvPl" value="' + esc(S.drive.pl) + '" placeholder="https://drive.google.com/drive/folders/…">' +
    '<button class="btn full mt" data-act="drv-audio">Zapisz i odśwież listę nagrań</button>' +
    '<div class="muted mt">' + esc(UI.audioMsg || ((S.audio.org || []).length + (S.audio.pl || []).length ? 'Nagrań: oryginał ' + S.audio.org.length + ', po polsku ' + S.audio.pl.length + '.' : '')) + '</div></div>' +
    '<div class="card"><h2>Własne tematy do Słownika</h2><div class="muted">Tematy (hasła) spoza Słownika – czytania wpisujesz ręcznie w „Liturgii Słowa”.</div>' +
    S.extraHasla.map(x => '<div class="row" style="border-bottom:1px solid var(--line)"><span class="grow">' + esc(x) + '</span>' +
      '<button class="icon" data-act="haslo-del" data-a="' + esc(x) + '">🗑</button></div>').join('') +
    '<div class="row mt"><input type="text" id="newHaslo" placeholder="Nowy temat" class="grow"><button class="btn" data-act="haslo-add">+</button></div></div>' +
    '<div class="card"><h2>Linki</h2>' +
    LINKS.map(l => '<a class="link" data-act="link" data-a="' + esc(l[1]) + '">' + esc(l[0]) + ' ↗</a>').join('') +
    (S.spiewnikUrl ? '<a class="link" data-act="link" data-a="' + esc(S.spiewnikUrl) + '">Śpiewnik ↗</a>' : '') +
    '<label class="lbl">Link do Śpiewnika</label><div class="row"><input type="url" id="spiewnik" class="grow" value="' + esc(S.spiewnikUrl) + '">' +
    '<button class="btn text" data-act="spiewnik">Zapisz</button></div></div>';

  const bez = (window.KONTO ? KONTO.card() : '') +
    '<div class="card"><h2>Synchronizacja z Arkuszem</h2>' +
    '<div class="muted">Najprościej: w arkuszu menu „Przygotowanie → Kod połączenia (QR)” i zeskanuj go niżej w „Wspólne przygotowanie”. Albo wpisz ręcznie:</div>' +
    '<label class="lbl">Adres Web App (…/exec)</label><input type="url" id="syncUrl" value="' + esc(S.syncUrl) + '">' +
    '<label class="lbl">Token</label><input type="password" id="syncToken" value="' + esc(S.syncToken) + '">' +
    '<label class="row mt"><span class="grow">Lista braci z arkusza</span><input type="checkbox" data-ch="braciaZArkusza"' + (S.braciaZArkusza ? ' checked' : '') + '></label>' +
    '<div class="row mt"><button class="btn grow" data-act="sync"' + (UI.syncing ? ' disabled' : '') + '>↻ Synchronizuj</button>' +
    '<button class="btn ghost" data-act="sync-push"' + (UI.syncing ? ' disabled' : '') + '>Wyślij braci</button></div>' +
    (UI.syncStatus ? '<div class="muted mt">' + esc(UI.syncStatus) + '</div>' : '') +
    (S.lastSync ? '<div class="muted">Ostatnia synchronizacja: ' + new Date(S.lastSync).toLocaleString('pl-PL') + '</div>' : '') + '</div>' + wsCard() +
    '<div class="card"><h2>Kopia danych</h2>' +
    '<div class="muted">Kopia: bracia, przerobione tematy, historia, własne tematy i bieżące przygotowanie.</div>' +
    '<div class="row mt"><button class="btn ghost grow" data-act="export">Eksport</button><button class="btn ghost grow" data-act="import">Uzupełnij z kopii</button></div>' +
    '<button class="btn ghost full mt" data-act="pack">🎁 Pakiet startowy dla innej osoby</button><div class="muted">Wybierasz, co przekazać (wspólnota, kalendarz, archiwum…) – druga osoba wczyta to przyciskiem „Uzupełnij z kopii”.</div></div>' + (A && A.desktop ? '' : kopieHtml());

  h += setGrp('wyg', 'set_wyg', 'Wygląd', 'ekrany startowe, wielkość tekstu, jasność, logo i tło', wyg) +
    setGrp('zr', 'set_zr', 'Źródła', 'śpiewnik, słownik, muzyka, własne tematy, linki', zr) +
    setGrp('bez', 'set_bez', 'Bezpieczeństwo i synchronizacja', 'hasło i konto, arkusz, wspólne przygotowanie, kopia', bez);

  const ver = A && A.version ? A.version() : '';
  h += setGrp('oa', 'oapp', 'O aplikacji', 'wersja, nowości, sugestie i pomoc, aktualizacje', '<div class="grpin">' +
    '<b>Trójnóg' + (ver ? ' – wersja ' + esc(ver) : '') + '</b>' +
    helpButtons() +
    '<details class="mt"><summary><b>Co nowego</b></summary>' + changesHtml() + '</details>' +
    (A && A.web ? '<div class="muted mt">Wersja na iPhone\'a aktualizuje się sama przy uruchomieniu (z internetem).</div>' : A && A.desktop ? deskUpdHtml() :
    '<label class="lbl">Folder z aktualizacjami (Google Drive)</label><input type="url" id="drvApk" value="' + esc(S.drive.apk) + '" placeholder="https://drive.google.com/drive/folders/…">' +
    '<button class="btn ghost full mt" data-act="upd-check">⟳ Sprawdź aktualizacje</button>' +
    (UI.upd ? '<div class="muted mt">' + esc(UI.upd) + '</div>' : '') +
    (UI.updFile ? '<button class="btn full mt" data-act="upd-get">⇩ Pobierz ' + esc(UI.updFile.n) + '</button><div class="muted">Po pobraniu otwórz plik i zainstaluj – dane zostają.</div>' : '')) +
    '<p>Pomoc we wspólnotowym przygotowaniu celebracji Słowa: wybór tematu ze Słownika Teologii Biblijnej, rozdział czytań między obecnych braci, układ celebracji, pieśni i przydziały.</p>' +
    '<div class="notice">Aplikacja nie jest oficjalnym programem Drogi Neokatechumenalnej.</div>' +
    '<p><b>Alan Solutions</b><a class="link" data-act="link" data-a="mailto:' + CONTACT + '">' + CONTACT + '</a></p></div>');
  return h;
}

/** Notatnik: prywatne zapiski – tylko na tym telefonie (nie idą do arkusza ani do „Mojego konta”). */
function notes() {
  if (!Array.isArray(S.notatki)) S.notatki = [];
  // dawne zapiski z Archiwum (8.4) → prywatny notatnik; z arkusza znikają
  const old = S.history.filter(e => e.tryb === 'Zapisek');
  if (old.length) {
    old.forEach(e => { S.notatki.unshift({ id: e.id, tytul: e.haslo, data: e.date, tekst: e.tekst || '', ts: e.ts || Date.now() }); S.deletedHistory.push(e.id); });
    S.history = S.history.filter(e => e.tryb !== 'Zapisek'); save();
  }
  return S.notatki;
}
const noteText = n => n.tytul + ' (' + plDate(n.data) + ')\n\n' + n.tekst;
function viewNotatnik() {
  const list = notes(), ed = UI.noteEd ? list.find(n => n.id === UI.noteEd) : null;
  const d = ed || UI.note || (UI.note = { tytul: '', tekst: '', data: today() });
  return '<div class="notice priv"><b>Prywatne</b> – zapiski są tylko na tym telefonie. Nie trafiają do arkusza ani do wspólnoty.</div>' +
    '<div class="card"><h2>' + (ed ? 'Edycja zapisku' : 'Nowy zapisek') + '</h2>' +
    '<label class="lbl">Tytuł</label><input type="text" data-in="note" data-a="tytul" value="' + esc(d.tytul) + '" placeholder="' + esc(S.haslo || 'np. Przygotowanie u Nowaków') + '">' +
    '<label class="lbl">Data</label><input type="date" data-in="note" data-a="data" value="' + esc(d.data) + '">' +
    '<label class="lbl">Zapisek</label><textarea rows="7" data-in="note" data-a="tekst" placeholder="Myśli ze Słowa, ustalenia, kto co przygotowuje…">' + esc(d.tekst) + '</textarea>' +
    (ed ? '<div class="row mt"><button class="btn grow" data-act="note-done">Gotowe</button><button class="btn text" data-act="note-del">Usuń</button></div>' +
        '<div class="row mt"><button class="btn ghost grow" data-act="note-keep">Wyślij do Google Keep</button><button class="btn ghost grow" data-act="note-txt">Zapisz jako .txt</button></div>'
      : '<button class="btn full mt" data-act="note-add">＋ Zapisz w notatniku</button>') + '</div>' +
    '<div class="card"><h2>Moje zapiski (' + list.length + ')</h2>' + (list.length ? list.map(n => '<div class="hist" data-act="note-edit" data-a="' + esc(n.id) + '"><div class="h">' + esc(n.tytul) + '</div>' +
      '<div class="muted">' + plDate(n.data) + ' · ' + esc(String(n.tekst).slice(0, 60)) + (String(n.tekst).length > 60 ? '…' : '') + '</div></div>').join('') +
      '<button class="btn ghost full mt" data-act="note-txt-all">Zapisz wszystkie jako .txt</button>' : '<div class="muted">Jeszcze nic – pierwszy zapisek dodasz wyżej.</div>') + '</div>';
}
function viewArchiwum() {
  let h = '';
  const ra = window.RZ ? RZ.archived() : [];
  if (ra.length) h += '<div class="card"><h2>Przygotowania – rozpiski (' + ra.length + ')</h2>' + ra.map(x => '<button class="mojerow" data-act="moje-rz" data-a="' + esc(x.k) + '"><span class="mjd">' +
      (x.od ? plDate(x.od).slice(0, 5) + (x.doD && x.doD !== x.od ? '–' + plDate(x.doD).slice(0, 5) : '') + '<br><small>' + x.od.slice(0, 4) + '</small>' : '—') + '</span><span class="grow"><b>' + esc(x.tytul) + '</b><br><span class="muted">' +
      x.n + ' bloków · odbyło się</span></span><span class="chev"></span></button>').join('') + '</div>';
  h += '<div class="card"><h2>Archiwum (' + S.history.length + ')</h2>' +
    (S.history.length ? '' : '<div class="muted">Puste. Dodajesz przyciskiem „Dodaj do archiwum” w Liturgii Słowa lub w Eucharystii.</div>') +
    S.history.map(e => {
      const open = UI.openHist === e.id;
      let x = '<div class="hist"><div class="row"><div class="grow" data-act="hist-toggle" data-a="' + esc(e.id) + '">' +
        '<div class="h">' + esc(e.haslo) + '</div><div class="muted">' + plDate(e.date) + (e.prowadzil ? ' · prowadził(a): ' + esc(e.prowadzil) : '') + (e.tryb ? ' · ' + esc(e.tryb) : '') + '</div></div>' +
        (open ? '<button class="icon" data-act="hist-del" data-a="' + esc(e.id) + '">🗑</button>' : '') + '</div>';
      if (open) {
        x += '<div class="det">' + (e.tekst ? '<div class="note-t">' + esc(e.tekst).replace(/\n/g, '<br>') + '</div>' : '') + (e.czytania || []).map((r, i) => r ? '<div>' + READ_LABELS[i] + '. ' + esc(r) +
          ((e.przydzialy || [])[i] ? ' – ' + esc(e.przydzialy[i]) : '') + '</div>' : '').join('') +
          (e.piesni || []).map((s, i) => s ? '<div class="muted">' + SONG_LABELS[i] + ': ' + esc(s) + '</div>' : '').join('') +
          Object.keys(e.ogolne || {}).map(k => e.ogolne[k] ? '<div class="muted">' + esc(k) + ': ' + esc(e.ogolne[k]) + '</div>' : '').join('') +
          '</div>';
      }
      return x + '</div>';
    }).join('') + '</div>';

  return h;
}

/* ===== EUCHARYSTIA ===== */

function viewEucharystia() {
  const e = S.eucharystia, ob = e.obecni;
  const all = ob.length >= aktywni().length && ob.length > 0;
  let h = '<div class="card"><h2>Termin</h2><div class="row">' +
    '<div class="grow"><label class="lbl">Data</label><input type="date" data-in="eu-data" value="' + esc(e.data) + '"></div>' +
    '<div class="grow"><label class="lbl">Godzina Eucharystii</label><input type="time" data-in="eu-t" data-a="godzEu" value="' + esc(e.godzEu || '') + '"></div>' +
    '<div class="grow"><label class="lbl">Zbiórka</label><input type="time" data-in="eu-godz" value="' + esc(e.godzina) + '"></div>' +
    '</div>' +
    '<label class="lbl">Miejsce (opcjonalnie)</label><input type="text" data-in="eu-t" data-a="gdzie" value="' + esc(e.gdzie || '') + '" placeholder="np. kościół, kaplica">' +
    (window.KAL ? KAL.prepBar('eucharystia') : '') +
    '<label class="row mt"><input type="checkbox" data-ch="eu-wig"' + (e.wigilia ? ' checked' : '') + '><span class="grow">Wigilia (czytania z następnego dnia)</span></label>' +
    euReadingsHtml() + '</div>';
  h += '<div class="card"><h2>Kto losuje</h2>' +
    (S.bracia.length ? '' : '<div class="muted">Dodaj osoby w zakładce „Wspólnota”.</div>') +
    '<div class="chips">' + aktywni().map(b =>
      '<button class="chip' + (ob.indexOf(b) >= 0 ? ' on' : '') + '" data-act="eu-present" data-a="' + esc(b) + '">' + dot(b) + esc(b) + '</button>').join('') + '</div>' + (window.KAL ? KAL.groupChips('eu') : '') + '<div>' +
    '</div><div class="row mt"><span class="grow muted">Losowanie tylko spośród zaznaczonych (' + ob.length + ').</span><button class="btn ghost sm" data-act="eu-all">' + (all ? 'Odznacz wszystkich' : '✓ Zaznacz wszystkich') + '</button></div></div>';
  euAutoFetch();
  const sig = euSig();
  h += '<div class="card"><h2>Funkcje</h2>' + EU_ROLES.map(r =>
    '<div class="who"><span class="t">' + r + (sig[r] ? '<br><span class="muted sig">' + esc(sig[r]) + '</span>' : '') + '</span>' + personSelect(e.who[r] || '', 'eu-who', r, ob.length ? ob : S.bracia) +
    pinBtn(e.locked[r] && e.who[r], 'lock-eu', r) + '</div>').join('') +
    '<div class="muted mt">Najpierw wybierz chętnych (🔒), potem „Losuj” rozdzieli resztę.</div>' +
    drawBtn('eu-draw', '↻ Losuj', ob.length > 0) +
    (ob.length && ob.length < EU_ROLES.length ? '<div class="muted mt">Osób mniej niż funkcji – część osób dostanie dwie funkcje.</div>' : '') +
    '</div>';
  h += '<div class="card"><h2>Śpiewy</h2>' + EU_SONGS.map((l, i) =>
    '<div class="song" data-act="eu-song" data-a="' + i + '"><label class="lbl" style="margin:0">' + l + '</label>' +
    '<div class="v' + (e.songs[i] ? '' : ' empty') + '">' + (e.songs[i] ? esc(e.songs[i]) : 'dotknij, aby wybrać') + '</div></div>').join('') + '</div>';
  h += '<div class="card"><h2>Wyślij i zapisz</h2><button class="btn full" data-act="eu-share">⇪ Udostępnij (WhatsApp / SMS)</button>' +
    '<button class="btn ghost full mt" data-act="eu-sms">✉ SMS (zaznaczeni / pozostali)</button>' +
    '<button class="btn ghost full mt" data-act="eu-archive">✓ Dodaj do archiwum</button>' +
    '<button class="btn ghost full mt" data-act="bread">🍞 Przepis na chleb</button>' +
    '<button class="btn text full mt" data-act="eu-reset">Wyczyść</button></div>';
  return h;
}

function euShareText() {
  const e = S.eucharystia, sig = euSig();
  const lines = ['✝ Eucharystia' + (e.data ? ' – ' + plDate(e.data) : '')];
  if (e.czyt && e.czyt.day && euOk()) lines.push(e.czyt.day);
  if (e.godzEu || e.gdzie) lines.push('Eucharystia:' + (e.godzEu ? ' godz. ' + e.godzEu : '') + (e.gdzie ? ', ' + e.gdzie : ''));
  if (e.godzina) lines.push('Zbiórka: godz. ' + e.godzina);
  lines.push('');
  EU_ROLES.forEach(r => {
    lines.push(r + ': ' + (e.who[r] || '—') + (sig[r] ? ' (' + sig[r] + ')' : ''));
    if (r === 'Czytanie 1' && sig.ps) lines.push('Psalm: ' + sig.ps);
  });
  if (e.songs.some(Boolean)) { lines.push('', 'ŚPIEWY'); e.songs.forEach((x, i) => { if (x) lines.push(EU_SONGS[i] + ': ' + x); }); }
  return lines.join('\n');
}

/* ---- czytania mszalne z internetu (Evangelizo, wersja polska) ---- */

const EVZ = 'https://feed.evangelizo.org/v2/reader.php';
function euTarget() {
  const e = S.eucharystia;
  if (!e.data) return '';
  if (!e.wigilia) return e.data;
  const d = new Date(e.data + 'T12:00:00'); d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function euOk() { const e = S.eucharystia; return e.czyt && e.czyt.for === euTarget() && !e.czyt.err; }
function euSig() {
  const c = S.eucharystia.czyt;
  if (!euOk()) return {};
  return { 'Czytanie 1': c.fr || '', 'Czytanie 2': c.sr || '', 'Ewangelia': c.gsp || '', ps: c.ps || '' };
}
function httpGet(url, cb) {
  const id = uuid();
  syncCbs[id] = cb;
  if (A && A.httpGet) { A.httpGet(url, id); return; }
  fetch(url).then(r => r.text()).then(t => window.__syncCb(id, true, t)).catch(er => window.__syncCb(id, false, String(er)));
}
function cleanEvz(t) {
  return String(t || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim().replace(/[.\s]+$/, '');
}
let euLoading = '';
function fetchEuReadings(manual) {
  const tgt = euTarget();
  if (!tgt) { if (manual) toast('Najpierw wybierz datę.'); return; }
  if (euLoading === tgt) return;
  euLoading = tgt;
  const ymd = tgt.replace(/-/g, '');
  const parts = [['day', 'liturgic_t', ''], ['fr', 'reading_lt', 'FR'], ['ps', 'reading_lt', 'PS'], ['sr', 'reading_lt', 'SR'], ['gsp', 'reading_lt', 'GSP']];
  const res = { for: tgt }; let left = parts.length, fail = 0;
  parts.forEach(p => {
    httpGet(EVZ + '?date=' + ymd + '&lang=PL&type=' + p[1] + (p[2] ? '&content=' + p[2] : ''), (ok, text) => {
      if (ok) res[p[0]] = cleanEvz(text); else fail++;
      if (--left) return;
      euLoading = '';
      if (!res.fr && !res.gsp) res.err = fail ? 'brak połączenia' : 'serwer nie zwrócił czytań na ten dzień';
      if (S.eucharystia.data && euTarget() === tgt) { S.eucharystia.czyt = res; save(); }
      const ae = document.activeElement;
      if (UI.view === 'eucharystia' && (!ae || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(ae.tagName) < 0)) render();
      if (manual) toast(res.err ? 'Nie pobrano czytań: ' + res.err + '.' : 'Pobrano czytania.');
    });
  });
}
function euAutoFetch() {
  const e = S.eucharystia, tgt = euTarget();
  UI.euTried = UI.euTried || {};
  if (tgt && (!e.czyt || e.czyt.for !== tgt) && !UI.euTried[tgt]) { UI.euTried[tgt] = 1; setTimeout(() => fetchEuReadings(false), 0); }
}
function euReadingsHtml() {
  const e = S.eucharystia, tgt = euTarget();
  if (!tgt) return '<div class="muted mt">Wybierz datę – czytania mszalne pobiorą się same.</div>';
  const c = e.czyt && e.czyt.for === tgt ? e.czyt : null;
  let h = '<div class="eu-czyt mt"><div class="muted">Czytania mszalne – ' + plDate(tgt) + (e.wigilia ? ' (dzień następny)' : '') + '</div>';
  if (euLoading === tgt && !c) h += '<div class="muted">Pobieram…</div>';
  else if (!c) h += '<div class="muted">Jeszcze nie pobrano.</div>';
  else if (c.err) h += '<div class="muted">Nie pobrano: ' + esc(c.err) + '.</div>';
  else {
    if (c.day) h += '<div><b>' + esc(c.day) + '</b></div>';
    [['I czytanie', c.fr], ['Psalm', c.ps], ['II czytanie', c.sr], ['Ewangelia', c.gsp]].forEach(x => {
      if (x[1]) h += '<div class="row"><span class="grow"><span class="muted">' + x[0] + ':</span> ' + esc(x[1]) + '</span>' + bibleBtn(x[1]) + '</div>';
    });
  }
  return h + '<div class="row mt"><button class="btn ghost grow" data-act="eu-fetch">⇩ Pobierz ponownie</button>' +
    '<button class="btn ghost" data-act="eu-full">Pełne teksty ↗</button></div><div class="muted">Źródło: evangelizo.org</div></div>';
}

/* ===== MOJA SKRUTACJA ===== */

function newSkrutacja() {
  return { id: uuid(), date: today(), fragment: '', odnosniki: '', slowo: '', modlitwa: '', ts: Date.now() };
}

function viewSkrutacja() {
  const cur = S.skrutacje.find(x => x.id === UI.skr);
  if (cur) {
    const opts = S.haslo ? readings().reduce((a, c) => a.concat(c), []) : [];
    return '<div class="card"><h2><span class="grow">Skrutacja</span><button class="btn text act" data-act="skr-close">◀ Lista</button></h2>' +
      '<label class="lbl">Data</label><input type="date" data-in="skr" data-a="date" value="' + esc(cur.date) + '">' +
      '<label class="lbl">Fragment (sygnatura)</label><div class="slot"><div class="body"><div class="inp">' +
      '<textarea rows="1" data-in="skr" data-a="fragment">' + esc(cur.fragment) + '</textarea>' +
      (opts.length ? '<button data-act="skr-frag">▾</button>' : '') + '</div></div></div>' +
      '<label class="lbl">Odnośniki z marginesu, za którymi poszedłem</label><textarea rows="2" data-in="skr" data-a="odnosniki" placeholder="np. Rdz 22,2; Hbr 11,17">' + esc(cur.odnosniki) + '</textarea>' +
      '<label class="lbl">Co mówi do mnie Słowo</label><textarea rows="5" data-in="skr" data-a="slowo">' + esc(cur.slowo) + '</textarea>' +
      '<label class="lbl">Moja odpowiedź / modlitwa</label><textarea rows="3" data-in="skr" data-a="modlitwa">' + esc(cur.modlitwa) + '</textarea>' +
      '<div class="row mt"><button class="btn ghost grow" data-act="skr-share">⇪ Udostępnij</button><button class="btn text" data-act="skr-del">Usuń</button></div></div>';
  }
  return '<div class="card"><h2>Moja skrutacja</h2>' +
    '<p class="muted">Skrutacja (łac. <i>scrutatio</i> – badanie) to osobiste czytanie Pisma, w którym Pismo tłumaczy Pismo: od fragmentu idziesz za odnośnikami na marginesie Biblii (np. Jerozolimskiej) i notujesz, co Słowo mówi do Ciebie.</p>' +
    '<ol class="steps"><li>Pomódl się do Ducha Świętego.</li><li>Przeczytaj fragment powoli, kilka razy.</li>' +
    '<li>Idź za odnośnikami z marginesu – zapisz te, które Cię poruszyły.</li><li>Zapisz, co Bóg mówi do Ciebie dziś.</li><li>Odpowiedz modlitwą.</li></ol>' +
    '<button class="btn full" data-act="skr-new">+ Nowa skrutacja</button></div>' +
    (S.skrutacje.length ? '<div class="card"><h2>Moje zapiski (' + S.skrutacje.length + ')</h2>' +
      S.skrutacje.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.ts - a.ts).map(x =>
        '<div class="hist" data-act="skr-open" data-a="' + esc(x.id) + '"><div class="h">' + esc(x.fragment || '(bez fragmentu)') + '</div>' +
        '<div class="muted">' + plDate(x.date) + (x.slowo ? ' · ' + esc(x.slowo.slice(0, 70)) + (x.slowo.length > 70 ? '…' : '') : '') + '</div></div>').join('') +
      '</div>' : '') +
    '<div class="muted center">Zapiski są prywatne – zostają tylko w telefonie (i w kopii danych).</div>';
}

function skrText(x) {
  return ['Skrutacja – ' + plDate(x.date), 'Fragment: ' + (x.fragment || '—'),
    x.odnosniki ? 'Odnośniki: ' + x.odnosniki : '', x.slowo ? '\nSłowo do mnie:\n' + x.slowo : '',
    x.modlitwa ? '\nModlitwa:\n' + x.modlitwa : ''].filter(Boolean).join('\n');
}

const BREAD_HTML =
  '<p class="muted">Przepis pomocniczy – to nie jest oficjalna receptura Drogi. Kształt i proporcje ustal z katechistami i prezbiterem; wiele wspólnot ma własny, sprawdzony przepis.</p>' +
  '<h4>Wymóg liturgiczny</h4><p>Chleb do Eucharystii w obrządku łacińskim ma być <b>tylko z mąki pszennej i wody</b>, niekwaszony i świeży: bez drożdży, zakwasu, soli, oleju, miodu czy mleka (por. list okólny Kongregacji ds. Kultu Bożego z 2017 r.).</p>' +
  '<h4>Składniki (1 chleb, ok. 25–30 osób)</h4><ul><li>250 g mąki pszennej razowej (typ 1850–2000)</li><li>250 g mąki pszennej typ 650 (albo całość razowej)</li><li>ok. 280–320 ml letniej wody – dolewaj stopniowo</li></ul>' +
  '<h4>Wykonanie</h4><ol class="steps"><li>Nagrzej piekarnik do 200°C (góra–dół).</li>' +
  '<li>Do mąki dolewaj wodę i wyrabiaj 8–10 min, aż ciasto będzie gładkie, elastyczne i nie będzie się kleić.</li>' +
  '<li>Uformuj kulę i rozwałkuj placek o średnicy ok. 20–22 cm i grubości ok. 1 cm; brzegi wyrównaj (np. wzdłuż talerza).</li>' +
  '<li>Gęsto ponakłuwaj widelcem, żeby nie pękał i nie robił bąbli; możesz płytko zaznaczyć nożem krzyż / linie łamania.</li>' +
  '<li>Piecz na papierze ok. 12–15 min: ma być upieczony, ale jasny i miękki w środku, nie przypieczony.</li>' +
  '<li>Studź owinięty czystą lnianą ściereczką, żeby nie wysechł. Najlepiej piec w dniu Eucharystii.</li></ol>' +
  '<h4>Gdy coś nie wychodzi</h4><ul><li>Za twardy → krócej piecz albo zrób grubszy placek.</li><li>Kruszy się przy łamaniu → ciasto za suche, daj trochę więcej wody i dłużej wyrabiaj.</li><li>Pęcherze → więcej nakłuć widelcem.</li></ul>';

function smsUrl(nums, text) {
  if (A && A.web) return 'sms:' + nums.join(',') + '&body=' + encodeURIComponent(text);   // iPhone: inny zapis niż Android
  if (A && A.desktop) { try { navigator.clipboard.writeText(text).catch(() => {}); toast('Treść skopiowana – wklej ją w wiadomości.'); } catch (e) { /* */ } return 'sms:' + nums.join(',') + '?body=' + encodeURIComponent(text); }
  return 'smsto:' + nums.join(';') + '?body=' + encodeURIComponent(text);
}
function openUrl(u) { if (A) A.openUrl(u); else window.open(u); }

function myReadings(p) {
  const cats = readings(), who = roundRobin(cats, readingOrder());
  const byCat = cats.map((l, ci) => l.filter((ref, ri) => who[ci][ri] === p));
  return { byCat: byCat, flat: byCat.reduce((a, l) => a.concat(l), []) };
}
function mineText(p) {
  const m = myReadings(p);
  const c = S.celebration || {}, pm = window.KAL ? KAL.prepMeetText('slowo') : '';
  const kiedy = (c.data ? '\nCelebracja: ' + plDate(c.data) + (c.godz ? ', godz. ' + c.godz : '') + (c.gdzie ? ', ' + c.gdzie : '') : '') + (pm ? '\n' + pm : '');
  return pokoj() + '! ' + p + ', Twoje czytania na przygotowanie (temat: ' + S.haslo + (S.zPsalmami ? ', z Psalmami' : '') + '):' + kiedy + '\n' +
    m.byCat.map((l, i) => l.length ? CAT_LABEL[i] + ': ' + l.join('; ') : '').filter(Boolean).join('\n');
}

/* ===== WSPÓLNOTA ===== */

function viewWspolnota() {
  const act = S.wspolnoty.find(w => w.id === S.wspAktywna);
  let h = '<div class="card"><h2>Wspólnoty</h2><select data-ch="wsp-sel">' + S.wspolnoty.map(w =>
      '<option value="' + w.id + '"' + (w.id === S.wspAktywna ? ' selected' : '') + '>' + esc(w.nazwa) + (wspShared(w) ? ' ⇅' : '') + '</option>').join('') +
    (S.wspolnoty.length > 1 ? '<option value="ALL"' + (isMerged() ? ' selected' : '') + '>⊕ Wszystkie razem (okres łączony)</option>' : '') + '</select>' +
    (isMerged() ? '<div class="notice mt">Okres łączony: obecni, losowanie, SMS i przygotowanie obejmują osoby ze wszystkich wspólnot. Osoby i grupy edytujesz w poszczególnych wspólnotach.</div>' : '') +
    '<div class="row mt"><button class="btn ghost grow" data-act="wsp-new">＋ Nowa</button>' + (isMerged() ? '' : '<button class="btn ghost" data-act="wsp-ren">Nazwa</button>' +
    (S.wspolnoty.length > 1 ? '<button class="btn text" data-act="wsp-del">Usuń</button>' : '')) + '</div>' +
    (S.wspolnoty.length > 1 ? '<button class="btn ghost full mt" data-act="wsp-merge">⇢⇠ Scal dwie wspólnoty w jedną</button>' : '') +
    (loadJson('kopia_scalenie.json') ? '<button class="btn text full" data-act="wsp-unmerge">↺ Cofnij ostatnie scalenie</button>' : '') +
    '</div>';
  if (isMerged()) {
    return h + '<div class="card"><h2>Wszystkie razem (' + S.bracia.length + ')</h2>' + S.bracia.map(b => {
      const tel = S.telefony[b] || '';
      return '<div class="person-row fullnames' + (isAkt(b) ? '' : ' inact') + '"><div class="grow"><div class="pn">' + dot(b) + esc(b) + (b === S.owner ? ' <span class="muted">(Ja)</span>' : '') + roleBadges(b) + '</div><div class="muted">' + esc(tel || 'brak numeru') + '</div></div>' +
        (tel ? '<button class="icon" data-act="call" data-a="' + esc(b) + '">✆</button><button class="icon" data-act="sms" data-a="' + esc(b) + '">✉</button>' +
          '<button class="icon wa" data-act="wa" data-a="' + esc(b) + '">W</button>' : '') + '</div>';
    }).join('') + '</div>' + (window.KAL ? KAL.groupsCard(true) : '');
  }
  const kc = (act && act.katechisci) || [];
  h += '<div class="card" data-def="c"><h2>Katechiści (' + kc.length + ')</h2><div class="muted">Prowadzą wspólnotę – nie są na liście osób ani w losowaniu.</div>' +
    kc.map((k, i) => '<div class="person-row"><div class="grow"' + (roleLocked() ? '' : ' data-act="kc-edit" data-a="' + i + '"') + '><div class="pn">' + esc(k.n) + '</div>' +
      '<div class="muted">' + esc([k.tel, k.mail].filter(Boolean).join(' · ') || 'brak kontaktu') + '</div></div>' +
      (k.tel ? '<button class="icon" data-act="kc-call" data-a="' + i + '">✆</button><button class="icon" data-act="kc-sms" data-a="' + i + '">✉</button><button class="icon wa" data-act="kc-wa" data-a="' + i + '">W</button>' : '') +
      (k.mail ? '<button class="icon" data-act="kc-mail" data-a="' + i + '">@</button>' : '') + '</div>').join('') +
    (roleLocked() ? '' : '<button class="btn ghost full mt" data-act="kc-edit" data-a="-1">＋ Dodaj katechistę</button>') + '</div>';
  h += '<div class="card"><h2>Etap i region</h2><label class="lbl">Etap na Drodze</label><select data-ch="wsp-etap"' + (roleLocked() ? ' disabled' : '') + '>' +
    ETAPY.map(e => '<option' + ((act && act.etap || ETAPY[0]) === e ? ' selected' : '') + '>' + esc(e) + '</option>').join('') + '</select>' +
    '<label class="lbl">Region / diecezja</label><input type="text" list="dlDiec" data-ch="wsp-region" value="' + esc(act && act.region || '') + '" placeholder="np. diecezja ełcka"' + (roleLocked() ? ' disabled' : '') + '>' +
    '<datalist id="dlDiec">' + DIECEZJE.map(x => '<option value="' + x + '">').join('') + '</datalist>' +
    '<div class="muted mt">Informacja na stronie startowej.' + (roleLocked() ? ' Etap i region ustawia odpowiedzialny.' : '') + '</div></div>';
  h += '<div class="card"><h2>' + esc(act ? act.nazwa : 'Wspólnota') + ' (' + S.bracia.length + ')</h2>' +
    (S.bracia.length > 2 ? '<div class="sortbar"><span class="muted">↕ Sortuj:</span>' + [['f', 'Funkcje'], ['g', 'Grupy'], ['a', 'A–Z']].map(x => '<button class="chip sm" data-act="brat-sort" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' : '') +
    (S.bracia.length ? '' : '<div class="muted">Brak osób. Dodaj pierwszą poniżej.</div>') +
    ((S.grupy || []).length ? '<div class="glegend">' + S.grupy.map(g => '<button class="gl' + (UI.gFilter === g.id ? ' on' : '') + '" data-act="gfilter" data-a="' + esc(g.id) + '" style="--gc:' + grpColor(g) + '"><i></i>' + esc(g.nazwa) + ' <b>' + (g.osoby || []).filter(b => S.bracia.indexOf(b) >= 0).length + '</b></button>').join('') +
      '<button class="gl' + (UI.gFilter === 'none' ? ' on' : '') + '" data-act="gfilter" data-a="none"><i style="background:var(--line)"></i>bez grupy</button>' +
      (UI.gFilter ? '<button class="gl clr" data-act="gfilter" data-a="">✕ wszyscy</button>' : '') + '</div>' : '') +
    '<div class="plist">' + (function () { coupleGroups(); const U = personUnits(), DRAG = '<span class="pdrag" title="Przytrzymaj i przeciągnij"><svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></span>';
      const F = UI.gFilter && (UI.gFilter === 'none' || (S.grupy || []).some(x => x.id === UI.gFilter)) ? UI.gFilter : '';
      return U.map(u => {
        const g = (S.grupy || []).find(x => u.some(b => (x.osoby || []).indexOf(b) >= 0)), gc = g ? grpColor(g) : '';
        if (F && (F === 'none' ? g : !g || g.id !== F)) return '';
        return '<div class="punit' + (u.length > 1 ? ' couple' : '') + (g ? ' hasg' : '') + '" data-u="' + esc(u[0]) + '"' + (gc ? ' style="--gc:' + gc + '"' : '') + '>' +
          '<div class="pu-ic">' + (u.length > 1 ? RINGS : '') + '</div><div class="pu-rows">' + u.map((b, k) => {
          const tel = S.telefony[b] || '', ice = (S.ice || {})[b], mail = (S.maile || {})[b];
          return '<div class="person-row fullnames' + (isAkt(b) ? '' : ' inact') + '"><div class="grow" data-act="osoba-edit" data-a="' + esc(b) + '">' +
            '<div class="pn">' + dot(b) + esc(b) + (b === S.owner ? ' <span class="muted">(Ja)</span>' : '') + roleBadges(b, true) + '</div>' +
            '<div class="pmeta">' + (!isAkt(b) ? '<span class="tag">nieaktywny</span> ' : '') + '<span class="muted">' + (tel || mail ? esc([tel, mail].filter(Boolean).join(' · ')) : 'brak numeru') + '</span></div></div>' +
            '<div class="pacts">' + (tel ? '<button class="icon" data-act="call" data-a="' + esc(b) + '" title="Zadzwoń">✆</button>' +
              '<button class="icon" data-act="sms" data-a="' + esc(b) + '" title="SMS">✉</button>' +
              '<button class="icon wa" data-act="wa" data-a="' + esc(b) + '" title="WhatsApp">W</button>' : '') +
            (mail ? '<button class="icon" data-act="link" data-a="mailto:' + esc(mail) + '" title="E-mail">@</button>' : '') +
            (ice && ice.tel ? '<button class="icon ice" data-act="link" data-a="tel:' + esc(ice.tel.replace(/\s/g, '')) + '" title="Kontakt w nagłej sytuacji: ' + esc(ice.n || '') + '">SOS</button>' : '') + '</div></div>';
        }).join('') + '</div>' + (F ? '' : DRAG) + '</div>';
      }).join(''); })() + '</div>' +
    '<div class="muted">⠿ – przytrzymaj i przeciągnij, żeby zmienić kolejność (małżeństwo przesuwa się razem).</div>' +
    '<label class="lbl mt">Nowa osoba</label>' +
    '<input type="text" id="newBrat" placeholder="Imię i nazwisko (w aplikacji: Kasia Sz.)">' +
    '<div class="row mt"><input type="tel" id="newTel" class="grow" placeholder="Telefon (opcjonalnie)"><button class="btn ghost" data-act="contact" data-a="new">📇 Kontakty</button></div>' +
    '<button class="btn full mt" data-act="brat-add">+ Dodaj</button>' +
    '<button class="btn text full mt" data-act="wsp-import">📋 Wklej listę osób z arkusza (imię, telefon, grupa)</button></div>' +
    (window.KAL ? KAL.groupsCard() : '') + communityCard();
  return h;
}

/* ---------- kilka wspólnot, kolory osób ---------- */

const COLORS = ['#C0392B', '#2E86C1', '#27AE60', '#D68910', '#8E44AD', '#16A085', '#D35400', '#7F8C8D'];
function dot(b) { const i = S.kolory[b]; return i === undefined || !COLORS[i] ? '' : '<i class="pd" style="background:' + COLORS[i] + '"></i>'; }
const WSP_FIELDS = ['bracia', 'telefony', 'role', 'kolory', 'grupy'];
/** Dane aktywnej wspólnoty żyją w S.bracia/telefony/role/kolory – kopia trafia do jej wpisu na liście wspólnot. */
function storeActive() {
  const w = S.wspolnoty && S.wspolnoty.find(x => x.id === S.wspAktywna);
  if (!w) return;
  WSP_FIELDS.forEach(k => { w[k] = JSON.parse(JSON.stringify(S[k])); });
}
/** Okres łączony: wszystkie wspólnoty razem (lista tylko do odczytu – edycja w poszczególnych wspólnotach). */
function mergedCommunity() {
  const m = { bracia: [], telefony: {}, role: {}, kolory: {}, grupy: [] }, multi = S.wspolnoty.length > 1;
  S.wspolnoty.forEach(w => {
    (w.bracia || []).forEach(b => { if (m.bracia.indexOf(b) < 0) m.bracia.push(b); });
    Object.assign(m.telefony, w.telefony || {}); Object.assign(m.kolory, w.kolory || {});
    Object.keys(w.role || {}).forEach(b => { m.role[b] = Array.from(new Set((m.role[b] || []).concat(w.role[b]))); });
    (w.grupy || []).forEach(g => m.grupy.push({ id: g.id, nazwa: g.nazwa + (multi ? ' (' + w.nazwa + ')' : ''), osoby: g.osoby.slice() }));
  });
  return m;
}
function isMerged() { return S.wspAktywna === 'ALL'; }
function switchCommunity(id) {
  storeActive();
  const w = id === 'ALL' ? mergedCommunity() : S.wspolnoty.find(x => x.id === id);
  if (!w) return;
  S.wspAktywna = id;
  S.bracia = (w.bracia || []).slice(); S.telefony = Object.assign({}, w.telefony || {});
  S.role = JSON.parse(JSON.stringify(w.role || {})); S.kolory = Object.assign({}, w.kolory || {});
  S.grupy = JSON.parse(JSON.stringify(w.grupy || []));
  S.obecni = S.obecni.filter(b => S.bracia.indexOf(b) >= 0);
  S.kolejnosc = S.kolejnosc.filter(b => S.bracia.indexOf(b) >= 0);
  S.eucharystia.obecni = S.eucharystia.obecni.filter(b => S.bracia.indexOf(b) >= 0);
  Object.keys(wspLast).forEach(k => delete wspLast[k]);
  save(true);
  const cw = curW(); if (cw && wspShared(cw) && !wspSends(cw)) pullOne(cw, false);
}
window.onContactPicked = function (target, name, num) {
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  const setIfEmpty = (id, v) => { const el = document.getElementById(id); if (el && v && !el.value.trim()) el.value = v; };
  if (target === 'new') { setIfEmpty('newBrat', name.split(' ')[0]); set('newTel', num); }
  else if (target === 'edit') set('osTel', num);
  else if (target === 'smsx') { setIfEmpty('smsXName', name.split(' ')[0]); set('smsXTel', num); }
  else if (target === 'kinv') set('kinvTel', num);
  else if (target === 'katech') { setIfEmpty('kcName', name); set('kcTel', num); }
  if (!num) toast('Ten kontakt nie ma numeru.');
};

/* ---------- Google Drive: aktualizacje i nagrania pieśni (foldery udostępnione „każdy z linkiem”) ---------- */

function driveId(u) {
  u = String(u || '').trim();
  const m = u.match(/folders\/([\w-]{10,})/) || u.match(/[?&]id=([\w-]{10,})/) || u.match(/^([\w-]{20,})$/);
  return m ? m[1] : '';
}
function unent(t) { return String(t).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(); }
/** Lista plików publicznego folderu (strona embeddedfolderview) → [{id, n}] */
function listDrive(url, cb) {
  const id = driveId(url);
  if (!id) { cb(null, 'nieprawidłowy adres folderu'); return; }
  httpGet('https://drive.google.com/embeddedfolderview?id=' + id, (ok, html) => {
    if (!ok) { cb(null, 'brak połączenia (' + html + ')'); return; }
    const out = [], re = /id="entry-([\w-]+)"[\s\S]*?class="flip-entry-title"[^>]*>([^<]+)</g;
    let m;
    while ((m = re.exec(html))) out.push({ id: m[1], n: unent(m[2]) });
    cb(out, out.length ? '' : 'folder pusty albo nieudostępniony (ustaw „Każdy z linkiem”)');
  });
}
function verNum(s) { const m = String(s).match(/(\d+(?:\.\d+)+)/); return m ? m[1].split('.').map(Number) : null; }
function verCmp(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; }
/** Komputer: aktualizacje z folderu na dysku (np. synchronizowanego z Google Drive). */
function deskUpdHtml() {
  const d = A.updDir();
  return '<label class="lbl">Folder z aktualizacjami (na tym komputerze)</label>' +
    '<div class="row"><input id="deskUpd" value="' + esc(d) + '" placeholder="np. G:\\Mój dysk\\Trójnóg" class="grow"><button class="btn ghost" data-act="dupd-pick">Wybierz…</button></div>' +
    '<div class="muted">Wrzucaj tam plik Trojnog-Setup-X.Y.exe – program sam go zauważy przy starcie.</div>' +
    '<button class="btn ghost full mt" data-act="dupd-check">⟳ Sprawdź aktualizacje</button>' +
    (UI.upd ? '<div class="muted mt">' + esc(UI.upd) + '</div>' : '') +
    (UI.dupd ? '<button class="btn full mt" data-act="dupd-inst">⇩ Zainstaluj wersję ' + esc(UI.dupd) + '</button><div class="muted">Program zamknie się, zaktualizuje i uruchomi ponownie – dane zostają.</div>' : '');
}
window.onDeskUpdate = function (u) { UI.upd = u.msg; UI.dupd = u.v || ''; toast('Jest nowa wersja Trójnoga: ' + u.v + ' (Ustawienia → O aplikacji).'); };
function checkUpdate() {
  if (A && A.desktop) {
    const el = document.getElementById('deskUpd'); if (el) A.setUpdDir(el.value);
    UI.upd = 'Sprawdzam…'; render();
    A.checkUpdate().then(u => { UI.upd = u.msg; UI.dupd = u.v || ''; render(); });
    return;
  }
  if (!S.drive.apk) { toast('Wpisz adres folderu z aktualizacjami.'); return; }
  UI.upd = 'Sprawdzam…'; render();
  listDrive(S.drive.apk, (files, err) => {
    if (!files) { UI.upd = 'Nie sprawdzono: ' + err + '.'; render(); return; }
    let best = null;
    files.filter(f => /\.apk$/i.test(f.n) && verNum(f.n)).forEach(f => { if (!best || verCmp(verNum(f.n), verNum(best.n)) > 0) best = f; });
    if (!best) { UI.upd = 'Brak plików .apk z numerem wersji w nazwie (np. Trojnog-7.6.apk).'; UI.updFile = null; render(); return; }
    const cur = verNum(A && A.version ? A.version() : '0.0') || [0];
    if (verCmp(verNum(best.n), cur) > 0) { UI.upd = 'Jest nowsza wersja: ' + best.n; UI.updFile = best; }
    else { UI.upd = 'Masz najnowszą wersję (' + best.n + ' w folderze).'; UI.updFile = null; }
    render();
  });
}
function refreshAudio(manual) {
  const kinds = ['org', 'pl'].filter(k => S.drive[k]);
  if (!kinds.length) { if (manual) toast('Wpisz adresy folderów z nagraniami.'); return; }
  let left = kinds.length; const msgs = [];
  if (manual) { UI.audioMsg = 'Pobieram listę nagrań…'; render(); }
  kinds.forEach(k => listDrive(S.drive[k], (files, err) => {
    if (files) S.audio[k] = files.filter(f => /\.(mp3|m4a|aac|ogg|opus|wav|flac|wma|amr|3gp)$/i.test(f.n) || !/\.\w{2,4}$/.test(f.n));
    msgs.push((k === 'org' ? 'Oryginał' : 'Po polsku') + ': ' + (files ? S.audio[k].length + ' nagrań' : err));
    if (--left) return;
    S.audio.ts = Date.now(); save(true);
    UI.audioMsg = msgs.join(' · ');
    if (UI.view === 'wiecej') render();
  }));
}
function simp(t) { return String(t || '').toLowerCase().replace(/[ąćęłńóśźż]/g, c => PL[c]).replace(/\.[a-z0-9]{2,4}$/, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
/** Nagranie pasujące do pieśni: nazwa pliku zaczyna się numerem pieśni albo zawiera jej tytuł. */
function audioFor(p, kind) {
  if (!p) return null;
  const list = S.audio[kind] || [], t = simp(p.t), n = String(p.n || '');
  return list.find(f => { const s = simp(f.n); return n && (s === n || s.indexOf(n + ' ') === 0); }) ||
    (t.length >= 4 ? list.find(f => simp(f.n).indexOf(t) >= 0) : null) || null;
}
function playAudio(f, label) {
  const bar = document.getElementById('pvaudio') || document.getElementById('audiobar');
  const html = '<div class="aud"><span class="grow">♪ ' + esc(label) + '</span>' +
    '<button class="pvb" data-act="aud-drive" data-a="' + f.id + '">↗ Drive</button><button class="pvb" data-act="aud-stop">✕</button></div>' +
    '<audio id="aud" controls autoplay src="https://drive.google.com/uc?export=download&id=' + f.id + '"></audio>';
  if (bar) { bar.innerHTML = html; bar.classList.remove('hidden'); }
  const au = document.getElementById('aud');
  if (au) au.onerror = () => toast('Nie udało się odtworzyć w aplikacji – użyj „↗ Drive”.');
}

/* ---------- role we wspólnocie + lista od odpowiedzialnego ---------- */

const ROLE_LIST = ['Odpowiedzialny', 'Drugi odpowiedzialny', 'Współodpowiedzialny', 'Kantor główny', 'Kantor', 'Didaskal', 'Ostiariusz'];
const ROLE_SHORT = { 'Odpowiedzialny': 'Odpowiedzialny', 'Drugi odpowiedzialny': '2. odpowiedzialny', 'Współodpowiedzialny': 'Współodp.', 'Kantor główny': 'Kantor gł.', 'Kantor': 'Kantor', 'Didaskal': 'Didaskal', 'Ostiariusz': 'Ostiariusz' };
/** Stare role (do 10.8): „Kantor” = główny, „Drugi kantor” = zwykły kantor. */
function roleMigrate(role) {
  Object.keys(role || {}).forEach(b => { role[b] = (role[b] || []).map(r => r === 'Kantor' ? 'Kantor główny' : r === 'Drugi kantor' ? 'Kantor' : r); });
  return role;
}
/* ---------- sortowanie listy: funkcyjni, małżeństwa, single, zawieszeni; po nazwisku ---------- */
const surname = n => { const w = String(n).trim().split(/\s+/); return (w.length > 1 ? w[w.length - 1] + ' ' + w.slice(0, -1).join(' ') : w[0]).toLocaleLowerCase('pl-PL'); };
/** Ważność funkcji: Odpowiedzialny (0) … Ostiariusz; bez funkcji – 99. */
const roleRank = b => rolesOf(b).reduce((m, r) => Math.min(m, ROLE_LIST.indexOf(r)), 99);
/** Sortowanie: 'f' – funkcje (od odpowiedzialnego), małżeństwa, single, zawieszeni; 'g' – grupami (w grupie tak samo); 'a' – alfabetycznie. Zawsze po nazwisku. */
function sortPeople(how) {
  const U = personUnits(), uRole = u => Math.min.apply(null, u.map(roleRank));
  const rank = u => u.every(b => !isAkt(b)) ? 3 : uRole(u) < 99 ? 0 : u.length > 1 ? 1 : 2;
  const alpha = (a, b) => surname(a[0]).localeCompare(surname(b[0]), 'pl');
  const gIdx = u => { const gs = S.grupy || []; const i = gs.findIndex(g => u.some(b => (g.osoby || []).indexOf(b) >= 0)); return i < 0 ? 1e3 : i; };
  const gOrder = (S.grupy || []).map((g, i) => i).sort((a, b) => S.grupy[a].nazwa.localeCompare(S.grupy[b].nazwa, 'pl', { numeric: true }));
  U.forEach(u => u.sort((a, b) => roleRank(a) - roleRank(b) || surname(a).localeCompare(surname(b), 'pl')));
  const byFun = (a, b) => rank(a) - rank(b) || (rank(a) === 0 ? uRole(a) - uRole(b) : 0) || alpha(a, b);
  if (how === 'a') U.sort((a, b) => (rank(a) === 3) - (rank(b) === 3) || alpha(a, b));
  else if (how === 'g') U.sort((a, b) => (rank(a) === 3) - (rank(b) === 3) || (gOrder.indexOf(gIdx(a)) + (gIdx(a) === 1e3 ? 1e3 : 0)) - (gOrder.indexOf(gIdx(b)) + (gIdx(b) === 1e3 ? 1e3 : 0)) || byFun(a, b));
  else U.sort(byFun);
  S.bracia = [].concat.apply([], U);
}
function rolesOf(b) { return (S.role[b] || []).filter(r => ROLE_LIST.indexOf(r) >= 0); }
function roleBadges(b, noGroups) { return rolesOf(b).map(r => ' <span class="rb">' + ROLE_SHORT[r] + '</span>').join('') + (noGroups ? '' : groupBadges(b)); }
/* ---------- małżeństwa: para w aktywnej wspólnocie (w.malz = {osoba: współmałżonek}) ---------- */
function malzMap() { const w = curW(); if (!w) return {}; w.malz = w.malz || {}; return w.malz; }
function spouse(b) { const m = curW() ? (curW().malz || {}) : {}, x = m[b]; return x && S.bracia.indexOf(x) >= 0 ? x : ''; }
function setSpouse(b, x) {
  const m = malzMap();
  if (m[b]) delete m[m[b]]; delete m[b];
  if (x) { if (m[x]) delete m[m[x]]; m[b] = x; m[x] = b; }
}
/** Lista wspólnoty w „jednostkach”: małżeństwo razem (w miejscu pierwszej z osób). */
function personUnits() {
  const done = new Set(), out = [];
  S.bracia.forEach(b => { if (done.has(b)) return; const sp = spouse(b); done.add(b); if (sp && !done.has(sp)) { done.add(sp); out.push([b, sp]); } else out.push([b]); });
  return out;
}
/** Zmiana terminu przygotowania → połączone wydarzenie w kalendarzu też się zmienia (po chwili, nie przy każdej literze). */
let prepCalT = null;
function prepCalSoon(v) { clearTimeout(prepCalT); prepCalT = setTimeout(() => { if (window.KAL) KAL.prepToCal(v, false); }, 1500); }
/** Grupy do wyboru w wiadomości: z wybranych wspólnot (moja grupa pierwsza). */
function msgGroups(m) {
  const ids = m && m.what === 'msg' && m.ws && m.ws.length ? m.ws : [S.wspAktywna];
  const out = []; ids.forEach(id => (wspData(id).grupy || []).forEach(g => { if ((g.osoby || []).length) out.push(g); }));
  return out.sort((x, y) => (y.osoby.indexOf(S.owner) >= 0) - (x.osoby.indexOf(S.owner) >= 0));
}
/** Grupy osoby na liście wspólnoty. */
const RINGS = '<svg class="rings" viewBox="0 0 24 24" aria-label="małżeństwo"><circle cx="9" cy="13.5" r="5.5"/><circle cx="15" cy="10.5" r="5.5"/><path d="M13.6 2.6l1.4 1.6 1.4-1.6" /></svg>';
const GRP_COLORS = ['#C0392B', '#2E7D32', '#1565C0', '#8E44AD', '#D4A72C', '#00838F', '#E67E22', '#6D4C41'];
/** Kolor grupy: wg kolejności grup we wspólnocie (Grupa 1 – czerwony, 2 – zielony…). */
function grpColor(g) { const i = (S.grupy || []).indexOf(g); return GRP_COLORS[(i < 0 ? 0 : i) % GRP_COLORS.length]; }
function groupBadges(b, b2) { return (S.grupy || []).filter(g => (g.osoby || []).indexOf(b) >= 0 || (b2 && (g.osoby || []).indexOf(b2) >= 0)).map(g => ' <span class="gb">' + esc(g.nazwa) + '</span>').join(''); }
/** Małżeństwo ma wspólne grupy: każda grupa jednego z nich obejmuje oboje. */
function coupleGroups() {
  const inAny = b => (S.grupy || []).some(g => (g.osoby || []).indexOf(b) >= 0);
  (S.grupy || []).forEach(g => { (g.osoby || []).slice().forEach(b => { const sp = spouse(b); if (sp && !inAny(sp)) g.osoby.push(sp); }); });
}
/* ---------- przeciąganie osób na liście wspólnoty ---------- */
let pdrag = null;
document.addEventListener('pointerdown', ev => {
  const h = ev.target.closest('.pdrag'); if (!h) return;
  const el = h.closest('.punit'), list = el && el.parentElement; if (!el) return;
  ev.preventDefault();
  pdrag = { el: el, list: list, y0: ev.clientY, top0: el.getBoundingClientRect().top, ph: document.createElement('div') };
  pdrag.ph.className = 'rzph'; pdrag.ph.style.height = el.offsetHeight + 'px';
  el.classList.add('dragging'); el.style.width = el.offsetWidth + 'px'; el.style.left = el.getBoundingClientRect().left + 'px'; el.style.top = pdrag.top0 + 'px';
  list.insertBefore(pdrag.ph, el); document.body.appendChild(el);
  try { h.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
});
document.addEventListener('pointermove', ev => {
  if (!pdrag) return;
  ev.preventDefault();
  pdrag.el.style.top = (pdrag.top0 + ev.clientY - pdrag.y0) + 'px';
  const y = ev.clientY; let before = null;
  for (const s2 of pdrag.list.querySelectorAll('.punit')) { const r = s2.getBoundingClientRect(); if (y < r.top + r.height / 2) { before = s2; break; } }
  if (before) pdrag.list.insertBefore(pdrag.ph, before); else pdrag.list.appendChild(pdrag.ph);
  const m = document.getElementById('main'), mr = m.getBoundingClientRect();
  if (y < mr.top + 50) m.scrollTop -= 12; else if (y > mr.bottom - 50) m.scrollTop += 12;
}, { passive: false });
function pdragEnd() {
  if (!pdrag) return;
  const d0 = pdrag; pdrag = null;
  d0.list.insertBefore(d0.el, d0.ph); d0.ph.remove();
  d0.el.classList.remove('dragging'); d0.el.style.width = ''; d0.el.style.top = ''; d0.el.style.left = '';
  const order = Array.from(d0.list.querySelectorAll('.punit')).map(x => x.dataset.u), U = personUnits();
  const by = {}; U.forEach(u => { by[u[0]] = u; });
  const nu = order.map(k => by[k]).filter(Boolean); U.forEach(u => { if (nu.indexOf(u) < 0) nu.push(u); });
  S.bracia = [].concat.apply([], nu);
  S.obecni = S.bracia.filter(b => S.obecni.indexOf(b) >= 0);
  save(); render();
}
document.addEventListener('pointerup', pdragEnd); document.addEventListener('pointercancel', pdragEnd);
/** Ten telefon wysyła listę wspólnoty, gdy właściciel jest (drugim) odpowiedzialnym. */
function isResp() {
  const r = rolesOf(S.owner);
  return r.indexOf('Odpowiedzialny') >= 0 || r.indexOf('Drugi odpowiedzialny') >= 0;
}

/** Osoby z wybranych wspólnot (bez powtórzeń): [{n, tel, wsp}] */
function peopleOf(ws) {
  const out = [], seen = {};
  (ws || []).forEach(id => {
    const w = S.wspolnoty.find(x => x.id === id); if (!w) return;
    const d = wspData(id);
    d.bracia.forEach(b => { if (!seen[b]) { seen[b] = 1; out.push({ n: b, tel: d.telefony[b] || '', wsp: w.nazwa }); } });
  });
  return out;
}
/** Role w udostępnionej wspólnocie zmienia tylko osoba uprawniona (inni dostają je z arkusza). */
function roleLocked() { const w = curW(); return !!w && wspShared(w) && !canSend(w); }
const ETAPY = ['Prekatechumenat', '1 Skrutynium Chrzcielne', 'Szema Izrael', '2 Skrutynium Chrzcielne', '1 Wprowadzenie w Modlitwę', 'Traditio Symboli',
  'Redditio Symboli', '2 Wprowadzenie w Modlitwę (Ojcze Nasz)', '3 Skrutynium Chrzcielne', 'Odnowienie Obietnic Chrzcielnych'];
/** Etap wspólnoty – tylko informacja; przy prekatechumenacie nic się nie pokazuje. */
const DIECEZJE = ['archidiecezja białostocka', 'archidiecezja częstochowska', 'archidiecezja gdańska', 'archidiecezja gnieźnieńska', 'archidiecezja katowicka', 'archidiecezja krakowska',
  'archidiecezja lubelska', 'archidiecezja łódzka', 'archidiecezja poznańska', 'archidiecezja przemyska', 'archidiecezja szczecińsko-kamieńska', 'archidiecezja warmińska',
  'archidiecezja warszawska', 'archidiecezja wrocławska', 'diecezja bielsko-żywiecka', 'diecezja bydgoska', 'diecezja drohiczyńska', 'diecezja elbląska', 'diecezja ełcka',
  'diecezja gliwicka', 'diecezja kaliska', 'diecezja kielecka', 'diecezja koszalińsko-kołobrzeska', 'diecezja legnicka', 'diecezja łomżyńska', 'diecezja łowicka',
  'diecezja opolska', 'diecezja pelplińska', 'diecezja płocka', 'diecezja radomska', 'diecezja rzeszowska', 'diecezja sandomierska', 'diecezja siedlecka', 'diecezja sosnowiecka',
  'diecezja świdnicka', 'diecezja tarnowska', 'diecezja toruńska', 'diecezja warszawsko-praska', 'diecezja włocławska', 'diecezja zamojsko-lubaczowska', 'diecezja zielonogórsko-gorzowska',
  'diecezja kielecka', 'ordynariat polowy'].filter((x, i, a) => a.indexOf(x) === i);
function etapOf(w) { return w && w.etap && w.etap !== ETAPY[0] ? w.etap : ''; }
function curW() { return S.wspolnoty.find(x => x.id === S.wspAktywna); }
/** Scalanie: B dołącza do A (A zostaje – jej połączenie z arkuszem, etap, region); nowa nazwa. Kopia przed zmianą w pliku. */
function mergeDialog() {
  const opt = sel => S.wspolnoty.map(w => '<option value="' + w.id + '"' + (w.id === sel ? ' selected' : '') + '>' + esc(w.nazwa) + (wspShared(w) ? ' ⇅' : '') + '</option>').join('');
  const a0 = S.wspAktywna !== 'ALL' ? S.wspAktywna : S.wspolnoty[0].id, b0 = (S.wspolnoty.find(w => w.id !== a0) || {}).id;
  openModal('Scal wspólnoty',
    '<label class="lbl">Pierwsza (zostaje jej połączenie z arkuszem, etap i region)</label><select id="mgA">' + opt(a0) + '</select>' +
    '<label class="lbl">Druga (dołącza do pierwszej)</label><select id="mgB">' + opt(b0) + '</select>' +
    '<label class="lbl">Nazwa nowej wspólnoty</label><input id="mgN" value="' + esc((S.wspolnoty.find(w => w.id === a0) || {}).nazwa || '') + '">' +
    '<div class="muted mt">Osoby (bez powtórzeń) z rolami, telefonami, e-mailami i kolorami, grupy, kalendarz i kasetka trafią do jednej wspólnoty. Druga zniknie z listy (jej połączenie z arkuszem zostanie odłączone). Przed scaleniem zapisuje się kopia.</div>',
    '<button class="btn text" data-act="close">Anuluj</button><button class="btn" data-act="wsp-merge-ok">Scal</button>');
  modalState = { kind: 'wspmerge' };
}
function mergeCommunities(aId, bId, name) {
  storeActive();
  const A0 = S.wspolnoty.find(w => w.id === aId), B = S.wspolnoty.find(w => w.id === bId);
  if (!A0 || !B || aId === bId) return false;
  try { if (A && A.saveText) A.saveText('kopia_scalenie.json', JSON.stringify({ akt: S.wspAktywna, wspolnoty: S.wspolnoty, kal: S.kal, kasa: S.kasa, grupyRob: S.grupyRob })); } catch (e) { /* */ }
  const W = A0;
  (B.bracia || []).forEach(b => { if ((W.bracia = W.bracia || []).indexOf(b) < 0) W.bracia.push(b); });
  W.telefony = Object.assign({}, B.telefony || {}, W.telefony || {});
  W.kolory = Object.assign({}, B.kolory || {}, W.kolory || {});
  W.role = W.role || {}; Object.keys(B.role || {}).forEach(b => { W.role[b] = Array.from(new Set((W.role[b] || []).concat(B.role[b] || []))); });
  const gn = new Set((W.grupy || []).map(g => g.nazwa));
  W.grupy = (W.grupy || []).concat((B.grupy || []).map(g => Object.assign({}, g, { nazwa: gn.has(g.nazwa) ? g.nazwa + ' (' + B.nazwa + ')' : g.nazwa })));
  ['etap', 'region', 'diecezja'].forEach(k => { if (!W[k] && B[k]) W[k] = B[k]; });
  W.malz = Object.assign({}, B.malz || {}, W.malz || {});
  if (name) W.nazwa = name;
  (S.kal || []).forEach(e => { if (e.wsp === bId) { e.wsp = aId; e.ts = Date.now(); } });
  (S.grupyRob || []).forEach(g => { g.wsp = Array.from(new Set((g.wsp || []).map(x => x === bId ? aId : x))); g.osoby = (g.osoby || []).map(o => o.indexOf(bId + '|') === 0 ? aId + o.slice(bId.length) : o); });
  if (S.kasa && S.kasa[bId]) { S.kasa[aId] = (S.kasa[aId] || []).concat(S.kasa[bId]); delete S.kasa[bId]; }
  if (S.kasaSync) delete S.kasaSync[bId];
  S.wspolnoty = S.wspolnoty.filter(w => w.id !== bId);
  if (S.wspSync === bId) S.wspSync = aId;
  if (S.kalView === bId) S.kalView = aId;
  S.wspAktywna = '';
  W.sync = { ts: Date.now(), by: S.owner || '' };   // scalona lista jest najnowsza – nie podmieniaj jej starszą z arkusza
  switchCommunity(aId);
  save();
  if (wspShared(W) && wspSends(W)) pushCommunity(W, true);
  return true;
}
/** Cofnij scalenie: przywraca wspólnoty, kalendarz, kasetkę i grupy robocze sprzed ostatniego scalenia. */
function undoMerge() {
  const k = loadJson('kopia_scalenie.json');
  if (!k || !Array.isArray(k.wspolnoty)) { toast('Brak kopii sprzed scalenia.'); return; }
  S.wspolnoty = k.wspolnoty; if (k.kal) S.kal = k.kal; if (k.kasa) S.kasa = k.kasa; if (k.grupyRob) S.grupyRob = k.grupyRob;
  (S.kal || []).forEach(e => { e.ts = Date.now(); });
  S.wspolnoty.forEach(w => { if (w.sync) w.sync.ts = Date.now(); });
  S.wspAktywna = ''; switchCommunity(k.akt && S.wspolnoty.some(w => w.id === k.akt) ? k.akt : S.wspolnoty[0].id); save();
  if (A && A.saveText) A.saveText('kopia_scalenie.json', '');
  toast('Przywrócono wspólnoty sprzed scalenia.'); render();
}
function wspData(id) {
  if (id === S.wspAktywna) return { bracia: S.bracia, telefony: S.telefony, role: S.role, kolory: S.kolory, grupy: S.grupy };
  const w = S.wspolnoty.find(x => x.id === id) || {};
  return { bracia: w.bracia || [], telefony: w.telefony || {}, role: w.role || {}, kolory: w.kolory || {}, grupy: w.grupy || [] };
}
function wspShared(w) { return !!w && w.key !== undefined && w.key !== null; }
/** Administrator: zalogowane (zweryfikowane hasłem) konto Alana Filipiaka. */
function isSuper() {
  const k = S.konto || {};
  if (!k.on || !k.ok) return false;
  const n = String(k.login || '').toLowerCase().replace(/[ąćęłńóśźż]/g, c => PL[c]).replace(/@.*$/, '').replace(/[^a-z]/g, '');
  return n === 'alanfilipiak' || n === 'filipiakalan';
}
/** Wysyłać listę mogą: odpowiedzialny, drugi odpowiedzialny, współodpowiedzialny (w tej wspólnocie) i administrator. */
function canSend(w) {
  if (isSuper()) return true;
  const r = (wspData(w.id).role[S.owner] || []);
  return r.indexOf('Odpowiedzialny') >= 0 || r.indexOf('Drugi odpowiedzialny') >= 0 || r.indexOf('Współodpowiedzialny') >= 0;
}
/** Czy to urządzenie wysyła listę tej wspólnoty (ustawienie; domyślnie: właściciel jest w niej (drugim) odpowiedzialnym). */
function wspSends(w) {
  if (!canSend(w)) return false;
  if (w.send !== undefined) return !!w.send;
  const r = (wspData(w.id).role[S.owner] || []);
  return r.indexOf('Odpowiedzialny') >= 0 || r.indexOf('Drugi odpowiedzialny') >= 0;
}
function isResp() { const w = curW(); return !!w && wspSends(w); }
function newKey() { return 'w' + uuid().replace(/[^a-z0-9]/gi, '').slice(0, 14); }

function communityCard() {
  const w = curW();
  let h = '<div class="card"><h2>Synchronizacja tej wspólnoty</h2>';
  if (!w) return '';
  if (!wsReady()) return h + '<div class="muted">Połącz aplikację z arkuszem (Ustawienia → Wspólne przygotowanie, kod QR). Wtedy odpowiedzialny wysyła listę, a pozostali dostają ją automatycznie.</div></div>';
  const NOPERM = '<div class="muted mt">Wysyłać listę mogą tylko odpowiedzialni, współodpowiedzialni i administrator.</div>';
  if (!wspShared(w) && !canSend(w)) return h + '<div class="muted">Lista „' + esc(w.nazwa) + '” jest tylko w tym telefonie.</div>' + NOPERM + '</div>';
  if (!wspShared(w)) {
    return h + '<div class="muted">Lista „' + esc(w.nazwa) + '” jest tylko w tym telefonie.</div>' +
      '<button class="btn full mt" data-act="wsp-share">⇪ Udostępnij – wysyłam listę tej wspólnoty</button>' +
      '<div class="muted mt">Dostaniesz kod QR tej wspólnoty – osoby z niej skanują go i mają u siebie jej aktualną listę.</div></div>';
  }
  const sy = w.sync || {};
  const same = S.wspolnoty.filter(x => x !== w && wspShared(x) && x.key === w.key);
  h += '<div class="muted">Miejsce w arkuszu: <b>' + 'zakładka App_Wspolnoty, wiersz „' + (w.key === '' ? 'glowna' : esc(w.key)) + '” (' + esc(w.nazwa) + ')' + '</b></div>';
  if (same.length) h += '<div class="notice mt">Ta sama lista co „' + esc(same.map(x => x.nazwa).join('”, „')) + '” – dlatego się mieszają. Przenieś jedną z nich na osobne miejsce.</div>';
  if (canSend(w) && same.length)
    h += '<button class="btn ghost full mt" data-act="wsp-move">↪ Przenieś tę wspólnotę na osobne miejsce w arkuszu</button>';
  if (canSend(w)) h += '<button class="btn ghost full mt" data-act="wsp-manual">⇩ Pobierz osoby z arkusza („Lista ręczna”)</button>';
  if (wspSends(w)) {
    h += '<div class="muted">Wysyłasz listę tej wspólnoty – każda zmiana (osoby, role, grupy' + (S.wspolnota.tel ? ', telefony' : '') + ') trafia do arkusza.</div>' +
      '<label class="row mt"><span class="grow">Udostępniaj też numery telefonów (trafiają do arkusza)</span><input type="checkbox" data-ch="wspTel"' + (S.wspolnota.tel ? ' checked' : '') + '></label>' +
      '<div class="row mt"><button class="btn grow" data-act="wsp-push">⇪ Wyślij teraz</button><button class="btn ghost grow" data-act="wsp-qr">▦ Kod QR tej wspólnoty</button></div>' +
      '<button class="btn text full" data-act="wsp-send" data-a="0">Tylko pobieram tę listę (nie wysyłam)</button>';
  } else {
    h += '<div class="muted">' + (sy.ts ? 'Lista od: <b>' + esc(sy.by || 'odpowiedzialnego') + '</b>, ' + new Date(sy.ts).toLocaleDateString('pl-PL') + ' ' + hhmm(sy.ts) +
      '. Zmiany zrobione tutaj zostaną zastąpione przy następnej aktualizacji.' : 'Lista pobierze się sama, gdy odpowiedzialny ją wyśle.') + '</div>' +
      '<div class="row mt"><button class="btn ghost grow" data-act="wsp-pull">⇩ Pobierz teraz</button><button class="btn ghost grow" data-act="wsp-qr">▦ Kod QR</button></div>' +
      (canSend(w) ? '<button class="btn text full" data-act="wsp-send" data-a="1">To ja prowadzę tę listę (wysyłam)</button>' : NOPERM);
  }
  return h + '<div class="muted mt" id="wspStatus">' + esc(UI.wspStatus || '') + '</div></div>';
}
function wspStatus(m) { UI.wspStatus = m; const el = document.getElementById('wspStatus'); if (el) el.textContent = m; }

let wspTimer = null; const wspLast = {}, wspBusy = {};
function communityPayload(w) {
  const d = wspData(w.id), tel = {}, role = {}, kol = {};
  d.bracia.forEach(b => {
    if (S.wspolnota.tel && d.telefony[b]) tel[b] = d.telefony[b];
    const r = (d.role[b] || []).filter(x => ROLE_LIST.indexOf(x) >= 0); if (r.length) role[b] = r;
    if (d.kolory[b] !== undefined) kol[b] = d.kolory[b];
  });
  const mz = {}; Object.keys(w.malz || {}).forEach(b => { if (d.bracia.indexOf(b) >= 0 && d.bracia.indexOf(w.malz[b]) >= 0) mz[b] = w.malz[b]; });
  return { by: S.owner, nazwa: w.nazwa, etap: w.etap || '', region: w.region || '', katechisci: w.katechisci || [], bracia: d.bracia.slice(), role: role, kolory: kol, grupy: d.grupy, telefony: S.wspolnota.tel ? tel : null, malz: mz, rv: 2 };
}
function scheduleCommunity() {
  if (!wsReady()) return;
  clearTimeout(wspTimer);
  wspTimer = setTimeout(() => S.wspolnoty.forEach(w => { if (wspShared(w) && wspSends(w)) pushCommunity(w, false); }), 3000);
}
let keyedOk = false;
/** Odcisk listy (bez „kto wysłał”) – czy od ostatniej synchronizacji coś zmieniono w tym telefonie. */
function wspHash(w) { const p = communityPayload(w); delete p.by; return JSON.stringify(p); }
function pushCommunity(w, force) { syncOne(w, !!force, false); }
function pullCommunity(manual) {
  S.wspolnoty.forEach(w => { if (wspShared(w)) syncOne(w, false, manual && w.id === S.wspAktywna); });
}
function pullOne(w, manual) { syncOne(w, false, manual); }
/**
 * Bezpieczna synchronizacja jednej listy:
 * 1) zawsze najpierw pobiera wersję z arkusza;
 * 2) jeśli w arkuszu jest nowsza, a tu nic nie zmieniano – przyjmuje ją;
 * 3) wysyła tylko wtedy, gdy to urządzenie może wysyłać, zna właściciela, ma zmiany i nie jest w tyle.
 * Dzięki temu telefon ze starą lub domyślną listą nie nadpisze aktualnej.
 */
function syncOne(w, force, manual) {
  if (!w || !wspShared(w) || !wsReady() || wspBusy[w.id]) return;
  wspBusy[w.id] = 1;
  const act = w.id === S.wspAktywna;
  if (manual || force) wspStatus(force ? 'Wysyłam listę…' : 'Pobieram listę…');
  httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'wspolnotaPull', key: w.key }), (ok, text) => {
    wspBusy[w.id] = 0;
    let r = null; try { r = JSON.parse(text); } catch (e) { r = null; }
    if (!ok || !r || !r.ok) { if (manual || force) wspStatus('Brak połączenia: ' + (r && r.error ? r.error : 'spróbuj później') + '.'); return; }
    if (!('wsp' in r) || (w.key && !r.keyed)) { if (act) wspStatus('W arkuszu jest starszy Sync.gs – wklej nowy i wdroż „Nowa wersja”.'); return; }
    if (w.key) keyedOk = true;
    stanMark('wsp:' + w.id);
    const d = r.wsp, has = d && Array.isArray(d.bracia) && d.bracia.length > 0;
    const base = (w.sync || {}).ts || 0, newer = has && r.ts > base;
    const hash = wspHash(w), changed = w.syncHash !== undefined ? hash !== w.syncHash : !has;
    if (newer && (!changed || !wspSends(w))) {
      applyCommunity(w, d, r.ts);
      if (manual || force) wspStatus('Pobrano aktualną listę z arkusza.');
      return;
    }
    if (newer && changed) {   // zmiany tu i w arkuszu – pierwszeństwo ma arkusz
      applyCommunity(w, d, r.ts);
      wspStatus('Ktoś inny zmienił listę – pobrałem jego wersję. Jeśli coś tu zmieniałeś, zrób to jeszcze raz.');
      return;
    }
    if (!wspSends(w)) { if (manual) wspStatus(has ? 'Masz aktualną listę.' : 'W arkuszu nie ma jeszcze listy tej wspólnoty – odpowiedzialny musi ją wysłać.'); return; }
    if (!S.owner) { if (act && (manual || force)) wspStatus('Nie wysłano: najpierw wybierz siebie na stronie startowej.'); return; }
    if (!changed && !force) { if (manual) wspStatus('Masz aktualną listę.'); return; }
    if (!d0ok(w)) { if (act) wspStatus('Nie wysłano: lista jest pusta.'); return; }
    const p = communityPayload(w), ts = Math.max(Date.now(), (r.ts || 0) + 1);
    httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'wspolnotaPush', key: w.key, ts: ts, wsp: p }), (ok2, text2) => {
      let r2 = null; try { r2 = JSON.parse(text2); } catch (e) { r2 = null; }
      if (ok2 && r2 && r2.ok && r2.ts !== undefined && !r2.stale) {
        w.sync = { ts: ts, by: S.owner }; w.syncHash = hash; wspLast[w.id] = hash; save(true);
        if (act) wspStatus('Lista wysłana o ' + hhmm(ts) + '.');
      } else if (act) wspStatus('Nie wysłano: ' + (r2 && r2.error ? r2.error : r2 && r2.stale ? 'w arkuszu jest nowsza lista' : 'brak połączenia') + '.');
    });
  });
}
function d0ok(w) { return wspData(w.id).bracia.length > 0; }
function applyCommunity(w, d, ts) {
  const nw = d.bracia.map(String);
  const role = {}, kol = {};
  Object.keys(d.role || {}).forEach(b => { if (nw.indexOf(b) >= 0 && Array.isArray(d.role[b])) role[b] = d.role[b].slice(); });
  if (!(d.rv >= 2)) roleMigrate(role);   // lista wysłana starszą wersją aplikacji
  if (d.kolory) Object.keys(d.kolory).forEach(b => { if (nw.indexOf(b) >= 0) kol[b] = +d.kolory[b]; });
  const grupy = Array.isArray(d.grupy) ? d.grupy.map(g => ({ id: g.id, nazwa: g.nazwa, osoby: (g.osoby || []).filter(b => nw.indexOf(b) >= 0) })) : null;
  if (w.id === S.wspAktywna) {
    S.bracia.filter(b => nw.indexOf(b) < 0).forEach(b => replacePerson(b, null));   // usunięci przez odpowiedzialnego
    S.bracia = nw.slice();
    S.obecni = S.bracia.filter(b => S.obecni.indexOf(b) >= 0);
    S.eucharystia.obecni = S.bracia.filter(b => S.eucharystia.obecni.indexOf(b) >= 0);
    S.kolejnosc = S.kolejnosc.filter(b => nw.indexOf(b) >= 0);
    S.role = role;
    if (d.telefony) Object.keys(d.telefony).forEach(b => { if (d.telefony[b]) S.telefony[b] = String(d.telefony[b]); });
    if (grupy) S.grupy = grupy;
    if (d.kolory) S.kolory = kol;
  } else {
    w.bracia = nw.slice(); w.role = role;
    w.telefony = Object.assign({}, w.telefony || {});
    if (d.telefony) Object.keys(d.telefony).forEach(b => { if (d.telefony[b]) w.telefony[b] = String(d.telefony[b]); });
    if (grupy) w.grupy = grupy;
    if (d.kolory) w.kolory = kol;
  }
  if (d.nazwa && (w.nazwa === 'Moja wspólnota' || w.nazwa === 'Wspólnota')) w.nazwa = d.nazwa;
  if (d.etap !== undefined) w.etap = d.etap;
  if (d.region !== undefined) w.region = d.region;
  if (Array.isArray(d.katechisci)) w.katechisci = d.katechisci;
  if (d.malz && typeof d.malz === 'object') w.malz = d.malz;
  w.sync = { ts: ts, by: d.by || '' };
  w.syncHash = wspHash(w);
  save(true);
  const ae = document.activeElement;
  if (document.getElementById('modal').classList.contains('hidden') && (!ae || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(ae.tagName) < 0)) render();
  toast('Lista „' + w.nazwa + '” zaktualizowana' + (d.by ? ' (od ' + d.by + ')' : '') + '.');
}
setInterval(() => { if (document.visibilityState !== 'hidden') pullCommunity(false); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullCommunity(false); });
setTimeout(() => pullCommunity(false), 1500);

/* ---- import listy osób: wklejone z arkusza (Imię | Telefon | Grupa | Rola) ---- */
function importDialog() {
  modalState = { kind: 'import' };
  openModal('Wklej listę osób', '<div class="muted">Skopiuj w Arkuszu Google kolumny <b>Imię | Telefon | Grupa | Rola</b> (grupa i rola opcjonalnie) i wklej poniżej. Jedna osoba w wierszu; kolumny mogą być rozdzielone tabulatorem, średnikiem lub przecinkiem.</div>' +
    '<textarea id="impText" rows="8" placeholder="Magda	600 333 444	Grupa 1\nPiotr	601 222 111	Grupa 2	Kantor"></textarea>' +
    '<label class="row mt"><input type="checkbox" id="impTel" checked><span class="grow">Nadpisz telefony osób, które już są na liście</span></label>',
    '<button class="btn" data-act="imp-ok">Dodaj do „' + esc((curW() || {}).nazwa || '') + '”</button>');
}
/** Zakładka „Lista ręczna” w arkuszu → osoby tej wspólnoty (dopisuje i uzupełnia, niczego nie usuwa). */
function pullManual() {
  const w = curW(); if (!w || !wsReady()) return;
  wspStatus('Pobieram „Listę ręczną”…');
  httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'listaReczna' }), (ok, text) => {
    let r = null; try { r = JSON.parse(text); } catch (e) { r = null; }
    if (!ok || !r || !r.ok) { wspStatus('Nie pobrano: ' + (r && r.error ? r.error : 'brak połączenia') + '.'); return; }
    if (!Array.isArray(r.rows)) { wspStatus('W arkuszu jest starszy Sync.gs – wklej nowy i wdroż „Nowa wersja”.'); return; }
    if (r.missing) { wspStatus('W arkuszu nie ma zakładki „Lista ręczna”.'); return; }
    const nm = w.nazwa.trim().toLowerCase(), names = S.wspolnoty.map(x => x.nazwa.trim().toLowerCase());
    const rows = r.rows.filter(x => x.w.toLowerCase() === nm || (!x.w && S.wspolnoty.length === 1));
    const other = r.rows.filter(x => x.w && names.indexOf(x.w.toLowerCase()) < 0).map(x => x.w);
    if (!rows.length) { wspStatus('W „Liście ręcznej” nie ma osób z wpisaną wspólnotą „' + w.nazwa + '”' + (other.length ? ' (są: ' + Array.from(new Set(other)).join(', ') + ')' : '') + '.'); return; }
    let add = 0, upd = 0;
    rows.forEach(x => {
      if (S.bracia.indexOf(x.n) < 0) { S.bracia.push(x.n); add++; } else upd++;
      if (x.tel) S.telefony[x.n] = x.tel;
      const rola = ROLE_LIST.find(q => q.toLowerCase() === x.rola.toLowerCase());
      if (rola) S.role[x.n] = Array.from(new Set((S.role[x.n] || []).concat([rola])));
      if (x.grupa) {
        let g = S.grupy.find(q => q.nazwa.toLowerCase() === x.grupa.toLowerCase());
        if (!g) { g = { id: uuid(), nazwa: x.grupa, osoby: [] }; S.grupy.push(g); }
        S.grupy.forEach(q => { q.osoby = q.osoby.filter(b => b !== x.n); });
        g.osoby.push(x.n);
      }
    });
    save(); render();
    wspStatus('Z arkusza: dodano ' + add + ' os., uzupełniono ' + upd + '.' + (wspShared(w) && wspSends(w) ? ' Wysyłam listę…' : ''));
  });
}
function doImport() {
  const txt = document.getElementById('impText').value, over = document.getElementById('impTel').checked;
  let add = 0, upd = 0;
  txt.split(/\r?\n/).forEach(line => {
    const c = line.split(/\t|;|,(?=\s*[^\d\s])|,(?=\s*\+?\d)/).map(x => x.trim());
    const n = c[0]; if (!n || /^imi[eę]$/i.test(n)) return;
    let tel = '', grp = '', rola = '';
    c.slice(1).forEach(x => {
      if (!x) return;
      if (!tel && /^[+\d][\d\s\-()]{5,}$/.test(x)) tel = x;
      else if (ROLE_LIST.some(r => r.toLowerCase() === x.toLowerCase())) rola = ROLE_LIST.find(r => r.toLowerCase() === x.toLowerCase());
      else if (!grp) grp = x;
    });
    if (S.bracia.indexOf(n) < 0) { S.bracia.push(n); add++; } else upd++;
    if (tel && (over || !S.telefony[n])) S.telefony[n] = tel;
    if (rola) { S.role[n] = Array.from(new Set((S.role[n] || []).concat([rola]))); }
    if (grp) {
      let g = S.grupy.find(x => x.nazwa.toLowerCase() === grp.toLowerCase());
      if (!g) { g = { id: uuid(), nazwa: grp, osoby: [] }; S.grupy.push(g); }
      S.grupy.forEach(x => { x.osoby = x.osoby.filter(b => b !== n); });
      g.osoby.push(n);
    }
  });
  closeModal(); save(); render();
  toast('Dodano ' + add + ' os.' + (upd ? ', zaktualizowano ' + upd : '') + '.');
}

/* ---------- śpiewnik: dobór pieśni i wyszukiwarka ---------- */

const SP = window.SPIEWNIK || { piesni: (D.piesni || []).map((p, i) => ({ n: 0, t: p.t, r: '', k: [] })), slowa: {} };
const SP_BY = {};
SP.piesni.forEach(p => { SP_BY[p.n] = p; });
const SP_WORDS = Object.keys(SP.slowa);
const LITURGICAL_MAX = 44;   // nr 1–44: stałe części liturgii (prefacje, Credo…) – nie proponujemy ich do tematu

function songLabel(p) { return p.t + (p.r ? ' (' + p.r + ')' : '') + (p.n ? ' — nr ' + p.n : ''); }

/** "Mt 1, 18nn; 2, 13n.18; por. Lb 5, 11–31" → [{b,c,v:Set|null}] */
function parseRefs(str) {
  const out = [];
  let book = '';
  String(str || '').split(';').forEach(part => {
    const m = part.replace(/por\./g, '').match(/^\s*((?:\d\s?)?[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+)?\s*(\d+)\s*(?:,\s*([0-9.\-–n\s+]*))?/);
    if (!m) return;
    if (m[1]) book = m[1].replace(/\s/g, '').toLowerCase();
    if (!book) return;
    let v = null;
    if (m[3]) {
      v = new Set();
      m[3].split('.').forEach(seg => {
        const r = seg.match(/(\d+)\s*(?:[-–]\s*(\d+))?\s*(nn|n)?/);
        if (!r) return;
        const a = +r[1], b = r[2] ? +r[2] : (r[3] === 'nn' ? a + 5 : r[3] === 'n' ? a + 1 : a);
        for (let x = a; x <= Math.min(b, a + 60); x++) v.add(x);
      });
      if (!v.size) v = null;
    }
    out.push({ b: book, c: +m[2], v: v });
  });
  return out;
}
SP.piesni.forEach(p => { p._refs = parseRefs(p.r); });

function topicWords(h) {
  const res = [];
  String(h || '').toLowerCase().split(/[\s\-–,()]+/).forEach(w => {
    if (w.length < 3) return;
    if (SP.slowa[w]) { res.push(w); return; }
    if (w.length >= 5) {
      const stem = w.slice(0, Math.max(4, w.length - 2));
      SP_WORDS.forEach(k => { if (k.indexOf(stem) === 0 && Math.abs(k.length - w.length) <= 3) res.push(k); });
    }
  });
  return Array.from(new Set(res));
}

/** Propozycje pieśni do bieżącego tematu; slot: 0 = wejście, 5 = wyjście (premia dla kategorii). */
function suggestSongs(slot) {
  const score = {}, why = {};
  const add = (n, pts, reason) => {
    const w = why[n] = why[n] || [];
    if (w.indexOf(reason) >= 0 || w.indexOf('✓ ' + reason) >= 0) return;
    const plain = w.indexOf(reason.replace('✓ ', ''));
    if (plain >= 0) w.splice(plain, 1);
    score[n] = (score[n] || 0) + pts;
    w.push(reason);
  };
  const bookLabel = b => b.replace(/^(\d?)(.)(.*)$/, (m, d, f, r) => (d ? d + ' ' : '') + f.toUpperCase() + r);
  if (S.haslo && String(slot)[0] !== 'e') {
    const rrefs = [];
    readings().forEach(cat => cat.forEach(r => parseRefs(r).forEach(x => rrefs.push(x))));
    SP.piesni.forEach(p => {
      if (p.n <= LITURGICAL_MAX) return;
      p._refs.forEach(a => {
        rrefs.forEach(b => {
          if (a.b !== b.b || a.c !== b.c) return;
          const label = bookLabel(b.b) + ' ' + b.c;
          let overlap = false;
          if (a.v && b.v) a.v.forEach(x => { if (b.v.has(x)) overlap = true; });
          add(p.n, overlap ? 6 : 2, (overlap ? '✓ ' : '') + label);
        });
      });
    });
    const tw = topicWords(S.haslo);
    tw.forEach(w => (SP.slowa[w] || []).forEach(n => { if (n > LITURGICAL_MAX) add(n, 5, 'słowo: ' + w); }));
    SP.piesni.forEach(p => {
      if (p.n > LITURGICAL_MAX && tw.some(w => norm(p.t).indexOf(norm(w)) >= 0)) add(p.n, 4, 'w tytule');
    });
  }
  (SLOT_CATS[slot] || []).forEach(cn => SP.piesni.forEach(p => { if (p.k.indexOf(cn) >= 0) add(p.n, 4, cn.replace('Pieśni ', '').toLowerCase()); }));
  const season = liturgy(new Date()).cat;
  if (season) SP.piesni.forEach(p => { if (p.k.indexOf(season) >= 0 && score[p.n]) add(p.n, 2, season); });
  return Object.keys(score).map(Number).sort((a, b) => score[b] - score[a] || a - b)
    .slice(0, 12).map(n => ({ p: SP_BY[n], why: why[n].slice(0, 3) }));
}

/* ---- pliki PDF użytkownika (śpiewnik, słownik): podgląd i skanowanie w telefonie ---- */

const PDF_NAMES = { songbook: 'śpiewnika', slownik: 'Słownika' };
const SCAN = { busy: '', msg: '' };
let FT = null, FTN = null, FTC = null;       // śpiewnik: nr pieśni -> tekst / znormalizowany / bez spacji
let SPMAP = null;                            // śpiewnik: nr pieśni -> indeks strony PDF
let SLT = null, SLTN = null, SLMAP = null;   // słownik: teksty stron, znormalizowane, hasło -> strona

function pdfPages(key) {
  if (!A) return 0;
  try { return A.pdfPages ? A.pdfPages(key) : (key === 'songbook' && A.songbookPages ? A.songbookPages() : 0); } catch (e) { return 0; }
}
function hasPdf(key) { return pdfPages(key) > 0; }
function loadJson(name) {
  try { const t = A && A.loadText ? A.loadText(name) : ''; return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
function compact(s) { return norm(s).replace(/[^\p{L}\p{N}]/gu, ''); }

function ftLoad() {
  if (FT || !A) return;
  FT = loadJson('fulltext.json');
  SPMAP = loadJson('spmap.json');
  if (FT) ftNormalize();
}
function ftNormalize() {
  FTN = {}; FTC = {};
  Object.keys(FT).forEach(n => { FTN[n] = norm(FT[n]); FTC[n] = FTN[n].replace(/[^\p{L}\p{N}]/gu, ''); });
}
function ftCount() { ftLoad(); return FT ? Object.keys(FT).length : 0; }
function slLoad() {
  if (SLT || !A) return;
  SLT = loadJson('slownik_txt.json');
  SLMAP = loadJson('slmap.json') || {};
  if (SLT) SLTN = SLT.map(norm);
}

function loadScript(src) {
  return new Promise((ok, err) => {
    const sc = document.createElement('script');
    sc.src = src; sc.onload = ok; sc.onerror = err;
    document.head.appendChild(sc);
  });
}

function scanMsg(m) {
  SCAN.msg = m;
  const el = document.getElementById('scanMsg');
  if (el) el.textContent = m;
}

/** Odczytuje tekst wszystkich stron z pliku użytkownika (pdf.js działa lokalnie w telefonie). */
async function pdfTexts(key) {
  if (!window.pdfjsLib) {
    await loadScript('lib/pdf.worker.min.js');   // tryb bez osobnego wątku (działa w WebView z plików lokalnych)
    await loadScript('lib/pdf.min.js');
  }
  let bytes;
  if (A.pdfBytes) bytes = await A.pdfBytes(key);
  else {
    const b64 = A.pdfBase64 ? A.pdfBase64(key) : A.songbookBase64();
    if (!b64) throw new Error('nie można odczytać pliku');
    const bin = atob(b64); bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  }
  if (!bytes || !bytes.length) throw new Error('nie można odczytać pliku');
  const pdf = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true }).promise;
  const out = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent();
    out.push(tc.items.map(it => it.str).join(' ').replace(/[\u{1D400}-\u{1D7FF}℀-⅏△▽♭♯𝄪⟨⟩]/gu, ' ').replace(/\s+/g, ' '));
    if (i % 10 === 0) { scanMsg('Czytam plik… ' + Math.round(100 * i / pdf.numPages) + '%'); await new Promise(r => setTimeout(r, 0)); }
  }
  return out;
}

/** Śpiewnik: szuka strony każdej pieśni po tytule na początku strony – działa też z innym wydaniem. */
function mapSongbook(pages) {
  const heads = pages.map(t => compact(t.slice(0, 260)));
  const cand = {};
  SP.piesni.forEach(p => {
    const key = compact(p.t).slice(0, 18);
    if (key.length < 4) return;
    cand[p.n] = [];
    heads.forEach((h, i) => { if (h.indexOf(key) >= 0) cand[p.n].push(i); });
  });
  const diffs = [];
  Object.keys(cand).forEach(n => { if (cand[n].length === 1) diffs.push(cand[n][0] - n); });
  diffs.sort((a, b) => a - b);
  const off = diffs.length ? diffs[Math.floor(diffs.length / 2)] : (SP.offset || 0);
  const map = {};
  let found = 0;
  SP.piesni.forEach(p => {
    const c = cand[p.n] || [];
    if (c.length) {
      found++;
      map[p.n] = c.reduce((best, i) => Math.abs(i - (p.n + off)) < Math.abs(best - (p.n + off)) ? i : best, c[0]);
    } else {
      map[p.n] = Math.min(pages.length - 1, Math.max(0, p.n + off));
    }
  });
  return { map: map, found: found };
}

/** Słownik: strona, na której zaczyna się hasło (nagłówek WIELKIMI LITERAMI, w kolejności alfabetycznej). */
function mapSlownik(pages) {
  const caps = pages.map(t => t.replace(/[^\p{L}\p{N}]/gu, ''));
  const names = D.hasla.map(h => h.n).sort(COLL.compare);
  const map = {};
  let from = 0, found = 0;
  names.forEach(n => {
    const key = n.replace(/[^\p{L}\p{N}]/gu, '');
    if (key.length < 2) return;
    let pg = -1;
    for (let i = from; i < caps.length; i++) { if (caps[i].indexOf(key) >= 0) { pg = i; break; } }
    if (pg < 0) for (let i = 0; i < from; i++) { if (caps[i].indexOf(key) >= 0) { pg = i; break; } }
    if (pg >= 0) { map[n] = pg; from = pg; found++; }
  });
  return { map: map, found: found, total: names.length };
}

async function scanPdf(key) {
  if (SCAN.busy || !A) return;
  SCAN.busy = key; scanMsg('Czytam plik…'); render();
  try {
    const pages = await pdfTexts(key);
    if (key === 'songbook') {
      const r = mapSongbook(pages);
      const starts = Object.keys(r.map).map(n => [+n, r.map[n]]).sort((a, b) => a[1] - b[1]);
      const ft = {};
      pages.forEach((t, i) => {
        let nr = 0;
        for (const st of starts) { if (st[1] <= i) nr = st[0]; else break; }
        if (nr) ft[nr] = (ft[nr] ? ft[nr] + ' ' : '') + t;
      });
      SPMAP = r.map; FT = ft; ftNormalize();
      A.saveText('spmap.json', JSON.stringify(r.map));
      A.saveText('fulltext.json', JSON.stringify(ft));
      scanMsg('Rozpoznano ' + r.found + ' z ' + SP.piesni.length + ' pieśni' +
        (r.found < SP.piesni.length * 0.5 ? ' – układ pliku inny niż znany, numery stron mogą się nie zgadzać.' : '. Działa podgląd i szukanie po tekście.'));
    } else {
      const r = mapSlownik(pages);
      SLT = pages; SLTN = pages.map(norm); SLMAP = r.map;
      A.saveText('slownik_txt.json', JSON.stringify(pages));
      A.saveText('slmap.json', JSON.stringify(r.map));
      scanMsg('Odnaleziono ' + r.found + ' z ' + r.total + ' haseł w pliku. Działa podgląd i szukanie po tekście.');
    }
  } catch (e) {
    scanMsg('Błąd odczytu: ' + (e && e.message ? e.message : e));
  }
  SCAN.busy = '';
  render();
}

/** Podgląd strony PDF z pliku użytkownika (renderuje Android). */
/* ---- pełnoekranowy podgląd strony PDF (powiększanie palcami, przesuwanie, podwójne dotknięcie) ---- */
let PV = null;
const PVZ = { s: 1, x: 0, y: 0 };

function openPdfPage(key, idx, title, extra) {
  const pick = modalState && modalState.kind === 'picker' && modalState.onPick ? modalState.onPick : null;
  PV = Object.assign({ key: key, idx: idx, title: title, pick: pick }, extra || {});
  renderViewer();
}
function renderViewer() {
  const v = document.getElementById('viewer');
  const key = PV.key, total = pdfPages(key);
  let stage;
  if (!total) {
    stage = '<div class="pvmsg"><p>Aby zobaczyć stronę, wskaż plik ' + PDF_NAMES[key] + ' (PDF) zapisany w telefonie.</p>' +
      '<button class="btn" data-act="pick-pdf" data-a="' + key + '">Wskaż plik</button></div>';
  } else {
    PV.idx = Math.max(0, Math.min(total - 1, PV.idx));
    UI.lastPage = UI.lastPage || {}; UI.lastPage[key] = PV.idx;
    const w = Math.round(window.innerWidth * (window.devicePixelRatio || 2) * 1.6);
    const img = A.renderPdfAsync ? 'about:blank' : A.renderPdf ? A.renderPdf(key, PV.idx, w) : A.renderPage(PV.idx, w);
    if (A.renderPdfAsync) { const idx = PV.idx; A.renderPdfAsync(key, idx, w).then(u => { const im = document.getElementById('pvimg'); if (im && PV && PV.idx === idx) im.src = u; })
      .catch(() => { const st = document.getElementById('pvstage'); if (st) st.innerHTML = '<div class="pvmsg">Nie udało się wyświetlić strony ' + (idx + 1) + '.</div>'; }); }
    stage = img ? '<img id="pvimg" src="' + img + '" alt="" draggable="false">' : '<div class="pvmsg">Nie udało się wyświetlić strony ' + (PV.idx + 1) + '.</div>';
  }
  const sp = PV.nr ? SP_BY[PV.nr] : null, ao = audioFor(sp, 'org'), ap = audioFor(sp, 'pl');
  v.innerHTML = '<div class="pvbar"><b class="grow">' + esc(PV.title) + '</b>' +
    (ao ? '<button class="pvb" data-act="aud-org" title="Nagranie – oryginał">♪ Org</button>' : '') +
    (ap ? '<button class="pvb" data-act="aud-pl" title="Nagranie – po polsku">♪ PL</button>' : '') +
    (total && A && A.openPdfExternal ? '<button class="pvb" data-act="pv-ext" title="Otwórz oryginalny plik">↗ PDF</button>' : '') +
    '<button class="pvb" data-act="pv-close">✕</button></div>' +
    '<div class="pvstage" id="pvstage">' + stage + '</div>' +
    '<div id="pvaudio" class="pvaudio hidden"></div>' +
    (total ? '<div class="pvbar"><button class="pvb" data-act="pv-prev">◀</button>' +
      '<input type="number" id="pvNo" min="1" max="' + total + '" value="' + (PV.idx + 1) + '"><span>/ ' + total + '</span>' +
      '<button class="pvb" data-act="pv-go">Idź</button><button class="pvb" data-act="pv-next">▶</button>' +
      (PV.pick && PV.nr ? '<button class="pvb on" data-act="pv-pick">Wybierz</button>' : '') + '</div>' : '');
  v.classList.remove('hidden');
  PVZ.s = 1; PVZ.x = 0; PVZ.y = 0; pvApply();
}
function closeViewer() {
  const v = document.getElementById('viewer');
  v.classList.add('hidden'); v.innerHTML = ''; PV = null;
}
function pvApply() {
  const im = document.getElementById('pvimg');
  if (im) im.style.transform = 'translate(' + PVZ.x + 'px,' + PVZ.y + 'px) scale(' + PVZ.s + ')';
}
(function pvGestures() {
  let t0 = null, lastTap = 0;
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  document.addEventListener('touchstart', e => {
    if (!e.target.closest('#pvstage')) return;
    if (e.touches.length === 2) t0 = { d: dist(e.touches[0], e.touches[1]), s: PVZ.s, x: PVZ.x, y: PVZ.y, mode: 'pinch' };
    else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap < 300) { PVZ.s = PVZ.s > 1 ? 1 : 2.5; PVZ.x = 0; PVZ.y = 0; pvApply(); lastTap = 0; t0 = null; return; }
      lastTap = now;
      t0 = { cx: e.touches[0].clientX, cy: e.touches[0].clientY, x: PVZ.x, y: PVZ.y, mode: 'pan' };
    }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!t0 || !e.target.closest('#pvstage')) return;
    if (t0.mode === 'pinch' && e.touches.length === 2) {
      PVZ.s = Math.max(1, Math.min(5, t0.s * dist(e.touches[0], e.touches[1]) / t0.d));
      if (PVZ.s === 1) { PVZ.x = 0; PVZ.y = 0; }
    } else if (t0.mode === 'pan' && e.touches.length === 1 && PVZ.s > 1) {
      PVZ.x = t0.x + e.touches[0].clientX - t0.cx; PVZ.y = t0.y + e.touches[0].clientY - t0.cy;
    } else if (t0.mode === 'pan' && e.touches.length === 1 && PVZ.s === 1) {
      t0.swipe = e.touches[0].clientX - t0.cx;   // przesunięcie w bok = następna / poprzednia strona
      return;
    }
    pvApply();
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (t0 && t0.mode === 'pan' && PVZ.s === 1 && Math.abs(t0.swipe || 0) > 80 && PV) {
      PV.idx += t0.swipe < 0 ? 1 : -1; renderViewer();
    }
    t0 = null;
  });
})();

function songPage(nr) { ftLoad(); return SPMAP && SPMAP[nr] !== undefined ? SPMAP[nr] : nr + (SP.offset || 0); }
function openSongView(nr, shift) {
  const p = SP_BY[nr];
  openPdfPage('songbook', songPage(nr) + shift, p ? p.n + '. ' + p.t : 'Pieśń', { nr: nr });
}

window.onPdfPicked = function (key, ok) {
  if (!ok) { toast('Nie udało się otworzyć pliku.'); return; }
  if (key === 'rzimp') { if (window.RZ) RZ.importPicked(); return; }
  if (key === 'songbook') { FT = null; FTN = null; FTC = null; SPMAP = null; A.saveText('fulltext.json', ''); A.saveText('spmap.json', ''); }
  else { SLT = null; SLTN = null; SLMAP = null; A.saveText('slownik_txt.json', ''); A.saveText('slmap.json', ''); }
  closeModal(); if (PV) closeViewer();
  UI.view = key === 'songbook' ? 'spiewnik' : 'slownik';
  toast('Plik ustawiony – skanuję…');
  scanPdf(key);
};
window.onSongbook = function (ok) { window.onPdfPicked('songbook', ok); };   // zgodność ze starszym mostem

function pdfCard(key) {
  const n = pdfPages(key);
  return '<div class="card"><h2>Plik ' + PDF_NAMES[key] + ' (PDF)</h2><div class="row"><span class="grow muted">' +
    (n ? 'Wskazany (' + n + ' stron)' : 'Nie wskazano – wskaż plik zapisany w telefonie.') + '</span>' +
    '<button class="btn ghost" data-act="pick-pdf" data-a="' + key + '">' + (n ? 'Zmień plik' : 'Wskaż plik') + '</button></div>' +
    (n ? '<button class="btn full mt" data-act="pdf-open" data-a="' + key + '">📖 Otwórz ' + (key === 'songbook' ? 'śpiewnik' : 'Słownik') + '</button>' : '') +
    (key === 'songbook' && n ? '<div class="muted mt">Strony pieśni są dopasowywane po tytułach przy skanowaniu – działa też z innym wydaniem śpiewnika.</div>' : '') +
    (n ? '<div class="row mt"><span class="grow muted" id="scanMsg">' + esc(SCAN.busy === key ? SCAN.msg :
      (SCAN.msg && UI.lastScan === key ? SCAN.msg : (key === 'songbook' ? (ftCount() ? 'Plik zeskanowany.' : 'Plik niezeskanowany.') :
        (slLoad(), SLT ? 'Plik zeskanowany.' : 'Plik niezeskanowany.')))) + '</span>' +
      '<button class="btn ghost" data-act="scan" data-a="' + key + '"' + (SCAN.busy ? ' disabled' : '') + '>Skanuj</button></div>' : '') +
    '</div>';
}

/* ===== ŚPIEWNIK ===== */

function viewSpiewnik() {
  return pdfCard('songbook') +
    '<input type="search" id="spq" placeholder="Tytuł, numer, odnośnik, słowo lub fragment tekstu…" value="' + esc(UI.spq) + '" data-in="spq">' +
    '<div class="list mt" id="splist">' + spiewnikList() + '</div>';
}
function spiewnikList() {
  const r = UI.spq.trim() ? searchSongs(UI.spq) : SP.piesni.map(p => ({ p: p, why: [] }));
  if (!r.length) return '<div class="empty-info">Brak wyników.</div>';
  return (UI.spq.trim() ? '<div class="muted">Znaleziono: ' + r.length + '</div>' : '') +
    r.map(x => '<div class="opt" data-act="song-view" data-a="' + x.p.n + '"><span class="grow"><span class="nr">' + x.p.n + '</span>' +
      esc(x.p.t) + (x.p.r ? ' <span class="muted">(' + esc(x.p.r) + ')</span>' : '') +
      (x.why.length ? '<span class="why">' + x.why.map(esc).join(' · ') + '</span>' : '') +
      (x.p.k && x.p.k.length ? '<span class="why muted">' + esc(x.p.k.slice(0, 3).join(' · ')) + '</span>' : '') + '</span>' +
      '<button class="addbtn" data-act="song-add" data-a="' + x.p.n + '" title="Dodaj do liturgii">＋</button><span class="eye">👁</span></div>').join('');
}

/* ===== SŁOWNIK ===== */

function viewSlownik() {
  slLoad();
  if (UI.slH) {
    const n = UI.slH, h = BY_NAME[n];
    return '<div class="card"><h2><span class="grow">' + esc(n) + '</span><button class="btn text act" data-act="sl-close">◀ Lista</button></h2>' +
      '<div class="row"><button class="btn grow" data-act="sl-topic" data-a="' + esc(n) + '">Ustaw jako temat</button>' +
      (SLMAP && SLMAP[n] !== undefined ? '<button class="btn ghost" data-act="sl-page" data-a="' + esc(n) + '">📖 Strona</button>' : '') + '</div>' +
      '<div class="mt">' + countsHtml(n) + '</div>' +
      '<div class="dict mt">' + (h && h.s ? h.s.map(e => (e.t ? '<h4>' + esc(e.t) + '</h4>' : '') + (e.r ? '<p>' + esc(e.r.join('; ')) + '</p>' : '')).join('') : '') + '</div></div>';
  }
  const cur = S.haslo && S.haslo.trim();
  const curCard = cur ? '<div class="card cur-topic"><div class="muted">Wybrany temat</div><div class="big">' + esc(cur) + '</div>' +
    '<div class="row mt">' + (SLMAP && SLMAP[cur] !== undefined ? '<button class="btn grow" data-act="sl-page" data-a="' + esc(cur) + '">📖 Otwórz w Słowniku</button>' : '') +
    (BY_NAME[cur] ? '<button class="btn ' + (SLMAP && SLMAP[cur] !== undefined ? 'ghost' : 'grow') + '" data-act="sl-open" data-a="' + esc(cur) + '">Czytania hasła</button>' : '') +
    (!(SLMAP && SLMAP[cur] !== undefined) && hasPdf('slownik') ? '<button class="btn ghost" data-act="sl-find" data-a="' + esc(cur) + '">🔎 Szukaj w tekście</button>' : '') +
    '</div></div>' : '';
  return curCard + pdfCard('slownik') +
    '<input type="search" id="slq" placeholder="Szukaj hasła' + (SLT ? ' lub słowa w tekście Słownika' : '') + '…" value="' + esc(UI.slq) + '" data-in="slq">' +
    '<div class="list mt" id="sllist">' + slownikList() + '</div>';
}
function slownikList() {
  const q = norm(UI.slq.trim());
  const names = allNames().filter(n => !q || norm(n).indexOf(q) >= 0);
  let h = names.map(n => '<div class="opt" data-act="sl-open" data-a="' + esc(n) + '"><span class="grow">' + esc(n) +
    countsHtml(n) + '</span></div>').join('');
  if (SLTN && q.length >= 4) {
    const hits = [];
    SLTN.forEach((t, i) => { const k = t.indexOf(q); if (k >= 0) hits.push([i, k]); });
    if (hits.length) {
      h += '<div class="sec">W tekście Słownika (' + hits.length + ' stron)</div>' + hits.slice(0, 60).map(x => {
        const t = SLT[x[0]], a = Math.max(0, x[1] - 30), b = Math.min(t.length, x[1] + q.length + 30);
        return '<div class="opt" data-act="sl-pdf" data-a="' + x[0] + '"><span class="grow"><span class="nr">s. ' + (x[0] + 1) + '</span>…' + esc(t.slice(a, b)) + '…</span><span class="eye">👁</span></div>';
      }).join('');
    }
  }
  return h || '<div class="empty-info">Brak wyników.</div>';
}

function snippet(nr, nq) {
  const i = FTN[nr].indexOf(nq), t = FT[nr];
  const a = Math.max(0, i - 25), b = Math.min(t.length, i + nq.length + 25);
  return (a ? '…' : '') + t.slice(a, b).trim() + (b < t.length ? '…' : '');
}

function searchSongs(q) {
  const nq = norm(q.trim());
  if (!nq) return SP.piesni.map(p => ({ p: p, why: [] }));
  const res = [], seen = {};
  SP.piesni.forEach(p => {
    if (norm(songLabel(p)).indexOf(nq) >= 0 || String(p.n) === nq) { res.push({ p: p, why: [] }); seen[p.n] = 1; }
  });
  ftLoad();
  if (FTN && nq.length >= 4) {
    Object.keys(FTN).forEach(n => {
      n = +n;
      if (!seen[n] && SP_BY[n] && FTN[n].indexOf(nq) >= 0) { seen[n] = 1; res.push({ p: SP_BY[n], why: ['w tekście: „' + snippet(n, nq) + '”'] }); }
    });
    // słowa rozbite w PDF na sylaby („no cami”) – porównanie bez spacji
    const cq = nq.replace(/[^\p{L}\p{N}]/gu, '');
    if (cq.length >= 5) Object.keys(FTC).forEach(n => {
      n = +n;
      if (!seen[n] && SP_BY[n] && FTC[n].indexOf(cq) >= 0) { seen[n] = 1; res.push({ p: SP_BY[n], why: ['w tekście'] }); }
    });
  }
  if (nq.length >= 3) {
    SP_WORDS.forEach(w => {
      if (norm(w).indexOf(nq) !== 0) return;
      SP.slowa[w].forEach(n => { if (!seen[n] && SP_BY[n]) { seen[n] = 1; res.push({ p: SP_BY[n], why: ['słowo: ' + w] }); } });
    });
  }
  return res;
}

function songRow(x) {
  return '<div class="opt" data-act="pick" data-a="' + esc(songLabel(x.p)) + '"><span class="grow"><span class="nr">' + (x.p.n || '') + '</span>' +
    esc(x.p.t) + (x.p.r ? ' <span class="muted">(' + esc(x.p.r) + ')</span>' : '') +
    (x.why.length ? '<span class="why">' + x.why.map(esc).join(' · ') + '</span>' : '') + '</span>' +
    (x.p.n ? '<button class="eye" data-act="song-view" data-a="' + x.p.n + '" title="Podgląd">👁</button>' : '') + '</div>';
}

function openSongPicker(slot, onPick) {
  modalState = { kind: 'picker', onPick: onPick, songs: true, slot: slot, query: '' };
  openModal(slotTitle(slot),
    '<input type="search" id="pq" placeholder="Tytuł, numer, odnośnik lub fragment tekstu…" data-in="pq">' +
    (ftCount() ? '' : '<div class="muted mt">Wyszukiwanie po całym tekście: ekran Śpiewnik → wskaż plik PDF.</div>') +
    '<div id="plist" class="mt">' + songList() + '</div>',
    (slot ? '<button class="btn text" data-act="pick" data-a="">Wyczyść</button>' : '') +
    '<button class="btn text" data-act="pick-custom">✎ Inna pieśń</button>' +
    '<button class="btn text" data-act="pdf-open" data-a="songbook">📖 Śpiewnik</button>');
}

function songList() {
  const q = modalState.query.trim();
  if (q) {
    const r = searchSongs(q);
    return r.length ? '<div class="muted">Znaleziono: ' + r.length + '</div>' + r.map(songRow).join('') : '<div class="empty-info">Brak wyników.</div>';
  }
  const sug = suggestSongs(modalState.slot);
  return (sug.length ? '<div class="sec">Propozycje' + (S.haslo && String(modalState.slot)[0] === 's' ? ' do tematu ' + esc(S.haslo) : '') + '</div>' + sug.map(songRow).join('') : '') +
    '<div class="sec">Wszystkie pieśni</div>' + SP.piesni.map(p => songRow({ p: p, why: [] })).join('');
}

/* ---------- okna (dolny arkusz) ---------- */

let modalState = null;

function openModal(title, body, footer, onRender) {
  const m = document.getElementById('modal');
  m.innerHTML = '<div class="sheet"><div class="sh-h">' + esc(title) + '</div><div class="sh-b">' + body + '</div>' +
    '<div class="sh-f">' + (footer || '') + '<button class="btn text" data-act="close">Zamknij</button></div></div>';
  m.classList.remove('hidden');
  if (onRender) onRender(m);
}
function closeModal() {
  if (typeof stopScanner === 'function') stopScanner();
  const m = document.getElementById('modal');
  m.classList.add('hidden');
  m.innerHTML = '';
  modalState = null;
}

function openPicker(title, items, onPick, opts) {
  modalState = { kind: 'picker', items: items, onPick: onPick, append: opts && opts.append, query: '' };
  openModal(title,
    '<input type="search" id="pq" placeholder="Szukaj…" data-in="pq"><div id="plist" class="mt">' + pickerList() + '</div>',
    (opts && opts.clear !== false ? '<button class="btn text" data-act="pick" data-a="">Wyczyść</button>' : ''));
}
function pickerList() {
  const q = norm(modalState.query.trim());
  const list = modalState.items.filter(t => !q || norm(t).indexOf(q) >= 0);
  if (!list.length) return '<div class="empty-info">Brak wyników.</div>';
  return list.map(t => '<div class="opt"><span class="grow" data-act="pick" data-a="' + esc(t) + '">' + esc(t) + '</span>' +
    (modalState.append ? '<button data-act="pick-add" data-a="' + esc(t) + '">+</button>' : '') + '</div>').join('');
}

function confirmBox(title, text, okLabel, onOk) {
  modalState = { kind: 'confirm', onOk: onOk };
  openModal(title, '<p>' + esc(text) + '</p>', '<button class="btn" data-act="confirm-ok">' + esc(okLabel) + '</button>');
}

function promptBox(title, label, val, onOk) {
  modalState = { kind: 'prompt', onOk: onOk };
  openModal(title, '<label class="lbl">' + esc(label) + '</label><input type="text" id="promptIn" value="' + esc(val) + '">',
    '<button class="btn" data-act="prompt-ok">OK</button>');
  setTimeout(() => { const i = document.getElementById('promptIn'); if (i) i.focus(); }, 50);
}

/* ---------- osoba spoza listy (np. gość, ktoś z innej wspólnoty) ---------- */

function askOther(ch, a) {
  render();   // przywraca listę w polu wyboru, gdyby okno zamknięto bez wyboru
  modalState = { kind: 'other', ch: ch, a: a };
  openModal('Inna osoba', '<label class="lbl">Imię</label><input type="text" id="otherName" placeholder="np. gość, katechista">' +
    '<label class="row chk mt"><input type="checkbox" id="otherAdd"><span>Dodaj też do listy wspólnoty</span></label>',
    '<button class="btn" data-act="other-ok">OK</button>');
  setTimeout(() => { const i = document.getElementById('otherName'); if (i) i.focus(); }, 50);
}

/** Okno wysyłki SMS: wybór odbiorców (obecni / nieobecni / wszyscy / pojedynczo). */
const DNI_PL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const dayFull = d => DNI_PL[new Date(d + 'T12:00:00').getDay()] + ' ' + plDate(d);
/** Zaproszenia: na przygotowanie (najpierw spotkanie, potem celebracja, czytania do wyboru) albo na samą celebrację. */
function inviteText(mode) {
  const eu = mode.indexOf('eu') === 0, prep = /-zap$/.test(mode), L = [];
  const v = eu ? 'eucharystia' : 'slowo', P = eu ? S.eucharystia : S.celebration;
  if (prep) {
    const pm = window.KAL ? KAL.prepMeetText(v) : '';
    L.push('📖 Przygotowanie ' + (eu ? 'Eucharystii' : 'Liturgii Słowa') + ': ' + (pm ? pm.replace(/^Przygotowanie: /, '') : 'termin podam wkrótce') + '.');
  }
  const when = P.data ? dayFull(P.data) + ((eu ? P.godzEu : P.godz) ? ', godz. ' + (eu ? P.godzEu : P.godz) : '') + (P.gdzie ? ', ' + P.gdzie : '') : 'termin podam wkrótce';
  if (eu) { L.push('✝ ' + (prep ? 'Eucharystia' : 'Zapraszamy na Eucharystię') + ': ' + when + (P.czyt && P.czyt.day && euOk() ? ' – ' + P.czyt.day : '') + '.'); if (prep && P.godzina) L.push('Zbiórka przed Eucharystią: godz. ' + P.godzina + '.'); }
  else L.push('✝ ' + (prep ? 'Liturgia Słowa' : 'Zapraszamy na Liturgię Słowa') + ': ' + when + '.' + (S.haslo ? '\nTemat: ' + S.haslo + (S.zPsalmami ? ' (z Psalmami)' : '') : ''));
  if (S.smsCzyt !== false) {
    const R = [];
    if (eu) { const g = euSig(); if (g['Czytanie 1']) R.push('I czytanie: ' + g['Czytanie 1']); if (g.ps) R.push('Psalm: ' + g.ps); if (g['Czytanie 2']) R.push('II czytanie: ' + g['Czytanie 2']); if (g['Ewangelia']) R.push('Ewangelia: ' + g['Ewangelia']); }
    else for (let i = 0; i < 5; i++) { const r = P.readings[i]; if (r) R.push(READ_LABELS[i] + '. ' + r); }
    if (R.length) L.push('', 'Czytania:', ...R);
  }
  if (prep && window.KAL) { const ex = KAL.prepMeetExtras(v); if (ex.length) L.push('', ...ex); }
  return L.join('\n');
}
function smsDefaultMode() {
  const c = S.celebration;
  return c.readings.slice(1).some(Boolean) || c.who.some(Boolean) || c.songs.some(Boolean) ? 'uklad' : 'moje';
}
function openSmsDialog(kind) {
  const present = kind === 'eu' ? S.eucharystia.obecni : kind === 'msg' ? S.bracia : S.obecni;
  modalState = { kind: 'sms', what: kind, sel: present.slice(), stage: 'pick', sent: {}, mode: kind === 'eu' ? (EU_ROLES.some(r => S.eucharystia.who[r]) ? 'eu' : 'eu-zap') : kind === 'msg' ? 'msg' : smsDefaultMode() };
  if (kind === 'msg') {
    modalState.ws = S.wspAktywna === 'ALL' ? S.wspolnoty.map(w => w.id) : [S.wspAktywna];
    modalState.sel = peopleOf(modalState.ws).map(p => p.n);
  }
  renderSmsDialog();
}
/** Treść SMS dla jednej osoby (p = imię z listy; '' = osoba spoza listy). */
/** Początek wiadomości dla osoby: powitanie + jej funkcja / czytanie. */
/** Potocznie: samo imię („Monika Nowak” → „Monika”, „Jan i Ewa Kowalscy” → „Jan i Ewa”). */
function firstName(n) {
  const w = String(n || '').trim().split(/\s+/).filter(Boolean);
  return w[1] === 'i' && w[2] ? w.slice(0, 3).join(' ') : (w[0] || '');
}
const INV_MODES = ['eu-zap', 'eu-inv', 'ls-zap', 'ls-inv'];
function smsHead(p, mode) {
  const hi = pokoj() + ', ' + (p ? firstName(p) : 'bracia') + '!\n';
  if (mode === 'msg') return S.msgHello !== false ? hi : '';
  if (INV_MODES.indexOf(mode) >= 0) return hi + '\n';
  if (mode === 'eu') {
    const mine = EU_ROLES.filter(r => p && S.eucharystia.who[r] === p);
    return hi + (mine.length ? 'Twoja funkcja: ' + mine.join(', ') + '\n' : '') + '\n';
  }
  const c = S.celebration, mine = [];
  for (let i = 0; i < 5; i++) if (p && c.who[i] === p) mine.push(READ_LABELS[i] + '. ' + (c.readings[i] || READ_DESC[i]));
  return hi + (mine.length ? 'Ty czytasz: ' + mine.join('; ') + '\n' : '') + '\n';
}
/** Wspólna część wiadomości (można ją poprawić ręcznie przed wysłaniem). */
function smsBody(mode) {
  if (mode === 'msg') return S.msgDraft || '';
  if (mode === 'eu') return euShareText();
  if (INV_MODES.indexOf(mode) >= 0) return inviteText(mode);
  const c = S.celebration;
  const lines = ['✝ Liturgia Słowa – temat: ' + (S.haslo || '—') + (S.zPsalmami ? ' (z Psalmami)' : '')];
  if (c.data) lines.push('Celebracja: ' + plDate(c.data) + (c.godz ? ', godz. ' + c.godz : '') + (c.gdzie ? ', ' + c.gdzie : ''));
  lines.push('', 'CZYTANIA');
  for (let i = 0; i < 5; i++) {
    const r = c.readings[i], pg = c.pages[i], w = c.who[i];
    if (!r && !w) continue;
    lines.push(READ_LABELS[i] + '. ' + (r || READ_DESC[i]) + (pg ? ' (str. ' + pg + ')' : '') + (w ? ' – ' + w : ''));
  }
  if (c.songs.some(Boolean)) {
    lines.push('', 'PIEŚNI');
    c.songs.forEach((x, i) => { if (x) lines.push(SONG_LABELS[i] + ': ' + x); });
  }
  return lines.join('\n');
}
function smsTextFor(p, mode) {
  const m = modalState && modalState.kind === 'sms' ? modalState : {};
  const extra = (m.extra ? '\n\n' + m.extra : '') + (S.smsPotw ? (m.extra ? '\n' : '\n\n') + 'Proszę o potwierdzenie odczytania.' : '');
  if (mode === 'moje') return mineText(p) + extra;
  return smsHead(p, mode) + (m.body !== undefined && m.body !== null ? m.body : smsBody(mode)) + extra;
}
/** Po kolei: otwiera SMS dla następnej osoby; po powrocie do aplikacji pokazuje kolejną. */
function smsSeqNext(m) {
  const b = m.seq[m.seqI]; if (!b) { m.seq = null; renderSmsDialog(); toast('Gotowe – wszystkie wiadomości otwarte.'); return; }
  m.sent[b] = true; m.seqI++;
  openUrl(smsUrl([smsTel(m, b).replace(/\s/g, '')], smsTextFor(b, m.mode)));
  m.seqWait = true;
  setTimeout(() => smsSeqShow(m), 700);
}
function smsSeqShow(m) {
  if (!m.seq) return;
  modalState = m;
  const b = m.seq[m.seqI], prev = m.seq[m.seqI - 1];
  if (!b) { m.seq = null; renderSmsDialog(); toast('Gotowe – ' + m.seqI + ' wiadomości.'); return; }
  openModal('Wysyłanie po kolei', '<p>' + (prev ? '✓ ' + esc(prev) + ' – jeśli wiadomość wyszła, dalej:' : '') + '</p>' +
    '<button class="btn full" data-act="sms-seqnext">✉ Następna: ' + esc(b) + ' (' + (m.seqI + 1) + '/' + m.seq.length + ')</button>' +
    '<div class="muted mt">Zostało: ' + m.seq.slice(m.seqI).map(esc).join(', ') + '</div>',
    '<button class="btn text" data-act="sms-seqend">Zakończ</button>');
}
document.addEventListener('visibilitychange', () => { const m = modalState; if (document.visibilityState === 'visible' && m && m.kind === 'sms' && m.seq) smsSeqShow(m); });
/** „Zażółć” → „Zazolc”: SMS bez polskich znaków mieści 160 zamiast 70 znaków. */
function noPl(t) { const M = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z', Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z', '–': '-', '—': '-', '„': '"', '”': '"', '’': "'", '✝': '+', '…': '...' }; return String(t).replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ–—„”’✝…]/g, c => M[c]); }
function grabSmsEdit() {
  { const x = document.getElementById('smsAscii'); if (x && modalState) modalState.ascii = x.checked; }
  const m = modalState, b = document.getElementById('smsBody'), x = document.getElementById('smsExtra');
  if (b) m.body = b.value;
  if (x) m.extra = x.value.trim();
}
/** Wysyłka bez otwierania aplikacji SMS – każdy osobno (wymaga zgody na SMS). */
function sendAllAuto(list, done, label) {
  const items = list.filter(x => x.tel).map(x => ({ tel: x.tel.replace(/[^\d+]/g, ''), text: x.text }));
  const skip = list.length - items.length;
  if (!items.length) { toast('Nikt z wybranych nie ma numeru.'); return; }
  if (!A || !A.sendSms) { toast('Dostępne w aplikacji na telefonie.'); return; }
  const back = modalState;
  confirmBox('Wysłać ' + items.length + ' SMS?', (label ? 'Odbiorcy: ' + label + '. ' : '') + 'Każda osoba dostanie osobną wiadomość – taką jak w podglądzie – wysłaną od razu z Twojego telefonu (zwykła opłata za SMS). Jeśli telefon zapyta o „wiele SMS-ów”, wybierz „Pozwól” (najlepiej z „Zapamiętaj”) – kolejne osoby poczekają na Twoją odpowiedź.' +
    (skip ? ' Pominięte bez numeru: ' + skip + '.' : ''), 'Wyślij wszystkim', () => {
    const id = uuid();
    window.__smsCbs = window.__smsCbs || {};
    window.__smsCbs[id] = (ok, fail, code) => {
      if (!fail) { toast('Wysłano: ' + ok + '.'); if (back && back.kind === 'sms' && !document.querySelector('#modal:not(.hidden)')) { modalState = back; renderSmsDialog(); } if (done) done(); return; }
      const why = { 1: 'telefon zablokował wysyłkę (na Xiaomi/HyperOS: Ustawienia aplikacji → Uprawnienia → „Wysyłanie SMS” → Zezwalaj; przy dwóch kartach SIM ustaw kartę domyślną do SMS)',
        2: 'tryb samolotowy / wyłączone radio', 4: 'brak zasięgu', 5: 'odmówiono zgody na wiele SMS-ów', 6: 'blokada numerów (FDN)' }[code] || ('kod błędu ' + (code || '?'));
      modalState = { kind: 'smsfail' };
      openModal('Wysłano ' + ok + ', nie udało się ' + fail, '<p>Powód: ' + esc(why) + '.</p><p class="muted">Pojedynczo („✉ SMS”) zawsze zadziała – otwiera zwykłą aplikację SMS.</p>',
        (A && A.openAppSettings ? '<button class="btn ghost" data-act="app-settings">Ustawienia aplikacji</button>' : '') + '<button class="btn" data-act="smsfail-back">Wróć do listy</button>');
      window.__smsBack = back; if (done) done();
    };
    toast('Wysyłam ' + items.length + ' SMS…');
    A.sendSms(JSON.stringify(items), id);
  });
}
window.__smsCb = function (id, ok, fail, code) { const f = window.__smsCbs && window.__smsCbs[id]; if (f) { delete window.__smsCbs[id]; f(ok, fail, code); } };
/** Jedna wiadomość grupowa do wszystkich numerów (otwiera aplikację SMS). */
function sendGroup(tels, text) {
  const n = tels.filter(Boolean).map(t => t.replace(/\s/g, ''));
  if (!n.length) { toast('Nikt z wybranych nie ma numeru.'); return; }
  openUrl(smsUrl(n, text));
}
function grabMsg() {
  const t = document.getElementById('msgText'), h = document.getElementById('msgHello');
  if (t) S.msgDraft = t.value;
  if (h) S.msgHello = h.checked;
  if (t || h) save(true);
}
function smsHasContent(p, mode) { return mode !== 'moje' || (S.haslo && myReadings(p).flat.length > 0); }

function smsTel(m, b) {
  if (m.what === 'msg') { const p = peopleOf(m.ws).find(x => x.n === b); return p ? p.tel : ''; }
  return S.telefony[b] || '';
}
function renderSmsDialog() {
  const m = modalState, present = m.what === 'eu' ? S.eucharystia.obecni : S.obecni;
  const msgList = m.what === 'msg' ? peopleOf(m.ws) : null;
  const title = m.what === 'eu' ? 'SMS – Eucharystia' : m.what === 'msg' ? 'Wiadomość do wspólnoty' : 'SMS – Liturgia Słowa';
  const modeChips = m.what === 'msg' ? '<label class="lbl">Treść</label><textarea id="msgText" rows="5" placeholder="np. W sobotę o 19:00 przygotowanie u Kowalskich…">' + esc(S.msgDraft || '') + '</textarea>' +
    '<label class="row mt"><input type="checkbox" id="msgHello"' + (S.msgHello !== false ? ' checked' : '') + '><span class="grow">Zacznij od „Pokój, {imię}!”</span></label>' +
    '<label class="row"><input type="checkbox" data-ch="sms-potw"' + (S.smsPotw ? ' checked' : '') + '><span class="grow">Na końcu: „Proszę o potwierdzenie odczytania.”</span></label>'
    : '<label class="lbl">Co wysłać</label><div class="chips">' +
    (m.what === 'eu' ? [['eu-zap', 'Zaproszenie na przygotowanie'], ['eu', 'Podsumowanie przygotowania (kto co robi)'], ['eu-inv', 'Zaproszenie na Eucharystię']]
      : [['ls-zap', 'Zaproszenie na przygotowanie'], ['moje', 'Czytania dla każdego (tylko jego)'], ['uklad', 'Podsumowanie (czytania i pieśni)'], ['ls-inv', 'Zaproszenie na celebrację']]).map(x =>
      '<button class="chip' + (m.mode === x[0] ? ' on' : '') + '" data-act="sms-mode" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
    (INV_MODES.indexOf(m.mode) >= 0 ? '<label class="row"><input type="checkbox" data-ch="sms-czyt"' + (S.smsCzyt !== false ? ' checked' : '') + '><span class="grow">Dodaj czytania do treści</span></label>' : '');
  if (m.stage === 'queue') {
    const rows = m.sel.map(b => {
      const tel = smsTel(m, b), ok = smsHasContent(b, m.mode), done = m.sent[b];
      return '<div class="row chk' + (done ? ' sent' : '') + '"><span class="grow">' + (done ? '✓ ' : '') + esc(b) +
        '<br><span class="muted">' + (ok ? (tel ? esc(tel) : 'bez numeru – wybierzesz w SMS') : 'brak czytań') + '</span></span>' +
        (ok ? '<button class="btn sm" data-act="sms-one" data-a="' + esc(b) + '">✉ SMS</button>' +
          '<button class="icon wa" data-act="sms-one" data-a="' + esc(b) + '" data-b="wa">W</button>' : '') + '</div>';
    }).join('');
    const opts = m.mode === 'moje' ? present.filter(b => smsHasContent(b, 'moje')) : [];
    const same = m.mode !== 'moje';
    const edit = (same ? '<label class="lbl">Treść (możesz poprawić; powitanie i „Twoja funkcja” dopisują się same)</label><textarea id="smsBody" rows="7">' +
        esc(m.body !== undefined && m.body !== null ? m.body : smsBody(m.mode)) + '</textarea>' : '') +
      '<label class="row mt"><input type="checkbox" data-ch="sms-potw"' + (S.smsPotw ? ' checked' : '') + '><span class="grow">Na końcu: „Proszę o potwierdzenie odczytania.”</span></label>' +
      '<label class="lbl">Dopisek na końcu każdej wiadomości</label><textarea id="smsExtra" rows="2" placeholder="np. Proszę o potwierdzenie">' + esc(m.extra || '') + '</textarea>';
    const send = m.sel.filter(b => smsHasContent(b, m.mode)), pi = Math.min(m.pv || 0, Math.max(0, send.length - 1)), pb = send[pi];
    const prev = '<div class="card pvcard"><h2>Podgląd</h2><div><span class="muted">Do:</span> <b>' + esc(m.grpLabel || (send.length === 1 ? '1 osoba' : send.length + ' wybranych osób')) + '</b>' +
        (m.grpLabel ? ' <span class="muted">(' + send.length + ')</span>' : '') + '</div><div class="muted">' + send.map(b => esc(b) + (smsTel(m, b) ? '' : ' (bez numeru)')).join(', ') + '</div>' +
      (pb ? '<div class="row mt"><button class="icon sm" data-act="sms-pv" data-a="-1"' + (pi ? '' : ' disabled') + '>‹</button><span class="grow muted" style="text-align:center">Wiadomość dla: <b>' + esc(pb) + '</b> (' + (pi + 1) + '/' + send.length + ')</span>' +
        '<button class="icon sm" data-act="sms-pv" data-a="1"' + (pi < send.length - 1 ? '' : ' disabled') + '>›</button></div><div class="smsbubble">' + esc(smsTextFor(pb, m.mode)) + '</div>' : '<div class="muted">Nikt z wybranych nie ma czego dostać.</div>') +
      '<div class="muted">Po poprawieniu treści niżej dotknij ‹ › albo „Odśwież”, żeby zobaczyć zmiany.</div><button class="btn text sm" data-act="sms-pv" data-a="0">↻ Odśwież podgląd</button></div>';
    const bulk = '<label class="row mt"><input type="checkbox" id="smsAscii"' + (m.ascii !== false ? ' checked' : '') + '><span class="grow">Bez polskich znaków przy „Wyślij wszystkim”<br><span class="muted">SMS-y 2× krótsze – telefon nie pyta o zgodę na „wiele SMS-ów”</span></span></label>' +
      '<button class="btn full mt" data-act="sms-seq">▶ Wyślij po kolei (' + send.filter(b => smsTel(m, b)).length + ')</button>' +
      '<div class="muted">Otwiera SMS dla każdej osoby z gotową treścią – Ty tylko dotykasz „Wyślij” i wracasz; następna osoba czeka. Działa zawsze.</div>' +
      '<div class="row mt"><button class="btn ghost grow" data-act="sms-auto">⚡ Automatycznie w tle</button></div>' +
      '<div class="muted">W tle bez otwierania SMS – na Xiaomi tylko z uprawnieniem „Wysyłanie SMS-ów: Zezwalaj”; jeśli wiadomości nie dochodzą, użyj „Po kolei”.</div>' +
      (same ? '<button class="btn ghost full mt" data-act="sms-group">👥 Razem – jedna wiadomość grupowa</button>' : '');
    openModal(title,
      prev + edit + bulk + '<div class="muted mt">Albo pojedynczo: „✉ SMS” otwiera wiadomość do jednej osoby – wyślij i wróć, następna czeka.</div>' +
      '<div class="mt">' + rows + '</div>' +
      '<div class="sec">Osoba spoza listy</div>' +
      '<input type="text" id="smsXName" placeholder="Imię (opcjonalnie)">' +
      '<div class="row mt"><input type="tel" id="smsXTel" class="grow" placeholder="Numer (puste = wybierzesz w SMS)"><button class="btn ghost" data-act="contact" data-a="smsx">📇</button></div>' +
      (m.mode === 'moje' ? '<select id="smsXWho" class="mt"><option value="">Wybrane czytania i pieśni</option>' +
        opts.map(b => '<option value="' + esc(b) + '">Czytania: ' + esc(b) + '</option>').join('') + '</select>' : '') +
      '<div class="row mt"><button class="btn grow" data-act="sms-ext">✉ SMS</button><button class="icon wa" data-act="sms-ext" data-b="wa">W</button></div>',
      '<button class="btn text" data-act="sms-back">◀ Zmień wybór</button>');
    return;
  }
  const rows = (msgList || S.bracia.map(b => ({ n: b, tel: S.telefony[b] || '' }))).map(p => {
    const b = p.n, tel = p.tel;
    return '<label class="row chk"><input type="checkbox" data-ch="sms-sel" data-a="' + esc(b) + '"' + (m.sel.indexOf(b) >= 0 ? ' checked' : '') +
      '><span class="grow">' + dot(b) + esc(b) + (m.what === 'msg' || present.indexOf(b) >= 0 ? '' : ' <span class="muted">(nieobecny)</span>') +
      (msgList && m.ws.length > 1 ? ' <span class="muted">· ' + esc(p.wsp) + '</span>' : '') + '</span>' +
      '<span class="muted">' + (tel ? esc(tel) : 'brak numeru') + '</span></label>';
  }).join('');
  const wsChips = msgList && S.wspolnoty.length > 1 ? '<label class="lbl">Wspólnota</label><div class="chips">' + S.wspolnoty.map(w =>
    '<button class="chip' + (m.ws.indexOf(w.id) >= 0 ? ' on' : '') + '" data-act="msg-ws" data-a="' + w.id + '">' + esc(w.nazwa) + '</button>').join('') +
    '<button class="chip' + (m.ws.length === S.wspolnoty.length ? ' on' : '') + '" data-act="msg-ws" data-a="*">Wszystkie</button></div>' : '';
  openModal(title, modeChips + wsChips +
    '<label class="lbl">Do kogo</label><div class="chips">' + (msgList ? [['wszyscy', 'Wszyscy'], ['nikt', 'Nikt']] : [['obecni', 'Obecni'], ['nieobecni', 'Nieobecni'], ['wszyscy', 'Wszyscy'], ['nikt', 'Nikt']]).map(x =>
      '<button class="chip" data-act="sms-grp" data-a="' + x[0] + '">' + x[1] + '</button>').join('') +
      msgGroups(m).map(g => '<button class="chip' + (g.osoby.indexOf(S.owner) >= 0 ? ' me' : '') + '" data-act="sms-grp" data-a="g:' + esc(g.id) + '">' + (g.osoby.indexOf(S.owner) >= 0 ? '★ Moja grupa: ' : 'Grupa: ') + esc(g.nazwa) + '</button>').join('') + '</div>' +
    '<div class="mt">' + rows + '</div>' +
    '<div class="muted mt">Dalej możesz też wysłać do osoby spoza listy. Nic nie wychodzi automatycznie – każdy SMS zatwierdzasz sam.</div>',
    '<button class="btn" data-act="sms-send">Dalej (' + m.sel.length + ') ▶</button>');
}

/* ---------- akcje ---------- */

function selectHaslo(n) {
  if (S.haslo === n) return;
  S.haslo = n;
  const c = S.celebration;
  c.readings = [c.readings[0] || 'Wstęp ogólny', '', '', '', ''];
  c.pages = ['', '', '', '', ''];
  save();
}

function setDone(n, done, by) {
  S.done[n] = { done: !!done, date: done ? today() : '', by: by || '', ts: Date.now() };
  save();
}

function shareText() {
  const c = S.celebration;
  const lines = ['✝ Przygotowanie – ' + plDate(today()), 'Temat: ' + (S.haslo || '—') + (S.zPsalmami ? ' (z Psalmami)' : ' (bez Psalmów)'), '', 'CZYTANIA'];
  for (let i = 0; i < 5; i++) {
    const r = c.readings[i], p = c.pages[i], w = c.who[i];
    if (!r && !w) continue;
    lines.push(READ_LABELS[i] + '. ' + (r || READ_DESC[i]) + (p ? ' (str. ' + p + ')' : '') + (w ? ' – ' + w : ''));
  }
  if (c.songs.some(Boolean)) {
    lines.push('', 'PIEŚNI');
    c.songs.forEach((s, i) => { if (s) lines.push(SONG_LABELS[i] + ': ' + s); });
  }
  const cats = readings();
  if (S.obecni.length && cats.some(x => x.length)) {
    const order = readingOrder();
    const who = roundRobin(cats, order);
    lines.push('', 'ROZDZIAŁ CZYTAŃ');
    order.forEach(p => {
      const m = myReadings(p);
      if (!m.flat.length) return;
      lines.push(p + ':');
      m.byCat.forEach((l, i) => { if (l.length) lines.push('  ' + CAT_SHORT[i] + ': ' + l.join('; ')); });
    });
  }
  return lines.join('\n');
}

function finishDialog() {
  const c = S.celebration;
  modalState = { kind: 'finish' };
  openModal('Dodaj do archiwum',
    '<p>Temat: <b>' + esc(S.haslo) + '</b></p>' +
    '<div class="who"><span class="t">Prowadził(a)</span>' + personSelect(c.who[0], 'fin-by', '').replace('data-ch="fin-by"', 'id="finBy"') + '</div>' +
    '<label class="row mt"><input type="checkbox" id="finMark" checked><span>Oznacz temat jako przerobiony</span></label>',
    '<button class="btn" data-act="finish-ok">Dodaj</button>');
}

function finish(by, mark) {
  const c = S.celebration;
  S.history.unshift({
    id: uuid(), date: today(), haslo: S.haslo, prowadzil: by, tryb: S.zPsalmami ? 'Z Psalmami' : 'Bez Psalmów',
    czytania: c.readings.map((r, i) => (c.pages[i] ? r + ' (str. ' + c.pages[i] + ')' : r)),
    przydzialy: c.who.slice(), piesni: c.songs.slice(), ogolne: {}, ts: Date.now(),
  });
  if (mark && S.haslo) setDone(S.haslo, true, by);
  save();
}

/* ---------- synchronizacja ---------- */

const syncCbs = {};
/* ---- wskaźnik synchronizacji w nagłówku: ok / czeka / brak sieci / błąd ---- */
const SYNC = { pend: 0, ids: {}, state: 'ok', ts: 0, err: '', waitUntil: 0 };
/** Korona obok kropki: to urządzenie jest główne (pełna) albo dotknij, żeby przejąć (pusta). */
function mainBtn() {
  const b = document.getElementById('mainBtn'); if (!b) return;
  const k = S.konto || {};
  if (!k.on || !k.dev) { b.className = 'mainbtn hidden'; return; }
  const me = S.mainDev === k.dev;
  b.className = 'mainbtn' + (me ? ' on' : '');
  b.title = me ? 'To urządzenie jest główne' : 'Ustaw to urządzenie jako główne' + (S.mainDev && S.devices && S.devices[S.mainDev] ? ' (teraz: ' + S.devices[S.mainDev].n + ')' : '');
}
function syncDot() {
  mainBtn();
  const el = document.getElementById('syncDot'); if (!el) return;
  if (!wsReady()) { el.className = 'syncdot hidden'; return; }
  const now = Date.now();
  Object.keys(SYNC.ids).forEach(k => { if (now - SYNC.ids[k] > 30000) { delete SYNC.ids[k]; SYNC.pend = Math.max(0, SYNC.pend - 1); } });   // bez odpowiedzi – nie czekamy w nieskończoność
  const st = SYNC.pend > 0 ? 'wait' : (navigator.onLine === false ? 'off' : SYNC.state);
  el.className = 'syncdot ' + st;
  el.textContent = { ok: '✓', wait: '↻', off: '✕', err: '!' }[st];
  el.setAttribute('aria-label', { ok: 'Zsynchronizowano', wait: 'Czeka na wysłanie', off: 'Brak sieci', err: 'Błąd synchronizacji' }[st]);
}
function syncMark() { /* „czeka” tylko przy prawdziwej wysyłce (httpPost) */ }
function syncAllNow() {
  if (!wsReady()) return;
  S.wspolnoty.forEach(w => { if (wspShared(w)) syncOne(w, false, false); });
  if (window.KAL && KAL.syncKal) KAL.syncKal(false);
}
window.addEventListener('online', () => { syncDot(); setTimeout(syncAllNow, 1500); });
window.addEventListener('offline', syncDot);
window.__syncCb = function (id, ok, text) {
  const cb = syncCbs[id];
  delete syncCbs[id];
  if (SYNC.ids[id]) {
    delete SYNC.ids[id]; SYNC.pend = Math.max(0, SYNC.pend - 1);
    let r = null; try { r = JSON.parse(text); } catch (e) { r = null; }
    if (!ok) { SYNC.state = navigator.onLine === false || /resolve|timeout|network|connect|Unable|Failed/i.test(String(text)) ? 'off' : 'err'; SYNC.err = String(text || '').slice(0, 120); }
    else if (r && r.ok === false) { SYNC.state = 'err'; SYNC.err = r.error || 'odrzucone przez arkusz'; }
    else { SYNC.state = 'ok'; SYNC.ts = Date.now(); SYNC.err = ''; }
    syncDot();
  }
  if (cb) cb(ok, text);
};

function httpPost(url, body, cb) {
  const id = uuid();
  syncCbs[id] = cb;
  SYNC.ids[id] = Date.now(); SYNC.pend++; syncDot(); setTimeout(syncDot, 31000);
  if (A) { A.sync(url, body, id); return; }
  fetch(url, { method: 'POST', body: body }).then(r => r.text()).then(t => window.__syncCb(id, true, t))
    .catch(e => window.__syncCb(id, false, String(e)));
}

function doSync(pushBracia) {
  const u = document.getElementById('syncUrl'), t = document.getElementById('syncToken');
  if (u) S.syncUrl = u.value.trim();
  if (t) S.syncToken = t.value.trim();
  save();
  if (!S.syncUrl || !S.syncToken) { UI.syncStatus = 'Uzupełnij adres Web App i token.'; render(); return; }
  UI.syncing = true; UI.syncStatus = 'Synchronizuję…'; render();
  const req = {
    token: S.syncToken, action: 'sync',
    done: Object.keys(S.done).map(h => ({ h: h, done: S.done[h].done, date: S.done[h].date || '', by: S.done[h].by || '', ts: S.done[h].ts || 0 })),
    history: S.history, bracia: pushBracia ? S.bracia : null, deletedHistory: S.deletedHistory,
  };
  httpPost(S.syncUrl, JSON.stringify(req), (ok, text) => {
    UI.syncing = false;
    let r = null;
    if (ok) { try { r = JSON.parse(text); } catch (e) { ok = false; text = 'nieprawidłowa odpowiedź (sprawdź adres /exec i dostęp „Każdy”)'; } }
    if (!ok) { UI.syncStatus = 'Brak połączenia lub błąd: ' + text; render(); return; }
    if (!r.ok) { UI.syncStatus = 'Błąd: ' + (r.error || 'nieznany'); render(); return; }
    (r.done || []).forEach(d => {
      const l = S.done[d.h];
      if (!l || (d.ts || 0) >= (l.ts || 0)) S.done[d.h] = { done: !!d.done, date: d.date || '', by: d.by || '', ts: d.ts || 0 };
    });
    const ids = new Set(S.history.map(e => e.id));
    (r.history || []).forEach(e => { if (e && e.id && !ids.has(e.id) && S.deletedHistory.indexOf(e.id) < 0) S.history.push(e); });
    S.history.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (S.braciaZArkusza && !S.wspolnota.ts && !pushBracia && r.bracia && r.bracia.length) {
      S.bracia = r.bracia.slice();
      S.obecni = S.bracia.filter(b => S.obecni.indexOf(b) >= 0);
      S.eucharystia.obecni = S.bracia.filter(b => S.eucharystia.obecni.indexOf(b) >= 0);
    }
    S.deletedHistory = [];
    S.lastSync = Date.now();
    save();
    UI.syncStatus = pushBracia ? 'Wysłano listę braci i zsynchronizowano.' : 'Zsynchronizowano.';
    render();
  });
}

/* ---------- wspólne przygotowanie: prowadzący wysyła, pozostali pobierają ---------- */

const SHARED_KEYS = ['haslo', 'zPsalmami', 'filtry', 'obecni', 'kolejnosc', 'celebration', 'eucharystia'];
let pubTimer = null, lastPub = '', pulling = false;

function prepPayload() {
  const o = { by: S.owner };
  SHARED_KEYS.forEach(k => { o[k] = JSON.parse(JSON.stringify(S[k])); });
  return o;
}
function wsReady() { return !!(S.syncUrl && S.syncToken); }
function wsStatus(m) {
  UI.wsStatus = m;
  const el = document.getElementById('wsStatus');
  if (el) el.textContent = m;
}
function hhmm(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

function schedulePublish() {
  if (S.wspolne.rola !== 'prowadze' || !wsReady()) return;
  clearTimeout(pubTimer);
  pubTimer = setTimeout(publishNow, 2500);
}
function publishNow(force) {
  if (S.wspolne.rola !== 'prowadze' || !wsReady()) return;
  const p = prepPayload(), j = JSON.stringify(p);
  if (j === lastPub && !force) return;
  wsStatus('Wysyłam…');
  httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'publish', ts: Date.now(), prep: p }), (ok, text) => {
    let r = null;
    try { r = JSON.parse(text); } catch (e) { r = null; }
    if (ok && r && r.ok) { lastPub = j; stanMark('pub'); wsStatus('Wysłano do wspólnoty o ' + hhmm(Date.now()) + '.'); }
    else wsStatus('Nie wysłano: ' + (r && r.error ? r.error : 'brak połączenia') + '. Spróbuję przy następnej zmianie.');
  });
}
function pullNow(manual) {
  if (S.wspolne.rola !== 'pobieram' || !wsReady() || pulling) return;
  pulling = true;
  if (manual) wsStatus('Pobieram…');
  httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'pull' }), (ok, text) => {
    pulling = false;
    let r = null;
    try { r = JSON.parse(text); } catch (e) { r = null; }
    if (!ok || !r || !r.ok) { if (manual) wsStatus('Nie pobrano: ' + (r && r.error ? r.error : 'brak połączenia') + '.'); return; }
    stanMark('pull');
    if (!r.prep) { if (manual) wsStatus('Prowadzący jeszcze nic nie wysłał.'); return; }
    if (r.ts <= (S.wspolne.ts || 0)) { if (manual) wsStatus('Masz aktualną wersję (od ' + (S.wspolne.by || '?') + ', ' + hhmm(r.ts) + ').'); return; }
    const pick = {};
    SHARED_KEYS.forEach(k => { if (r.prep[k] !== undefined) pick[k] = r.prep[k]; });
    S = normalizeState(Object.assign({}, S, pick));
    S.wspolne.ts = r.ts; S.wspolne.by = r.prep.by || '';
    save(true);
    wsStatus('Zaktualizowano: od ' + (S.wspolne.by || 'prowadzącego') + ', ' + hhmm(r.ts) + '.');
    const ae = document.activeElement;
    if (!ae || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(ae.tagName) < 0) render();
    toast('Przygotowanie zaktualizowane' + (S.wspolne.by ? ' (od ' + S.wspolne.by + ')' : '') + '.');
  });
}
setInterval(() => { if (document.visibilityState !== 'hidden') pullNow(false); }, 20000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullNow(false); });

function joinCode(w) {
  const o = { u: S.syncUrl, t: S.syncToken };
  if (w && wspShared(w)) { o.w = w.key; o.n = w.nazwa; }
  const j = JSON.stringify(o);
  return btoa(unescape(encodeURIComponent(j))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function joinLink(w) { return 'przygotowanie://polacz?k=' + joinCode(w); }
function parseCode(k) {
  try {
    k = String(k).trim().replace(/^.*[?&]k=/, '').replace(/-/g, '+').replace(/_/g, '/');
    const o = JSON.parse(decodeURIComponent(escape(atob(k))));
    return o.u && o.t ? o : null;
  } catch (e) { return null; }
}
/** Kod połączenia: ustawia adres i token; rola – podana albo pytamy (prowadzę / pobieram). */
function useCode(k, rola) {
  const o = parseCode(k);
  if (!o) { toast('Nieprawidłowy kod połączenia.'); return false; }
  S.syncUrl = o.u; S.syncToken = o.t;
  if (o.w !== undefined) {   // kod konkretnej wspólnoty – dołącz do niej (lub odśwież istniejącą)
    let w = S.wspolnoty.find(x => x.key === o.w);
    if (!w) {
      const w0 = S.wspolnoty[0];   // nowa instalacja: domyślna lista nigdy nie synchronizowana – zastępujemy ją tą wspólnotą
      const empty = S.wspolnoty.length === 1 && (!S.bracia.length || (!(w0.sync && w0.sync.ts) && !wspSends(w0))) ? w0 : null;
      if (empty) { w = empty; w.key = o.w; w.nazwa = o.n || w.nazwa; S.bracia = []; S.telefony = {}; S.role = {}; S.kolory = {}; S.grupy = []; S.obecni = []; }
      else { w = { id: uuid(), nazwa: o.n || 'Wspólnota', key: o.w, bracia: [], telefony: {}, role: {}, kolory: {}, grupy: [] }; S.wspolnoty.push(w); }
      w.send = false; w.sync = { ts: 0, by: '' };
    }
    switchCommunity(w.id);
    pullOne(w, false);
    toast('Dołączono do wspólnoty „' + w.nazwa + '”.');
  }
  save(true);
  if (!rola) {
    modalState = { kind: 'role' };
    openModal('Połączono z arkuszem', '<p>Adres i token zapisane. Jak chcesz korzystać ze wspólnego przygotowania?</p>',
      '<button class="btn ghost" data-act="ws-rola-set" data-a="pobieram">Pobieram</button>' +
      '<button class="btn" data-act="ws-rola-set" data-a="prowadze">Prowadzę</button>');
    return true;
  }
  setRola(rola);
  return true;
}
function setRola(r) {
  S.wspolne = { rola: r, ts: 0 }; lastPub = ''; UI.wsStatus = '';
  save(true);
  if (r === 'prowadze') publishNow(true);
  if (r === 'pobieram') pullNow(true);
  pullCommunity(false); scheduleCommunity();
  toast(r === 'prowadze' ? 'Prowadzisz – przygotowanie będzie wysyłane.' : r === 'pobieram' ? 'Połączono – pobieram przygotowanie.' : 'Wyłączono.');
}

/* ---- czytnik kodów QR (aparat w telefonie, odczyt jsQR) ---- */
let scanStream = null, scanTimer = null;
async function openScanner() {
  openModal('Skanuj kod QR', '<video id="qrv" playsinline muted class="qrvideo"></video><canvas id="qrc" hidden></canvas>' +
    '<p class="muted" id="qrMsg">Nakieruj aparat na kod połączenia (z arkusza lub od prowadzącego).</p>');
  modalState = { kind: 'scan' };
  try {
    if (!window.jsQR) await loadScript('lib/jsQR.js');
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const v = document.getElementById('qrv');
    if (!v) { stopScanner(); return; }
    v.srcObject = scanStream;
    await v.play();
    const c = document.getElementById('qrc'), ctx = c.getContext('2d', { willReadFrequently: true });
    scanTimer = setInterval(() => {
      if (!v.videoWidth) return;
      const w = 480, h = Math.round(480 * v.videoHeight / v.videoWidth);
      c.width = w; c.height = h;
      ctx.drawImage(v, 0, 0, w, h);
      const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      if (r && r.data) {
        stopScanner();
        closeModal();
        if (window.KASA && KASA.scan(r.data)) return;
        if (parseCode(r.data)) useCode(r.data); else toast('To nie jest kod połączenia aplikacji.');
      }
    }, 250);
  } catch (e) {
    stopScanner();
    const m = document.getElementById('qrMsg');
    if (m) m.textContent = 'Brak dostępu do aparatu (' + (e && e.name ? e.name : e) + '). Zezwól aplikacji na aparat albo wklej kod ręcznie.';
  }
}
function stopScanner() {
  clearInterval(scanTimer); scanTimer = null;
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
}
window.onJoinLink = function (url) { go('start'); useCode(url); };

async function showQr(w) {
  if (!window.qrcode) await loadScript('lib/qrcode.js');
  const q = qrcode(0, 'M');
  q.addData(joinLink(w));
  q.make();
  modalState = { kind: 'qr', w: w ? w.id : null };
  openModal(w ? 'Kod wspólnoty „' + w.nazwa + '”' : 'Kod połączenia', '<div class="qr">' + q.createSvgTag(6, 12) + '</div>' +
    '<p class="muted">' + (w ? 'Osoba z tej wspólnoty skanuje kod aparatem (w aplikacji: Ustawienia → Wspólne przygotowanie → Skanuj). Dostanie listę „' + esc(w.nazwa) + '” i jej aktualizacje.'
      : 'Druga osoba skanuje ten kod aparatem w telefonie (z zainstalowaną aplikacją) albo wkleja kod tekstowy w Ustawieniach.') + '</p>',
    w ? '<button class="btn ghost" data-act="wsp-invite">Wyślij zaproszenie</button>' : '');
}

function wsCard() {
  const r = S.wspolne.rola;
  return '<div class="card"><h2>Wspólne przygotowanie</h2>' +
    '<div class="muted">Prowadzący wysyła przygotowanie, a pozostali widzą to samo u siebie (odświeżanie co ok. 20 s).</div>' +
    '<div class="chips mt">' + [['off', 'Wyłączone'], ['prowadze', 'Prowadzę – wysyłam'], ['pobieram', 'Pobieram']].map(t =>
      '<button class="chip' + (r === t[0] ? ' on' : '') + '" data-act="ws-rola" data-a="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' +
    (r !== 'off' && !wsReady() ? '<div class="notice">Najpierw uzupełnij adres i token w „Synchronizacja z Arkuszem” albo wklej kod od prowadzącego.</div>' : '') +
    '<div class="muted mt" id="wsStatus">' + esc(UI.wsStatus || '') + '</div>' +
    (wsReady() ? '<div class="row mt">' +
      (r === 'prowadze' ? '<button class="btn ghost grow" data-act="ws-pub">Wyślij teraz</button>' : '') +
      (r === 'pobieram' ? '<button class="btn ghost grow" data-act="ws-pull">Pobierz teraz</button>' : '') + '</div>' +
      (r === 'prowadze' ? '<div class="row mt"><button class="btn ghost grow" data-act="ws-qr">Kod QR</button>' +
        '<button class="btn ghost grow" data-act="ws-invite">Wyślij zaproszenie</button></div>' : '') : '') +
    '<button class="btn full mt" data-act="ws-scan">📷 Skanuj kod QR</button>' +
    '<label class="lbl mt">…albo wklej kod</label><div class="row"><input type="text" id="wsCode" class="grow" placeholder="Wklej kod lub link">' +
    '<button class="btn" data-act="ws-join">Połącz</button></div></div>';
}

/* ---------- import / eksport ---------- */

/* ---------- Pakiet startowy: wybrane części danych dla innej osoby; „Uzupełnij z kopii” – dołącza do istniejących ---------- */
const PACK = [
  ['wsp', 'Wspólnoty – osoby, funkcje, telefony, grupy, małżeństwa, katechiści, etap', true],
  ['kal', 'Kalendarz i grupy robocze', true],
  ['rz', 'Rozpiski (konwiwencja, Pascha, pokutna, własne – także archiwum)', true],
  ['hist', 'Archiwum Liturgii Słowa i przerobione tematy', true],
  ['zr', 'Własne tematy, linki i adres śpiewnika', true],
  ['sync', 'Połączenie z arkuszem wspólnoty (adres, token, wspólne przygotowanie)', false],
  ['wyg', 'Wygląd (kafelki, motyw, czcionka)', false]
];
function packOf(st, sel) {
  const p = { trojnogPack: 1, ver: A && A.version ? A.version() : '', od: st.owner || '', t: Date.now(), parts: {} };
  if (sel.wsp) p.parts.wsp = { wspolnoty: st.wspolnoty, maile: st.maile || {}, nieakt: st.nieakt || {}, wspolnota: st.wspolnota };
  if (sel.kal) p.parts.kal = { kal: st.kal || [], grupyRob: st.grupyRob || [] };
  if (sel.rz) p.parts.rz = { rozpiski: st.rozpiski || {} };
  if (sel.hist) p.parts.hist = { history: st.history || [], done: st.done || {} };
  if (sel.zr) p.parts.zr = { extraHasla: st.extraHasla || [], myLinks: st.myLinks || [], spiewnikUrl: st.spiewnikUrl };
  if (sel.sync) p.parts.sync = { syncUrl: st.syncUrl, syncToken: st.syncToken, wspolne: st.wspolne, braciaZArkusza: st.braciaZArkusza };
  if (sel.wyg) p.parts.wyg = { hiddenTiles: st.hiddenTiles, tileOrder: st.tileOrder, theme: st.theme, font: st.font, tilesMin: st.tilesMin, tilesCols: st.tilesCols };
  return p;
}
function packDialog() {
  modalState = { kind: 'pack', sel: Object.assign({}, ...PACK.map(x => ({ [x[0]]: x[2] }))) };
  packRender();
}
function packRender() {
  const m = modalState;
  openModal('Pakiet startowy dla innej osoby', '<div class="muted">Plik z wybranymi danymi – ktoś (np. brat) wczyta go w Ustawienia → Bezpieczeństwo → „Uzupełnij z kopii” i aplikacja od razu ma Twoją bazę. Prywatne rzeczy (skrutacje, notatki, kasetka, Moje konto, hasła) nie trafiają do pakietu.</div>' +
    PACK.map(x => '<label class="row chk"><input type="checkbox" data-ch="pack-sel" data-a="' + x[0] + '"' + (m.sel[x[0]] ? ' checked' : '') + '><span class="grow">' + esc(x[1]) + (x[0] === 'sync' ? '<br><span class="muted">tylko dla zaufanych – daje dostęp do arkusza wspólnoty</span>' : '') + '</span></label>').join(''),
    '<button class="btn ghost" data-act="pack-save">Zapisz plik</button><button class="btn" data-act="pack-send">✉ Wyślij</button>');
}
/** Wczytany plik: pakiet albo pełna kopia – wybór części i sposobu (uzupełnij / zastąp). */
function importDialog(obj) {
  const full = !obj.trojnogPack, p = full ? packOf(normalizeState(obj), Object.assign({}, ...PACK.map(x => ({ [x[0]]: true })))) : obj;
  modalState = { kind: 'imp', p: p, full: full ? obj : null, sel: Object.assign({}, ...PACK.filter(x => p.parts[x[0]]).map(x => ({ [x[0]]: x[0] !== 'sync' || !S.syncUrl }))) };
  impRender();
}
function impRender() {
  const m = modalState, have = PACK.filter(x => m.p.parts[x[0]]);
  openModal('Uzupełnij z kopii', '<div class="muted">' + (m.full ? 'Pełna kopia danych' : 'Pakiet') + (m.p.od ? ' od: <b>' + esc(m.p.od) + '</b>' : '') + (m.p.t ? ' · ' + new Date(m.p.t).toLocaleDateString('pl-PL') : '') +
    '. Zaznacz, co dodać. Twoje dane zostają – nowe osoby, wydarzenia, rozpiski i wpisy archiwum dopiszą się, a te same zostaną połączone.</div>' +
    have.map(x => '<label class="row chk"><input type="checkbox" data-ch="imp-sel" data-a="' + x[0] + '"' + (m.sel[x[0]] ? ' checked' : '') + '><span class="grow">' + esc(x[1]) + '</span></label>').join('') +
    (m.full ? '<button class="btn text full mt" data-act="kimp-replace">Zamiast tego: zastąp wszystkie moje dane tą kopią</button>' : ''),
    '<button class="btn" data-act="kimp-ok">Uzupełnij</button>');
}
function applyPack(p, sel) {
  storeActive();
  const P = p.parts, n = { wsp: 0, os: 0, kal: 0, rz: 0, hist: 0 };
  if (sel.wsp && P.wsp) {
    if (S.wspolnoty.length === 1 && !S.bracia.length && !(S.wspolnoty[0].bracia || []).length) { S.wspolnoty = []; S.wspAktywna = ''; }   // świeża instalacja – pusta wspólnota znika
    (P.wsp.wspolnoty || []).forEach(w => {
      const loc = S.wspolnoty.find(x => x.id === w.id) || S.wspolnoty.find(x => x.nazwa.toLowerCase() === String(w.nazwa).toLowerCase() || (w.key && x.key === w.key));
      if (!loc) { S.wspolnoty.push(JSON.parse(JSON.stringify(w))); n.wsp++; n.os += (w.bracia || []).length; return; }
      (w.bracia || []).forEach(b => { if ((loc.bracia = loc.bracia || []).indexOf(b) < 0) { loc.bracia.push(b); n.os++; } });
      ['telefony', 'kolory', 'malz'].forEach(k => { loc[k] = Object.assign({}, w[k] || {}, loc[k] || {}); });
      loc.role = loc.role || {}; Object.keys(w.role || {}).forEach(b => { if (!loc.role[b] || !loc.role[b].length) loc.role[b] = w.role[b]; });
      const gn = (loc.grupy = loc.grupy || []); (w.grupy || []).forEach(g => { const lg = gn.find(x => x.id === g.id || x.nazwa === g.nazwa); if (!lg) gn.push(JSON.parse(JSON.stringify(g))); else g.osoby.forEach(b => { if (lg.osoby.indexOf(b) < 0 && !gn.some(x => x.osoby.indexOf(b) >= 0)) lg.osoby.push(b); }); });
      (w.katechisci || []).forEach(k => { if (!(loc.katechisci = loc.katechisci || []).some(x => x.imie === k.imie)) loc.katechisci.push(k); });
      ['etap', 'region'].forEach(k => { if (!loc[k] && w[k]) loc[k] = w[k]; });
    });
    S.maile = Object.assign({}, P.wsp.maile || {}, S.maile || {}); S.nieakt = Object.assign({}, P.wsp.nieakt || {}, S.nieakt || {});
    if (S.wspolnoty.length && !S.wspolnoty.some(w => w.id === S.wspAktywna)) S.wspAktywna = S.wspolnoty[0].id;
  }
  if (sel.kal && P.kal) {
    S.kal = S.kal || [];
    (P.kal.kal || []).forEach(e => { const i = S.kal.findIndex(x => x.id === e.id); if (i < 0) { S.kal.push(e); n.kal++; } else if ((e.ts || 0) > (S.kal[i].ts || 0)) S.kal[i] = e; });
    S.grupyRob = S.grupyRob || []; (P.kal.grupyRob || []).forEach(g => { if (!S.grupyRob.some(x => x.id === g.id)) S.grupyRob.push(g); });
  }
  if (sel.rz && P.rz) {
    if (window.RZ) RZ.ensure();
    Object.keys(P.rz.rozpiski || {}).forEach(k => {
      const r = P.rz.rozpiski[k], loc = S.rozpiski[k];
      if (!loc || (!(loc.ts > 0) && !loc.ev)) { S.rozpiski[k] = r; n.rz++; }   // nie ma albo jest tylko pusty szablon
      else if (JSON.stringify(loc.dni) !== JSON.stringify(r.dni)) { S.rozpiski[k.split(':')[0] + ':i' + uuid().slice(0, 7)] = r; n.rz++; }
    });
  }
  if (sel.hist && P.hist) {
    (P.hist.history || []).forEach(h => { if (!S.history.some(x => x.id === h.id)) { S.history.push(h); n.hist++; } });
    S.history.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    Object.keys(P.hist.done || {}).forEach(k => { if (!S.done[k]) S.done[k] = P.hist.done[k]; });
  }
  if (sel.zr && P.zr) {
    (P.zr.extraHasla || []).forEach(h => { if (!S.extraHasla.some(x => JSON.stringify(x) === JSON.stringify(h))) S.extraHasla.push(h); });
    S.myLinks = S.myLinks || []; (P.zr.myLinks || []).forEach(l => { if (!S.myLinks.some(x => x.url === l.url)) S.myLinks.push(l); });
    if (P.zr.spiewnikUrl && !S.spiewnikUrl) S.spiewnikUrl = P.zr.spiewnikUrl;
  }
  if (sel.sync && P.sync) { if (P.sync.syncUrl) { S.syncUrl = P.sync.syncUrl; S.syncToken = P.sync.syncToken; } if (P.sync.wspolne && (!S.wspolne || S.wspolne.rola === 'off')) S.wspolne = Object.assign({}, P.sync.wspolne, { rola: 'pobieram' }); }
  if (sel.wyg && P.wyg) Object.keys(P.wyg).forEach(k => { if (P.wyg[k] !== undefined) S[k] = P.wyg[k]; });
  const act = S.wspolnoty.some(w => w.id === S.wspAktywna) ? S.wspAktywna : (S.wspolnoty[0] || {}).id;
  S.wspAktywna = ''; if (act) switchCommunity(act);   // bez storeActive – wspólnota już uzupełniona
  return n;
}
window.onImport = function (text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { toast('To nie jest poprawny plik kopii.'); return; }
  if (obj && (obj.trojnogPack || obj.wspolnoty || obj.bracia)) { importDialog(obj); return; }
  let st;
  try { st = normalizeState(obj); } catch (e) { toast('To nie jest poprawna kopia danych.'); return; }
  confirmBox('Wczytać kopię?', 'Obecne dane w aplikacji zostaną zastąpione danymi z pliku.', 'Wczytaj', () => {
    S = st; save(); toast('Wczytano kopię danych.'); render();
  });
};

/* ---------- obsługa zdarzeń ---------- */

document.addEventListener('click', ev => {
  const h2 = ev.target.closest('.card.fold > h2');
  if (h2 && !ev.target.closest('button, label, input, select, a')) {
    const c = h2.parentElement, key = c.dataset.key;
    S.collapsed = S.collapsed || {};
    if (c.classList.toggle('collapsed')) S.collapsed[key] = true; else if (c.dataset.def === 'c') S.collapsed[key] = false; else delete S.collapsed[key];
    save(true);
    return;
  }
  const el = ev.target.closest('[data-act]');
  if (!el) {
    if (ev.target.id === 'modal') closeModal();
    return;
  }
  const act = el.dataset.act, a = el.dataset.a;
  if (window.KAL && KAL.act(act, a, el)) return;
  if (window.KONTO && KONTO.act(act, a, el)) return;
  if (window.ZDJ && ZDJ.act(act, a, el)) return;
  if (window.RZ && RZ.act(act, a, el)) return;
  if (window.KAT && KAT.act(act, a, el)) return;
  if (window.WYG && WYG.act(act, a, el)) return;
  if (window.KASA && KASA.act(act, a, el)) return;
  if (['draw-topic', 'eu-draw', 'shuffle-order'].indexOf(act) >= 0) {
    if (!UI.armed || !UI.armed[act]) { toast('Najpierw zaznacz „odblokuj”.'); return; }
    UI.armed[act] = false;
  }
  if (act === 'pick' && ev.target.closest('.eye')) return;
  const c = S.celebration;
  switch (act) {
    case 'tab': subnavToggle(false); go(a); return;
    case 'liturgia': subnavToggle(); return;
    case 'mode': S.zPsalmami = a === '1'; save(); break;
    case 'draw-topic': {
      const names = allNames();
      let pool = names.filter(n => !isDone(n) && n !== S.haslo);
      if (!pool.length) pool = names.filter(n => !isDone(n));
      if (!pool.length) { toast('Wszystkie tematy są już przerobione.'); return; }
      selectHaslo(pool[Math.floor(Math.random() * pool.length)]);
      UI.pop = true;
      document.getElementById('main').scrollTop = 0;
      break;
    }
    case 'clear-topic': selectHaslo(''); break;
    case 'dict': {
      const h = BY_NAME[S.haslo];
      openModal(S.haslo, '<div class="dict">' + h.s.map(e => (e.t ? '<h4>' + esc(e.t) + '</h4>' : '') +
        (e.r ? '<p>' + esc(e.r.join('; ')) + '</p>' : '')).join('') + '</div>');
      return;
    }
    case 'filter': UI.filter = +a; break;
    case 'select-h': selectHaslo(a); break;
    case 'present': {
      const set = new Set(S.obecni);
      if (set.has(a)) set.delete(a); else set.add(a);
      S.obecni = S.bracia.filter(b => set.has(b)); save(); break;
    }
    case 'prep-cal': if (window.KAL) { KAL.prepToCal(a, true); render(); } return;
    case 'bible': openBible(a); return;
    case 'kop-now': autoBackup(true); toast('Zapisano kopię.'); render(); return;
    case 'kop-gmail': case 'kop-mail': {
      storeActive(); const t = act === 'kop-mail' ? (A.loadText(a) || '') : JSON.stringify(S);
      if (!t) { toast('Kopia jest pusta.'); return; }
      const nm = 'trojnog-kopia-' + (act === 'kop-mail' ? a.replace(/\D/g, '') : today().replace(/-/g, '')) + '.json';
      if (A && A.shareBackup) A.shareBackup(t, nm, act === 'kop-gmail'); else if (A && A.exportData) A.exportData(t, nm);
      return; }
    case 'kop-rest': confirmBox('Przywrócić kopię?', 'Obecne dane zostaną zastąpione kopią z ' + a.replace(/\D/g, '').replace(/(\d{4})(\d{2})(\d{2})/, '$3.$2.$1') + '. (Dzisiejszy stan zapisze się jako osobna kopia.)', 'Przywróć', () => {
        const t = A.loadText(a); if (!t) { toast('Nie można odczytać kopii.'); return; }
        try { const st = normalizeState(JSON.parse(t)); autoBackup(true); const keep = { konto: S.konto, imiona: S.imiona, tut: S.tut }; S = Object.assign(st, keep); save(); toast('Przywrócono kopię.'); render(); } catch (e) { toast('Kopia uszkodzona.'); }
      }); return;
    case 'tut-next': tutNext(); return;
    case 'tut-skip': tutEnd(); return;
    case 'tut-again': S.tut = {}; save(true); go('start'); setTimeout(() => tutStart('start', true), 400); return;
    case 'welc': welcomeDialog(+a); return;
    case 'welc-end': closeModal(); S.welcomed = 1; save(true); setTimeout(() => tutStart(UI.view || 'start'), 300); return;
    case 'moje-rz': if (window.RZ) RZ.openKey(a); return;
    case 'stan': case 'stan-run': stanDialog(); return;
    case 'stan-go': closeModal(); if (a === 'wsp') { go('wspolnota'); return; } if (a === 'kal') { go('kalendarz'); return; } if (a === 'kasa') { go('wydatki'); return; }
      UI.setGrp = a; go('wiecej'); return;
    case 'imiona': S.imiona = a; save(true); render(); return;
    case 'all-present': S.obecni = S.obecni.length >= aktywni().length ? [] : aktywni(); save(); break;
    case 'mine': UI.mine = a; break;
    case 'read-menu': {
      const i = +a;
      openPicker(READ_DESC[i], readings()[i - 1], (v, add) => {
        c.readings[i] = add && c.readings[i] ? c.readings[i] + '; ' + v : v; save();
      }, { append: true });
      return;
    }
    case 'pick-custom': {
      if (!modalState || modalState.kind !== 'picker') return;
      const cb = modalState.onPick, q = (document.getElementById('pq') || {}).value || '';
      promptBox('Inna pieśń', 'Tytuł (spoza listy)', q, n => { n = String(n || '').trim(); closeModal(); if (n) cb(n, false); });
      return;
    }
    case 'pick': case 'pick-add': {
      if (!modalState || modalState.kind !== 'picker') return;
      const cb = modalState.onPick;
      closeModal(); cb(a, act === 'pick-add'); break;
    }
    case 'draw-who':
      c.who = drawWithLocks(S.obecni, c.who, c.locked);
      c.locked = c.locked.map((l, i) => !!(l && c.who[i]));
      save(); toast('Wylosowano wolne miejsca.'); break;
    case 'lock-who': { const i = +a; c.locked[i] = !(c.locked[i] && c.who[i]) && !!c.who[i]; save(); break; }
    case 'lock-eu': { const e = S.eucharystia; e.locked[a] = !(e.locked[a] && e.who[a]) && !!e.who[a]; save(); break; }
    case 'send-mine': {
      const t = S.telefony[a] || '', text = mineText(a);
      if (el.dataset.b === 'wa') openUrl((t ? 'https://wa.me/' + phoneDigits(t) : 'https://wa.me/') + '?text=' + encodeURIComponent(text));
      else openUrl(smsUrl(t ? [t.replace(/\s/g, '')] : [], text));
      return;
    }
    case 'sms-all': openSmsDialog('slowo'); return;
    case 'eu-sms': openSmsDialog('eu'); return;
    case 'eu-fetch': fetchEuReadings(true); render(); return;
    case 'eu-full': { const t = euTarget(); if (t) openUrl('https://www.niedziela.pl/liturgia/' + t); return; }
    case 'sms-grp': { grabMsg();
      const m = modalState, present = m.what === 'eu' ? S.eucharystia.obecni : S.obecni;
      const all = m.what === 'msg' ? peopleOf(m.ws).map(p => p.n) : S.bracia;
      const grp = a.indexOf('g:') === 0 ? msgGroups(m).find(g => g.id === a.slice(2)) : null;
      m.grpLabel = grp ? 'Grupa: ' + grp.nazwa : ({ obecni: 'Obecni', nieobecni: 'Nieobecni', wszyscy: 'Wszyscy' }[a] || '');
      m.sel = grp ? all.filter(b => grp.osoby.indexOf(b) >= 0) : a === 'obecni' ? present.slice() : a === 'nieobecni' ? all.filter(b => present.indexOf(b) < 0) : a === 'wszyscy' ? all.slice() : [];
      renderSmsDialog(); return;
    }
    case 'msg-open': openSmsDialog('msg'); return;
    case 'msg-ws': { grabMsg(); const m = modalState;
      if (a === '*') m.ws = m.ws.length === S.wspolnoty.length ? [] : S.wspolnoty.map(w => w.id);
      else m.ws = m.ws.indexOf(a) >= 0 ? m.ws.filter(x => x !== a) : m.ws.concat([a]);
      m.sel = peopleOf(m.ws).map(p => p.n); renderSmsDialog(); return; }
    case 'sms-send': {
      const m = modalState;
      if (m.what === 'msg') {
        grabMsg();
        if (!(S.msgDraft || '').trim()) { toast('Wpisz treść wiadomości.'); return; }
      }
      m.stage = 'queue'; renderSmsDialog(); return;
    }
    case 'sms-mode': modalState.mode = a; modalState.body = undefined; renderSmsDialog(); return;
    case 'sms-back': grabSmsEdit(); modalState.stage = 'pick'; renderSmsDialog(); return;
    case 'app-settings': if (A && A.openAppSettings) A.openAppSettings(); return;
    case 'smsfail-back': if (window.__smsBack) { modalState = window.__smsBack; renderSmsDialog(); } else closeModal(); return;
    case 'sms-seq': { grabSmsEdit(); const m = modalState;
      m.seq = m.sel.filter(b => smsHasContent(b, m.mode) && smsTel(m, b) && !m.sent[b]); m.seqI = 0;
      if (!m.seq.length) { toast('Nikt z wybranych (z numerem) nie czeka na wiadomość.'); return; }
      smsSeqNext(m); return; }
    case 'sms-seqnext': smsSeqNext(modalState); return;
    case 'sms-seqend': { const m = modalState; m.seq = null; renderSmsDialog(); return; }
    case 'sms-pv': { grabSmsEdit(); const m = modalState; m.pv = Math.max(0, (m.pv || 0) + (+a)); renderSmsDialog(); return; }
    case 'sms-auto': { grabSmsEdit(); const m = modalState;
      sendAllAuto(m.sel.filter(b => smsHasContent(b, m.mode)).map(b => { const t = smsTextFor(b, m.mode); return { tel: smsTel(m, b), text: m.ascii !== false ? noPl(t) : t }; }), () => {
        m.sel.forEach(b => { if (smsTel(m, b)) m.sent[b] = true; }); if (modalState === m) renderSmsDialog(); }, m.grpLabel);
      return; }
    case 'sms-group': { grabSmsEdit(); const m = modalState;
      sendGroup(m.sel.map(b => smsTel(m, b)), smsTextFor('', m.mode)); return; }
    case 'sms-one': case 'sms-ext': {
      const m = modalState; grabSmsEdit();
      let tel, text;
      if (act === 'sms-one') { tel = smsTel(m, a); text = smsTextFor(a, m.mode); m.sent[a] = true; }
      else {
        const nm = document.getElementById('smsXName').value.trim(), who = document.getElementById('smsXWho');
        tel = document.getElementById('smsXTel').value.trim();
        text = who && who.value ? mineText(who.value) : smsTextFor(nm, m.mode === 'moje' ? 'uklad' : m.mode);
      }
      if (el.dataset.b === 'wa') openUrl((tel ? 'https://wa.me/' + phoneDigits(tel) : 'https://wa.me/') + '?text=' + encodeURIComponent(text));
      else openUrl(smsUrl(tel ? [tel.replace(/\s/g, '')] : [], text));
      if (act === 'sms-one') renderSmsDialog();
      return;
    }
    case 'other-ok': {
      const m = modalState, v = document.getElementById('otherName').value.trim(), addIt = document.getElementById('otherAdd').checked;
      if (!v) { toast('Wpisz imię.'); return; }
      closeModal();
      if (addIt && S.bracia.indexOf(v) < 0) S.bracia.push(v);
      if (m.ch === 'who') { c.who[+m.a] = v; c.locked[+m.a] = true; }
      else if (m.ch === 'eu-who') { S.eucharystia.who[m.a] = v; S.eucharystia.locked[m.a] = true; }
      save(); break;
    }
    case 'eu-archive': {
      const e = S.eucharystia, og = {};
      EU_ROLES.forEach(r => { if (e.who[r]) og[r] = e.who[r]; });
      if (e.godzina) og['Zbiórka'] = e.godzina;
      S.history.unshift({ id: uuid(), date: e.data || today(), haslo: 'Eucharystia', prowadzil: '', tryb: 'Eucharystia',
        czytania: [], przydzialy: [], piesni: [], ogolne: og, ts: Date.now() });
      save(); toast('Dodano do archiwum.'); return;
    }
    case 'bread': openModal('Chleb do Eucharystii', '<div class="dict">' + BREAD_HTML + '</div>'); return;
    case 'theme': S.theme = a; save(); break;
    case 'font': S.fontScale = +a; save(true); break;
    case 'tiles-cols': S.tilesMin = a !== '0'; if (S.tilesMin) S.tilesCols = +a; save(true); break;
    case 'tile-mv': {
      const o = tilesOrdered().map(t => t[0]), i = o.indexOf(a), j = i + (+el.dataset.b);
      if (i < 0 || j < 0 || j >= o.length) return;
      o.splice(j, 0, o.splice(i, 1)[0]); S.tileOrder = o; save(true); break;
    }
    case 'tile-reset': delete S.tileOrder; save(true); break;
    case 'kc-open': kcDialog(); return;
    case 'note-add': {
      const d = UI.note || {}; const t = (d.tekst || '').trim();
      if (!t) { toast('Wpisz treść zapisku.'); return; }
      notes().unshift({ id: uuid(), tytul: (d.tytul || '').trim() || S.haslo || 'Zapisek', data: d.data || today(), tekst: t, ts: Date.now() });
      UI.note = null; save(true); toast('Zapisano w notatniku.'); render(); return;
    }
    case 'note-edit': UI.noteEd = a; document.getElementById('main').scrollTop = 0; render(); return;
    case 'note-done': UI.noteEd = null; save(true); render(); return;
    case 'note-del': confirmBox('Usunąć zapisek?', '', 'Usuń', () => { S.notatki = notes().filter(n => n.id !== UI.noteEd); UI.noteEd = null; save(true); render(); }); return;
    case 'note-keep': { const n = notes().find(x => x.id === UI.noteEd); if (n) { if (A && A.share) A.share(noteText(n)); else toast('Dostępne w aplikacji na telefonie.'); } return; }
    case 'note-txt': case 'note-txt-all': {
      const l = act === 'note-txt' ? notes().filter(x => x.id === UI.noteEd) : notes(); if (!l.length) return;
      const txt = l.map(noteText).join('\n\n— — —\n\n'), name = (l.length === 1 ? l[0].tytul : 'Zapiski') .replace(/[\\/:*?"<>|]+/g, ' ').trim() + ' ' + today() + '.txt';
      if (A && A.exportFile) A.exportFile(txt, name, 'text/plain'); else toast('Dostępne w aplikacji na telefonie.');
      return;
    }
    case 'rozw-open': rozwDialog(); return;
    case 'rozw-q': rozwDialog(a); return;
    case 'rozw-go': rozwDialog((document.getElementById('rozwQ') || {}).value.trim()); return;
    case 'rozw-sl': closeModal(); UI.slH = a; go('slownik'); return;
    case 'lnk-open': linksDialog(); return;
    case 'lnk-add': {
      const n = document.getElementById('lnkN').value.trim(); let u = document.getElementById('lnkU').value.trim();
      if (!u) { toast('Wpisz adres strony.'); return; }
      if (!/^[a-z]+:/i.test(u)) u = 'https://' + u;
      S.myLinks = (S.myLinks || []).concat([[n || u.replace(/^https?:\/\//, '').split('/')[0], u]]); save(true); linksDialog(); return;
    }
    case 'lnk-del': S.myLinks.splice(+a, 1); save(true); linksDialog(); return;
    case 'kcx': {
      const pr = a.split('|'), w = S.wspolnoty.find(x => x.id === pr[0]), k = w && (w.katechisci || [])[+pr[1]]; if (!k) return;
      const how = el.dataset.b, tel = (k.tel || '').replace(/\s/g, '');
      openUrl(how === 'call' ? 'tel:' + tel : how === 'sms' ? 'sms:' + tel : how === 'wa' ? 'https://wa.me/' + phoneDigits(k.tel) : 'mailto:' + k.mail);
      return;
    }
    case 'sync-dot': {
      const st = SYNC.pend > 0 ? 'wait' : navigator.onLine === false ? 'off' : SYNC.state;
      const hm = t => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      toast(st === 'wait' ? 'Wysyłam zmiany do arkusza…' : st === 'off' ? 'Brak sieci – zmiany zostają w telefonie i wyślą się, gdy wróci internet.'
        : st === 'err' ? 'Błąd synchronizacji: ' + SYNC.err : 'Zsynchronizowano' + (SYNC.ts ? ' o ' + hm(SYNC.ts) : '') + '.');
      if (st !== 'wait') syncAllNow();
      return;
    }
    case 'set-grp': UI.setGrp = UI.setGrp === a ? '' : a; render(); return;
    case 'pick-songbook': case 'pick-pdf': {
      const key = act === 'pick-songbook' ? 'songbook' : a;
      if (!A) { toast('Dostępne w aplikacji na telefonie.'); return; }
      if (A.pickPdf) A.pickPdf(key); else if (key === 'songbook' && A.pickSongbook) A.pickSongbook();
      return;
    }
    case 'scan': UI.lastScan = a; scanPdf(a); return;
    case 'ws-rola': {
      const u = document.getElementById('syncUrl'), t = document.getElementById('syncToken');
      if (u) S.syncUrl = u.value.trim();
      if (t) S.syncToken = t.value.trim();
      setRola(a); break;
    }
    case 'ws-rola-set': closeModal(); setRola(a); break;
    case 'ws-scan': openScanner(); return;
    case 'ws-pub': publishNow(true); return;
    case 'ws-pull': S.wspolne.ts = 0; pullNow(true); return;
    case 'ws-qr': { const w = curW(); showQr(w && wspShared(w) ? w : null); return; }
    case 'ws-invite': {
      const t = pokoj() + '! Dołącz do wspólnego przygotowania w aplikacji Przygotowanie.\n' +
        'Link (otwórz w telefonie z aplikacją): ' + joinLink(curW()) + '\n\nAlbo w aplikacji: Ustawienia → Wspólne przygotowanie → wklej kod:\n' + joinCode(curW());
      if (A) A.share(t); else navigator.clipboard && navigator.clipboard.writeText(t);
      return;
    }
    case 'ws-join': { useCode(document.getElementById('wsCode').value); return; }
    case 'set-owner': S.owner = a; save(); break;
    case 'owner-add': {
      const v = document.getElementById('ownerNew').value.trim();
      if (!v) { toast('Wpisz imię.'); return; }
      if (S.bracia.indexOf(v) < 0) S.bracia.push(v);
      S.owner = v; save(); break;
    }
    case 'owner-change': S.owner = ''; save(); go('start'); return;
    case 'ksiega': S.filtry[a] = !S.filtry[a]; save(); break;
    case 'preset': S.filtry = a === 'pre' ? { madr: true, pnp: true, ap: true } : { madr: false, pnp: false, ap: false }; save(); break;
    case 'sl-open': UI.slH = a; document.getElementById('main').scrollTop = 0; break;
    case 'sl-close': UI.slH = null; break;
    case 'sl-topic': selectHaslo(a); toast('Temat: ' + a); go('temat'); return;
    case 'sl-find': UI.slq = a; render(); return;
    case 'sl-page': openPdfPage('slownik', SLMAP[a], a); return;
    case 'sl-pdf': openPdfPage('slownik', +a, 'Słownik – s. ' + (+a + 1)); return;
    case 'song-view': openSongView(+a, 0); return;
    case 'song-add': {
      const p = SP_BY[+a];
      modalState = { kind: 'add', nr: +a };
      openModal('Dodaj: ' + p.n + '. ' + p.t,
        '<div class="sec">Liturgia Słowa</div><div class="chips">' + SONG_LABELS.map((l, i) =>
          '<button class="chip" data-act="song-put" data-a="s' + i + '">' + l + (S.celebration.songs[i] ? ' ✓' : '') + '</button>').join('') + '</div>' +
        '<div class="sec">Eucharystia</div><div class="chips">' + EU_SONGS.map((l, i) =>
          '<button class="chip" data-act="song-put" data-a="e' + i + '">' + l + (S.eucharystia.songs[i] ? ' ✓' : '') + '</button>').join('') + '</div>' +
        '<p class="muted">✓ – miejsce już zajęte (zostanie zastąpione).</p>');
      return;
    }
    case 'song-put': {
      const p = SP_BY[modalState.nr], i = +a.slice(1);
      if (a[0] === 's') S.celebration.songs[i] = songLabel(p); else S.eucharystia.songs[i] = songLabel(p);
      save(); closeModal();
      toast('Dodano: ' + (a[0] === 's' ? 'Słowo – ' + SONG_LABELS[i] : 'Eucharystia – ' + EU_SONGS[i]));
      return;
    }
    case 'eu-song': {
      const i = +a;
      openSongPicker('e' + i, v => { S.eucharystia.songs[i] = v; save(); });
      return;
    }
    case 'view-prev': case 'view-next': case 'view-go': case 'view-zoom': {
      const m = modalState;
      let idx = m.idx;
      if (act === 'view-prev') idx--;
      if (act === 'view-next') idx++;
      if (act === 'view-go') idx = (parseInt(document.getElementById('pgNo').value, 10) || 1) - 1;
      if (act === 'view-zoom') UI.zoom = (UI.zoom || 1) === 1 ? 1.5 : (UI.zoom === 1.5 ? 2 : 1);
      openPdfPage(m.key, idx, m.title, { nr: m.nr, back: m.back });
      return;
    }
    case 'pdf-open': {
      if (!hasPdf(a)) { if (A && A.pickPdf) A.pickPdf(a); else toast('Dostępne w aplikacji na telefonie.'); return; }
      openPdfPage(a, (UI.lastPage && UI.lastPage[a]) || 0, a === 'songbook' ? 'Śpiewnik' : 'Słownik Teologii Biblijnej');
      return;
    }
    case 'pv-close': closeViewer(); return;
    case 'pv-prev': PV.idx--; renderViewer(); return;
    case 'pv-next': PV.idx++; renderViewer(); return;
    case 'pv-go': PV.idx = (parseInt(document.getElementById('pvNo').value, 10) || 1) - 1; renderViewer(); return;
    case 'pv-ext': if (A && A.openPdfExternal) A.openPdfExternal(PV.key); return;
    case 'pv-pick': {
      const f = PV.pick, p = SP_BY[PV.nr];
      closeViewer(); closeModal();
      if (f && p) f(songLabel(p), false);
      render(); return;
    }
    case 'view-pick': {
      const b = modalState.back, p = SP_BY[modalState.nr];
      closeModal(); if (b && b.onPick && p) b.onPick(songLabel(p), false); break;
    }
    case 'view-back': {
      const b = modalState.back;
      if (b && b.songs) openSongPicker(b.slot, b.onPick); else closeModal();
      return;
    }
    case 'skr-new': { const x = newSkrutacja(); S.skrutacje.push(x); UI.skr = x.id; save(); break; }
    case 'skr-open': UI.skr = a; break;
    case 'skr-close': UI.skr = null; break;
    case 'skr-frag': {
      const x = S.skrutacje.find(y => y.id === UI.skr);
      openPicker('Fragment z tematu ' + S.haslo, readings().reduce((acc, l) => acc.concat(l), []), (v, add) => {
        x.fragment = add && x.fragment ? x.fragment + '; ' + v : v; save();
      }, { append: true });
      return;
    }
    case 'skr-share': { const x = S.skrutacje.find(y => y.id === UI.skr); if (x) { if (A) A.share(skrText(x)); } return; }
    case 'skr-del':
      confirmBox('Usunąć zapisek?', 'Tej skrutacji nie da się przywrócić.', 'Usuń', () => {
        S.skrDel = S.skrDel || {}; S.skrDel[UI.skr] = Date.now();
        S.skrutacje = S.skrutacje.filter(y => y.id !== UI.skr); UI.skr = null; save(); render();
      });
      return;
    case 'song': {
      const i = +a;
      openSongPicker('s' + i, v => { c.songs[i] = v; save(); });
      return;
    }
    case 'spiewnik-open':
      openSongPicker('', v => { if (v) toast(v); });
      return;
    case 'share':
      if (A) A.share(shareText());
      else navigator.clipboard && navigator.clipboard.writeText(shareText()).then(() => toast('Skopiowano.'));
      return;
    case 'finish': finishDialog(); return;
    case 'finish-ok': {
      const by = document.getElementById('finBy').value, mark = document.getElementById('finMark').checked;
      closeModal(); finish(by, mark); toast('Dodano do archiwum.'); break;
    }
    case 'reset':
      confirmBox('Nowe przygotowanie', 'Wyczyścić czytania, przydziały, pieśni i funkcje ogólne?', 'Wyczyść', () => {
        S.celebration = newCelebration(S.celebration.przydzialy); save(); render();
      });
      return;
    case 'prompt-ok': {
      const f = modalState && modalState.onOk, v = document.getElementById('promptIn').value.trim();
      if (!v) { toast('Wpisz nazwę.'); return; }
      closeModal(); if (f) f(v); return;
    }
    case 'confirm-ok': { const f = modalState && modalState.onOk; closeModal(); if (f) f(); return; }
    case 'close': closeModal(); return;
    case 'brat-add': {
      const v = document.getElementById('newBrat').value.trim(), t = document.getElementById('newTel').value.trim();
      if (!v) { toast('Wpisz imię.'); return; }
      if (S.bracia.indexOf(v) >= 0) { toast('Taka osoba już jest na liście.'); return; }
      S.bracia.push(v); if (t) S.telefony[v] = t; save(); break;
    }
    case 'os-role': el.classList.toggle('on'); return;
    case 'os-col': document.querySelectorAll('#osCol .chip').forEach(x => x.classList.toggle('on', x === el)); return;
    case 'contact': if (A && A.pickContact) A.pickContact(a); else toast('Dostępne w aplikacji na telefonie.'); return;
    case 'wsp-new':
      promptBox('Nowa wspólnota', 'Nazwa (np. WSP 1 – parafia św. Józefa)', '', v => {
        storeActive();
        const id = uuid();
        S.wspolnoty.push({ id: id, nazwa: v, bracia: [], telefony: {}, role: {}, kolory: {} });
        switchCommunity(id); render();
      });
      return;
    case 'wsp-ren': {
      const w = S.wspolnoty.find(x => x.id === S.wspAktywna);
      promptBox('Nazwa wspólnoty', 'Nazwa', w.nazwa, v => { w.nazwa = v; save(); render(); });
      return;
    }
    case 'wsp-merge': mergeDialog(); return;
    case 'wsp-unmerge': confirmBox('Cofnąć scalenie?', 'Wspólnoty, kalendarz i kasetka wrócą do stanu sprzed ostatniego scalenia.', 'Cofnij', () => { closeModal(); undoMerge(); }); return;
    case 'wsp-merge-ok': {
      const a1 = document.getElementById('mgA').value, b1 = document.getElementById('mgB').value, n1 = document.getElementById('mgN').value.trim();
      if (a1 === b1) { toast('Wybierz dwie różne wspólnoty.'); return; }
      const na = S.wspolnoty.find(w => w.id === a1).nazwa, nb = S.wspolnoty.find(w => w.id === b1).nazwa;
      confirmBox('Scalić wspólnoty?', '„' + nb + '” dołączy do „' + na + '” jako „' + (n1 || na) + '”. Tego nie da się cofnąć jednym przyciskiem (kopia zostaje w pamięci telefonu).', 'Scal', () => {
        closeModal(); if (mergeCommunities(a1, b1, n1)) { toast('Scalono – wspólnota „' + (n1 || na) + '”.'); render(); }
      });
      return;
    }
    case 'wsp-del': {
      const w = S.wspolnoty.find(x => x.id === S.wspAktywna);
      confirmBox('Usunąć wspólnotę?', 'Usunąć „' + w.nazwa + '” razem z jej listą osób?', 'Usuń', () => {
        S.wspolnoty = S.wspolnoty.filter(x => x.id !== w.id);
        if (S.wspSync === w.id) S.wspSync = S.wspolnoty[0].id;
        S.wspAktywna = '';
        switchCommunity(S.wspolnoty[0].id); render();
      });
      return;
    }
    case 'wsp-share': { const w = curW(); if (!w) return;
      if (!canSend(w)) { toast('Tylko odpowiedzialni, współodpowiedzialni i administrator.'); return; }
      if (w.key === undefined || w.key === null) w.key = newKey();   // nowa wspólnota zawsze ma własne miejsce w arkuszu
      w.send = true; w.sync = { ts: 0, by: '' }; save(); pushCommunity(w, true); render(); showQr(w); return; }
    case 'wsp-send': { const w = curW(); if (!w) return;
      if (a === '1' && !canSend(w)) { toast('Tylko odpowiedzialni, współodpowiedzialni i administrator.'); return; } w.send = a === '1'; w.sync = { ts: 0, by: '' }; save(); if (w.send) pushCommunity(w, true); else pullOne(w, true); break; }
    case 'wsp-qr': showQr(curW()); return;
    case 'wsp-move': { const w = curW(); if (!w || !canSend(w)) return;
      confirmBox('Przenieść na osobne miejsce?', 'Lista „' + w.nazwa + '” zapisze się w arkuszu osobno. Osoby z tej wspólnoty muszą potem zeskanować NOWY kod QR tej wspólnoty.', 'Przenieś', () => {
        w.key = newKey(); w.send = true; w.sync = { ts: 0, by: '' }; save(); pushCommunity(w, true); render(); showQr(w);
      });
      return; }
    case 'wsp-invite': {
      const w = S.wspolnoty.find(x => x.id === modalState.w);
      const t = pokoj() + '! Dołącz do listy wspólnoty „' + (w ? w.nazwa : '') + '” w aplikacji Przygotowanie.\nLink (otwórz w telefonie z aplikacją): ' + joinLink(w) +
        '\n\nAlbo w aplikacji: Ustawienia → Wspólne przygotowanie → wklej kod:\n' + joinCode(w);
      if (A) A.share(t); else navigator.clipboard && navigator.clipboard.writeText(t);
      return;
    }
    case 'wsp-import': importDialog(); return;
    case 'wsp-manual': pullManual(); return;
    case 'kc-edit': {
      const w = curW(); if (!w) return;
      const i = +a, k = i >= 0 ? (w.katechisci || [])[i] : { n: '', tel: '', mail: '' };
      modalState = { kind: 'kc', i: i };
      openModal(i >= 0 ? 'Katechista' : 'Nowy katechista',
        '<label class="lbl">Imię i nazwisko</label><input type="text" id="kcName" value="' + esc(k.n) + '">' +
        '<label class="lbl">Telefon</label><div class="row"><input type="tel" id="kcTel" class="grow" value="' + esc(k.tel) + '"><button class="btn ghost" data-act="contact" data-a="katech">📇</button></div>' +
        '<label class="lbl">E-mail (opcjonalnie)</label><input type="email" id="kcMail" value="' + esc(k.mail || '') + '">',
        (i >= 0 ? '<button class="btn text" data-act="kc-del">Usuń</button>' : '') + '<button class="btn" data-act="kc-ok">Zapisz</button>');
      return;
    }
    case 'kc-ok': {
      const w = curW(), n = document.getElementById('kcName').value.trim();
      if (!n) { toast('Wpisz imię i nazwisko.'); return; }
      const k = { n: n, tel: document.getElementById('kcTel').value.trim(), mail: document.getElementById('kcMail').value.trim() };
      w.katechisci = w.katechisci || [];
      if (modalState.i >= 0) w.katechisci[modalState.i] = k; else w.katechisci.push(k);
      closeModal(); save(); break;
    }
    case 'kc-del': { const w = curW(); w.katechisci.splice(modalState.i, 1); closeModal(); save(); break; }
    case 'kc-call': case 'kc-sms': case 'kc-wa': case 'kc-mail': {
      const k = (curW().katechisci || [])[+a]; if (!k) return;
      openUrl(act === 'kc-call' ? 'tel:' + k.tel.replace(/\s/g, '') : act === 'kc-sms' ? 'sms:' + k.tel.replace(/\s/g, '') : act === 'kc-wa' ? 'https://wa.me/' + phoneDigits(k.tel) : 'mailto:' + k.mail);
      return;
    }
    case 'imp-ok': doImport(); return;
    case 'drv-audio':
      S.drive.org = document.getElementById('drvOrg').value.trim(); S.drive.pl = document.getElementById('drvPl').value.trim();
      save(true); refreshAudio(true); return;
    case 'upd-check': S.drive.apk = document.getElementById('drvApk').value.trim(); save(true); checkUpdate(); return;
    case 'dupd-pick': A.pickUpdDir().then(() => { UI.upd = ''; checkUpdate(); }); return;
    case 'dupd-check': checkUpdate(); return;
    case 'dupd-inst': toast('Instaluję aktualizację…'); A.installUpdate(); return;
    case 'upd-get': openUrl('https://drive.google.com/uc?export=download&id=' + UI.updFile.id); return;
    case 'aud-org': case 'aud-pl': {
      const p = SP_BY[PV && PV.nr], f = audioFor(p, act === 'aud-org' ? 'org' : 'pl');
      if (f) playAudio(f, (act === 'aud-org' ? 'Oryginał: ' : 'Po polsku: ') + f.n);
      return;
    }
    case 'aud-drive': openUrl('https://drive.google.com/file/d/' + a + '/view'); return;
    case 'aud-stop': { const b = document.getElementById('pvaudio'); if (b) { b.innerHTML = ''; b.classList.add('hidden'); } return; }
    case 'wsp-push': pushCommunity(curW(), true); return;
    case 'wsp-pull': { const w = curW(); if (w) pullOne(w, true); return; }
    case 'contact-add': {
      const g = id => (document.getElementById(id) || {}).value || '', n = g('osName').trim(), t = g('osTel').trim(), m = g('osMail').trim();
      if (!n) { toast('Wpisz imię.'); return; }
      if (A && A.addContact) { A.addContact(n, t, m); return; }
      const v = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:' + n + '\r\nN:' + n.split(' ').slice(1).join(' ') + ';' + n.split(' ')[0] + ';;;\r\n' + (t ? 'TEL;TYPE=CELL:' + t + '\r\n' : '') + (m ? 'EMAIL:' + m + '\r\n' : '') + 'END:VCARD\r\n';
      if (A && A.exportFile) A.exportFile(v, n.replace(/[^\p{L}\p{N} ]/gu, '') + '.vcf', 'text/vcard'); else toast('Dostępne w telefonie.');
      return;
    }
    case 'osoba-edit':
      modalState = { kind: 'osoba', old: a };
      openModal('Osoba', '<label class="lbl">Imię</label><input type="text" id="osName" value="' + esc(a) + '">' +
        '<label class="lbl">Telefon</label><div class="row"><input type="tel" id="osTel" class="grow" value="' + esc(S.telefony[a] || '') + '"><button class="btn ghost" data-act="contact" data-a="edit">📇</button></div>' +
        '<label class="lbl">E-mail</label><input type="email" id="osMail" value="' + esc((S.maile || {})[a] || '') + '" placeholder="np. kasia@gmail.com" autocapitalize="off">' +
        '<label class="lbl">Kontakt w nagłej sytuacji (ktoś spoza Drogi)</label><div class="row"><input type="text" id="osIceN" class="grow" value="' + esc(((S.ice || {})[a] || {}).n || '') + '" placeholder="np. siostra Anna">' +
          '<input type="tel" id="osIceT" class="grow" value="' + esc(((S.ice || {})[a] || {}).tel || '') + '" placeholder="numer"></div>' +
        '<label class="lbl">Małżeństwo z</label><select id="osMalz"><option value="">— brak —</option>' +
          S.bracia.filter(x => x !== a && (!spouse(x) || spouse(x) === a)).map(x => '<option value="' + esc(x) + '"' + (spouse(a) === x ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' +
        '<button class="btn ghost full mt" data-act="contact-add">＋ Dodaj do kontaktów w telefonie</button>' +
        '<label class="lbl">Kolor (np. małżeństwo – ten sam)</label><div class="chips" id="osCol">' +
          ['<button class="chip col' + (S.kolory[a] === undefined ? ' on' : '') + '" data-act="os-col" data-a="">brak</button>'].concat(COLORS.map((c, i) =>
          '<button class="chip col' + (S.kolory[a] === i ? ' on' : '') + '" data-act="os-col" data-a="' + i + '"><i class="pd" style="background:' + c + '"></i></button>')).join('') + '</div>' +
        '<label class="lbl">Rola we wspólnocie</label><div class="chips" id="osRole">' + ROLE_LIST.map(r =>
          '<button class="chip' + (rolesOf(a).indexOf(r) >= 0 ? ' on' : '') + '" data-act="os-role" data-a="' + r + '"' + (roleLocked() ? ' disabled' : '') + '>' + r + '</button>').join('') + '</div>' +
          (roleLocked() ? '<div class="muted">Role ustawia odpowiedzialny (lista pobierana z arkusza).</div>' : '') +
        '<label class="row mt"><input type="checkbox" id="osNieakt"' + (isAkt(a) ? '' : ' checked') + '><span class="grow"><b>Nieaktywny</b><br><span class="muted">Zawieszony – nie ma go wśród obecnych, w losowaniu ani przy rozpiskach. Zostaje na liście.</span></span></label>',
        '<button class="btn text" data-act="brat-del" data-a="' + esc(a) + '">Usuń</button><button class="btn" data-act="osoba-ok">Zapisz</button>');
      return;
    case 'osoba-ok': {
      const old = modalState.old, v = document.getElementById('osName').value.trim(), t = document.getElementById('osTel').value.trim();
      const roles = roleLocked() ? rolesOf(modalState.old) : Array.from(document.querySelectorAll('#osRole .chip.on')).map(x => x.dataset.a);
      const colEl = document.querySelector('#osCol .chip.on'), col = colEl && colEl.dataset.a !== '' ? +colEl.dataset.a : null;
      const nieakt = document.getElementById('osNieakt').checked, mail = document.getElementById('osMail').value.trim(), malz = document.getElementById('osMalz').value;
      const iceN = document.getElementById('osIceN').value.trim(), iceT = document.getElementById('osIceT').value.trim();
      closeModal();
      if (!v) return;
      if (v !== old && S.bracia.indexOf(v) >= 0) { toast('Taka osoba już jest na liście.'); return; }
      if (v !== old) replacePerson(old, v);
      S.nieakt = S.nieakt || {}; delete S.nieakt[old];
      if (nieakt) { S.nieakt[v] = true; S.obecni = S.obecni.filter(x => x !== v); if (S.eucharystia) S.eucharystia.obecni = S.eucharystia.obecni.filter(x => x !== v); }
      else delete S.nieakt[v];
      S.maile = S.maile || {}; if (mail) S.maile[v] = mail; else delete S.maile[v];
      S.ice = S.ice || {}; delete S.ice[old]; if (iceT || iceN) S.ice[v] = { n: iceN, tel: iceT };
      setSpouse(v, malz && malz !== v ? malz : '');
      if (malz && malz !== v) {   // wspólna grupa małżeństwa: grupa osoby, której dotyczy okno (albo współmałżonka, gdy ta nie ma)
        const g = (S.grupy || []).find(x => x.osoby.indexOf(v) >= 0) || (S.grupy || []).find(x => x.osoby.indexOf(malz) >= 0);
        if (g) { S.grupy.forEach(x => { x.osoby = x.osoby.filter(b => b !== v && b !== malz); }); g.osoby.push(v, malz); }
      }
      if (malz && malz !== v) {   // para obok siebie na liście
        S.bracia = S.bracia.filter(x => x !== malz); S.bracia.splice(S.bracia.indexOf(v) + 1, 0, malz);
      }
      if (t) S.telefony[v] = t; else delete S.telefony[v];
      if (roles.length) S.role[v] = roles; else delete S.role[v];
      if (col !== null) S.kolory[v] = col; else delete S.kolory[v];
      save(); break;
    }
    case 'brat-del':
      closeModal();
      confirmBox('Usunąć?', 'Usunąć „' + a + '” ze wspólnoty?', 'Usuń', () => {
        replacePerson(a, null); save(); render();
      });
      return;
    case 'call': case 'sms': case 'wa': {
      const t = S.telefony[a] || '';
      const url = act === 'call' ? 'tel:' + t.replace(/\s/g, '') : act === 'sms' ? 'sms:' + t.replace(/\s/g, '') : 'https://wa.me/' + phoneDigits(t);
      if (A) A.openUrl(url); else window.open(url);
      return;
    }
    case 'shuffle-order': S.kolejnosc = shuffle(S.obecni); save(); toast('Nowa kolejność rozdziału.'); break;
    case 'eu-present': {
      const set = new Set(S.eucharystia.obecni);
      if (set.has(a)) set.delete(a); else set.add(a);
      S.eucharystia.obecni = S.bracia.filter(b => set.has(b)); save(); break;
    }
    case 'eu-all': {
      const e = S.eucharystia;
      e.obecni = e.obecni.length >= aktywni().length ? [] : aktywni(); save(); break;
    }
    case 'eu-draw': {
      const e = S.eucharystia;
      const cur = EU_ROLES.map(r => e.who[r] || ''), lk = EU_ROLES.map(r => !!e.locked[r]);
      const d = drawWithLocks(e.obecni, cur, lk);
      EU_ROLES.forEach((r, i) => { e.who[r] = d[i]; e.locked[r] = !!(lk[i] && d[i]); });
      save(); toast('Wylosowano wolne miejsca.'); break;
    }
    case 'eu-share':
      if (A) A.share(euShareText()); else navigator.clipboard && navigator.clipboard.writeText(euShareText()).then(() => toast('Skopiowano.'));
      return;
    case 'eu-reset':
      confirmBox('Wyczyścić?', 'Wyczyścić termin i przydziały na Eucharystię? (zaznaczone osoby zostają)', 'Wyczyść', () => {
        const ob = S.eucharystia.obecni; S.eucharystia = newEucharystia(); S.eucharystia.obecni = ob; save(); render();
      });
      return;
    case 'gfilter': UI.gFilter = UI.gFilter === a ? '' : a; render(); return;
    case 'brat-sort': sortPeople(a); S.obecni = S.bracia.filter(b => S.obecni.indexOf(b) >= 0); save(); render(); toast('Posortowano.'); return;
    case 'brat-up': case 'brat-down': {
      const U = personUnits(), i = U.findIndex(u => u.indexOf(a) >= 0), j = i + (act === 'brat-up' ? -1 : 1);
      if (i < 0 || j < 0 || j >= U.length) return;
      const t = U[i]; U[i] = U[j]; U[j] = t;
      S.bracia = [].concat.apply([], U);   // małżeństwo przesuwa się razem
      S.obecni = S.bracia.filter(b => S.obecni.indexOf(b) >= 0);
      S.eucharystia.obecni = S.bracia.filter(b => S.eucharystia.obecni.indexOf(b) >= 0); save(); break;
    }
    case 'haslo-add': {
      const v = document.getElementById('newHaslo').value.trim().toLocaleUpperCase('pl-PL');
      if (v && allNames().indexOf(v) < 0) { S.extraHasla.push(v); save(); }
      break;
    }
    case 'haslo-del':
      S.extraHasla = S.extraHasla.filter(x => x !== a);
      if (S.haslo === a) S.haslo = '';
      save(); break;
    case 'hist-toggle': UI.openHist = UI.openHist === a ? null : a; break;
    case 'hist-del':
      confirmBox('Usunąć wpis?', 'Usunąć ten wpis z historii?', 'Usuń', () => {
        S.history = S.history.filter(e => e.id !== a); S.deletedHistory.push(a); save(); render();
      });
      return;
    case 'sync': doSync(false); return;
    case 'sync-push':
      confirmBox('Wysłać listę braci?', 'Lista braci w arkuszu (T3:T39) zostanie zastąpiona listą z telefonu.', 'Wyślij', () => doSync(true));
      return;
    case 'main-take': {
      const k = S.konto || {}, cur = S.mainDev && S.devices && S.devices[S.mainDev] ? S.devices[S.mainDev].n : '';
      if (S.mainDev === k.dev) { toast('To urządzenie (' + (k.devName || '') + ') jest główne – przy zmianach na dwóch urządzeniach naraz wygrywa ono.'); return; }
      confirmBox('Przejąć jako główne?', 'To urządzenie (' + (k.devName || '') + ') stanie się główne' + (cur ? ' zamiast „' + cur + '”' : '') + ' – przy zmianach na dwóch urządzeniach naraz wygrywa główne.', 'Przejmij', () => {
        S.mainDev = k.dev; k.changed = Date.now(); save(); mainBtn(); toast('Główne urządzenie: ' + (k.devName || 'to urządzenie') + '.'); if (UI.view === 'wiecej') render();
      }); return; }
    case 'pack': packDialog(); return;
    case 'pack-save': case 'pack-send': {
      const p = packOf((storeActive(), S), modalState.sel), t = JSON.stringify(p), nm = 'trojnog-pakiet-' + today().replace(/-/g, '') + '.json';
      if (!Object.keys(p.parts).length) { toast('Zaznacz co najmniej jedną część.'); return; }
      closeModal();
      if (act === 'pack-send' && A && A.shareBackup) A.shareBackup(t, nm, false); else if (A && A.exportData) A.exportData(t, nm);
      else { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([t])); l.download = nm; l.click(); }
      return; }
    case 'kimp-ok': { const m = modalState; closeModal(); autoBackup(true); const n = applyPack(m.p, m.sel); save(); render();
      toast('Dodano: ' + [n.wsp ? n.wsp + ' wspólnot' : '', n.os ? n.os + ' osób' : '', n.kal ? n.kal + ' wydarzeń' : '', n.rz ? n.rz + ' rozpisek' : '', n.hist ? n.hist + ' wpisów archiwum' : ''].filter(Boolean).join(', ') + '.'); return; }
    case 'kimp-replace': { const m = modalState; confirmBox('Zastąpić wszystko?', 'Wszystkie Twoje dane zostaną zastąpione tą kopią (dzisiejszy stan zapisze się w kopiach automatycznych).', 'Zastąp', () => {
        autoBackup(true); S = normalizeState(m.full); save(); toast('Wczytano kopię danych.'); render(); }); return; }
    case 'export': {
      const json = JSON.stringify(S, null, 1), name = 'przygotowanie-' + today() + '.json';
      if (A) A.exportData(json, name);
      else { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([json])); l.download = name; l.click(); }
      return;
    }
    case 'import':
      if (A) A.importData();
      return;
    case 'link': if (A) A.openUrl(a); else window.open(a); return;
    case 'spiewnik': S.spiewnikUrl = document.getElementById('spiewnik').value.trim(); save(); toast('Zapisano.'); break;
    default: return;
  }
  render();
});

document.addEventListener('change', ev => {
  const el = ev.target;
  const ch = el.dataset ? el.dataset.ch : null;
  if (!ch) return;
  if (window.KAL && KAL.change(ch, el.dataset.a, el)) return;
  if (window.RZ && RZ.change(ch, el.dataset.a, el)) return;
  if (window.WYG && WYG.change(ch, el.dataset.a, el)) return;
  const a = el.dataset.a, c = S.celebration;
  switch (ch) {
    case 'done': setDone(a, el.checked); break;
    case 'who': case 'eu-who':
      if (el.value === '__inna__') { askOther(ch, a); return; }
      if (ch === 'who') { c.who[+a] = el.value; c.locked[+a] = !!el.value; } else { S.eucharystia.who[a] = el.value; S.eucharystia.locked[a] = !!el.value; }
      save(); break;
    case 'general': c.general[a] = el.value; save(); break;
    case 'filtr': S.filtry[a] = el.checked; save(); break;
    case 'sms-czyt': { grabSmsEdit(); S.smsCzyt = el.checked; save(true); delete modalState.body; renderSmsDialog(); return; }
    case 'tut-arm': if (el.checked) { window.__tutArmed = true; S.welcomed = 0; S.tut = {}; toast('Samouczek pokaże się przy następnym otwarciu aplikacji.'); } else { S.welcomed = 1; S.tut = { start: 1, przyg: 1, kalendarz: 1, wspolnota: 1, wiecej: 1 }; } save(true); return;
    case 'pack-sel': case 'imp-sel': modalState.sel[a] = el.checked; return;
    case 'sms-potw': { grabSmsEdit(); grabMsg(); S.smsPotw = el.checked; save(true); renderSmsDialog(); return; }
    case 'sms-sel': {
      const m = modalState; grabMsg();
      if (el.checked) { if (m.sel.indexOf(a) < 0) m.sel.push(a); } else m.sel = m.sel.filter(x => x !== a);
      m.grpLabel = '';
      renderSmsDialog(); return;
    }
    case 'arm': UI.armed = UI.armed || {}; UI.armed[a] = el.checked; break;
    case 'braciaZArkusza': S.braciaZArkusza = el.checked; save(); break;
    case 'wsp-sel': switchCommunity(el.value); break;
    case 'eu-wig': S.eucharystia.wigilia = el.checked; save(); break;
    case 'wspTel': S.wspolnota.tel = el.checked; save(); break;
    case 'wsp-etap': { const w = curW(); if (w) { w.etap = el.value; save(); } break; }
    case 'wsp-region': { const w = curW(); if (w) { w.region = el.value.trim(); save(); } break; }
    case 'ignoreDiacritics': S.ignoreDiacritics = el.checked; save(); break;
    case 'pok-show': S.pokShow = el.checked; save(true); break;
    case 'tile-vis': S.hiddenTiles = S.hiddenTiles || {}; if (el.checked) delete S.hiddenTiles[el.dataset.a]; else S.hiddenTiles[el.dataset.a] = 1; save(); break;
    default: return;
  }
  render();
});

document.addEventListener('input', ev => {
  const el = ev.target;
  const k = el.dataset ? el.dataset.in : null;
  if (!k) return;
  if (k === 'ktq' && window.KAL) { KAL.treeSearch(el.value); return; }
  if (window.RZ && RZ.input(k, el)) return;
  const c = S.celebration;
  if (k === 'query') { UI.query = el.value; document.getElementById('hlist').innerHTML = topicList(); return; }
  if (k === 'spq') { UI.spq = el.value; document.getElementById('splist').innerHTML = spiewnikList(); return; }
  if (k === 'slq') { UI.slq = el.value; document.getElementById('sllist').innerHTML = slownikList(); return; }
  if (k === 'pq' && modalState) { modalState.query = el.value; document.getElementById('plist').innerHTML = modalState.songs ? songList() : pickerList(); return; }
  if (k === 'reading') {
    const i = +el.dataset.a;
    c.readings[i] = el.value; save();
    autoGrow(el);
    const t = document.getElementById('whoT' + i);
    if (t) t.textContent = el.value || READ_DESC[i];
    return;
  }
  if (k === 'page') { c.pages[+el.dataset.a] = el.value; save(); }
  if (k === 'note') { const n = UI.noteEd ? notes().find(x => x.id === UI.noteEd) : (UI.note = UI.note || { tytul: '', tekst: '', data: today() }); if (n) { n[el.dataset.a] = el.value; if (UI.noteEd) { n.ts = Date.now(); save(true); } } }
  if (k === 'eu-data') { S.eucharystia.data = el.value; save(); render(); }
  if (k === 'skr') { const x = S.skrutacje.find(y => y.id === UI.skr); if (x) { x[el.dataset.a] = el.value; x.ts = Date.now(); save(); } if (el.tagName === 'TEXTAREA') autoGrow(el); }
  if (k === 'eu-godz') { S.eucharystia.godzina = el.value; save(); }
  if (k === 'eu-t') { S.eucharystia[el.dataset.a] = el.value; save(); prepCalSoon('eucharystia'); }
  if (k === 'cel-t') { S.celebration[el.dataset.a] = el.value; save(); prepCalSoon('slowo'); }
});

function autoGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

/** Przycisk Wstecz: zamyka okno, potem wraca do „Temat”, potem wychodzi. */
window.onBack = function () {
  { const sn = document.getElementById('subnav'); if (sn && !sn.classList.contains('hidden')) { subnavToggle(false); return true; } }
  if (PV) { closeViewer(); return true; }
  if (!document.getElementById('modal').classList.contains('hidden')) { closeModal(); return true; }
  if (UI.view === 'skrutacja' && UI.skr) { UI.skr = null; render(); return true; }
  if (UI.view === 'slownik' && UI.slH) { UI.slH = null; render(); return true; }
  if (UI.view !== 'start') { go('start'); return true; }
  return false;
};

if (!window.WYG && typeof document !== 'undefined') setTimeout(() => { if (!window.WYG) showNewsOnce(); }, 1500);   // bez modułu wyglądu
if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { /* stary WebView */ } }
render();
new MutationObserver(() => document.querySelectorAll('textarea[data-in="reading"],textarea[data-in="skr"]').forEach(autoGrow))
  .observe(document.getElementById('main'), { childList: true });
document.querySelectorAll('textarea[data-in="reading"]').forEach(autoGrow);
document.addEventListener('click', ev => {   // dotknięcie poza menu Liturgii – zamyka je
  const sn = document.getElementById('subnav');
  if (sn && !sn.classList.contains('hidden') && !ev.target.closest('#subnav') && !ev.target.closest('[data-act=liturgia]')) subnavToggle(false);
}, true);
