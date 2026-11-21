/* Przygotowanie – grupy, grupy robocze, kalendarz wspólnoty, święta i przypomnienia.
   Ładowany po app.js; korzysta z jego stanu (S, UI) i funkcji pomocniczych. */
(function () {
  'use strict';

  /* ===================== GRUPY ===================== */

  // S.grupy – grupy aktywnej wspólnoty [{id, nazwa, osoby:[imię]}] (osoba może być w kilku grupach)
  // S.grupyRob – grupy robocze z dwóch wspólnot [{id, nazwa, wsp:[id1,id2], osoby:['wspId|imię']}]
  function ensure() {
    if (!Array.isArray(S.grupy)) S.grupy = [];
    if (!Array.isArray(S.grupyRob)) S.grupyRob = [];
    if (!Array.isArray(S.kal)) S.kal = [];
    S.kalView = S.kalView || 'all';
    S.przyp = Object.assign({ on: true, hour: 19 }, S.przyp || {});
    S.przyp.co = Object.assign({ prep: true, czyt: true, eu: true, kal: true, zapr: false }, S.przyp.co || {});
    S.przyp.kiedy = S.przyp.kiedy || { '1d': true };
    S.przyp.kan = Object.assign({ tel: true, app: true, gcal: false }, S.przyp.kan || {});
    S.wspolnoty.forEach(w => { if (w.id !== S.wspAktywna && !Array.isArray(w.grupy)) w.grupy = []; });
  }
  ensure();

  function wspName(id) { const w = S.wspolnoty.find(x => x.id === id); return w ? w.nazwa : '?'; }
  function membersOf(wid) {   // osoby wspólnoty (aktywnej – z S, pozostałych – z zapisu)
    if (wid === S.wspAktywna) return S.bracia.slice();
    const w = S.wspolnoty.find(x => x.id === wid);
    return w && w.bracia ? w.bracia.slice() : [];
  }
  function groupsOf(wid) {
    if (wid === S.wspAktywna) return S.grupy;
    const w = S.wspolnoty.find(x => x.id === wid);
    return w && w.grupy ? w.grupy : [];
  }
  /** Wszystkie grupy widoczne dla wydarzenia danej wspólnoty ('all' = wszystkie moje wspólnoty) + robocze. */
  function groupsFor(wid) {
    const out = [];
    const ws = wid === 'all' ? S.wspolnoty.map(w => w.id) : [wid];
    ws.forEach(id => groupsOf(id).forEach(g => out.push({ id: g.id, nazwa: g.nazwa + (ws.length > 1 ? ' (' + wspName(id) + ')' : ''), osoby: g.osoby.slice() })));
    S.grupyRob.forEach(g => {
      if (wid === 'all' || g.wsp.indexOf(wid) >= 0) out.push({ id: 'r:' + g.id, nazwa: g.nazwa + ' (robocza)', osoby: g.osoby.map(x => x.split('|').slice(1).join('|')) });
    });
    return out;
  }
  function groupById(key) {
    const all = groupsFor('all');
    return all.find(g => g.id === key) || null;
  }

  function groupsCard(readOnly) {
    ensure();
    const free = S.bracia.filter(b => !S.grupy.some(g => g.osoby.indexOf(b) >= 0));
    let h = '<div class="card"><h2>Grupy</h2>' +
      (S.grupy.length ? '' : '<div class="muted">Stałe podgrupy zadaniowe na przygotowania (gdy wspólnota jest liczna). Każda osoba należy do jednej grupy.</div>') +
      S.grupy.map(g => '<div class="person-row"><div class="grow"' + (readOnly ? '' : ' data-act="grp-edit" data-a="' + g.id + '"') + '><div class="pn">' + esc(g.nazwa) + ' <span class="muted">(' + g.osoby.length + ')</span></div>' +
        '<div class="muted">' + (g.osoby.length ? g.osoby.map(b => window.HZ && HZ.busy(b) ? '<span class="hzbusy" title="Przygotowuje duży temat: ' + esc(HZ.busy(b)) + '">' + dot(b) + esc(b) + ' 📜</span>' : dot(b) + esc(b)).join(', ') : 'brak osób – dotknij, aby dodać') + '</div></div></div>').join('') +
      (S.grupy.length && free.length ? '<div class="muted mt">Bez grupy: ' + free.map(esc).join(', ') + '</div>' : '') +
      (readOnly ? '' : '<button class="btn ghost full mt" data-act="grp-new">＋ Nowa grupa</button>') + '</div>';
    if (readOnly) return h;
    h += '<div class="card"><h2>Grupy robocze</h2>' +
      '<div class="muted">Grupa złożona z osób z dwóch wspólnot (np. wspólne przygotowanie).</div>' +
      S.grupyRob.map(g => '<div class="person-row"><div class="grow" data-act="grob-edit" data-a="' + g.id + '"><div class="pn">' + esc(g.nazwa) + '</div>' +
        '<div class="muted">' + esc(g.wsp.map(wspName).join(' + ')) + ' · ' + g.osoby.length + ' os.</div></div></div>').join('') +
      (S.wspolnoty.length > 1 ? '<button class="btn ghost full mt" data-act="grob-new">＋ Nowa grupa robocza</button>'
        : '<div class="muted mt">Dodaj drugą wspólnotę (wyżej „＋ Nowa”), aby tworzyć grupy robocze.</div>') + '</div>';
    return h;
  }

  function groupDialog(g) {
    modalState = { kind: 'grp', id: g ? g.id : null };
    const sel = g ? g.osoby : [];
    openModal(g ? 'Grupa' : 'Nowa grupa',
      '<label class="lbl">Nazwa</label><input type="text" id="grpName" value="' + esc(g ? g.nazwa : '') + '" placeholder="np. Grupa 1">' +
      '<label class="lbl">Osoby</label><div class="chips" id="grpOs">' + S.bracia.map(b => {
        const other = S.grupy.find(x => (!g || x.id !== g.id) && x.osoby.indexOf(b) >= 0);
        return '<button class="chip' + (sel.indexOf(b) >= 0 ? ' on' : '') + '" data-act="tgl" data-a="' + esc(b) + '">' + dot(b) + esc(b) +
          (other ? ' <span class="muted">· ' + esc(other.nazwa) + '</span>' : '') + '</button>';
      }).join('') + '</div><div class="muted">Osoba przeniesiona tutaj zniknie ze swojej poprzedniej grupy.</div>',
      (g ? '<button class="btn text" data-act="grp-del">Usuń</button>' : '') + '<button class="btn" data-act="grp-ok">Zapisz</button>');
  }
  function grobDialog(g) {
    modalState = { kind: 'grob', id: g ? g.id : null, wsp: g ? g.wsp.slice() : [S.wspAktywna, (S.wspolnoty.find(w => w.id !== S.wspAktywna) || {}).id] };
    renderGrob(g ? g.osoby : [], g ? g.nazwa : '');
  }
  function renderGrob(sel, name) {
    const m = modalState;
    const wsel = (i) => '<select data-ch="grob-w" data-a="' + i + '">' + S.wspolnoty.map(w =>
      '<option value="' + w.id + '"' + (m.wsp[i] === w.id ? ' selected' : '') + '>' + esc(w.nazwa) + '</option>').join('') + '</select>';
    const block = (i) => '<div class="sec">' + esc(wspName(m.wsp[i])) + '</div><div class="chips">' + membersOf(m.wsp[i]).map(b => {
      const k = m.wsp[i] + '|' + b;
      return '<button class="chip' + (sel.indexOf(k) >= 0 ? ' on' : '') + '" data-act="tgl" data-a="' + esc(k) + '">' + esc(b) + '</button>';
    }).join('') + '</div>';
    openModal(m.id ? 'Grupa robocza' : 'Nowa grupa robocza',
      '<label class="lbl">Nazwa</label><input type="text" id="grpName" value="' + esc(name) + '" placeholder="np. Przygotowanie Paschy">' +
      '<label class="lbl">Wspólnota 1</label>' + wsel(0) + '<label class="lbl">Wspólnota 2</label>' + wsel(1) +
      '<div id="grpOs">' + block(0) + (m.wsp[1] && m.wsp[1] !== m.wsp[0] ? block(1) : '') + '</div>',
      (m.id ? '<button class="btn text" data-act="grob-del">Usuń</button>' : '') + '<button class="btn" data-act="grob-ok">Zapisz</button>');
  }
  function selected() { return Array.from(document.querySelectorAll('#grpOs .chip.on')).map(x => x.dataset.a); }

  /** Szybkie zaznaczanie obecnych całą grupą (Czytania / Eucharystia). */
  function groupChips(kind) {
    ensure();
    const gs = S.grupy.filter(g => g.osoby.some(b => S.bracia.indexOf(b) >= 0));
    if (!gs.length) return '';
    const cur = kind === 'eu' ? S.eucharystia.obecni : S.obecni;
    return '<div class="chips mt"><span class="muted" style="align-self:center">Grupy:</span>' + gs.map(g => {
      const on = g.osoby.every(b => cur.indexOf(b) >= 0 || S.bracia.indexOf(b) < 0 || (window.HZ && HZ.busy(b)));
      return '<button class="chip grp' + (on ? ' on' : '') + '" data-act="grp-present" data-a="' + g.id + '" data-b="' + kind + '">' + esc(g.nazwa) + '</button>';
    }).join('') + '</div>';
  }

  /* ===================== ŚWIĘTA ===================== */

  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fromIso = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const FCACHE = {};
  /** Święta kościelne w Polsce na rok kalendarzowy: {'RRRR-MM-DD': [{n, r}]}, r: 'U' uroczystość, 'S' święto, 'N' niedziela szczególna. */
  function feasts(y) {
    if (FCACHE[y]) return FCACHE[y];
    const f = {};
    const add = (d, n, r) => { const k = iso(d); (f[k] = f[k] || []).push({ n: n, r: r }); };
    const ea = easter(y), D = (m, d) => new Date(y, m - 1, d);
    // stałe
    add(D(1, 1), 'Świętej Bożej Rodzicielki Maryi', 'U');
    add(D(1, 6), 'Objawienie Pańskie (Trzech Króli)', 'U');
    add(D(2, 2), 'Ofiarowanie Pańskie', 'S');
    const holyWeekStart = addDays(ea, -7), octaveEnd = addDays(ea, 7);
    const jozef = D(3, 19);
    add(jozef >= holyWeekStart && jozef <= octaveEnd ? addDays(holyWeekStart, -1) : jozef, 'Św. Józefa', 'U');
    const zw = D(3, 25);
    add(zw >= holyWeekStart && zw <= octaveEnd ? addDays(octaveEnd, 1) : zw, 'Zwiastowanie Pańskie', 'U');
    add(D(4, 23), 'Św. Wojciecha', 'U');
    add(D(5, 3), 'NMP Królowej Polski', 'U');
    add(D(5, 8), 'Św. Stanisława', 'U');
    add(D(6, 24), 'Narodzenie św. Jana Chrzciciela', 'U');
    add(D(6, 29), 'Śś. Apostołów Piotra i Pawła', 'U');
    add(D(8, 6), 'Przemienienie Pańskie', 'S');
    add(D(8, 15), 'Wniebowzięcie NMP', 'U');
    add(D(8, 26), 'NMP Częstochowskiej', 'U');
    add(D(9, 8), 'Narodzenie NMP', 'S');
    add(D(9, 14), 'Podwyższenie Krzyża Świętego', 'S');
    add(D(11, 1), 'Wszystkich Świętych', 'U');
    add(D(11, 2), 'Wspomnienie wszystkich wiernych zmarłych', 'S');
    add(D(12, 8), 'Niepokalane Poczęcie NMP', 'U');
    add(D(12, 24), 'Wigilia Bożego Narodzenia', 'S');
    add(D(12, 25), 'Narodzenie Pańskie', 'U');
    add(D(12, 26), 'Św. Szczepana', 'S');
    // ruchome
    const ep = D(1, 6), bap = addDays(ep, 7 - ep.getDay());
    add(bap, 'Chrzest Pański', 'S');
    add(addDays(ea, -46), 'Środa Popielcowa', 'N');
    add(addDays(ea, -7), 'Niedziela Palmowa', 'N');
    add(addDays(ea, -3), 'Wielki Czwartek', 'N');
    add(addDays(ea, -2), 'Wielki Piątek', 'N');
    add(addDays(ea, -1), 'Wielka Sobota – Wigilia Paschalna', 'N');
    add(ea, 'Zmartwychwstanie Pańskie (Wielkanoc)', 'U');
    add(addDays(ea, 1), 'Poniedziałek Wielkanocny', 'S');
    add(addDays(ea, 7), 'Niedziela Miłosierdzia Bożego', 'N');
    add(addDays(ea, 42), 'Wniebowstąpienie Pańskie', 'U');
    add(addDays(ea, 49), 'Zesłanie Ducha Świętego', 'U');
    add(addDays(ea, 50), 'NMP Matki Kościoła', 'S');
    add(addDays(ea, 56), 'Najświętszej Trójcy', 'U');
    add(addDays(ea, 60), 'Boże Ciało', 'U');
    add(addDays(ea, 68), 'Najświętszego Serca Pana Jezusa', 'U');
    const adv = adventStart(y);
    add(addDays(adv, -7), 'Jezusa Chrystusa Króla Wszechświata', 'U');
    ['I', 'II', 'III', 'IV'].forEach((r, i) => add(addDays(adv, 7 * i), r + ' Niedziela Adwentu', 'N'));
    const x = D(12, 25), sunAfter = addDays(x, 7 - x.getDay());
    add(x.getDay() === 0 ? D(12, 30) : sunAfter, 'Świętej Rodziny', 'S');
    FCACHE[y] = f;
    return f;
  }
  function feastsOn(isoDate) { return (feasts(+isoDate.slice(0, 4))[isoDate] || []).concat(window.personalOn ? personalOn(isoDate) : []); }

  /* ===================== KALENDARZ ===================== */

  const TYPES = [
    ['eu', 'Eucharystia', '#B3261E', 'c'], ['ls', 'Liturgia Słowa', '#2E6DA4', 'c'], ['lp', 'Liturgia pokutna', '#6B3A8C', 'c'], ['kon', 'Konwiwencja', '#B7791F', 'c'],
    ['p-ls', 'Przygotowanie Liturgii Słowa', '#2E6DA4', 'p'], ['p-eu', 'Przygotowanie Eucharystii', '#B3261E', 'p'], ['p-lp', 'Przygotowanie Liturgii pokutnej', '#6B3A8C', 'p'],
    ['p-kon', 'Przygotowanie Konwiwencji', '#B7791F', 'p'], ['p-og', 'Przygotowanie ogólne', '#3F7A3A', 'p'],
    ['brak-eu', 'Brak Eucharystii', '#8A8178', 'c'], ['pascha', 'Pascha', '#C9A227', 'c'], ['kpr', 'Konwiwencja początku roku', '#B7791F', 'c'],
    ['gk', 'Głoszenie katechez', '#00796B', 'k'], ['kat', 'Katecheza', '#00897B', 'k'], ['skat', 'Spotkanie z katechistami', '#5D4037', 'k'], ['skk', 'Spotkanie katechistów', '#7A1E1E', 'k'],
    ['ogp', 'Ogłoszenie Paschy', '#C9A227', 'k'], ['oga', 'Ogłoszenie Adwentu', '#6B3A8C', 'k'],
    ['piel', 'Pielgrzymka', '#1E6B8A', 'o'], ['skrt', 'Skrutacja', '#8D6E63', 'o'], ['inne', 'Własne wydarzenie', '#455A64', 'o'],
  ];
  /** Nazwa wydarzenia – przy „Własnym” wpisany tytuł. */
  function nm(e) { return e && e.typ === 'inne' && e.tytul ? e.tytul : (TY[e && e.typ] || TY['p-og']).n; }
  const FISH = '<svg class="fish" viewBox="0 0 40 24" aria-hidden="true"><path d="M3 7c5-5 12-5 17 0-5 5-12 5-17 0zM20 7l5-4v8z"/><path d="M15 17c5-5 12-5 17 0-5 5-12 5-17 0zM32 17l5-4v8z"/><circle cx="8" cy="6.3" r=".9" fill="#fff"/><circle cx="20" cy="16.3" r=".9" fill="#fff"/></svg>';
  const RANGE = ['kon', 'p-kon', 'kpr', 'gk'];
  /** Przygotowanie ↔ celebracja: „Przygotowanie Eucharystii” wskazuje, której Eucharystii dotyczy (data, godzina). */
  const CEL_OF = { 'p-eu': 'eu', 'p-ls': 'ls' }, PREP_OF = { eu: 'p-eu', ls: 'p-ls' };
  const celName = t => t === 'eu' ? 'Eucharystii' : 'Liturgii Słowa';
  function celOf(p) { const t = CEL_OF[p.typ]; if (!t || !p.celData) return null; return alive().find(c => c.id === p.celId && !c.del) || alive().find(c => c.typ === t && c.data === p.celData) || null; }
  function prepsOf(c) { const t = PREP_OF[c.typ]; if (!t) return []; return alive().filter(p => p.typ === t && (p.celId === c.id || p.celData === c.data)); }
  /** Wiersz w wydarzeniu: do której celebracji (przy przygotowaniu) albo stan przygotowania (przy celebracji). */
  function linkRow(e) {
    if (CEL_OF[e.typ]) {
      if (!e.celData) return '<div class="muted">⚠ Nie wpisano, której ' + celName(CEL_OF[e.typ]) + ' dotyczy.</div>';
      const c = celOf(e);
      return '<div>⛪ <span class="muted">Do ' + celName(CEL_OF[e.typ]) + ':</span> ' + plDate(e.celData) + (e.celGodz || (c && c.godz) ? ', godz. ' + esc(e.celGodz || c.godz) : '') +
        (c ? ' <a class="link inl" data-act="kal-edit" data-a="' + c.id + '">pokaż ›</a>' : '') + '</div>';
    }
    if (PREP_OF[e.typ]) {
      const ps = prepsOf(e);
      return ps.length ? ps.map(p => '<div>📖 <span class="muted">Przygotowanie:</span> ' + plDate(p.data) + (p.godz ? ' ' + esc(p.godz) : '') + (p.gdzie ? ', ' + esc(p.gdzie) : '') +
          ' <a class="link inl" data-act="kal-edit" data-a="' + p.id + '">pokaż ›</a></div>').join('')
        : '<div class="row"><span class="muted grow">📖 Przygotowanie jeszcze nie zaplanowane</span><button class="btn text sm" data-act="kal-prepnew" data-a="' + e.id + '">＋ Zaplanuj</button></div>';
    }
    return '';
  }
  /** Wydarzenia, które mają przygotowanie w aplikacji (Eucharystia, Liturgia Słowa). */
  const PREP_V = { eu: ['eucharystia', 'Przygotowanie Eucharystii'], 'p-eu': ['eucharystia', 'Przygotowanie Eucharystii'], ls: ['slowo', 'Przygotowanie Liturgii Słowa'], 'p-ls': ['slowo', 'Przygotowanie Liturgii Słowa'] };   // wydarzenia od–do
  const KATECH = ['gk', 'kat'];                     // katechezy – widoczne dla wszystkich połączonych z arkuszem
  const DNI = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  /** 1 = poniedziałek … 7 = niedziela */
  const dow7 = d => (d.getDay() + 6) % 7 + 1;
  function isCyclic(e) { return Array.isArray(e.dni) && e.dni.length > 0; }
  function cycText(e) { return isCyclic(e) ? e.dni.slice().sort().map(x => DNI[x - 1].toLowerCase()).join(', ') : ''; }
  /** Najbliższy dzień wydarzenia od daty `from` (ISO) – dla cyklicznych kolejny dzień tygodnia z listy. */
  function nextOcc(e, from) {
    if (!isCyclic(e)) return (e.dataDo || e.data) >= from ? (e.data >= from ? e.data : from) : '';
    let d = fromIso(e.data > from ? e.data : from);
    for (let i = 0; i < 8; i++) {
      const k = iso(d);
      if (e.dataDo && k > e.dataDo) return '';
      if (e.dni.indexOf(dow7(d)) >= 0) return k;
      d = addDays(d, 1);
    }
    return '';
  }
  const SHORT = { skk: 'Kat', ogp: 'OP', oga: 'OA', piel: 'Pg', skrt: 'Sk', inne: 'W', eu: 'Euch', ls: 'LS', lp: 'Pok', kon: 'Konw', 'p-ls': 'P·LS', 'p-eu': 'P·Eu', 'p-lp': 'P·LP', 'p-kon': 'P·K', 'p-og': 'Przyg', 'brak-eu': 'Brak Eu', pascha: 'Pascha', kpr: 'KPR', gk: 'Głosz', kat: 'Kat', skat: 'Kat-ści' };
  const TY = {}; TYPES.forEach(t => { TY[t[0]] = { n: t[1], col: t[2], kind: t[3], s: SHORT[t[0]] }; });
  const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const DOW = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const DOWL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

  /** Wydarzenie „tylko dla wybranych”: widzą je i dostają przypomnienia tylko zaproszeni (i autor). */
  function forMe(e) { return !e.tylko || !S.owner || (e.zapr || []).indexOf(S.owner) >= 0 || e.autor === S.owner; }
  function alive() { return S.kal.filter(e => !e.del && forMe(e)); }
  function visible(e) { return S.kalView === 'all' || e.wsp === 'all' || e.wsp === S.kalView; }
  function onDay(e, d) {
    if (isCyclic(e)) return e.data <= d && (!e.dataDo || d <= e.dataDo) && e.dni.indexOf(dow7(fromIso(d))) >= 0;
    return e.data === d || (e.dataDo && e.data <= d && d <= e.dataDo);
  }
  function eventsOn(d) { return alive().filter(e => visible(e) && onDay(e, d)).sort((a, b) => (a.godz || '').localeCompare(b.godz || '')); }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  function isPrep(e) { return (TY[e.typ] || TY['p-og']).kind === 'p'; }
  /** Ekipa = osoby / grupy, które przygotowują. */
  function inTeam(e) {
    const me = S.owner;
    if (!me) return false;
    if ((e.osoby || []).indexOf(me) >= 0) return true;
    return (e.grupy || []).some(k => { const g = groupById(k); return g && g.osoby.indexOf(me) >= 0; });
  }
  /** Która wspólnota przygotowuje wydarzenie: wg ekipy, potem wg przygotowania (np. „Przygotowanie Eucharystii”) w ciągu 10 dni przed, na końcu – wspólnota wydarzenia. */
  function preparedBy(e) {
    const set = new Set(e.osoby || []);
    (e.grupy || []).forEach(k => { const g = groupById(k); if (g) g.osoby.forEach(b => set.add(b)); });
    if (set.size) {
      let best = '', n = 0;
      S.wspolnoty.forEach(w => { const c = membersOf(w.id).filter(b => set.has(b)).length; if (c > n) { n = c; best = w.id; } });
      if (best) return best;
    }
    const from = iso(addDays(fromIso(e.data), -10));
    const pr = alive().filter(x => isPrep(x) && x.wsp !== 'all' && x.typ === 'p-' + e.typ && x.data <= e.data && x.data >= from).sort((a, b) => b.data.localeCompare(a.data))[0];
    if (pr) return pr.wsp;
    return e.wsp !== 'all' ? e.wsp : '';
  }
  /** Ekipa: „wszyscy” tylko gdy zaznaczono wszystkich; nikogo – pusto. */
  function teamText(e) {
    const parts = [], set = new Set(e.osoby || []);
    (e.grupy || []).forEach(k => { const g = groupById(k); if (g) { parts.push(g.nazwa); g.osoby.forEach(b => set.add(b)); } });
    if (!set.size) return '';
    const all = e.wsp === 'all' ? Array.from(new Set([].concat.apply([], S.wspolnoty.map(w => membersOf(w.id))))) : membersOf(e.wsp);
    if (all.length && all.every(b => set.has(b))) return 'wszyscy';
    const inGroups = new Set(); (e.grupy || []).forEach(k => { const g = groupById(k); if (g) g.osoby.forEach(b => inGroups.add(b)); });
    const solo = (e.osoby || []).filter(b => !inGroups.has(b));
    if (solo.length) parts.push(solo.join(', '));
    return parts.join(' · ');
  }
  /** Czy wydarzenie mnie dotyczy (przypomnienie): celebracje i katechezy – cała wspólnota; przygotowania – tylko ekipa. */
  function concernsMe(e) {
    if (!isPrep(e)) return true;
    return inTeam(e);
  }
  function timeText(e) {
    if (isCyclic(e)) return cycText(e) + (e.godz ? ' ' + e.godz : '') + ' · ' + plDate(e.data).slice(0, 5) + (e.dataDo ? '–' + plDate(e.dataDo).slice(0, 5) : '');
    if (RANGE.indexOf(e.typ) >= 0 && e.dataDo && e.dataDo !== e.data) return plDate(e.data) + (e.godz ? ' ' + e.godz : '') + ' – ' + plDate(e.dataDo) + (e.godzDo ? ' ' + e.godzDo : '');
    return (e.godz || '') + (e.godzDo ? '–' + e.godzDo : '');
  }

  /** Miejsce + miejscowość: „Kościół św. Katarzyny, Kętrzyn”. */
  function whereTxt(e) { return [e.gdzie, e.miasto].filter(Boolean).join(', '); }
  function eventCard(e) {
    const t = TY[e.typ] || TY['p-og'];
    const mine = inTeam(e);
    return '<div class="kev' + (mine ? ' mine' : '') + '" data-act="kal-edit" data-a="' + e.id + '" style="border-left-color:' + t.col + '">' +
      '<div class="row"><b class="grow">' + esc(nm(e)) + '</b><span class="muted">' + esc(timeText(e)) + '</span></div>' +
      (whereTxt(e) || e.adres ? '<div>📍 ' + esc(whereTxt(e)) + (e.adres ? ' <span class="muted">' + esc(e.adres) + '</span>' : '') + '</div>' : '') +
      (teamText(e) ? '<div>👥 <span class="muted">' + (isPrep(e) ? 'Przygotowują:' : 'Ekipa (przygotowuje):') + '</span> ' + esc(teamText(e)) + (mine ? ' <span class="rb">Ty</span>' : '') + '</div>' : '') +
      (e.agapa ? '<div>' + FISH + ' Agapa' + (e.agapaInfo ? ': ' + esc(e.agapaInfo) : '') + '</div>' : '') +
      (extrasShort(e) ? '<div>🎒 ' + esc(extrasShort(e)) + '</div>' : '') +
      linkRow(e) +
      '<div class="row mt"><button class="btn text sm" data-act="kal-evsms" data-a="' + e.id + '">✉ Wyślij info o tym wydarzeniu</button>' + (INV[e.typ] ? '<button class="btn text sm" data-act="kal-inv" data-a="' + e.id + '">💌 Zaproszenie</button>' : '') + '</div>' +
      (PREP_V[e.typ] ? '<div class="row mt"><button class="btn ghost sm" data-act="kal-prep" data-a="' + e.id + '">' + (CEL_OF[e.typ] ? 'Czytania, funkcje, zbiórka' : PREP_V[e.typ][1]) + ' ›</button></div>' : '') +
      (window.RZ && RZ.hasPlan(e) && RZ.canSee(e) ? '<div class="row mt"><button class="btn ghost sm" data-act="kal-rz" data-a="' + e.id + '">Przygotowanie – rozpiska ›</button>' +
        (e.typ === 'lp' && window.POK ? POK.btn(e) : '') + '</div>' : '') +
      (e.info ? '<div>ℹ️ ' + esc(e.info) + '</div>' : '') +
      (e.uwagi ? '<div>⚠️ ' + esc(e.uwagi) + '</div>' : '') +
      (S.wspolnoty.length > 1 ? '<div class="muted">' + esc(e.wsp === 'all' ? 'Wszystkie wspólnoty' : wspName(e.wsp)) + '</div>' : '') +
      (window.ZDJ ? ZDJ.forEvent(e.id) : '') + '</div>';
  }

  function viewKalendarz() {
    ensure();
    const now = new Date();
    UI.kalM = UI.kalM || iso(new Date(now.getFullYear(), now.getMonth(), 1));
    UI.kalD = UI.kalD || iso(now);
    const m0 = fromIso(UI.kalM), y = m0.getFullYear(), mo = m0.getMonth();
    let h = '';
    if (window.adventWeek && adventWeek()) h += '<div class="advbar">' + adventWreath(adventWeek()) + '<div><b>' + ['I', 'II', 'III', 'IV'][adventWeek() - 1] + ' tydzień Adwentu</b><div class="muted">Marana tha – Przyjdź, Panie Jezu!</div></div></div>';
    if (S.wspolnoty.length > 1) {
      h += '<div class="chips kalf">' + [['all', 'Wszystkie wspólnoty']].concat(S.wspolnoty.map(w => [w.id, w.nazwa])).map(x =>
        '<button class="chip' + (S.kalView === x[0] ? ' on' : '') + '" data-act="kal-view" data-a="' + x[0] + '">' + esc(x[1]) + '</button>').join('') + '</div>';
    }
    h += '<div class="card kal"><div class="kalnav"><button class="knav" data-act="kal-m" data-a="-1">‹</button>' +
      '<b class="grow center kmy" data-act="kal-pick">' + MONTHS[mo] + ' ' + y + ' ▾</b>' +
      '<button class="knav" data-act="kal-m" data-a="1">›</button></div>' +
      '<div class="center"><button class="btn text" data-act="kal-today">Dziś</button></div><div class="kgrid">' +
      DOW.map((d, i) => '<div class="kdow' + (i >= 5 ? ' we' : '') + '">' + d.toLowerCase() + '</div>').join('');
    const first = new Date(y, mo, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate(), td = iso(now);
    let nEv = 0, nMine = 0, nFeast = 0;
    for (let i = 0; i < lead; i++) h += '<div class="kd empty"></div>';
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, mo, d), k = iso(dt), L = liturgy(dt), fs = feastsOn(k), evs = eventsOn(k);
      const big = fs.some(f => f.r === 'U'), mine = evs.some(inTeam);
      if (evs.length) nEv++; if (mine) nMine++; if (big) nFeast++;
      const sun = dt.getDay() === 0;
      const cls = 'kd' + (k === td ? ' today' : '') + (k === UI.kalD ? ' sel' : '') + (mine ? ' me' : '') + (sun || big ? ' sun' : '');
      const shadow = sun ? 'box-shadow: inset 0 -4px 0 ' + L.col + ';' : '';
      if (evs.length > 1) {   // kilka wydarzeń – kratka dzieli się na 2, 3 lub 4 części
        const show = evs.slice(0, 4), more = evs.length - 4;
        h += '<div class="' + cls + ' multi" data-act="kal-day" data-a="' + k + '" style="' + shadow + '">' +
          '<span class="dn">' + d + '</span><span class="kseg n' + show.length + '">' + show.map((e, i) => {
            const c = (TY[e.typ] || TY['p-og']).col;
            const TINY = { skk: 'K', ogp: 'P', oga: 'A', piel: 'G', skrt: 'S', inne: 'W', eu: 'Eu', ls: 'LS', lp: 'LP', kon: 'Kw', 'p-ls': 'P', 'p-eu': 'P', 'p-lp': 'P', 'p-kon': 'P', 'p-og': 'P', 'brak-eu': '–Eu', pascha: '✝', kpr: 'KR', gk: 'GK', kat: 'K', skat: 'KŚ' };
            const txt = (i === 3 && more > 0) ? '+' + (more + 1) : show.length === 4 ? (TINY[e.typ] || '•') : (TY[e.typ] || TY['p-og']).s;
            return '<i style="background:' + hexA(c, 0.22) + ';border-color:' + hexA(c, 0.9) + ';color:' + c + '"' + (inTeam(e) ? ' class="me"' : '') + '>' + esc(txt) + '</i>';
          }).join('') + '</span></div>';
        continue;
      }
      const ev = evs[0], col = ev ? (TY[ev.typ] || TY['p-og']).col : big ? '#C9A227' : null;
      const lab = ev ? (TY[ev.typ] || TY['p-og']).s : big ? '✠' : fs.length ? '•' : '';
      const lab2 = ev && ev.godz ? ev.godz : '';
      const st = col ? 'border-color:' + hexA(col, 0.85) + ';background:' + hexA(col, 0.16) + ';' : '';
      h += '<div class="' + cls + '" data-act="kal-day" data-a="' + k + '"' +
        ' style="' + st + shadow + '">' +
        '<span class="dn"' + (col ? ' style="color:' + col + '"' : '') + '>' + d + '</span>' +
        (lab ? '<span class="kl"' + (col ? ' style="color:' + col + '"' : '') + '>' + esc(lab) + '</span>' : '') +
        (lab2 ? '<span class="kl t">' + esc(lab2) + '</span>' : '') + '</div>';
    }
    const Lm = liturgy(new Date(y, mo, 15));
    h += '</div><div class="kleg"><span><i style="background:#C9A227"></i>uroczystość</span><span><i style="background:#B3261E"></i>Eucharystia</span>' +
      '<span><i style="background:#2E6DA4"></i>Liturgia Słowa</span><span><i style="background:#6B3A8C"></i>pokutna</span><span><i style="background:#B7791F"></i>konwiwencja</span>' +
      '<span><i style="background:#3F7A3A"></i>przygotowanie ogólne</span><span><i class="ring"></i>Twoja ekipa</span></div>' +
      '<div class="ksum">Dwa szybkie dotknięcia dnia – nowe wydarzenie.</div>' +
      '<div class="ksum"><i class="pd" style="background:' + Lm.col + '"></i>' + esc(Lm.name) + ' · dni z wydarzeniami: ' + nEv + ', Twoich: ' + nMine + ', uroczystości: ' + nFeast + '</div></div>';

    h += '<button class="btn ghost full" data-act="plan-open" style="margin:-4px 0 12px">✉ Wyślij rozpiskę spotkań (SMS / WhatsApp)</button>';

    // wybrany dzień
    const sd = fromIso(UI.kalD), L = liturgy(sd), fs = feastsOn(UI.kalD), evs = eventsOn(UI.kalD);
    h += '<div class="card"><h2>' + DOWL[sd.getDay()] + ', ' + plDate(UI.kalD) + '</h2>' +
      '<div class="muted"><i class="pd" style="background:' + L.col + '"></i>' + esc(L.name) + ' · szaty ' + esc(L.color) + '</div>' +
      fs.map(f => '<div class="kfeast' + (f.r === 'U' ? ' u' : '') + '">' + (f.r === 'U' ? '✠ ' : '') + esc(f.n) + (f.r === 'U' ? ' <span class="muted">(uroczystość)</span>' : f.r === 'S' ? ' <span class="muted">(święto)</span>' : '') + '</div>').join('') +
      (evs.length ? evs.map(eventCard).join('') : '<div class="muted mt">Brak wydarzeń.</div>') +
      '<button class="btn full mt" data-act="kal-new" data-a="' + UI.kalD + '">＋ Dodaj wydarzenie</button></div>';

    // najbliższe
    const up = alive().filter(e => visible(e) && (e.dataDo || e.data) >= td).sort((a, b) => (a.data + (a.godz || '')).localeCompare(b.data + (b.godz || ''))).slice(0, 8);
    h += '<div class="card"><h2>Najbliższe</h2>' + (up.length ? up.map(e => '<div class="kup" data-act="kal-goto" data-a="' + e.data + '"><span class="kdate">' +
      plDate(e.data).slice(0, 5) + '</span><i class="pd" style="background:' + (TY[e.typ] || TY['p-og']).col + '"></i><span class="grow">' + esc(nm(e)) +
      (e.godz ? ' · ' + e.godz : '') + (whereTxt(e) ? ' · ' + esc(whereTxt(e)) : '') + '</span>' + (inTeam(e) ? '<span class="rb">Ty</span>' : '') + '</div>').join('')
      : '<div class="muted">Nic nie zaplanowano.</div>') + '</div>';

    h += '<div class="card"><h2>Przypomnienia</h2><div class="row"><span class="grow muted">' + (S.przyp.on ? esc(nextRemText()) : 'Wyłączone.') + '</span>' +
      '<button class="btn ghost sm" data-act="przyp-set">Ustaw</button></div>' +
      '<div class="muted mt" id="kalStatus">' + esc(UI.kalStatus || '') + '</div></div>';
    h += gcalCard();
    return h;
  }

  /* ---- edycja wydarzenia ---- */
  function eventDialog(e, date, typ) {
    const isNew = !e;
    e = e ? JSON.parse(JSON.stringify(e)) : { id: uuid(), typ: typ || 'p-ls', data: date || UI.kalD || iso(new Date()), dataDo: '', godz: '', godzDo: '', gdzie: '', adres: '', uwagi: '', info: '',
      agapa: false, agapaInfo: '', pismo: false, wyjazd: false, stroj: false, grupy: [], osoby: [], wszyscy: false, wsp: S.kalView !== 'all' ? S.kalView : S.wspAktywna === 'ALL' ? 'all' : S.wspAktywna };
    modalState = { kind: 'kal', e: e, isNew: isNew }; UI.typOpen = false;
    renderEventDialog();
  }
  function grabEvent() {
    const m = modalState, e = m.e, v = id => { const x = document.getElementById(id); return x ? x.value.trim() : ''; };
    if (!document.getElementById('kData')) return e;
    e.data = v('kData') || e.data; e.dataDo = v('kDataDo'); e.godz = v('kGodz'); e.godzDo = v('kGodzDo');
    if (document.getElementById('kCelData')) { const nd = v('kCelData'); if (nd !== e.celData) delete e.celId; e.celData = nd; e.celGodz = v('kCelGodz'); }
    if (document.getElementById('kTytul')) e.tytul = v('kTytul');
    e.gdzie = v('kGdzie'); e.adres = v('kAdres'); e.uwagi = v('kUwagi'); e.info = v('kInfo'); e.agapaInfo = v('kAgapaInfo');
    e.agapa = document.getElementById('kAgapa').checked; ['pismo', 'wyjazd', 'stroj'].forEach(k => { const x = document.getElementById('k_' + k); if (x) e[k] = x.checked; }); e.wszyscy = false;
    { const mi = document.getElementById('kMiasto'); if (mi) { if ((e.miasto || '') !== mi.value.trim()) { delete e.lat; delete e.lon; } e.miasto = mi.value.trim(); } }
    if (document.querySelector('.kdni')) e.dni = Array.from(document.querySelectorAll('.kdni .chip.on')).map(x => +x.dataset.a);
    e.grupy = Array.from(document.querySelectorAll('.ktree .tg.on')).map(x => x.dataset.a);
    e.osoby = Array.from(new Set(Array.from(document.querySelectorAll('.ktree .tp.on')).map(x => x.dataset.a)));
    { const tl = document.getElementById('kTylko'); if (tl) { e.tylko = tl.checked; e.zapr = Array.from(document.querySelectorAll('#kZap [data-act=kal-zp].on')).map(x => x.dataset.a); if (e.tylko && !e.autor) e.autor = S.owner || ''; if (e.tylko && S.owner && e.zapr.indexOf(S.owner) < 0 && e.autor !== S.owner) e.zapr.push(S.owner); } }
    return e;
  }
  function renderEventDialog() {
    const m = modalState, e = m.e, t = TY[e.typ] || TY['p-og'];
    const people = e.wsp === 'all' ? Array.from(new Set([].concat.apply([], S.wspolnoty.map(w => membersOf(w.id))))) : membersOf(e.wsp);
    const gs = groupsFor(e.wsp);
    const grp = (kind, label) => '<optgroup label="' + label + '">' + TYPES.filter(x => x[3] === kind).map(x =>
      '<option value="' + x[0] + '"' + (e.typ === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</optgroup>';
    const kon = RANGE.indexOf(e.typ) >= 0;
    openModal(m.isNew ? 'Nowe wydarzenie' : nm(e),
      '<label class="lbl">Rodzaj wydarzenia</label><button class="typbtn" data-act="kal-typlist"><i class="pd big" style="background:' + t.col + '"></i><span class="grow">' + esc(t.n) + '</span><span class="chev sm' + (UI.typOpen ? ' up' : ' down') + '"></span></button>' +
      (UI.typOpen ? '<div class="typlist">' + [['c', 'Celebracje'], ['k', 'Katechezy'], ['p', 'Przygotowania'], ['o', 'Inne']].map(g => '<div class="typsec">' + g[1] + '</div>' +
        TYPES.filter(x => x[3] === g[0]).map(x => '<button class="typopt' + (e.typ === x[0] ? ' on' : '') + '" data-act="kal-typset" data-a="' + x[0] + '"><i class="pd" style="background:' + x[2] + '"></i>' +
          x[1] + '</button>').join('')).join('') + '</div>' : '') +
      (e.typ === 'inne' ? '<label class="lbl">Tytuł</label><input type="text" id="kTytul" value="' + esc(e.tytul || '') + '" placeholder="np. Spotkanie ekipy, Rekolekcje">' : '') +
      '<div class="row"><div class="grow"><label class="lbl">' + (kon ? 'Od' : 'Data') + '</label><input type="date" id="kData" value="' + esc(e.data) + '"></div>' +
      '<div class="grow"><label class="lbl">Godzina</label><input type="time" id="kGodz" value="' + esc(e.godz) + '"></div></div>' +
      (kon ? '<div class="row"><div class="grow"><label class="lbl">Do</label><input type="date" id="kDataDo" value="' + esc(e.dataDo) + '"></div>' +
        '<div class="grow"><label class="lbl">Godzina</label><input type="time" id="kGodzDo" value="' + esc(e.godzDo) + '"></div></div>'
        : '<input type="hidden" id="kDataDo" value=""><input type="hidden" id="kGodzDo" value="' + esc(e.godzDo) + '">') +
      (e.typ === 'gk' ? '<label class="lbl">Dni tygodnia (cyklicznie)</label><div class="chips kdni">' + DNI.map((x, i) =>
          '<button class="chip' + ((e.dni || []).indexOf(i + 1) >= 0 ? ' on' : '') + '" data-act="tgl" data-a="' + (i + 1) + '">' + x + '</button>').join('') + '</div>' +
          '<div class="muted">Zaznacz dni (np. wt i czw) – „Od” to pierwsza katecheza, „Do” ostatnia; kalendarz wypełni się sam.</div>' : '') +
      (CEL_OF[e.typ] ? '<div class="celbox"><label class="lbl">Do której ' + celName(CEL_OF[e.typ]) + '?</label><div class="row">' +
          '<div class="grow"><input type="date" id="kCelData" value="' + esc(e.celData || '') + '"></div><div class="grow"><input type="time" id="kCelGodz" value="' + esc(e.celGodz || '') + '"></div></div>' +
          (function () { const up = alive().filter(c => c.typ === CEL_OF[e.typ] && c.data >= iso(new Date())).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6);
            return up.length ? '<div class="chips">' + up.map(c => '<button class="chip' + (e.celId === c.id ? ' on' : '') + '" data-act="kal-celpick" data-a="' + c.id + '">' + plDate(c.data).slice(0, 5) + (c.godz ? ' ' + esc(c.godz) : '') + '</button>').join('') + '</div>' : ''; })() +
          '<div class="muted">Wybierz z kalendarza albo wpisz datę – jeśli tej ' + celName(CEL_OF[e.typ]) + ' nie ma w kalendarzu, dodam ją.</div></div>' : '') +
      (!m.isNew ? linkRow(e) : '') +
      (t.kind !== 'p' ? '<label class="lbl">Miejscowość</label><input type="text" id="kMiasto" value="' + esc(e.miasto || '') + '" placeholder="np. Kętrzyn">' : '') +
      '<label class="lbl">' + (t.kind === 'p' ? 'U kogo' : KATECH.indexOf(e.typ) >= 0 ? 'Parafia / miejsce' : 'Miejsce') + '</label><input type="text" id="kGdzie" value="' + esc(e.gdzie) + '" placeholder="' + (t.kind === 'p' ? 'np. u Kowalskich' : 'np. kościół, salka') + '">' +
      '<label class="lbl">Adres (opcjonalnie)</label><div class="row"><input type="text" id="kAdres" class="grow" value="' + esc(e.adres) + '">' +
      (e.adres ? '<button class="btn ghost" data-act="kal-map">🗺</button>' : '') + '</div>' +
      '<label class="lbl">Przypomnij w wiadomości</label>' + EXTRAS.map(x => '<label class="row"><input type="checkbox" id="k_' + x[0] + '"' + (e[x[0]] ? ' checked' : '') + '><span class="grow">' + x[1] + '</span></label>').join('') +
      '<label class="lbl">' + (e.typ === 'inne' ? 'Opis' : 'Poza tym (własnymi słowami)') + '</label><textarea id="kInfo" rows="2" placeholder="np. daj znać, jeśli nie masz Biblii Jerozolimskiej">' + esc(e.info) + '</textarea>' +
      '<label class="lbl">Uwagi</label><textarea id="kUwagi" rows="2">' + esc(e.uwagi) + '</textarea>' +
      '<label class="row mt"><input type="checkbox" id="kAgapa"' + (e.agapa ? ' checked' : '') + '><span class="grow">' + FISH + ' Agapa</span></label>' +
      '<input type="text" id="kAgapaInfo" class="mt" value="' + esc(e.agapaInfo) + '" placeholder="Agapa – kto co przynosi (opcjonalnie)">' +
      (S.wspolnoty.length > 1 ? '<label class="lbl">Wspólnota</label><select data-ch="kal-wsp">' + [['all', 'Wszystkie moje wspólnoty']].concat(S.wspolnoty.map(w => [w.id, w.nazwa])).map(x =>
        '<option value="' + x[0] + '"' + (e.wsp === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>' : '') +
      ((e.typ === 'skk' && e.tylko === undefined) ? (e.tylko = true, e.zapr = Object.keys(S.katech || {}), '') : '') +
      '<label class="row mt"><input type="checkbox" id="kTylko" data-ch="kal-tylko"' + (e.tylko ? ' checked' : '') + '><span class="grow"><b>Tylko dla zaproszonych</b> <span class="muted">(np. spotkanie katechistów)</span></span></label>' +
      '<div id="kZap" class="kzap' + (e.tylko ? '' : ' hidden') + '"><div class="muted">Widzą je i dostają przypomnienie tylko zaznaczeni.</div><div class="chips mt">' +
        '<button class="chip sm" data-act="kal-zpq" data-a="k">K – katechiści</button><button class="chip sm" data-act="kal-zpq" data-a="all">Wszyscy</button><button class="chip sm" data-act="kal-zpq" data-a="0">Nikt</button></div>' +
        '<div class="chips mt">' + people.filter(b => !(S.zmarli || {})[b]).map(b => '<button class="chip' + ((e.zapr || []).indexOf(b) >= 0 ? ' on' : '') + '" data-act="kal-zp" data-a="' + esc(b) + '">' + ((S.katech || {})[b] ? '<b>K</b> ' : '') + esc(b) + '</button>').join('') + '</div></div>' +
      '<label class="lbl">' + (t.kind === 'p' ? 'Kto przygotowuje' : 'Ekipa – kto przygotowuje') + '</label>' +
      '<div class="muted">' + (t.kind === 'p' ? 'Przypomnienie dzień wcześniej dostają tylko zaznaczone osoby i grupy.'
        : 'Wydarzenie i informacje widzi cała wspólnota' + (e.wsp === 'all' ? ' (wszystkie Twoje wspólnoty)' : '') + ' i wszyscy dostają przypomnienie. Tu zaznacz tylko ekipę, która przygotowuje.') + '</div>' +
      teamTree(e, gs, people),
      (m.isNew ? '' : '<button class="btn text" data-act="kal-del">Usuń</button>') +
      (!m.isNew && window.RZ && RZ.hasPlan(e) && RZ.canSee(e) ? '<button class="btn ghost" data-act="kal-rz" data-a="' + e.id + '">Przygotowanie ›</button>' : '') +
      (!m.isNew && PREP_V[e.typ] ? '<button class="btn ghost" data-act="kal-prep" data-a="' + e.id + '">Przygotowanie ›</button>' : '') +
      '<button class="btn" data-act="kal-ok">Zapisz</button>');
  }

  /** Drzewko ekipy: grupy (zaznaczenie całej grupy) → rozwijane osoby; osoby bez grupy osobno; szukajka. */
  function teamTree(e, gs, people) {
    UI.kOpen = UI.kOpen || {};
    const inG = new Set(); gs.forEach(g => g.osoby.forEach(b => inG.add(b)));
    const free = people.filter(b => !inG.has(b));
    const node = (key, name, members, isGroup) => {
      const open = !!UI.kOpen[key], sel = members.filter(b => e.osoby.indexOf(b) >= 0).length, gOn = isGroup && e.grupy.indexOf(key) >= 0;
      return '<div class="tnode"><div class="trow"><button class="tx" data-act="kt-open" data-a="' + esc(key) + '"><span class="chev sm' + (open ? ' down' : '') + '"></span></button>' +
        (isGroup ? '<button class="chip tg' + (gOn ? ' on' : '') + '" data-act="tgl" data-a="' + esc(key) + '">' + esc(name) + '</button>'
          : '<span class="tname">' + esc(name) + '</span>') +
        '<span class="muted grow">' + members.length + ' os.' + (sel ? ' · wybrane: ' + sel : '') + (gOn ? ' · cała grupa' : '') + '</span></div>' +
        '<div class="chips tkids' + (open ? '' : ' hidden') + '">' + members.map(b => '<button class="chip tp' + (e.osoby.indexOf(b) >= 0 ? ' on' : '') +
          '" data-act="kt-p" data-a="' + esc(b) + '">' + dot(b) + esc(b) + '</button>').join('') + '</div></div>';
    };
    return '<div class="ktree"><input type="search" id="ktq" placeholder="Szukaj osoby…" data-in="ktq">' +
      '<div id="ktres" class="chips mt"></div>' +
      gs.map(g => node(g.id, g.nazwa, g.osoby.filter(b => people.indexOf(b) >= 0 || g.id.indexOf('r:') === 0), true)).join('') +
      (free.length ? node('__free', gs.length ? 'Bez grupy' : 'Osoby', free, false) : '') + '</div>';
  }

  /* ---- przypomnienia (AlarmManager w aplikacji) ---- */
  const REM_CO = [['prep', 'Moje przygotowanie (gdy jestem w ekipie)'], ['czyt', 'Moje czytanie lub funkcja w Liturgii Słowa'], ['eu', 'Moja funkcja w Eucharystii'], ['kal', 'Wszystkie wydarzenia wspólnoty z kalendarza'], ['zapr', 'Rozesłanie zaproszeń SMS – dzień przed Eucharystią, Liturgią Słowa, pokutną i Konwiwencją o 18:15 (gotowy SMS do wysłania)']];
  const REM_KIEDY = [['1h', '1 godz. przed'], ['3h', '3 godz. przed'], ['rano', 'rano tego dnia'], ['1d', 'dzień wcześniej'], ['2d', '2 dni wcześniej']];
  const REM_KAN = [['app', 'Monit w aplikacji'], ['tel', 'Powiadomienie w telefonie'], ['gcal', 'W Kalendarzu Google']];
  /** Początek wydarzenia (ms) w danym dniu; bez godziny – null. */
  function startAt(dIso, godz) { if (!godz) return null; const d = fromIso(dIso), hm = godz.split(':').map(Number); d.setHours(hm[0], hm[1] || 0, 0, 0); return d.getTime(); }
  function nextOn(e, from) { return isCyclic(e) ? nextOcc(e, from) : (e.data >= from ? e.data : ''); }
  /** Co przypominać: lista spraw z datą (bez rozbicia na terminy). */
  function remSubjects() {
    const P = S.przyp, out = [], today = iso(new Date());
    if (!S.owner) return out;
    alive().forEach(e => {
      const t = TY[e.typ] || TY['p-og'], d = nextOn(e, today); if (!d) return;
      const mine = inTeam(e);
      if (mine && P.co.prep) out.push({ id: e.id, ev: e.id, d: d, godz: e.godz, title: (isPrep(e) ? 'Przygotowujesz: ' : 'Twoja ekipa: ') + nm(e), text: [whereTxt(e), e.adres].filter(Boolean).join(' · ') });
      else if (!isPrep(e) && P.co.kal) out.push({ id: e.id, ev: e.id, d: d, godz: e.godz, title: nm(e), text: [whereTxt(e), e.adres, e.agapa ? 'agapa' : ''].filter(Boolean).join(' · ') });
    });
    const c = S.celebration, myR = [];
    for (let i = 0; i < 5; i++) if (c.who[i] === S.owner) myR.push((i ? 'czytanie ' + i : 'wstęp ogólny') + (i && c.readings[i] ? ' – ' + c.readings[i] : ''));
    if (P.co.czyt && myR.length) {
      const ls = alive().filter(e => e.typ === 'ls').map(e => ({ e: e, d: nextOn(e, today) })).filter(x => x.d).sort((x, y) => x.d.localeCompare(y.d))[0];
      if (ls) out.push({ id: 'czyt', ev: ls.e.id, d: ls.d, godz: ls.e.godz, title: 'Liturgia Słowa – czytasz', text: myR.join('; ') });
    }
    const eu = S.eucharystia, myE = EU_ROLES.filter(r => eu.who[r] === S.owner);
    if (P.co.eu && eu.data && eu.data >= today && myE.length) {
      const ev = alive().find(e => e.typ === 'eu' && e.data === eu.data);
      out.push({ id: 'eu', ev: ev ? ev.id : null, d: eu.data, godz: eu.godzina || (ev && ev.godz) || '', title: 'Eucharystia – Twoja funkcja', text: myE.join(', ') + (eu.godzina ? ' · zbiórka ' + eu.godzina : '') });
    }
    // czytanie / funkcja zastępuje ogólne przypomnienie o tym samym wydarzeniu
    const spec = out.filter(x => x.id === 'czyt' || x.id === 'eu');
    return out.filter(x => !(x.id === x.ev && spec.some(y => y.ev === x.ev && y.d === x.d)));
  }
  /** Terminy przypomnień (ms) dla sprawy wg „kiedy”. */
  function remTimes(x) {
    const P = S.przyp, st = startAt(x.d, x.godz), day = fromIso(x.d), at = (off, h) => { const t = addDays(day, -off); t.setHours(h, 0, 0, 0); return t.getTime(); };
    const out = [];
    Object.keys(P.kiedy).filter(k => P.kiedy[k]).forEach(k => {
      let t;
      if (k === '1h' || k === '3h') t = st ? st - (k === '1h' ? 1 : 3) * 36e5 : at(0, 8);
      else if (k === 'rano') t = at(0, 7);
      else t = at(k === '1d' ? 1 : 2, P.hour);
      if (st && t >= st) return;
      out.push({ k: k, at: t });
    });
    return out;
  }
  function remList() {
    if (!S.przyp.on) return [];
    const list = [], now = Date.now();
    remSubjects().forEach(x => remTimes(x).forEach(r => {
      if (r.at <= now) return;
      list.push({ id: x.id + ':' + x.d + ':' + r.k, at: r.at, title: (r.k === '1d' || r.k === '2d' ? (r.k === '1d' ? 'Jutro' : 'Pojutrze') + ' – ' : '') + x.title + (x.godz ? ' · ' + x.godz : ''), text: x.text || 'Pokój!' });
    }));
    invDue().forEach(i => { if (i.at > now) list.push({ id: 'zapr:' + i.e.id + ':' + i.d, at: i.at, title: '✉ Roześlij zaproszenie: ' + nm(i.e) + ' jutro' + (i.e.godz ? ' · ' + i.e.godz : ''), text: 'Dotknij – SMS do wspólnoty jest gotowy' }); });
    return list.sort((a, b) => a.at - b.at);
  }
  /** Minuty przed początkiem – do przypomnień w Kalendarzu Google (wg wydarzenia z kalendarza). */
  function remMinutesFor(evId) {
    if (!S.przyp.on || !S.przyp.kan.gcal) return [];
    const subs = remSubjects().filter(x => x.ev === evId); if (!subs.length) return [];
    const x = subs[0], st = startAt(x.d, x.godz) || fromIso(x.d).getTime();
    return Array.from(new Set(remTimes(x).map(r => Math.max(0, Math.round((st - r.at) / 60000))))).slice(0, 5);
  }
  /** Monit w aplikacji: przypomnienia, których termin minął, a sprawa jeszcze się nie zaczęła. */
  function inAppCheck() {
    if (!S.przyp.on || !S.przyp.kan.app || modalState || !S.owner) return;
    const now = Date.now(), seen = S.przypSeen = S.przypSeen || {};
    const due = [];
    remSubjects().forEach(x => {
      const st = startAt(x.d, x.godz) || addDays(fromIso(x.d), 1).getTime();
      if (st < now) return;
      const r = remTimes(x).filter(r => r.at <= now).pop(); if (!r) return;
      const id = x.id + ':' + x.d + ':' + r.k; if (seen[id]) return;
      due.push({ id: id, x: x });
    });
    if (!due.length) return;
    due.forEach(d => { seen[d.id] = Date.now(); });
    Object.keys(seen).forEach(k => { if (now - seen[k] > 40 * 864e5) delete seen[k]; });
    save(true);
    modalState = { kind: 'przyp' };
    openModal('🔔 Przypomnienie', due.map(d => '<div class="kev"><b>' + esc(d.x.title) + '</b><div class="muted">' + esc(plDate(d.x.d) + (d.x.godz ? ', ' + d.x.godz : '')) + '</div>' +
      (d.x.text ? '<div>' + esc(d.x.text) + '</div>' : '') + '</div>').join(''), '<button class="btn" data-act="przyp-ok">OK</button>');
  }
  /** Widżety Androida: najbliższe wydarzenia (60 dni), daty do odliczania, kolor okresu. */
  function widgetPush() {
    if (!A || !A.setWidget) return;
    try {
      const t = new Date(), a = iso(t), y = t.getFullYear(), L = liturgy(t), cd = [];
      [y, y + 1].forEach(Y => { const e = easter(Y);
        cd.push({ n: 'Paschy', d: iso(addDays(e, -1)), c: '#C9A227' }, { n: 'Środy Popielcowej', d: iso(addDays(e, -46)), c: '#9C6ADE' }, { n: 'Pięćdziesiątnicy', d: iso(addDays(e, 49)), c: '#E5533D' },
          { n: 'Adwentu', d: iso(adventStart(Y)), c: '#9C6ADE' }, { n: 'Bożego Narodzenia', d: Y + '-12-25', c: '#F3E2B6' }); });
      const ev = eventsIn(a, iso(addDays(t, 60))).slice(0, 60).map(e => ({ d: e.d, g: e.godz || '', n: e.n, w: e.gdzie || '', c: e.kol, f: e.feast ? 1 : 0 }));
      A.setWidget(JSON.stringify({ ev: ev, cd: cd, lit: L.name || '', litc: L.col || '' }));
    } catch (e) { /* stary most */ }
  }
  setTimeout(widgetPush, 3000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') widgetPush(); });
  setTimeout(() => { invCheck(); inAppCheck(); }, 2500);
  setInterval(() => { if (document.visibilityState !== 'hidden') { invCheck(); inAppCheck(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => { invCheck(); inAppCheck(); }, 800); });
  /** Ustawienia → Ogólne: co, kiedy, którędy. */
  function remSettings() {
    const P = S.przyp;
    return '<label class="row mt"><span class="grow"><b>Przypomnienia</b></span><input type="checkbox" data-ch="przyp-on"' + (P.on ? ' checked' : '') + '></label>' +
      (P.on ? '<div class="przyp">' +
        '<label class="lbl">O czym przypominać</label>' + REM_CO.map(x => '<label class="row"><input type="checkbox" data-ch="przyp-co" data-a="' + x[0] + '"' + (P.co[x[0]] ? ' checked' : '') + '><span class="grow">' + x[1] + '</span></label>').join('') +
        '<label class="lbl">Kiedy (można kilka)</label><div class="chips">' + REM_KIEDY.map(x => '<button class="chip' + (P.kiedy[x[0]] ? ' on' : '') + '" data-act="przyp-kiedy" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
        ((P.kiedy['1d'] || P.kiedy['2d']) ? '<div class="row mt"><span class="grow">Godzina przypomnienia dzień / 2 dni wcześniej</span><select data-ch="przyp-h" style="width:auto">' +
          [8, 10, 12, 15, 17, 18, 19, 20, 21].map(x => '<option value="' + x + '"' + (P.hour === x ? ' selected' : '') + '>' + x + ':00</option>').join('') + '</select></div>' : '') +
        '<label class="lbl">Jak</label>' + REM_KAN.map(x => '<label class="row"><input type="checkbox" data-ch="przyp-kan" data-a="' + x[0] + '"' + (P.kan[x[0]] ? ' checked' : '') + '><span class="grow">' + x[1] + '</span></label>').join('') +
        (P.kan.gcal && !(S.gcal && S.gcal.on && S.gcal.cal) ? '<div class="notice">Kalendarz Google: najpierw włącz wysyłanie w Kalendarz → „Kalendarz Google”.</div>' : '') +
        (P.kan.gcal ? '<div class="muted">W Kalendarzu Google przypomnienie dostaje wydarzenie z kalendarza wspólnoty (czytanie i funkcję – przy Liturgii Słowa / Eucharystii z kalendarza).</div>' : '') +
        (S.owner ? '' : '<div class="notice">Najpierw wybierz siebie (Ustawienia → Ogólne → Jestem).</div>') +
        '<div class="muted mt">' + esc(nextRemText()) + '</div></div>' : '');
  }
  function nextRemText() { const l = remList(); return l.length ? 'Najbliższe: ' + new Date(l[0].at).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' – ' + l[0].title : 'Brak zaplanowanych przypomnień.'; }
  function syncReminders() {
    clearTimeout(syncReminders.wt); syncReminders.wt = setTimeout(widgetPush, 1500);
    if (!A || !A.setReminders) return;
    const list = S.przyp.kan.tel ? remList() : [];
    try { A.setReminders(JSON.stringify(list.slice(0, 60))); } catch (er) { /* starsza wersja mostka */ }
    gcalPush(false);
  }

  /* ---- Kalendarz Google: jednostronnie, z aplikacji do wybranego kalendarza w telefonie ---- */
  const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  function gcalOk() { return A && A.calSync && A.calList; }
  function gcalEvents() {
    const out = [], pad = n => String(n).padStart(2, '0');
    alive().forEach(e => {
      if (!e.data) return;
      const t = TY[e.typ] || TY['p-og'], cyc = isCyclic(e);
      const first = cyc ? nextOcc(e, e.data) : e.data; if (!first) return;
      const d0 = fromIso(first), allDay = !e.godz;
      const lastD = cyc ? first : (e.dataDo && e.dataDo > e.data ? e.dataDo : e.data);
      let start, end;
      if (allDay) { start = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate()); const l = fromIso(lastD); end = Date.UTC(l.getFullYear(), l.getMonth(), l.getDate() + 1); }
      else {
        const hm = x => x.split(':').map(Number), a = hm(e.godz); start = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), a[0], a[1]).getTime();
        const l = fromIso(lastD);
        if (e.godzDo) { const b = hm(e.godzDo); end = new Date(l.getFullYear(), l.getMonth(), l.getDate(), b[0], b[1]).getTime(); if (end <= start) end = start + 2 * 36e5; }
        else end = lastD !== first ? new Date(l.getFullYear(), l.getMonth(), l.getDate(), 23, 0).getTime() : start + 2 * 36e5;
      }
      let rrule = '';
      if (cyc) {
        rrule = 'FREQ=WEEKLY;BYDAY=' + e.dni.slice().sort().map(x => BYDAY[x - 1]).join(',');
        if (e.dataDo) { const u = fromIso(e.dataDo); rrule += ';UNTIL=' + u.getFullYear() + pad(u.getMonth() + 1) + pad(u.getDate()) + 'T235959Z'; }
      }
      const desc = extraLines(e, { team: true }).concat(S.wspolnoty.length > 1 ? [e.wsp === 'all' ? 'Wszystkie wspólnoty' : wspName(e.wsp)] : [], ['— z aplikacji Trójnóg']).join('\n');
      out.push({ id: e.id, rem: remMinutesFor(e.id), title: '✝ ' + nm(e), desc: desc, loc: [e.gdzie, e.miasto, e.adres].filter(Boolean).join(', '), start: start, end: end, allDay: allDay, rrule: rrule });
    });
    return out;
  }
  function gcalPush(force) {
    const g = S.gcal; if (!g || (!g.on && !force) || !g.cal || !gcalOk()) return;
    const evs = gcalEvents(), js = JSON.stringify(evs), h = g.cal + ':' + strHash(js);
    if (!force && h === g.hash) return;
    window.__gcalCb = (id, res) => {
      let r = {}; try { r = JSON.parse(res); } catch (er) { /* */ }
      if (r.ok) { S.gcal.hash = h; S.gcal.ts = Date.now(); UI.gcalMsg = 'Wysłano do kalendarza: ' + r.n + ' ' + (r.n === 1 ? 'wydarzenie' : r.n % 10 >= 2 && r.n % 10 <= 4 && (r.n % 100 < 10 || r.n % 100 >= 20) ? 'wydarzenia' : 'wydarzeń') + (r.del ? ', usunięto ' + r.del : '') + '.'; }
      else UI.gcalMsg = 'Błąd: ' + (r.err || 'brak zgody na kalendarz');
      save(true); if (UI.view === 'kalendarz' && !modalState) render(); else if (force) toast(UI.gcalMsg);
    };
    A.calSync(String(g.cal), js, 'g');
  }
  function strHash(x) { let h = 0; for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) | 0; return String(h >>> 0); }
  function gcalCard() {
    if (!gcalOk()) return '';
    const g = S.gcal || {};
    return '<div class="card" data-def="c"><h2>Kalendarz Google</h2>' +
      '<div class="muted">Tylko w jedną stronę: wydarzenia z aplikacji trafiają do wybranego kalendarza w telefonie (np. Twojego konta Google), a Google sam je synchronizuje. Zmiany zrobione w Google nie wracają do aplikacji.</div>' +
      '<label class="row mt"><span class="grow">Wysyłaj automatycznie po każdej zmianie</span><input type="checkbox" data-ch="gcal-on"' + (g.on ? ' checked' : '') + '></label>' +
      '<label class="lbl">Kalendarz</label>' + (UI.gcals ? '<select data-ch="gcal-cal"><option value="">— wybierz —</option>' + UI.gcals.map(c =>
        '<option value="' + c.id + '"' + (String(g.cal) === String(c.id) ? ' selected' : '') + '>' + esc(c.name + (c.acc && c.acc !== c.name ? ' (' + c.acc + ')' : '')) + '</option>').join('') + '</select>'
        : '<div class="row"><span class="grow">' + esc(g.calName || 'nie wybrano') + '</span><button class="btn ghost" data-act="gcal-list">Wybierz</button></div>') +
      '<button class="btn full mt" data-act="gcal-now"' + (g.cal ? '' : ' disabled') + '>⇪ Wyślij teraz do Kalendarza Google</button>' +
      (g.cal ? '<button class="btn text full" data-act="gcal-clear">Usuń z Google wszystko, co wysłała aplikacja</button>' : '') +
      '<div class="muted mt">' + esc(UI.gcalMsg || (g.ts ? 'Ostatnio wysłano: ' + new Date(g.ts).toLocaleString('pl-PL') : '')) + '</div></div>';
  }


  /* ---- synchronizacja kalendarza przez arkusz (każdy może dodawać; wygrywa nowsza zmiana) ---- */
  let kTimer = null, kBusy = false;
  function kalShared(e) { return e.wsp === 'all' || KATECH.indexOf(e.typ) >= 0 || wspShared(S.wspolnoty.find(w => w.id === e.wsp)); }
  function keyOfW(id) { const w = S.wspolnoty.find(x => x.id === id); return w ? w.key : undefined; }
  function scheduleKal() { clearTimeout(kTimer); kTimer = setTimeout(() => syncKal(false), 2500); }
  function kStatus(t) { UI.kalStatus = t; const el = document.getElementById('kalStatus'); if (el) el.textContent = t; }
  function syncKal(manual) {
    if (!wsReady() || kBusy) return;
    kBusy = true;
    const mine = S.kal.filter(kalShared).map(e => Object.assign({}, e, { wk: e.wsp === 'all' ? null : keyOfW(e.wsp) }));
    httpPost(S.syncUrl, JSON.stringify({ token: S.syncToken, action: 'kalendarz', events: mine }), (ok, text) => {
      kBusy = false;
      let r = null;
      try { r = JSON.parse(text); } catch (er) { r = null; }
      if (!ok || !r || !r.ok) { if (manual) kStatus('Kalendarz: brak połączenia.'); return; }
      if (!Array.isArray(r.events)) { kStatus('Kalendarz nie synchronizuje się – w arkuszu jest starszy Sync.gs (wklej nowy i wdroż „Nowa wersja”).'); return; }
      let changed = false;
      const byId = {}; S.kal.forEach(e => { byId[e.id] = e; });
      r.events.forEach(e => {
        if (!e || !e.id) return;
        if (e.wsp !== 'all') {   // u innych osób ta sama wspólnota ma inny identyfikator – łączymy po kluczu
          const k = e.wk === undefined || e.wk === null ? '' : e.wk, lw = S.wspolnoty.find(w => w.key === k);
          if (!lw && KATECH.indexOf(e.typ) < 0) return;
          e.wsp = lw ? lw.id : 'all';
        }
        const l = byId[e.id];
        if (!l || (e.ts || 0) > (l.ts || 0)) { if (l) S.kal.splice(S.kal.indexOf(l), 1); S.kal.push(e); changed = true; }
      });
      if (window.stanMark) stanMark('kal');
      if (window.RZ && RZ.fromEvents && RZ.fromEvents()) changed = true;
      kStatus('Kalendarz zsynchronizowany o ' + hhmm(Date.now()) + '.');
      if (changed) {
        save(true); syncReminders();
        const ae = document.activeElement;
        if (UI.view === 'kalendarz' && document.getElementById('modal').classList.contains('hidden') && (!ae || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(ae.tagName) < 0)) render();
      }
    });
  }
  setInterval(() => { if (document.visibilityState !== 'hidden') syncKal(false); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncKal(false); });
  setTimeout(() => { syncKal(false); syncReminders(); }, 2000);

  function commitEvent(e) {
    e.ts = Date.now();
    const i = S.kal.findIndex(x => x.id === e.id);
    if (i >= 0) S.kal[i] = e; else S.kal.push(e);
    save(); syncReminders(); scheduleKal();
  }

  /* ---- karta na stronie startowej ---- */
  /** Start: „Ten tydzień” – 7 dni po kolei, z zaznaczeniem, gdzie coś robisz. */
  function startCard() {
    ensure();
    const t0 = new Date(), td = iso(t0), out = [];
    for (let k = 0; k < 7; k++) {
      const d = iso(addDays(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()), k));
      alive().filter(e => isCyclic(e) ? onDay(e, d) : (d === e.data || (k === 0 && e.data < d && (e.dataDo || '') >= d))).forEach(e => out.push({ d: d, e: e }));
    }
    out.sort((a, b) => (a.d + (a.e.godz || '')).localeCompare(b.d + (b.e.godz || '')));
    const mineTxt = e => {
      const me = S.owner; if (!me) return '';
      if (e.typ === 'eu' && S.eucharystia && S.eucharystia.data === e.data) { const r = Object.keys(S.eucharystia.who || {}).filter(k => S.eucharystia.who[k] === me); if (r.length) return r.join(', '); }
      if (e.typ === 'ls' && S.celebration && S.celebration.data === e.data) { const n = (S.celebration.who || []).filter(w => w === me).length; if (n) return n > 1 ? 'czytasz ' + n + '×' : 'czytasz'; }
      return inTeam(e) ? 'Ty' : '';
    };
    if (!out.length) {
      const up = alive().filter(e => (e.dataDo || e.data) >= td).sort((a, b) => (a.data + (a.godz || '')).localeCompare(b.data + (b.godz || ''))).slice(0, 3);
      if (!up.length) return '';
      return '<div class="card"><h2>Najbliższe w kalendarzu</h2><div class="muted">W tym tygodniu nic – dalej:</div>' + up.map(e => row(e.data, e, mineTxt(e), false)).join('') + '</div>';
    }
    let last = '';
    return '<div class="card week"><h2>Ten tydzień</h2>' + out.slice(0, 8).map(x => { const hd = x.d !== last; last = x.d; return row(x.d, x.e, mineTxt(x.e), hd); }).join('') +
      (out.length > 8 ? '<div class="muted">i jeszcze ' + (out.length - 8) + ' – w kalendarzu</div>' : '') + '</div>';
    function row(d, e, mine, head) {
      const dd = fromIso(d), lbl = d === td ? 'dziś' : d === iso(addDays(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()), 1)) ? 'jutro' : SH[dd.getDay()] + ' ' + plDate(d).slice(0, 5);
      return '<div class="kup' + (mine ? ' mine' : '') + '" data-act="kal-goto" data-a="' + d + '"><span class="kdate">' + (head ? lbl : '') + '</span><i class="pd" style="background:' + (TY[e.typ] || TY['p-og']).col + '"></i>' +
        '<span class="grow">' + esc(nm(e)) + (e.godz ? ' · ' + e.godz : '') + (whereTxt(e) ? ' · ' + esc(whereTxt(e)) : '') + '</span>' + (mine ? '<span class="rb">' + esc(mine) + '</span>' : '') + '</div>';
    }
  }

  /* ===================== AKCJE ===================== */

  function act(a, v, el) {
    if (a === 'kal-zp') { el.classList.toggle('on'); return true; }
    if (a === 'kal-zpq') { document.querySelectorAll('#kZap [data-act=kal-zp]').forEach(x => x.classList.toggle('on', v === 'all' || (v === 'k' && !!(S.katech || {})[x.dataset.a]))); return true; }
    if (a.indexOf('plan-') === 0) return planAct(a, v, el);
    if (a.indexOf('harm-') === 0) return harmAct(a, v, el);
    const m = modalState;
    switch (a) {
      case 'tgl': el.classList.toggle('on'); return true;
      case 'przyp-kiedy': S.przyp.kiedy[v] = !S.przyp.kiedy[v]; save(true); syncReminders(); render(); return true;
      case 'przyp-set': UI.setGrp = 'og'; go('wiecej'); setTimeout(() => { const x = document.querySelector('.przyp'); if (x) x.scrollIntoView({ block: 'center' }); }, 50); return true;
      case 'przyp-ok': closeModal(); return true;
      case 'gcal-list':
        window.__calCb = (id, res) => { try { UI.gcals = JSON.parse(res); } catch (er) { UI.gcals = []; }
          if (!UI.gcals.length) toast('Brak kalendarzy do zapisu – dodaj konto Google w ustawieniach telefonu albo daj zgodę na kalendarz.'); render(); };
        A.calList('l'); return true;
      case 'gcal-now': UI.gcalMsg = 'Wysyłam…'; render(); gcalPush(true); return true;
      case 'gcal-clear':
        window.__gcalCb = (id, res) => { let r = {}; try { r = JSON.parse(res); } catch (er) { /* */ } UI.gcalMsg = r.ok ? 'Usunięto z Google: ' + (r.del || 0) + '.' : 'Błąd: ' + (r.err || ''); S.gcal.on = false; delete S.gcal.hash; save(true); render(); };
        A.calSync(String(S.gcal.cal), '[]', 'c'); return true;
      case 'kt-open': { grabEvent(); UI.kOpen = UI.kOpen || {}; UI.kOpen[v] = !UI.kOpen[v]; const sc = document.querySelector('.sh-b'), y = sc ? sc.scrollTop : 0;
        renderEventDialog(); const sc2 = document.querySelector('.sh-b'); if (sc2) sc2.scrollTop = y; return true; }
      case 'kt-p': {   // ta sama osoba może być w kilku miejscach drzewka – przełącz wszystkie
        const on = !el.classList.contains('on');
        document.querySelectorAll('.ktree .tp').forEach(x => { if (x.dataset.a === v) x.classList.toggle('on', on); });
        return true;
      }
      case 'grp-new': groupDialog(null); return true;
      case 'grp-edit': groupDialog(S.grupy.find(g => g.id === v)); return true;
      case 'grp-ok': {
        const n = document.getElementById('grpName').value.trim();
        if (!n) { toast('Wpisz nazwę grupy.'); return true; }
        const os = selected();
        os.slice().forEach(b => { const sp = window.spouse ? spouse(b) : ''; if (sp && os.indexOf(sp) < 0) os.push(sp); });   // małżeństwo – wspólna grupa
        S.grupy.forEach(x => { if (x.id !== m.id) x.osoby = x.osoby.filter(b => os.indexOf(b) < 0); });   // jedna osoba = jedna grupa
        if (m.id) { const g = S.grupy.find(x => x.id === m.id); g.nazwa = n; g.osoby = os; } else S.grupy.push({ id: uuid(), nazwa: n, osoby: os });
        closeModal(); save(); render(); return true;
      }
      case 'grp-del': S.grupy = S.grupy.filter(g => g.id !== m.id); closeModal(); save(); render(); return true;
      case 'grob-new': grobDialog(null); return true;
      case 'grob-edit': grobDialog(S.grupyRob.find(g => g.id === v)); return true;
      case 'grob-ok': {
        const n = document.getElementById('grpName').value.trim();
        if (!n) { toast('Wpisz nazwę grupy.'); return true; }
        const os = selected();
        if (m.id) { const g = S.grupyRob.find(x => x.id === m.id); g.nazwa = n; g.osoby = os; g.wsp = m.wsp.slice(); }
        else S.grupyRob.push({ id: uuid(), nazwa: n, wsp: m.wsp.slice(), osoby: os });
        closeModal(); save(); render(); return true;
      }
      case 'grob-del': S.grupyRob = S.grupyRob.filter(g => g.id !== m.id); closeModal(); save(); render(); return true;
      case 'grp-present': {
        const g = S.grupy.find(x => x.id === v); if (!g) return true;
        const eu = el.dataset.b === 'eu', cur = new Set(eu ? S.eucharystia.obecni : S.obecni);
        const allIn = g.osoby.every(b => cur.has(b) || S.bracia.indexOf(b) < 0 || (window.HZ && HZ.busy(b)));
        g.osoby.forEach(b => { if (allIn) cur.delete(b); else if (!(window.HZ && HZ.busy(b))) cur.add(b); });
        const list = S.bracia.filter(b => cur.has(b));
        if (eu) S.eucharystia.obecni = list; else S.obecni = list;
        save(); render(); return true;
      }
      case 'kal-m': { const d = fromIso(UI.kalM); d.setMonth(d.getMonth() + (+v)); UI.kalM = iso(d); render(); return true; }
      case 'kal-today': { const n = new Date(); UI.kalM = iso(new Date(n.getFullYear(), n.getMonth(), 1)); UI.kalD = iso(n); render(); return true; }
      case 'kal-day': {   // dwa szybkie dotknięcia tego samego dnia = nowe wydarzenie
        const now = Date.now(), dbl = UI.kalTap && UI.kalTap.d === v && now - UI.kalTap.t < 450;
        UI.kalTap = { d: v, t: now }; UI.kalD = v;
        if (dbl) { UI.kalTap = null; eventDialog(null, v); return true; }
        render(); return true;
      }
      case 'kal-pick': UI.kalPY = fromIso(UI.kalM).getFullYear(); pickDialog(); return true;
      case 'kal-py': UI.kalPY += +v; pickDialog(); return true;
      case 'kal-pm': { UI.kalM = iso(new Date(UI.kalPY, +v, 1)); closeModal(); render(); return true; }
      case 'kal-goto': { const d = fromIso(v); UI.kalD = v; UI.kalM = iso(new Date(d.getFullYear(), d.getMonth(), 1)); go('kalendarz'); return true; }
      case 'kal-view': S.kalView = v; save(true); render(); return true;
      case 'kal-new': eventDialog(null, v); return true;
      case 'kal-edit': eventDialog(S.kal.find(e => e.id === v)); return true;
      case 'kal-celpick': {
        const c = alive().find(x => x.id === v); if (!c) return true;
        grabEvent(); m.e.celId = c.id; m.e.celData = c.data; m.e.celGodz = c.godz || ''; renderEventDialog(); return true;
      }
      case 'kal-prepnew': {
        const c = alive().find(x => x.id === v); if (!c) return true;
        closeModal(); eventDialog(null, c.data, PREP_OF[c.typ]);
        Object.assign(modalState.e, { celId: c.id, celData: c.data, celGodz: c.godz || '', data: iso(addDays(fromIso(c.data), -2)) }); renderEventDialog(); return true;
      }
      case 'kal-inv': { const e = alive().find(x => x.id === v); if (!e) return true; closeModal(); openInvite(e, nextOn(e, iso(new Date())) || e.data); return true; }
      case 'kal-evsms': { const e = alive().find(x => x.id === v); if (!e) return true;
        closeModal(); modalState = { kind: 'plan', only: e.id, range: 'd', day: e.data, ws: e.wsp === 'all' ? S.wspolnoty.map(w => w.id) : [e.wsp], feasts: false, stage: 'pick', sent: {}, hello: 'imie', team: true, off: e.tylko ? Object.fromEntries(planPeople(e.wsp === 'all' ? S.wspolnoty.map(w => w.id) : [e.wsp]).filter(p => (e.zapr || []).indexOf(p.n) < 0).map(p => [p.n, 1])) : {} };
        planDialog(); return true; }
      case 'kal-prepgo': closeModal(); go(v); return true;
      case 'kal-eumove': closeModal(); if (window.__euMove) window.__euMove(); return true;
      case 'kal-prep': { const e = alive().find(x => x.id === v); if (e && PREP_V[e.typ]) { closeModal(); openPrep(e); } return true; }
      case 'pok-add': pokDialog(); return true;
      case 'pok-tgl': { const l = pokDates(), i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); save(true); if (modalState && modalState.kind === 'pok') pokDialog(); else render(); return true; }
      case 'pok-save': { const d = (document.getElementById('pokData') || {}).value; if (d && pokDates().indexOf(d) < 0) pokDates().push(d); save(true); closeModal(); render(); return true; }
      case 'kal-rz': { const e = alive().find(x => x.id === v); if (e && window.RZ && RZ.canSee(e)) { closeModal(); RZ.openForEvent(e); } return true; }
      case 'kal-map': { const e = grabEvent(); if (e.adres) openUrl('geo:0,0?q=' + encodeURIComponent(e.adres)); return true; }
      case 'kal-typlist': grabEvent(); UI.typOpen = !UI.typOpen; renderEventDialog(); return true;
      case 'kal-typset': grabEvent(); m.e.typ = v; UI.typOpen = false; renderEventDialog(); return true;
      case 'kal-ok': {
        const e = grabEvent();
        if (!e.data) { toast('Wybierz datę.'); return true; }
        if (e.dataDo && e.dataDo < e.data) e.dataDo = '';
        if (RANGE.indexOf(e.typ) < 0) e.dataDo = '';
        if (CEL_OF[e.typ] && e.celData) {   // celebracja, do której jest przygotowanie – w kalendarzu też
          let c = celOf(e);
          if (!c) {
            c = { id: uuid(), typ: CEL_OF[e.typ], data: e.celData, dataDo: '', godz: e.celGodz || '', godzDo: '', gdzie: '', adres: '', uwagi: '', info: '', agapa: false, agapaInfo: '', grupy: [], osoby: [], wszyscy: false, wsp: e.wsp };
            commitEvent(c); toast('Dodano też: ' + TY[c.typ].n + ', ' + plDate(c.data) + '.');
          } else if (e.celGodz && !c.godz) commitEvent(Object.assign(JSON.parse(JSON.stringify(c)), { godz: e.celGodz }));
          e.celId = c.id;
        }
        closeModal(); commitEvent(e);
        UI.kalD = e.data; const d = fromIso(e.data); UI.kalM = iso(new Date(d.getFullYear(), d.getMonth(), 1));
        render(); toast('Zapisano w kalendarzu.'); return true;
      }
      case 'kal-del': {
        const e = m.e;
        closeModal();
        confirmBox('Usunąć wydarzenie?', nm(e) + ' – ' + plDate(e.data), 'Usuń', () => {
          commitEvent(Object.assign({}, e, { del: true })); render();
        });
        return true;
      }
    }
    return false;
  }
  function change(ch, v, el) {
    switch (ch) {
      case 'harm-real': case 'harm-dow': case 'harm-co': case 'harm-start': case 'harm-name': case 'hsms-all': case 'hsms-hi': case 'hsms-p': return harmChange(ch, v, el);
      case 'grob-w': {
        const sel = selected(), name = document.getElementById('grpName').value;
        modalState.wsp[+v] = el.value; renderGrob(sel, name); return true;
      }
      case 'kal-typ': grabEvent(); modalState.e.typ = el.value; renderEventDialog(); return true;
      case 'kal-tylko': { const z = document.getElementById('kZap'); if (z) z.classList.toggle('hidden', !el.checked); return true; }
      case 'kal-wsp': grabEvent(); modalState.e.wsp = el.value; modalState.e.grupy = []; renderEventDialog(); return true;
      case 'plan-p': if (el.checked) delete modalState.off[v]; else modalState.off[v] = 1;
        { const b = document.querySelector('[data-act=plan-next]'); if (b) b.textContent = 'Dalej (' + planPeople(modalState.ws).filter(p => !modalState.off[p.n]).length + ' os.) ▶'; } return true;
      case 'plan-day': modalState.day = el.value; delete modalState.body; planDialog(); return true;
      case 'plan-od': case 'plan-do': if (el.value) modalState[ch === 'plan-od' ? 'od' : 'do'] = el.value; delete modalState.body; planDialog(); return true;
      case 'plan-feasts': modalState.feasts = el.checked; delete modalState.body; planDialog(); return true;
      case 'plan-team': modalState.team = el.checked; delete modalState.body; planDialog(); return true;
      case 'przyp-on': S.przyp.on = el.checked; save(true); syncReminders(); render(); return true;
      case 'przyp-co': S.przyp.co[v] = el.checked; save(true); syncReminders(); render(); return true;
      case 'przyp-kan': S.przyp.kan[v] = el.checked; save(true); syncReminders(); if (v === 'gcal') gcalPush(true); render(); return true;
      case 'gcal-on': S.gcal = S.gcal || {}; S.gcal.on = el.checked; save(true); if (el.checked) gcalPush(true); render(); return true;
      case 'gcal-cal': { const c = (UI.gcals || []).find(x => String(x.id) === el.value); S.gcal = S.gcal || {};
        S.gcal.cal = c ? c.id : ''; S.gcal.calName = c ? c.name + (c.acc && c.acc !== c.name ? ' (' + c.acc + ')' : '') : ''; delete S.gcal.hash; UI.gcals = null; save(true); render(); return true; }
      case 'przyp-h': S.przyp.hour = +el.value; save(true); syncReminders(); render(); return true;
    }
    return false;
  }

  function pickDialog() {
    const cur = fromIso(UI.kalM), n = new Date();
    modalState = { kind: 'kalpick' };
    openModal('Wybierz miesiąc', '<div class="kalnav"><button class="knav" data-act="kal-py" data-a="-1">‹</button><b class="grow center">' + UI.kalPY + '</b>' +
      '<button class="knav" data-act="kal-py" data-a="1">›</button></div><div class="kmonths">' + MONTHS.map((mn, i) =>
        '<button class="chip' + (UI.kalPY === cur.getFullYear() && i === cur.getMonth() ? ' on' : '') + (UI.kalPY === n.getFullYear() && i === n.getMonth() ? ' now' : '') +
        '" data-act="kal-pm" data-a="' + i + '">' + mn + '</button>').join('') + '</div>');
  }

  /* ---- plan na najbliższy czas: SMS / WhatsApp do wybranych wspólnot ---- */
  const RANGES = [['d', 'jeden dzień'], ['7', '7 dni'], ['14', '2 tygodnie'], ['31', 'miesiąc'], ['m', 'ten miesiąc'], ['n', 'następny miesiąc'], ['z', 'wybrane daty']];
  function planRange(r) {
    const n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (r === 'd') { const d = fromIso((modalState && modalState.day) || UI.kalD || iso(t0)); return [d, d]; }
    if (r === 'z') { const m = modalState || {}, a = fromIso(m.od || iso(t0)), b = fromIso(m.do || m.od || iso(t0)); return a <= b ? [a, b] : [b, a]; }
    if (r === 'm') return [t0, new Date(n.getFullYear(), n.getMonth() + 1, 0)];
    if (r === 'n') return [new Date(n.getFullYear(), n.getMonth() + 1, 1), new Date(n.getFullYear(), n.getMonth() + 2, 0)];
    return [t0, addDays(t0, (+r || 14) - 1)];
  }
  function planPeople(ws) { return peopleOf(ws); }
  function planPeopleOld(ws) {
    const out = [], seen = {};
    ws.forEach(id => {
      const w = S.wspolnoty.find(x => x.id === id); if (!w) return;
      const act = id === S.wspAktywna, list = act ? S.bracia : (w.bracia || []), tels = act ? S.telefony : (w.telefony || {});
      list.forEach(b => { if (!seen[b]) { seen[b] = 1; out.push({ n: b, tel: tels[b] || '', wsp: w.nazwa }); } });
    });
    return out;
  }
  const EXTRAS = [['pismo', '📖 Weź Pismo Święte i coś do pisania'], ['wyjazd', '🧳 Wyjazdowe – spakuj rzeczy (dni i noce policzą się same)'], ['stroj', '👔 Ładny, odświętny strój na Eucharystię']];
  const GEN = ['niedzieli', 'poniedziałku', 'wtorku', 'środy', 'czwartku', 'piątku', 'soboty'];
  /** Pożegnanie: w Oktawie Wielkanocy „Prawdziwie zmartwychwstał!”, poza nią zmienne (to samo przez cały dzień). */
  const BYES = ['Do zobaczenia! Niech Pan nas prowadzi.', 'Odwagi! Do zobaczenia.', 'Odwagi – Chrystus zwyciężył świat! Do zobaczenia.', 'Do zobaczenia! Niech Pan Was błogosławi.',
    'Nie lękajcie się! Do zobaczenia.', 'Do zobaczenia! Maryja niech Was prowadzi.', 'Odwagi, bracia! Pan jest z nami.', 'Do zobaczenia! Bóg jest wierny.', 'Do zobaczenia! Z Panem Bogiem.', 'Odwagi! Pan nas kocha. Do zobaczenia.'];
  function bye() { if (window.isOktawa && isOktawa()) return 'Prawdziwie zmartwychwstał!'; const d = new Date(); return BYES[(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % BYES.length]; }
  /** Zaproszenie na celebrację (SMS dzień wcześniej). */
  const INV = { eu: 'Eucharystię', ls: 'Liturgię Słowa', lp: 'Liturgię pokutną', kon: 'Konwiwencję' };
  function inviteText(e, d) {
    const x = Object.assign({}, e, { data: d || e.data }), w = whenHuman(x, true), pl = [e.gdzie, e.miasto, e.adres].filter(Boolean).join(', '), tm = iso(addDays(new Date(), 1)) === x.data;
    return 'Zapraszam Cię na ' + (INV[e.typ] || nm(e)) + (tm ? ' jutro, ' : ' ') + w + (pl ? ', ' + pl : '') + '.' + (e.agapa ? ' Po celebracji agapa.' : '') + '\n\n' + bye();
  }
  function openInvite(e, d) {
    const ws = e.wsp === 'all' ? S.wspolnoty.map(w => w.id) : [e.wsp];
    const off = e.tylko ? Object.fromEntries(planPeople(ws).filter(p => (e.zapr || []).indexOf(p.n) < 0).map(p => [p.n, 1])) : Object.fromEntries(planPeople(ws).filter(p => !massOK(p.n)).map(p => [p.n, 1]));
    modalState = { kind: 'plan', only: e.id, range: 'd', day: d || e.data, ws: ws, feasts: false, stage: 'queue', sent: {}, hello: 'imie', team: false, off: off, body: inviteText(e, d) };
    planDialog();
  }
  function invDue() {
    const P = S.przyp, out = [], today = iso(new Date());
    if (!P.on || !P.co.zapr) return out;
    alive().filter(e => INV[e.typ]).forEach(e => { const d = nextOn(e, today); if (!d) return; const t = addDays(fromIso(d), -1); t.setHours(18, 15, 0, 0); out.push({ e: e, d: d, at: t.getTime(), st: startAt(d, e.godz) || fromIso(d).getTime() + 864e5 }); });
    return out;
  }
  function invCheck() {
    if (modalState) return;
    const now = Date.now(), seen = S.przypSeen = S.przypSeen || {};
    const x = invDue().find(i => i.at <= now && now < i.st && !seen['zapr:' + i.e.id + ':' + i.d]); if (!x) return;
    seen['zapr:' + x.e.id + ':' + x.d] = now; save(true); openInvite(x.e, x.d);
  }
  const ACC = ['w niedzielę', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę'];
  const SH = ['nd', 'pn', 'wt', 'śr', 'czw', 'pt', 'sob'];
  const dm = d => { const x = fromIso(d); return x.getDate() + '.' + String(x.getMonth() + 1).padStart(2, '0'); };
  const plNoc = n => n === 1 ? '1 noc' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? n + ' noce' : n + ' nocy';
  function tripDays(e) { return e.dataDo && e.dataDo > e.data ? Math.round((fromIso(e.dataDo) - fromIso(e.data)) / 864e5) : 0; }
  function packText(e) {
    const n = tripDays(e), a = [];
    if (e.pismo) a.push('Pismo Święte', 'coś do pisania');
    if (e.wyjazd) a.push(n ? 'rzeczy na ' + (n + 1) + ' dni i ' + plNoc(n) : 'rzeczy na wyjazd');
    return a.length ? a.slice(0, -1).join(', ') + (a.length > 1 ? ' i ' : '') + a[a.length - 1] : '';
  }
  function extrasShort(e) { return [e.pismo ? 'Pismo' : '', e.wyjazd ? 'wyjazdowe' : '', e.stroj ? 'odświętny strój' : ''].filter(Boolean).join(', '); }
  /** Kiedy – po ludzku: „od piątku 6.11, godz. 16:00, do niedzieli 8.11 (ok. 15:00)” albo „w piątek 6.11 o 18:00”. */
  function whenHuman(e, withDay) {
    const d = fromIso(e.data).getDay();
    if (e.dataDo && e.dataDo !== e.data) return 'od ' + GEN[d] + ' ' + dm(e.data) + (e.godz ? ', godz. ' + e.godz : '') + ', do ' + GEN[fromIso(e.dataDo).getDay()] + ' ' + dm(e.dataDo) + (e.godzDo ? ' (ok. ' + e.godzDo + ')' : '');
    return (withDay ? ACC[d] + ' ' + dm(e.data) : '') + (e.godz ? (withDay ? ' ' : '') + (e.godzDo ? e.godz + '–' + e.godzDo : 'o ' + e.godz) : '');
  }
  function extraLines(e, m) {
    const out = [], pk = packText(e);
    if (pk) out.push('Weź ze sobą ' + pk + '.');
    if (e.stroj) out.push('Na Eucharystię – ładny, odświętny strój.');
    if (e.agapa) out.push(e.agapaInfo ? 'Będzie agapa: ' + e.agapaInfo + '.' : 'Będzie też agapa, więc jeśli możesz, przynieś coś do wspólnego stołu.');
    if (e.info) out.push(e.info);
    if (e.uwagi) out.push('Uwaga: ' + e.uwagi);
    if (m.team && teamText(e)) out.push((isPrep(e) ? 'Przygotowują: ' : 'Ekipa: ') + teamText(e) + '.');
    return out;
  }
  function planEvents(m) {
    if (m.only) { const e = alive().find(x => x.id === m.only); const d = e ? fromIso(e.data) : new Date(); return { rg: [d, d], a: e ? e.data : '', b: e ? e.data : '', evs: e ? [e] : [] }; }
    const rg = planRange(m.range), a = iso(rg[0]), b = iso(rg[1]), inWs = e => e.wsp === 'all' || m.ws.indexOf(e.wsp) >= 0;
    const evs = [];
    const kOk = e => !m.kinds || m.kinds[(TY[e.typ] || {}).kind || 'o'] !== false;
    alive().filter(inWs).filter(kOk).forEach(e => {
      if (isCyclic(e)) { if (e.data <= b && (!e.dataDo || e.dataDo >= a)) for (let d = new Date(rg[0]); d <= rg[1]; d = addDays(d, 1)) if (onDay(e, iso(d))) evs.push(Object.assign({}, e, { data: iso(d), dataDo: '' })); return; }
      if (e.data <= b && (e.dataDo || e.data) >= a) evs.push(e);
    });
    return { rg: rg, a: a, b: b, evs: evs };
  }
  function planText(m) {
    const P = planEvents(m), one = P.a === P.b, items = [];
    P.evs.forEach(e => items.push({ d: e.data, g: e.godz || '', e: e }));
    if (m.feasts) for (let d = new Date(P.rg[0]); d <= P.rg[1]; d = addDays(d, 1)) feastsOn(iso(d)).filter(f => f.r === 'U').forEach(f => items.push({ d: iso(d), g: '', f: f.n }));
    items.sort((x, y) => (x.d + x.g).localeCompare(y.d + y.g));
    const evItems = items.filter(i => i.e), lines = [];
    const fs = items.filter(i => i.f), fl = () => { if (fs.length) lines.push('', '✠ Uroczystości:', ...fs.map(i => (one ? '' : SH[fromIso(i.d).getDay()] + ' ' + dm(i.d) + ' – ') + i.f)); };
    const place = e => [e.gdzie, e.miasto, e.adres].filter(Boolean).join(', ');
    if (evItems.length === 1 && (one || items.length === 1)) {   // jedno spotkanie – zwykłe zdania
      const e = evItems[0].e, w = whenHuman(e, true), pl = place(e);
      lines.push('✝ ' + nm(e) + ' – ' + w + (pl ? ', ' + pl : '') + '.');
      if (CEL_OF[e.typ] && e.celData) lines.push('Przygotowujemy ' + (CEL_OF[e.typ] === 'eu' ? 'Eucharystię' : 'Liturgię Słowa') + ': ' + ACC[fromIso(e.celData).getDay()] + ' ' + dm(e.celData) + ((e.celGodz || (celOf(e) || {}).godz) ? ' o ' + (e.celGodz || celOf(e).godz) : '') + '.');
      if (PREP_OF[e.typ]) prepsOf(e).slice(0, 1).forEach(p => lines.push('Przygotowanie: ' + ACC[fromIso(p.data).getDay()] + ' ' + dm(p.data) + (p.godz ? ' o ' + p.godz : '') + (p.gdzie ? ', ' + p.gdzie : '') + '.'));
      fl();
      const ex = extraLines(e, Object.assign({}, m, { team: m.team !== false })); if (ex.length) lines.push('', ...ex);
    } else if (!evItems.length) {
      lines.push(one ? 'Tego dnia (' + ACC[P.rg[0].getDay()].replace(/^we? /, '') + ' ' + dm(P.a) + ') nie mamy spotkań.' : 'Do ' + dm(P.b) + ' nie mamy zaplanowanych spotkań.');
      fl();
    } else {
      lines.push(one ? '✝ Plan na ' + ACC[P.rg[0].getDay()] + ' ' + dm(P.a) + ':' : '✝ Plan na najbliższy czas (' + dm(P.a) + '–' + dm(P.b) + '):');
      let lastD = '';
      evItems.forEach(i => {
        if (!one && i.d !== lastD) { lines.push('', SH[fromIso(i.d).getDay()] + ' ' + dm(i.d) + ':'); lastD = i.d; }
        const e = i.e, w = whenHuman(e, false), pl = place(e);
        lines.push('• ' + nm(e) + (w ? (/^o /.test(w) ? ' ' : ', ') + w : '') + (pl ? ', ' + pl : ''));   // wiele wydarzeń: tylko co, kiedy, gdzie
      });
      fl();
    }
    lines.push('', bye());
    return lines.join('\n');
  }
  function grabPlan() { const t = document.getElementById('planBody'); if (t && modalState) modalState.body = t.value; }
  function planMsg(m, who) { const h = m.hello === true ? 'imie' : m.hello, nm = h === 'bracia' || !who ? 'bracia' : firstName(who), b = m.body !== undefined ? m.body : planText(m); return (h ? pokoj() + ', ' + nm + '!\n\n' : '') + (nm === 'bracia' ? b.replace(/Zapraszam Cię/g, 'Zapraszam Was') : b); }
  function planDialog() {
    if (!modalState || modalState.kind !== 'plan') modalState = { kind: 'plan', off: Object.fromEntries(peopleOf(S.wspolnoty.length > 1 ? S.wspolnoty.map(w => w.id) : [S.wspolnoty[0].id]).filter(p => !massOK(p.n)).map(p => [p.n, 1])), range: '14', ws: S.wspolnoty.length > 1 ? S.wspolnoty.map(w => w.id) : [S.wspolnoty[0].id], feasts: false, stage: 'pick', sent: {}, hello: 'imie', team: false };
    const m = modalState;
    if (m.stage === 'queue') {
      const ppl = planPeople(m.ws).filter(p => !m.off[p.n]);
      openModal('Plan – wysyłka', '<label class="lbl">Treść (możesz poprawić' + (m.hello ? '; powitanie dopisze się samo' : '') + ')</label>' +
        '<textarea id="planBody" rows="9">' + esc(m.body !== undefined ? m.body : planText(m)) + '</textarea>' +
        '<button class="btn full mt" data-act="plan-auto">⚡ Wyślij wszystkim (osobno, od razu)</button>' +
        '<button class="btn ghost full mt" data-act="plan-group">👥 Wszystkim to samo („Pokój, bracia!”) – każdy osobno</button>' +
        '<div class="muted mt">Albo pojedynczo: „✉ SMS” przy osobie – wyślij i wróć, następna czeka.</div>' +
        ppl.map(p => '<div class="row chk' + (m.sent[p.n] ? ' sent' : '') + '"><span class="grow">' + (m.sent[p.n] ? '✓ ' : '') + dot(p.n) + esc(p.n) +
          '<br><span class="muted">' + (p.tel ? esc(p.tel) : 'bez numeru – wybierzesz w SMS') + (m.ws.length > 1 ? ' · ' + esc(p.wsp) : '') + '</span></span>' +
          '<button class="btn sm" data-act="plan-send" data-a="' + esc(p.n) + '">✉ SMS</button><button class="icon wa" data-act="plan-send" data-a="' + esc(p.n) + '" data-b="wa">W</button></div>').join('') +
        '<div class="sec">Osoba spoza listy / grupa WhatsApp</div><div class="row"><button class="btn ghost grow" data-act="plan-send" data-a="">✉ SMS (wybierz kontakt)</button>' +
        '<button class="icon wa" data-act="plan-send" data-a="" data-b="wa">W</button></div>',
        '<button class="btn text" data-act="plan-back">◀ Zmień</button>');
      return;
    }
    openModal(m.only ? 'Info o wydarzeniu' : 'Rozpiska spotkań',
      (m.only ? '' : '<label class="lbl">Zakres</label><div class="chips">' + RANGES.map(r => '<button class="chip' + (m.range === r[0] ? ' on' : '') + '" data-act="plan-range" data-a="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>' +
      (m.range === 'd' ? '<input type="date" data-ch="plan-day" class="mt" value="' + esc(m.day || UI.kalD || iso(new Date())) + '">' : '')) +
      (m.range === 'z' ? '<div class="row mt"><div class="grow"><label class="lbl">Od</label><input type="date" data-ch="plan-od" value="' + esc(m.od) + '"></div>' +
        '<div class="grow"><label class="lbl">Do</label><input type="date" data-ch="plan-do" value="' + esc(m.do) + '"></div></div>' : '') +
      (S.wspolnoty.length > 1 ? '<label class="lbl">Do kogo</label><div class="chips">' + S.wspolnoty.map(w =>
        '<button class="chip' + (m.ws.indexOf(w.id) >= 0 ? ' on' : '') + '" data-act="plan-ws" data-a="' + w.id + '">' + esc(w.nazwa) + '</button>').join('') +
        '<button class="chip' + (m.ws.length === S.wspolnoty.length ? ' on' : '') + '" data-act="plan-ws" data-a="*">Wszystkie</button></div>' : '') +
      (m.only ? '' : '<label class="lbl">Co ma być zawarte</label><div class="chips">' + [['c', 'Celebracje'], ['k', 'Katechezy'], ['p', 'Przygotowania'], ['o', 'Inne']].map(x =>
        '<button class="chip sm' + ((m.kinds || {})[x[0]] === false ? '' : ' on') + '" data-act="plan-kind2" data-a="' + x[0] + '">' + x[1] + '</button>').join('') +
        '<button class="chip sm' + (m.feasts ? ' on' : '') + '" data-act="plan-fe">' + 'Uroczystości ✠</button></div>') +
      '<label class="row"><input type="checkbox" data-ch="plan-team"' + (m.team ? ' checked' : '') + '><span class="grow">Dopisz, kto przygotowuje (ekipa)</span></label>' +
      '<label class="lbl">Powitanie</label><div class="chips">' + [['imie', 'Pokój, {imię}!'], ['bracia', 'Pokój, bracia!'], ['', 'bez']].map(x =>
        '<button class="chip' + ((m.hello === true ? 'imie' : m.hello || '') === x[0] ? ' on' : '') + '" data-act="plan-hi" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<label class="lbl">Podgląd</label><div class="msgprev">' + esc(planText(m)) + '</div>' +
      '<label class="lbl">Do kogo</label><div class="chips"><button class="chip" data-act="plan-all" data-a="1">Wszyscy</button><button class="chip" data-act="plan-all" data-a="2">Wszyscy+</button><button class="chip" data-act="plan-all" data-a="0">Nikt</button>' +
        (Object.keys(S.katech || {}).length ? '<button class="chip" data-act="plan-sel" data-a="k">K – katechiści</button>' : '') +
        (S.grupy || []).map(g => '<button class="chip" data-act="plan-sel" data-a="' + g.id + '"><i class="gdot" style="background:' + grpColor(g) + '"></i>' + esc(g.nazwa) + '</button>').join('') + '</div>' +
      planPeople(m.ws).map(p => '<label class="row chk"><input type="checkbox" data-ch="plan-p" data-a="' + esc(p.n) + '"' + (m.off[p.n] ? '' : ' checked') + '><span class="grow">' + dot(p.n) + esc(p.n) +
        (m.ws.length > 1 ? ' <span class="muted">· ' + esc(p.wsp) + '</span>' : '') + '</span><span class="muted">' + (p.tel ? esc(p.tel) : 'brak numeru') + '</span></label>').join(''),
      '<button class="btn" data-act="plan-next"' + (m.ws.length ? '' : ' disabled') + '>Dalej (' + planPeople(m.ws).filter(p => !m.off[p.n]).length + ' os.) ▶</button>');
  }
  function planAct(a, v, el) {
    const m = modalState;
    switch (a) {
      case 'plan-open': modalState = null; planDialog(); return true;
      case 'plan-range': m.range = v; if (v === 'd' && !m.day) m.day = UI.kalD || iso(new Date());
        if (v === 'z' && !m.od) { m.od = UI.kalD || iso(new Date()); m.do = iso(addDays(fromIso(m.od), 13)); } delete m.body; planDialog(); return true;
      case 'plan-ws':
        if (v === '*') m.ws = m.ws.length === S.wspolnoty.length ? [] : S.wspolnoty.map(w => w.id);
        else m.ws = m.ws.indexOf(v) >= 0 ? m.ws.filter(x => x !== v) : m.ws.concat([v]);
        delete m.body; planDialog(); return true;
      case 'plan-hi': m.hello = v; planDialog(); return true;
      case 'plan-next': m.stage = 'queue'; planDialog(); return true;
      case 'plan-fe': m.feasts = !m.feasts; delete m.body; planDialog(); return true;
      case 'plan-kind2': { m.kinds = m.kinds || {}; m.kinds[v] = m.kinds[v] === false; delete m.body; planDialog(); return true; }
      case 'plan-sel': { const g = v === 'k' ? null : (S.grupy || []).find(x => x.id === v);
        m.off = {}; planPeople(m.ws).forEach(p => { const inn = g ? (g.osoby || []).indexOf(p.n) >= 0 : !!(S.katech || {})[p.n]; if (!inn) m.off[p.n] = 1; }); planDialog(); return true; }
      case 'plan-all': { m.off = {}; planPeople(m.ws).forEach(p => { if (v === '0' || (v === '1' && !massOK(p.n))) m.off[p.n] = 1; }); const sc = document.querySelector('.sh-b'), y = sc ? sc.scrollTop : 0; planDialog(); const s2 = document.querySelector('.sh-b'); if (s2) s2.scrollTop = y; return true; }
      case 'plan-back': grabPlan(); m.stage = 'pick'; planDialog(); return true;
      case 'plan-auto': { grabPlan(); const ppl = planPeople(m.ws).filter(p => !m.off[p.n]);
        sendAllAuto(ppl.map(p => ({ tel: p.tel, text: planMsg(m, p.n) })), () => { ppl.forEach(p => { if (p.tel) m.sent[p.n] = true; }); if (modalState === m) planDialog(); });
        return true; }
      case 'plan-group': { grabPlan(); sendGroup(planPeople(m.ws).filter(p => !m.off[p.n]).map(p => p.tel), planMsg(m, '')); return true; }
      case 'plan-send': {
        grabPlan();
        const p = planPeople(m.ws).find(x => x.n === v), tel = p ? p.tel : '';
        const text = planMsg(m, v);
        if (el.dataset.b === 'wa') openUrl((tel ? 'https://wa.me/' + phoneDigits(tel) : 'https://wa.me/') + '?text=' + encodeURIComponent(text));
        else openUrl(smsUrl(tel ? [tel.replace(/\s/g, '')] : [], text));
        if (v) { m.sent[v] = true; planDialog(); }
        return true;
      }
    }
    return false;
  }

  let remT = null;
  function remSoon() { clearTimeout(remT); remT = setTimeout(syncReminders, 1500); }

  /** Odliczanie do Paschy (Wigilia Paschalna); z kalendarza, jeśli wpisano Paschę, inaczej z daty Wielkanocy. */
  function paschaCard() {
    const n = new Date(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()), td = iso(t0);
    const ev = alive().filter(e => e.typ === 'pascha' && (e.dataDo || e.data) >= td).sort((a, b) => a.data.localeCompare(b.data))[0];
    let d = ev ? fromIso(ev.data) : addDays(easter(n.getFullYear()), -1);
    if (!ev && d < t0) d = addDays(easter(n.getFullYear() + 1), -1);
    const days = Math.round((d - t0) / 86400000);
    const lbl = days === 0 ? 'Dziś Wigilia Paschalna!' : days === 1 ? 'Jutro Pascha' : 'Do Paschy: <b>' + days + '</b> dni';
    return '<div class="pascha" data-act="kal-goto" data-a="' + iso(d) + '"><span class="pz">✝</span><div class="grow">' + lbl +
      '<div class="muted">' + (ev ? 'Pascha wspólnoty' + (ev.gdzie ? ' · ' + esc(ev.gdzie) : '') : 'Wigilia Paschalna') + ' – ' + DOWL[d.getDay()] + ', ' + plDate(iso(d)) +
      (days >= 7 ? ' · ' + Math.floor(days / 7) + ' tyg. ' + (days % 7) + ' dni' : '') + '</div></div></div>';
  }

  function treeSearch(q) {
    const box = document.getElementById('ktres'); if (!box) return;
    q = q.trim().toLowerCase();
    if (!q) { box.innerHTML = ''; return; }
    const seen = {};
    const hits = Array.from(document.querySelectorAll('.ktree .tkids .tp')).filter(x => { const n = x.dataset.a; if (seen[n] || n.toLowerCase().indexOf(q) < 0) return false; seen[n] = 1; return true; });
    box.innerHTML = hits.length ? hits.map(x => '<button class="chip tp' + (x.classList.contains('on') ? ' on' : '') + '" data-act="kt-p" data-a="' + esc(x.dataset.a) + '">' + esc(x.dataset.a) + '</button>').join('')
      : '<span class="muted">Brak osoby.</span>';
  }

  /* ---- liturgia pokutna: sam zaznaczasz, że byłeś(-aś); licznik dni od ostatniej (prywatne, na tym telefonie) ---- */
  function pokDates() { if (!Array.isArray(S.pokuta)) S.pokuta = []; return S.pokuta; }
  function pokLast() { const td = iso(new Date()); return pokDates().filter(d => d <= td).sort().pop() || ''; }
  window.POK = {
    card: function () {
      if (S.pokShow === false) return '';
      const l = pokLast(), td = fromIso(iso(new Date()));
      const days = l ? Math.round((td - fromIso(l)) / 864e5) : null;
      return '<div class="pokuta"><span class="grow">' + (l ? 'Od ostatniej liturgii pokutnej: <b>' + (days === 0 ? 'dziś' : days + (days === 1 ? ' dzień' : ' dni')) + '</b> <span class="muted">(' + plDate(l) + ')</span>'
        : '<span class="muted">Liturgia pokutna – zaznacz, kiedy byłeś(-aś) ostatnio</span>') + '</span><button class="btn text sm" data-act="pok-add">Byłem/am</button></div>';
    },
    btn: function (e) {
      const on = pokDates().indexOf(e.data) >= 0;
      return '<button class="btn ' + (on ? '' : 'ghost ') + 'sm" data-act="pok-tgl" data-a="' + e.data + '">' + (on ? '✓ Byłem/am' : 'Byłem/am') + '</button>';
    },
  };
  function pokDialog() {
    const td = iso(new Date()), past = alive().filter(e => e.typ === 'lp' && e.data <= td).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 4);
    modalState = { kind: 'pok' };
    openModal('Liturgia pokutna', '<div class="muted">Zaznacz, kiedy byłeś(-aś) – na Starcie zobaczysz, ile dni minęło. Widzisz to tylko Ty.</div>' +
      (past.length ? '<label class="lbl">Z kalendarza</label><div class="chips">' + past.map(e => '<button class="chip' + (pokDates().indexOf(e.data) >= 0 ? ' on' : '') + '" data-act="pok-tgl" data-a="' + e.data + '">' + plDate(e.data) + '</button>').join('') + '</div>' : '') +
      '<label class="lbl">Inna data</label><div class="row"><input type="date" id="pokData" class="grow" value="' + td + '" max="' + td + '"><button class="btn" data-act="pok-save">Zapisz</button></div>' +
      (pokDates().length ? '<label class="lbl">Zaznaczone</label><div class="chips">' + pokDates().slice().sort().reverse().slice(0, 8).map(d => '<button class="chip on" data-act="pok-tgl" data-a="' + d + '">✓ ' + plDate(d) + ' ✕</button>').join('') + '</div>' : ''));
  }
  /** Z kalendarza do przygotowania: Eucharystia / Liturgia Słowa dostaje termin z wydarzenia i jest z nim połączona. */
  function openPrep(e) {
    const v = PREP_V[e.typ][0];
    const P = v === 'eucharystia' ? S.eucharystia : S.celebration;
    // celebracja: ta sama; przygotowanie: celebracja, do której się odnosi
    const c = CEL_OF[e.typ] ? (celOf(e) || (e.celData ? { id: '', data: e.celData, godz: e.celGodz || '', gdzie: '' } : null)) : e;
    const celeb = !!c;
    if (!c) toast('W wydarzeniu nie wpisano, której ' + celName(CEL_OF[e.typ]) + ' dotyczy.');
    const apply = () => {
      if (celeb) { P.data = c.data; if (v === 'eucharystia') P.godzEu = c.godz || P.godzEu || ''; else P.godz = c.godz || P.godz || ''; if (c.gdzie) P.gdzie = c.gdzie; if (c.id) P.ev = c.id; }
      save(); go(v);
    };
    if (celeb && v === 'eucharystia' && P.data && P.data !== c.data && P.data < iso(new Date())) { freshEu(c); return; }   // stara już się odbyła – nowe przygotowanie, stare do archiwum
    if (celeb && P.data && P.data !== c.data) {
      if (v === 'eucharystia') {
        confirmBox('Inny termin', 'Bieżące przygotowanie jest na ' + plDate(P.data) + '. Zacząć nowe na ' + plDate(c.data) + ' (bieżące trafi do archiwum), czy przenieść bieżące na ten dzień?', 'Nowe przygotowanie', () => freshEu(c));
        setTimeout(() => { const f = document.querySelector('#modal .sh-f'); if (f) { window.__euMove = apply; f.insertAdjacentHTML('afterbegin', '<button class="btn text" data-act="kal-eumove">Przenieś</button>'); } }, 0);
        return;
      }
      confirmBox('Inny termin', 'Bieżące przygotowanie jest na ' + plDate(P.data) + '. Ustawić je na ' + plDate(c.data) + ' (z kalendarza)?', 'Ustaw', apply);
      setTimeout(() => { const f = document.querySelector('#modal .sh-f'); if (f) f.insertAdjacentHTML('afterbegin', '<button class="btn text" data-act="kal-prepgo" data-a="' + v + '">Tylko otwórz</button>'); }, 0);
      return;
    }
    apply();
  }
  /** Nowe przygotowanie Eucharystii dla celebracji c: poprzednie (z treścią) do archiwum, ekipa z harmonogramu (do poprawienia). */
  function freshEu(c) {
    const old = S.eucharystia, has = old.songs.some(Boolean) || Object.keys(old.who || {}).some(k => old.who[k]);
    if (old.data && has && !S.history.some(h => h.tryb === 'Eucharystia' && h.date === old.data)) {
      const og = {}; EU_ROLES.forEach(r => { if (old.who[r]) og[r] = old.who[r]; }); if (old.godzina) og['Zbiórka'] = old.godzina;
      S.history.unshift({ id: uuid(), date: old.data, haslo: 'Eucharystia', prowadzil: '', tryb: 'Eucharystia', czytania: [], przydzialy: [], piesni: [], euPiesni: old.songs.slice(), ogolne: og, ts: Date.now() });
    }
    const E = S.eucharystia = newEucharystia();
    E.data = c.data; E.godzEu = c.godz || ''; if (c.gdzie) E.gdzie = c.gdzie; if (c.id) E.ev = c.id;
    let who = '';
    try {
      const H = harms().find(h => h.typ === 'eu'), x = H && harmPlan(H, 40).find(y => !y.skip && y.d === c.data);
      if (x) { E.obecni = teamOf(H, x).filter(b => S.bracia.indexOf(b) >= 0); who = gName(x.who); }
    } catch (er) { /* bez harmonogramu */ }
    save(); go('eucharystia');
    toast('Nowe przygotowanie na ' + plDate(c.data) + (who ? ' – wg harmonogramu: ' + who + ' (możesz zmienić)' : '') + (old.data ? '. Poprzednie (' + plDate(old.data) + ') jest w archiwum.' : '.'));
  }
  /** Z przygotowania do kalendarza: wydarzenie z tą datą (połączone albo pasujące typem i dniem). */
  function prepEvent(v) {
    const P = v === 'eucharystia' ? S.eucharystia : S.celebration, typ = v === 'eucharystia' ? 'eu' : 'ls';
    if (!P || !P.data) return null;
    return alive().find(x => x.id === P.ev && x.data === P.data) || alive().find(x => x.typ === typ && x.data === P.data) || null;
  }
  /** Pasek „W kalendarzu” w karcie terminu przygotowania. */
  function prepBar(v) {
    const P = v === 'eucharystia' ? S.eucharystia : S.celebration; if (!P) return '';
    const e = prepEvent(v);
    if (e) {
      const ps = prepsOf(e);
      return '<div class="muted mt">📅 W kalendarzu: ' + esc(nm(e)) + ' · ' + plDate(e.data) + (e.godz ? ' ' + esc(e.godz) : '') + ' <a class="link inl" data-act="kal-edit" data-a="' + e.id + '">pokaż ›</a></div>' +
        (ps.length ? ps.map(p => '<div class="muted">📖 Spotkanie przygotowania: ' + plDate(p.data) + (p.godz ? ' ' + esc(p.godz) : '') + (p.gdzie ? ', ' + esc(p.gdzie) : '') + ' <a class="link inl" data-act="kal-edit" data-a="' + p.id + '">pokaż ›</a></div>').join('')
          : '<button class="btn text full" data-act="kal-prepnew" data-a="' + e.id + '">＋ Zaplanuj spotkanie przygotowania</button>');
    }
    return P.data ? '<button class="btn ghost full mt" data-act="prep-cal" data-a="' + v + '">＋ Dodaj do kalendarza wspólnoty</button>' : '<div class="muted mt">Gdy wpiszesz datę, możesz dodać to do kalendarza.</div>';
  }
  /** Utwórz albo uaktualnij wydarzenie z przygotowania (data, godzina, miejsce). */
  function prepToCal(v, create) {
    const P = v === 'eucharystia' ? S.eucharystia : S.celebration, typ = v === 'eucharystia' ? 'eu' : 'ls';
    if (!P || !P.data) return;
    let e = prepEvent(v);
    if (!e && !create) return;
    e = e ? JSON.parse(JSON.stringify(e)) : { id: uuid(), typ: typ, data: P.data, dataDo: '', godz: '', godzDo: '', gdzie: '', adres: '', uwagi: '', info: '', agapa: false, agapaInfo: '',
      grupy: [], osoby: [], wszyscy: false, wsp: S.wspAktywna === 'ALL' ? 'all' : S.wspAktywna };
    const g = v === 'eucharystia' ? P.godzEu : P.godz;
    if (e.data === P.data && e.godz === (g || e.godz) && e.gdzie === (P.gdzie || e.gdzie) && !create) return;
    e.data = P.data; if (g) e.godz = g; if (P.gdzie) e.gdzie = P.gdzie;
    P.ev = e.id; commitEvent(e);
    if (create) toast('Dodano do kalendarza: ' + TY[typ].n + ', ' + plDate(P.data) + '.');
  }

  /** Tekst do SMS: kiedy i gdzie spotkanie przygotowania tej Eucharystii / Liturgii Słowa. */
  function prepMeetText(v) {
    const e = prepEvent(v); if (!e) return '';
    const p = prepsOf(e).filter(x => x.data).sort((a, b) => a.data.localeCompare(b.data))[0]; if (!p) return '';
    const dn = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'][fromIso(p.data).getDay()];
    return 'Przygotowanie: ' + dn + ' ' + plDate(p.data) + (p.godz ? ', godz. ' + p.godz : '') + (p.gdzie ? ', ' + p.gdzie : '') + (p.adres ? ' (' + p.adres + ')' : '');
  }
  /** Dodatki ze spotkania przygotowania (Pismo, agapa, uwagi) – do zaproszenia. */
  function prepMeetExtras(v) {
    const e = prepEvent(v); if (!e) return [];
    const p = prepsOf(e).filter(x => x.data).sort((a, b) => a.data.localeCompare(b.data))[0];
    return p ? extraLines(p, { team: false }) : [];
  }

  /* ===================== HARMONOGRAMY PRZYGOTOWAŃ (osobno od kalendarza) ===================== */
  // S.harms = [{ id, nazwa, typ: eu|ls|dt|in, dow, co (co ile tygodni), start, order:[gid], real:{data: gid|'r'|'m'|'x'}, team:{data:[osoby]}, weeks }]
  const DOWN = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const HTYP = { eu: 'Eucharystia', ls: 'Liturgia Słowa', dt: 'Duży temat', in: 'Inne' };
  function myGrp() { return (S.grupy || []).find(g => (g.osoby || []).indexOf(S.owner) >= 0); }
  function nextDow(dow, from) { const d = from ? fromIso(from) : new Date(); d.setHours(0, 0, 0, 0); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d; }
  function harms() {
    ensure();
    if (!S.harms) { S.harms = []; if (S.harm) { S.harms.push(Object.assign({ id: uuid(), nazwa: 'Eucharystia', typ: 'eu', co: 1, team: {} }, S.harm)); delete S.harm; } }
    S.harms.forEach(H => { if (!H.real) H.real = {}; if (!H.team) H.team = {}; if (!H.order) H.order = []; if (!H.co) H.co = 1; H.order = H.order.filter(id => (S.grupy || []).some(g => g.id === id)); });
    return S.harms;
  }
  function newHarm(typ) {
    const ids = (S.grupy || []).map(g => g.id), me = myGrp(), i = me ? ids.indexOf(me.id) : 0, dow = typ === 'ls' ? 3 : 6;
    return { id: uuid(), nazwa: HTYP[typ] || 'Harmonogram', typ: typ, dow: dow, co: typ === 'dt' ? 4 : 1, start: iso(nextDow(dow)), order: ids.slice(i).concat(ids.slice(0, i)), real: {}, team: {}, weeks: 12 };
  }
  const hById = id => harms().find(h => h.id === id);
  const gName = id => id === 'r' ? 'grupa robocza' : id === 'm' ? 'ekipa złożona ręcznie' : ((S.grupy || []).find(g => g.id === id) || { nazwa: '?' }).nazwa;
  /** Terminy z przydziałem: kolejka; inna grupa z rozkładu – zamiana miejscami; robocza/ręczna – grupa z planu idzie na następny termin; 'x' – pominięty. */
  function harmPlan(H, nFut) {
    const Q = H.order.slice(), out = [], td = iso(new Date());
    if (!Q.length) return out;
    let d = fromIso(H.start), fut = 0;
    for (let k = 0; k < 520 && fut < nFut; k++, d = addDays(d, 7 * (H.co || 1))) {
      const di = iso(d), r = H.real[di];
      if (r === 'x') { out.push({ d: di, skip: true }); if (di >= td) fut++; continue; }
      const plan = Q[0]; let who = plan;
      if (r && r !== plan && Q.indexOf(r) > 0) { Q[Q.indexOf(r)] = plan; Q[0] = r; who = r; Q.push(Q.shift()); }
      else if (r === 'r' || r === 'm') who = r;
      else Q.push(Q.shift());
      out.push({ d: di, plan: plan, who: who, real: r || '' });
      if (di >= td) fut++;
    }
    return out;
  }
  /** Kto wg harmonogramu danego rodzaju (eu/ls) przygotowuje danego dnia albo najbliżej. */
  function harmHint(typ, di) {
    const H = harms().find(h => h.typ === typ); if (!H) return null;
    const td = iso(new Date()), x = harmPlan(H, 30).find(y => !y.skip && (di ? y.d === di : y.d >= td));
    return x ? { d: x.d, who: x.who, name: gName(x.who), id: H.id } : null;
  }
  function harmFor(di) { const x = harmHint('eu', di); return x ? x.who : ''; }
  function teamOf(H, x) { if (H.team[x.d] && H.team[x.d].length) return H.team[x.d]; const g = (S.grupy || []).find(y => y.id === x.who); return g ? g.osoby.slice() : []; }

  function harmList() {
    const L = harms(), me = myGrp();
    if (!(S.grupy || []).length) return '<div class="card"><h2>Harmonogramy</h2><div class="muted">Najpierw utwórz grupy (Wspólnota → Grupy).</div></div>';
    let h = '<div class="card"><h2>Harmonogramy przygotowań</h2><div class="muted">Grupy po kolei – osobno dla Eucharystii, Liturgii Słowa, dużych tematów. Nie mieszają się z kalendarzem.</div>';
    L.forEach(H => {
      const td = iso(new Date()), P = harmPlan(H, 3).filter(x => x.d >= td && !x.skip), mine = me ? harmPlan(H, 26).find(x => x.d >= td && x.who === me.id) : null;
      h += '<div class="hcard" data-act="harm-open" data-a="' + H.id + '"><div class="row"><b class="grow">' + esc(H.nazwa) + '</b><span class="muted">' + DOWN[H.dow] + (H.co > 1 ? ', co ' + H.co + ' tyg.' : ', co tydzień') + ' ›</span></div>' +
        '<div class="muted">' + P.map(x => SH[fromIso(x.d).getDay()] + ' ' + dm(x.d) + ' – ' + esc(gName(x.who))).join(' · ') + '</div>' +
        (mine ? '<div>Moja grupa: <b>' + SH[fromIso(mine.d).getDay()] + ' ' + dm(mine.d) + '</b></div>' : '') + '</div>';
    });
    h += '<div class="muted mt">Nowy harmonogram:</div><div class="chips">' + Object.keys(HTYP).map(t => '<button class="chip" data-act="harm-new" data-a="' + t + '">＋ ' + HTYP[t] + '</button>').join('') + '</div></div>';
    return h + (L.length ? statsCard() : '');
  }
  function statsCard() {
    const L = harms(), f = UI.hStat || '', td = iso(new Date());
    const sel = L.filter(H => !f || H.id === f), byG = {}, byP = {}, swaps = [], skip = []; let rob = 0, rec = 0, all = 0;
    sel.forEach(H => harmPlan(H, 1).filter(x => x.d <= td).forEach(x => {
      if (x.skip) { skip.push(dm(x.d) + ' (' + H.nazwa + ')'); return; }
      all++;
      const g = byG[x.who] = byG[x.who] || { n: 0, last: '' }; g.n++; if (x.d > g.last) g.last = x.d;
      if (x.who === 'r') rob++; else if (x.who === 'm') rec++;
      if (x.real && x.who !== x.plan) swaps.push(dm(x.d) + ' – ' + gName(x.who) + ' zamiast: ' + gName(x.plan) + (f ? '' : ' (' + H.nazwa + ')'));
      teamOf(H, x).forEach(b => { byP[b] = (byP[b] || 0) + 1; });
    }));
    const gl = Object.keys(byG).sort((a, b) => byG[b].n - byG[a].n), pl = Object.keys(byP).sort((a, b) => byP[b] - byP[a]);
    const max = Math.max(1, ...gl.map(k => byG[k].n)), bar = (n, m) => '<span class="hbar"><i style="width:' + Math.round(100 * n / m) + '%"></i></span>';
    return '<div class="card"><h2>📊 Statystyki</h2><div class="chips"><button class="chip sm' + (f ? '' : ' on') + '" data-act="harm-stat" data-a="">Wszystkie</button>' + L.map(H => '<button class="chip sm' + (f === H.id ? ' on' : '') + '" data-act="harm-stat" data-a="' + H.id + '">' + esc(H.nazwa) + '</button>').join('') + '</div>' +
      (all || skip.length ? '<div class="sec">Ile razy przygotowała grupa (' + all + ' terminów)</div>' + gl.map(k => '<div class="row hst"><span class="grow">' + esc(gName(k)) + '</span>' + bar(byG[k].n, max) + '<b>' + byG[k].n + '</b><span class="muted">ost. ' + dm(byG[k].last) + '</span></div>').join('') +
        '<div class="sec">Zamiany i zastępstwa</div>' + (swaps.length ? swaps.slice(-12).reverse().map(x => '<div class="muted">' + esc(x) + '</div>').join('') : '<div class="muted">Brak – wszystko wg rozkładu.</div>') +
        '<div class="muted mt">Grupa robocza: ' + rob + ' · ekipa ręczna: ' + rec + '</div>' +
        '<div class="sec">Osoby – ile razy w ekipie</div>' + (pl.length ? '<div class="chips">' + pl.map(b => '<span class="chip sm">' + esc(b) + ' <b>' + byP[b] + '</b></span>').join('') + '</div>' : '<div class="muted">Brak danych.</div>') +
        '<div class="sec">Pominięte terminy: ' + skip.length + '</div>' + (skip.length ? '<div class="muted">' + skip.slice(-10).map(esc).join(', ') + '</div>' : '')
        : '<div class="muted">Statystyki pojawią się po pierwszych terminach.</div>') + '</div>';
  }
  function harmView() {
    const H = hById(UI.harmId); if (!H) return harmList();
    const td = iso(new Date()), me = myGrp();
    const P = harmPlan(H, H.weeks || 12), past = P.filter(x => x.d < td).slice(-4), fut = P.filter(x => x.d >= td);
    const sel = x => '<select data-ch="harm-real" data-a="' + x.d + '"><option value="">✓ wg rozkładu (' + esc(gName(x.plan)) + ')</option>' +
      H.order.filter(id => id !== x.plan).map(id => '<option value="' + id + '"' + (x.real === id ? ' selected' : '') + '>przygotowała: ' + esc(gName(id)) + '</option>').join('') +
      '<option value="r"' + (x.real === 'r' ? ' selected' : '') + '>grupa robocza</option><option value="m"' + (x.real === 'm' ? ' selected' : '') + '>ekipa złożona ręcznie</option><option value="x">nie było</option></select>';
    const row = (x, isPast) => x.skip ? '<div class="row hrow skip"><b class="hd">' + SH[fromIso(x.d).getDay()] + ' ' + dm(x.d) + '</b><span class="grow muted">' + (x.d >= iso(new Date()) ? 'pominięty termin' : 'nie było') + ' <button class="btn text sm" data-act="harm-unx" data-a="' + x.d + '">cofnij</button></span></div>'
      : '<div class="hrow' + (me && x.who === me.id ? ' mine' : '') + '"><div class="row"><b class="hd">' + SH[fromIso(x.d).getDay()] + ' ' + dm(x.d) + '</b><span class="grow">' + esc(gName(x.who)) + (me && x.who === me.id ? ' <span class="muted">(moja)</span>' : '') + '</span>' + (isPast || x.d === td ? sel(x) : '<button class="btn text sm" data-act="harm-skip" data-a="' + x.d + '" title="Tego dnia nie ma (np. inna celebracja) – kolejka przesuwa się dalej">⊘ pomiń</button>') + '</div>' +
        ((x.who === 'r' || x.who === 'm') ? '<div class="muted" data-act="harm-team" data-a="' + x.d + '">Kto: ' + (H.team[x.d] && H.team[x.d].length ? esc(H.team[x.d].join(', ')) : 'dotknij, aby zaznaczyć osoby') + ' ›</div>' : '') + '</div>';
    let h = '<div class="card"><h2>' + esc(H.nazwa) + '</h2><div class="muted">' + DOWN[H.dow] + (H.co > 1 ? ', co ' + H.co + ' tygodnie' : ', co tydzień') + ' · od ' + plDate(H.start) + '. Gdy przygotuje inna grupa niż w rozkładzie, zaznacz to – zamienią się miejscami. „⊘ pomiń” – termin odpada (np. inna celebracja), kolejne grupy przesuwają się dalej.</div>' +
      (past.length ? '<div class="sec">Ostatnie</div>' + past.map(x => row(x, true)).join('') : '') +
      '<div class="sec">Najbliższe</div>' + fut.map(x => row(x, false)).join('') +
      '<div class="chips mt">' + [8, 12, 26].map(n => '<button class="chip sm' + ((H.weeks || 12) === n ? ' on' : '') + '" data-act="harm-weeks" data-a="' + n + '">' + n + ' terminów</button>').join('') + '</div>' +
      '<button class="btn full mt" data-act="harm-sms">✉ Wyślij harmonogram SMS-em</button></div>';
    h += '<div class="card"><h2>Ustawienia</h2><label class="lbl">Nazwa</label><input type="text" data-ch="harm-name" value="' + esc(H.nazwa) + '">' +
      '<div class="row"><div class="grow"><label class="lbl">Dzień</label><select data-ch="harm-dow">' + DOWN.map((n, i) => '<option value="' + i + '"' + (H.dow === i ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>' +
      '<div class="grow"><label class="lbl">Jak często</label><select data-ch="harm-co">' + [1, 2, 3, 4, 5, 6, 8, 12].map(n => '<option value="' + n + '"' + (H.co === n ? ' selected' : '') + '>' + (n === 1 ? 'co tydzień' : 'co ' + n + ' tyg.') + '</option>').join('') + '</select></div></div>' +
      '<label class="lbl">Pierwszy termin</label><input type="date" data-ch="harm-start" value="' + H.start + '">' +
      '<label class="lbl">Grupy biorące udział – kolejność</label>' +
      H.order.map((id, i) => '<div class="row chk"><span class="grow">' + (i + 1) + '. ' + esc(gName(id)) + '</span><button class="icon mv" data-act="harm-mv" data-a="' + id + '" data-b="-1"' + (i ? '' : ' disabled') + '>▲</button><button class="icon mv" data-act="harm-mv" data-a="' + id + '" data-b="1"' + (i < H.order.length - 1 ? '' : ' disabled') + '>▼</button><button class="icon" data-act="harm-out" data-a="' + id + '" title="Nie bierze udziału">✕</button></div>').join('') +
      ((S.grupy || []).filter(g => H.order.indexOf(g.id) < 0).length ? '<div class="muted mt">Nie biorą udziału (dotknij, aby dodać):</div><div class="chips">' + S.grupy.filter(g => H.order.indexOf(g.id) < 0).map(g => '<button class="chip sm" data-act="harm-in" data-a="' + g.id + '">＋ ' + esc(g.nazwa) + '</button>').join('') + '</div>' : '') +
      '<button class="btn ghost full mt" data-act="harm-restart">↻ Zacznij od nowa: najbliższy termin – ' + esc(me ? me.nazwa : 'pierwsza grupa') + '</button>' +
      '<button class="btn text full" data-act="harm-del">Usuń harmonogram</button></div>';
    return h;
  }
  function harmText(H, who, all) {
    const td = iso(new Date()), P = harmPlan(H, H.weeks || 12).filter(x => x.d >= td && !x.skip);
    const g = who && (S.grupy || []).find(x => (x.osoby || []).indexOf(who) >= 0 && H.order.indexOf(x.id) >= 0);
    const L = ['Harmonogram przygotowań – ' + H.nazwa + '.'];
    if (g) { const mine = P.filter(x => x.who === g.id); L.push('Twoja grupa (' + g.nazwa + ') przygotowuje: ' + (mine.length ? mine.map(x => SH[fromIso(x.d).getDay()] + ' ' + dm(x.d)).join(', ') : 'w tym okresie brak') + '.'); }
    if (all || !g) { L.push(''); P.forEach(x => L.push(SH[fromIso(x.d).getDay()] + ' ' + dm(x.d) + ' – ' + gName(x.who))); }
    return L.join('\n');
  }
  function smsDialog() {
    const H = hById(UI.harmId); if (!H) return;
    const m = modalState && modalState.kind === 'hsms' ? modalState : (modalState = { kind: 'hsms', off: Object.fromEntries(peopleOf([S.wspAktywna]).filter(p => !massOK(p.n)).map(p => [p.n, 1])), all: false, hello: true });
    const ppl = peopleOf([S.wspAktywna]), msg = n => (m.hello ? pokoj() + ', ' + firstName(n) + '!\n\n' : '') + harmText(H, n, m.all);
    m.items = () => ppl.filter(p => !m.off[p.n]).map(p => ({ tel: p.tel, text: msg(p.n) }));
    openModal('Harmonogram – SMS', '<div class="muted">Każdy dostaje terminy swojej grupy.</div>' +
      '<label class="row mt"><input type="checkbox" data-ch="hsms-all"' + (m.all ? ' checked' : '') + '><span class="grow">Dołącz cały rozkład</span></label>' +
      '<label class="row"><input type="checkbox" data-ch="hsms-hi"' + (m.hello ? ' checked' : '') + '><span class="grow">Powitanie „' + pokoj() + ', {imię}!”</span></label>' +
      '<label class="lbl">Podgląd</label><div class="msgprev">' + esc(msg(S.owner)) + '</div>' +
      '<label class="lbl">Do kogo</label>' + ppl.map(p => '<label class="row chk"><input type="checkbox" data-ch="hsms-p" data-a="' + esc(p.n) + '"' + (m.off[p.n] ? '' : ' checked') + '><span class="grow">' + esc(p.n) + '</span><span class="muted">' + (p.tel ? esc(p.tel) : 'brak numeru') + '</span></label>').join(''),
      '<button class="btn" data-act="harm-smsgo">Dalej ▶</button>');
  }
  function teamDialog(d) {
    const H = hById(UI.harmId); if (!H) return;
    modalState = { kind: 'hteam', d: d };
    const cur = H.team[d] || [];
    openModal('Kto przygotował – ' + dm(d), '<div class="chips">' + S.bracia.map(b => '<button class="chip' + (cur.indexOf(b) >= 0 ? ' on' : '') + '" data-act="harm-tp" data-a="' + esc(b) + '">' + esc(b) + '</button>').join('') + '</div>', '<button class="btn" data-act="harm-tok">Gotowe</button>');
  }
  function harmAct(a, v, el) {
    if (a === 'harm-open') { UI.harmId = v; go('harm1'); return true; }
    if (a === 'harm-new') { const H = newHarm(v); harms().push(H); save(); UI.harmId = H.id; go('harm1'); return true; }
    if (a === 'harm-stat') { UI.hStat = v; render(); return true; }
    const H = hById(UI.harmId); if (!H) return true;
    switch (a) {
      case 'harm-weeks': H.weeks = +v; break;
      case 'harm-mv': { const i = H.order.indexOf(v), j = i + (+el.dataset.b); if (i < 0 || j < 0 || j >= H.order.length) return true; H.order.splice(j, 0, H.order.splice(i, 1)[0]); break; }
      case 'harm-out': H.order = H.order.filter(x => x !== v); break;
      case 'harm-in': H.order.push(v); break;
      case 'harm-unx': delete H.real[v]; break;
      case 'harm-skip': H.real[v] = 'x'; break;
      case 'harm-team': teamDialog(v); return true;
      case 'harm-tp': { const t = H.team[modalState.d] = H.team[modalState.d] || [], i = t.indexOf(v); if (i >= 0) t.splice(i, 1); else t.push(v); save(); teamDialog(modalState.d); return true; }
      case 'harm-tok': closeModal(); render(); return true;
      case 'harm-sms': modalState = null; smsDialog(); return true;
      case 'harm-smsgo': { const items = modalState.items(); sendAllAuto(items, null, H.nazwa); return true; }
      case 'harm-del': confirmBox('Usunąć harmonogram „' + H.nazwa + '”?', 'Z historią zamian.', 'Usuń', () => { S.harms = harms().filter(x => x.id !== H.id); save(); go('harm'); }); return true;
      case 'harm-restart': confirmBox('Zacząć od nowa?', 'Najbliższy termin (' + DOWN[H.dow] + ') przygotuje ' + (myGrp() ? myGrp().nazwa : 'pierwsza grupa') + ', dalej po kolei. Zapisane zamiany zostaną wyczyszczone.', 'Zacznij', () => {
        const me = myGrp(), i = me ? H.order.indexOf(me.id) : -1;
        if (i > 0) H.order = H.order.slice(i).concat(H.order.slice(0, i));
        H.start = iso(nextDow(H.dow)); H.real = {}; H.team = {}; save(); render(); }); return true;
      default: return false;
    }
    save(); render(); return true;
  }
  function harmChange(ch, v, el) {
    if (ch.indexOf('hsms-') === 0) {
      const m = modalState; if (!m || m.kind !== 'hsms') return true;
      if (ch === 'hsms-all') m.all = el.checked; else if (ch === 'hsms-hi') m.hello = el.checked; else if (el.checked) delete m.off[v]; else m.off[v] = 1;
      smsDialog(); return true;
    }
    const H = hById(UI.harmId); if (!H) return true;
    switch (ch) {
      case 'harm-real': if (el.value) H.real[v] = el.value; else delete H.real[v]; break;
      case 'harm-dow': H.dow = +el.value; H.start = iso(nextDow(H.dow, H.start)); break;
      case 'harm-co': H.co = +el.value; break;
      case 'harm-start': if (el.value) { H.start = el.value; H.dow = fromIso(el.value).getDay(); } break;
      case 'harm-name': H.nazwa = el.value.trim() || H.nazwa; save(true); return true;
      default: return false;
    }
    save(); render(); return true;
  }
  /* ===== dane do raportu ===== */
  function eventsIn(a, b) {
    const out = [];
    alive().forEach(e => {
      let d = a, k = 0;
      while (k++ < 200) {
        const x = nextOcc(e, d); if (!x || x > b) break;
        out.push({ d: x, n: nm(e), godz: e.godz || '', gdzie: [e.gdzie, e.miasto].filter(Boolean).join(', '), kol: (TY[e.typ] || {}).col || '#777' });
        if (!isCyclic(e)) break;
        d = iso(addDays(fromIso(x), 1));
      }
    });
    Object.keys(Object.assign({}, feasts(+a.slice(0, 4)), +b.slice(0, 4) !== +a.slice(0, 4) ? feasts(+b.slice(0, 4)) : {})).forEach(k => {
      if (k >= a && k <= b) (feasts(+k.slice(0, 4))[k] || []).filter(f => f.r === 'U').forEach(f => out.push({ d: k, n: '✠ ' + f.n, godz: '', gdzie: '', kol: '#C9A227', feast: true }));
    });
    return out.sort((x, y) => x.d.localeCompare(y.d) || x.godz.localeCompare(y.godz));
  }
  function harmRep(n) {
    const td = iso(new Date());
    return harms().map(H => ({ nazwa: H.nazwa, typ: H.typ, co: H.co, dow: H.dow, rows: harmPlan(H, n).filter(x => x.d >= td && !x.skip).map(x => ({ d: x.d, who: gName(x.who) })) }));
  }
  function statsRep() {
    const td = iso(new Date()), byG = {}, byP = {}, sw = []; let all = 0, skip = 0;
    harms().forEach(H => harmPlan(H, 1).filter(x => x.d <= td).forEach(x => {
      if (x.skip) { skip++; return; }
      all++; const g = byG[x.who] = byG[x.who] || { n: 0, last: '' }; g.n++; if (x.d > g.last) g.last = x.d;
      if (x.real && x.who !== x.plan) sw.push(dm(x.d) + ' – ' + gName(x.who) + ' zamiast: ' + gName(x.plan) + ' (' + H.nazwa + ')');
      teamOf(H, x).forEach(b => { byP[b] = (byP[b] || 0) + 1; });
    }));
    return { all: all, skip: skip, grupy: Object.keys(byG).map(k => ({ n: gName(k), c: byG[k].n, last: byG[k].last })).sort((a, b) => b.c - a.c), osoby: Object.keys(byP).map(k => [k, byP[k]]).sort((a, b) => b[1] - a[1]), zamiany: sw };
  }
  window.KAL = {
    eventsIn: eventsIn, harmRep: harmRep, statsRep: statsRep,
    prepMeetText: prepMeetText, prepMeetExtras: prepMeetExtras, planText: planText,
    openPrep: openPrep, prepBar: prepBar, prepToCal: prepToCal,
    inTeam: inTeam, nextOcc: nextOcc, cycText: cycText, isCyclic: isCyclic, eventDialog: eventDialog, commitEvent: commitEvent, alive: alive, TY: TY, timeText: timeText,
    treeSearch: treeSearch,
    paschaCard: paschaCard,
    remSoon: remSoon, remSettings: remSettings, preparedBy: preparedBy,
    harmView: harmView, harmList: harmList, harmFor: harmFor, harmHint: harmHint, harms: harms,
    act: act, change: change, view: viewKalendarz, groupsCard: groupsCard, groupChips: groupChips, startCard: startCard,
    ensure: ensure, syncReminders: syncReminders, feasts: feasts, groupsFor: groupsFor, concernsMe: concernsMe, syncKal: syncKal,
  };
})();
