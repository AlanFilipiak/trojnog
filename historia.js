/* Historia zbawienia – duże tematy (katechumenat): 17 etapów, losowanie ekip i tematów, miesiąc = temat,
 * 4 wieczory (prezentacja, katecheza, kwestionariusz w domach, Liturgia Słowa) + konwiwencja. */
(function () {
  'use strict';
  const A = window.Android;
  const TEMATY = ['ABRAHAM', 'WYJŚCIE (do momentu dotarcia na pustynię)', 'PRZYMIERZE na Synaju', 'DROGA PRZEZ PUSTYNIĘ', 'PODBÓJ ZIEMI OBIECANEJ (Jozue)', 'DAWID I KRÓLESTWO',
    'WYGNANIE (niewola babilońska)', 'PROROCY', 'POCZĄTKI (stworzenie świata, zło i grzech, Rdz 1-11)', 'MESJASZ', 'ZMARTWYCHWSTANIE', 'KOŚCIÓŁ (Sakrament Zbawienia, Kościół w Biblii)',
    'KOŚCIÓŁ PIERWOTNY (3 pierwsze wieki: Ojcowie apostolscy)', 'KOŚCIÓŁ OD KONSTANTYNA DO SOBORU TRYDENCKIEGO', 'KOŚCIÓŁ OD SOBORU TRYDENCKIEGO DO SOBORU WATYKAŃSKIEGO II', 'SOBÓR WATYKAŃSKI II', 'PARUZJA'];
  const HASLA = [['Księga życia', 'str. 412-414'], ['Wiara', '1025-1034'], ['Życie wieczne', '1156-1161'], ['Pierwsze przykazanie', '484-491'], ['Bogactwa', ''], ['Duch Święty', '226-234'],
    ['Egzorcyzm', '166-167 [II.2.b]; 121-125; 205-207 [NT]; 516 [II.2]; 931-932 [II-III]'], ['Krzyż Chwalebny', '409-411'], ['Kościół, nasza matka', '383-393 [szczególnie VI]']];
  const MATER = ['Biblia Jerozolimska', 'Katechizm Kościoła Katolickiego', 'Alfred Läpple, Od księgi Rodzaju do Ewangelii', 'Suzanne de Dietrich, Boży plan zbawienia',
    'Luís Rubio Morán, Jezus Chrystus w historii zbawienia', 'Słownik Teologii Biblijnej, Léon-Dufour', 'Historia Kościoła Katolickiego, Pierre Pierrard'];
  const ETAPY = [['prez', '1. Prezentacja', '4–6 czytań z wprowadzeniami, przeplatanych śpiewami – bez echa i homilii.'],
    ['kat', '2. Katecheza', 'Temat podzielony na tyle części, ilu braci w ekipie – każdy mówi 7–10 min (egzystencjalnie). Na koniec do każdego z ekipy dolosowuje się braci (grupy domowe) i rozdaje kwestionariusz.'],
    ['kw', '3. Kwestionariusz (w domach)', 'Najwyżej 3 egzystencjalne pytania. Grupy domowe – każdy z ekipy prowadzi jedną. Gospodarz nie przygotowuje kolacji. Odpowiedzi się nie zapisuje.'],
    ['ls', '4. Liturgia Słowa', 'Regularna Liturgia Słowa na zakończenie tematu (4 lektury). Ekipa najpierw dzieli się, jak poszedł kwestionariusz.'],
    ['konw', '5. Konwiwencja', 'W niedzielę po zakończeniu tematu. Czytanie nawiązujące do tematu i wprowadzenie; na kręgu: „Co dał mi ten temat? W czym pomógł? Co w nim odnalazłem?”']];
  const DOWN = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'], SH = ['nd', 'pn', 'wt', 'śr', 'czw', 'pt', 'sob'];
  const MIES = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const isoD = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const fromIso = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); };
  const dm = s => { const d = fromIso(s); return SH[d.getDay()] + ' ' + d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0'); };

  function hz() {
    if (!S.hz) { const n = new Date(); n.setMonth(n.getMonth() + 2); S.hz = { tematy: TEMATY.slice(), dzien: 2, start: n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0'), ekipy: [], przyg: {}, size: 5 }; }
    const H = S.hz; if (!H.przyg) H.przyg = {}; if (!H.ekipy) H.ekipy = [];
    return H;
  }
  function P(k) { const H = hz(); const p = H.przyg[k] = H.przyg[k] || {}; if (!p.prez) p.prez = []; if (!p.kat) p.kat = []; if (!p.pyt) p.pyt = ['', '', '']; if (!p.domy) p.domy = []; if (!p.konw) p.konw = {}; if (!p.daty) p.daty = {}; return p; }
  /** Miesiąc tematu k (0..16): start + k. */
  function month(k) { const H = hz(), p = H.start.split('-').map(Number); return new Date(p[0], p[1] - 1 + k, 1); }
  function mLabel(k) { const d = month(k); return MIES[d.getMonth()] + ' ' + d.getFullYear(); }
  /** Daty etapów: n-ty dzień spotkań w miesiącu, konwiwencja – niedziela po 4. wieczorze (albo ręcznie zmienione). */
  function dates(k) {
    const H = hz(), p = P(k), d = month(k), out = {};
    while (d.getDay() !== H.dzien) d.setDate(d.getDate() + 1);
    ['prez', 'kat', 'kw', 'ls'].forEach((e, i) => { out[e] = p.daty[e] || isoD(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * i)); });
    const c = fromIso(out.ls); do c.setDate(c.getDate() + 1); while (c.getDay() !== 0);
    out.konw = p.daty.konw || isoD(c);
    const s = month(k); s.setMonth(s.getMonth() - 2); out.przyg = isoD(s);
    return out;
  }
  const teamOf = k => hz().ekipy.find(e => e.t === k);
  const status = k => { const td = isoD(new Date()), D = dates(k); return P(k).done || td > D.konw ? 'done' : td >= isoD(month(k)) ? 'now' : td >= D.przyg ? 'prep' : ''; };

  /* ===== Losowanie ekip: małżeństwa – odpowiedzialni, reszta po kolei do najmniejszej ekipy ===== */
  function draw(size) {
    const H = hz(), busy = new Set();
    const units = personUnits().map(u => u.filter(b => isAkt(b))).filter(u => u.length);
    const total = units.reduce((n, u) => n + u.length, 0), T = Math.max(1, Math.round(total / (size || 5)));
    const cpl = shuffle(units.filter(u => u.length === 2)), sgl = shuffle(units.filter(u => u.length === 1).map(u => u[0]));
    const teams = Array.from({ length: T }, () => ({ resp: [], osoby: [] }));
    cpl.forEach((c, i) => { if (i < T) { teams[i].resp = c.slice(); teams[i].osoby.push(...c); } else teams.slice().sort((a, b) => a.osoby.length - b.osoby.length)[0].osoby.push(...c); });
    sgl.forEach(b => teams.slice().sort((a, b2) => a.osoby.length - b2.osoby.length)[0].osoby.push(b));
    teams.forEach(t => { if (!t.resp.length && t.osoby.length) t.resp = [t.osoby[0]]; });
    void busy;
    // tematy: kolejne nieprzydzielone, losowo między ekipy
    const free = H.tematy.map((x, i) => i).filter(i => !H.ekipy.some(e => e.t === i)).slice(0, T), sh = shuffle(free);
    const runda = (H.ekipy.reduce((m, e) => Math.max(m, e.runda || 1), 0) || 0) + 1;
    return teams.map((t, i) => ({ id: uuid(), osoby: t.osoby, resp: t.resp, t: sh[i] === undefined ? -1 : sh[i], runda: runda }));
  }
  /** Grupy domowe do kwestionariusza: bracia spoza ekipy rozdzieleni losowo między członków ekipy (małżeństwa razem). */
  function drawHomes(k) {
    const e = teamOf(k); if (!e || !e.osoby.length) return [];
    const leaders = e.osoby.filter(b => !(e.resp.length === 2 && b === e.resp[1]));   // małżeństwo prowadzi razem jedną grupę
    const units = shuffle(personUnits().map(u => u.filter(b => isAkt(b) && e.osoby.indexOf(b) < 0)).filter(u => u.length));
    const G = leaders.map(l => ({ lider: l, lider2: e.resp.length === 2 && l === e.resp[0] ? e.resp[1] : '', osoby: [], gdzie: '' }));
    units.forEach(u => G.slice().sort((a, b) => a.osoby.length - b.osoby.length)[0].osoby.push(...u));
    return G;
  }

  /* ===== Widoki ===== */
  function view() {
    const H = hz(), td = isoD(new Date());
    const cur = H.tematy.findIndex((x, k) => status(k) === 'now');
    let h = '<div class="card"><h2>Historia zbawienia – duże tematy</h2><div class="muted">Każdy miesiąc – jeden temat. Ekipa przygotowuje go ok. 2 miesiące: prezentacja, katecheza, kwestionariusz w domach, Liturgia Słowa i konwiwencja.</div>';
    if (cur >= 0) {
      const D = dates(cur), e = teamOf(cur), nx = ETAPY.find(x => D[x[0]] >= td);
      h += '<div class="hz-now" data-act="hz-open" data-a="' + cur + '"><div class="muted">Teraz – ' + mLabel(cur) + '</div><b>' + (cur + 1) + '. ' + esc(H.tematy[cur]) + '</b>' +
        (e ? '<div class="muted">Ekipa: ' + esc(e.osoby.join(', ')) + '</div>' : '') + (nx ? '<div>Następnie: <b>' + nx[1].replace(/^\d\. /, '') + '</b> – ' + dm(D[nx[0]]) + '</div>' : '') + '</div>';
    }
    h += '<div class="row mt"><div class="grow"><label class="lbl">Pierwszy temat – miesiąc</label><input type="month" data-ch="hz-start" value="' + H.start + '"></div>' +
      '<div class="grow"><label class="lbl">Dzień spotkań</label><select data-ch="hz-dzien">' + DOWN.map((n, i) => '<option value="' + i + '"' + (H.dzien === i ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div></div>';
    h += '<div class="card"><h2>Tematy (' + H.tematy.length + ')</h2>' + H.tematy.map((t, k) => {
      const e = teamOf(k), st = status(k);
      return '<div class="hz-row ' + st + '" data-act="hz-open" data-a="' + k + '"><span class="hz-n">' + (k + 1) + '</span><div class="grow"><b>' + esc(t) + '</b><div class="muted">' + mLabel(k) +
        (e ? ' · ' + esc(e.resp.join(' i ') || e.osoby[0] || '') + (e.osoby.length > e.resp.length ? ' + ' + (e.osoby.length - e.resp.length) : '') : ' · bez ekipy') +
        (st === 'prep' ? ' · <span class="tag">przygotowanie</span>' : st === 'now' ? ' · <span class="tag on">teraz</span>' : st === 'done' ? ' · ✓' : '') + '</div></div><span class="muted">›</span></div>';
    }).join('') + '</div>';
    const rounds = Array.from(new Set(H.ekipy.map(e => e.runda || 1))).sort();
    h += '<div class="card"><h2>Ekipy</h2><div class="muted">Losowanie: małżeństwa zostają odpowiedzialnymi ekip, pozostali dolosowani (ok. ' + (H.size || 5) + ' osób w ekipie). Każda ekipa losuje jeden z kolejnych tematów. Po 6. temacie – nowe losowanie.</div>' +
      rounds.map(r => '<div class="sec">Losowanie ' + r + '</div>' + H.ekipy.filter(e => (e.runda || 1) === r).map(e => '<div class="hz-team" data-act="hz-team" data-a="' + e.id + '"><b>' + (e.t >= 0 ? (e.t + 1) + '. ' + esc(H.tematy[e.t]) : 'bez tematu') + '</b><div>' +
        e.osoby.map(b => e.resp.indexOf(b) >= 0 ? '<b>' + esc(b) + '</b>' : esc(b)).join(', ') + '</div></div>').join('')).join('') +
      '<div class="row mt"><button class="btn grow" data-act="hz-draw">🎲 Losuj ekipy i tematy</button><button class="btn ghost" data-act="hz-team" data-a="">＋ Ręcznie</button></div>' +
      '<div class="chips mt"><span class="muted">Wielkość ekipy:</span>' + [4, 5, 6].map(n => '<button class="chip sm' + ((H.size || 5) === n ? ' on' : '') + '" data-act="hz-size" data-a="' + n + '">' + n + '</button>').join('') + '</div></div>';
    h += '<div class="card"><h2>Hasła Liturgii Słowa do rozpoczęcia tematów</h2><div class="muted">Przez pierwsze dwa miesiące, zanim ekipa przygotuje „Abrahama”, wspólnota celebruje Słowo jak w prekatechumenacie (strony – Słownik Teologii Biblijnej).</div>' +
      HASLA.map((x, i) => '<div class="row hz-has"><span class="hz-n">' + (i + 1) + '</span><span class="grow">' + esc(x[0]) + '</span><span class="muted">' + esc(x[1]) + '</span></div>').join('') + '</div>';
    h += '<div class="card"><h2>Materiały</h2>' + MATER.map(m => '<div>• ' + esc(m) + '</div>').join('') + '</div>';
    return h;
  }
  function viewTemat() {
    const H = hz(), k = UI.hzK, p = P(k), D = dates(k), e = teamOf(k), ppl = S.bracia.filter(isAkt);
    const sel = (val, ch, a, list) => '<select data-ch="' + ch + '" data-a="' + a + '"><option value="">— kto —</option>' + (list || ppl).map(b => '<option value="' + esc(b) + '"' + (b === val ? ' selected' : '') + '>' + esc(b) + '</option>').join('') + '</select>';
    const team = e ? e.osoby : ppl;
    let h = '<div class="card"><h2>' + (k + 1) + '. ' + esc(H.tematy[k]) + '</h2><div class="muted">' + mLabel(k) + ' · przygotowanie od ' + plDate(D.przyg) + '</div>' +
      (e ? '<div class="mt">Ekipa: ' + e.osoby.map(b => e.resp.indexOf(b) >= 0 ? '<b>' + esc(b) + '</b>' : esc(b)).join(', ') + ' <button class="btn text sm" data-act="hz-team" data-a="' + e.id + '">zmień</button></div>' : '<div class="notice mt">Ten temat nie ma jeszcze ekipy – wylosuj albo dodaj ręcznie na liście tematów.</div>') +
      '<div class="hz-dates">' + ETAPY.map(x => '<div class="row"><span class="grow">' + x[1] + '</span><input type="date" data-ch="hz-date" data-a="' + x[0] + '" value="' + D[x[0]] + '"></div>').join('') + '</div>' +
      '<label class="row mt"><input type="checkbox" data-ch="hz-done"' + (p.done ? ' checked' : '') + '><span class="grow">Temat zakończony</span></label></div>';
    // 1. prezentacja
    h += '<div class="card"><h2>' + ETAPY[0][1] + ' – ' + dm(D.prez) + '</h2><div class="muted">' + ETAPY[0][2] + '</div>' +
      p.prez.map((r, i) => '<div class="hz-item"><div class="row"><b class="grow">Czytanie ' + (i + 1) + '</b><button class="icon" data-act="hz-del" data-a="prez" data-b="' + i + '">✕</button></div>' +
        '<input type="text" data-in="hz" data-a="prez|' + i + '|ref" placeholder="Sygnatura, np. Rdz 12,1-9" value="' + esc(r.ref || '') + '">' +(r.ref && window.bibleBtn ? bibleBtn(r.ref) : '') +
        '<textarea rows="2" data-in="hz" data-a="prez|' + i + '|wpr" placeholder="Wprowadzenie">' + esc(r.wpr || '') + '</textarea>' +
        '<div class="row"><div class="grow"><label class="lbl">Wprowadza / czyta</label>' + sel(r.kto, 'hz-sel', 'prez|' + i + '|kto') + '</div><div class="grow"><label class="lbl">Pieśń po czytaniu</label><input type="text" data-in="hz" data-a="prez|' + i + '|piesn" value="' + esc(r.piesn || '') + '"></div></div></div>').join('') +
      (p.prez.length < 7 ? '<button class="btn ghost full" data-act="hz-add" data-a="prez">＋ Czytanie</button>' : '') + '</div>';
    // 2. katecheza
    h += '<div class="card"><h2>' + ETAPY[1][1] + ' – ' + dm(D.kat) + '</h2><div class="muted">' + ETAPY[1][2] + '</div>' +
      p.kat.map((r, i) => '<div class="row hz-kat"><span class="hz-n">' + (i + 1) + '</span><input type="text" class="grow" data-in="hz" data-a="kat|' + i + '|t" placeholder="Część tematu, np. powołanie i podróż do Kanaanu" value="' + esc(r.t || '') + '">' + sel(r.kto, 'hz-sel', 'kat|' + i + '|kto', team) + '<button class="icon" data-act="hz-del" data-a="kat" data-b="' + i + '">✕</button></div>').join('') +
      '<div class="row mt"><button class="btn ghost grow" data-act="hz-add" data-a="kat">＋ Część</button>' + (e && !p.kat.length ? '<button class="btn ghost grow" data-act="hz-katall">Po części na każdego z ekipy</button>' : '') + '</div></div>';
    // 3. kwestionariusz
    h += '<div class="card"><h2>' + ETAPY[2][1] + ' – ' + dm(D.kw) + '</h2><div class="muted">' + ETAPY[2][2] + '</div>' +
      p.pyt.map((q, i) => '<label class="lbl">Pytanie ' + (i + 1) + '</label><textarea rows="2" data-in="hz" data-a="pyt|' + i + '" placeholder="' + (i ? '' : 'np. Kiedy usłyszałeś głos Boga: „Wyjdź ze swojej ziemi…”?') + '">' + esc(q) + '</textarea>').join('') +
      '<div class="sec">Grupy domowe</div>' + (p.domy.length ? p.domy.map((g, i) => '<div class="hz-item"><div><b>Prowadzi: ' + esc(g.lider + (g.lider2 ? ' i ' + g.lider2 : '')) + '</b> <span class="muted">(' + g.osoby.length + ' os.)</span></div><div class="muted">' + esc(g.osoby.join(', ')) + '</div>' +
        '<input type="text" data-in="hz" data-a="domy|' + i + '|gdzie" placeholder="U kogo / adres" value="' + esc(g.gdzie || '') + '"></div>').join('') : '<div class="muted">Jeszcze nie rozlosowane.</div>') +
      '<div class="row mt"><button class="btn ghost grow" data-act="hz-homes"' + (e ? '' : ' disabled') + '>🎲 ' + (p.domy.length ? 'Losuj ponownie' : 'Rozlosuj braci do grup') + '</button>' +
      (p.domy.length ? '<button class="btn grow" data-act="hz-smskw">✉ SMS do braci</button>' : '') + '</div></div>';
    // 4. LS
    h += '<div class="card"><h2>' + ETAPY[3][1] + ' – ' + dm(D.ls) + '</h2><div class="muted">' + ETAPY[3][2] + '</div><button class="btn ghost full mt" data-act="hz-ls">Przygotuj w Liturgii Słowa ›</button></div>';
    // 5. konwiwencja
    h += '<div class="card"><h2>' + ETAPY[4][1] + ' – ' + dm(D.konw) + '</h2><div class="muted">' + ETAPY[4][2] + '</div>' +
      '<label class="lbl">Czytanie</label><input type="text" data-in="hz" data-a="konw|ref" value="' + esc(p.konw.ref || '') + '">' +
      '<label class="lbl">Wprowadzenie</label><textarea rows="2" data-in="hz" data-a="konw|wpr">' + esc(p.konw.wpr || '') + '</textarea>' +
      '<label class="lbl">Pytanie na krąg</label><textarea rows="2" data-in="hz" data-a="konw|pyt">' + esc(p.konw.pyt || 'Co dał mi ten temat? W czym mi pomógł? Co w nim odnalazłem?') + '</textarea></div>';
    h += '<div class="card"><div class="row"><button class="btn grow" data-act="hz-smsteam"' + (e ? '' : ' disabled') + '>✉ Plan do ekipy</button><button class="btn ghost grow" data-act="hz-print">🖨 Rozpiska</button></div></div>';
    return h;
  }
  function teamDialog(id) {
    const H = hz(), e = id ? H.ekipy.find(x => x.id === id) : null;
    const m = modalState && modalState.kind === 'hzteam' ? modalState : (modalState = { kind: 'hzteam', id: id, osoby: e ? e.osoby.slice() : [], resp: e ? e.resp.slice() : [], t: e ? e.t : -1 });
    openModal(e ? 'Ekipa' : 'Nowa ekipa', '<label class="lbl">Temat</label><select data-ch="hzt-t"><option value="-1">— bez tematu —</option>' + H.tematy.map((t, i) => '<option value="' + i + '"' + (m.t === i ? ' selected' : '') + '>' + (i + 1) + '. ' + esc(t) + '</option>').join('') + '</select>' +
      '<label class="lbl">Osoby (dotknij – w ekipie; drugi raz – odpowiedzialny ★)</label><div class="chips">' + S.bracia.filter(isAkt).map(b => {
        const on = m.osoby.indexOf(b) >= 0, r = m.resp.indexOf(b) >= 0;
        return '<button class="chip' + (on ? ' on' : '') + '" data-act="hzt-p" data-a="' + esc(b) + '">' + (r ? '★ ' : '') + esc(b) + '</button>';
      }).join('') + '</div>', (e ? '<button class="btn text" data-act="hzt-del">Usuń</button>' : '') + '<button class="btn" data-act="hzt-ok">Zapisz</button>');
  }
  function teamText(k) {
    const H = hz(), D = dates(k), e = teamOf(k);
    return 'Historia zbawienia – nasz temat: ' + H.tematy[k] + ' (' + mLabel(k) + ').\nEkipa: ' + (e ? e.osoby.join(', ') : '') + '.\n\n' +
      'Przygotowanie (czytamy wszystko o temacie w Piśmie): od ' + plDate(D.przyg) + '.\n' + ETAPY.map(x => x[1].replace(/^\d\. /, '') + ': ' + dm(D[x[0]])).join('\n');
  }
  function docHtml(k) {
    const H = hz(), p = P(k), D = dates(k), e = teamOf(k), x = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const sec = (t, body) => '<tr class="day"><td colspan="2">' + t + '</td></tr>' + body;
    const row = (a, b) => '<tr><td class="n">' + a + '</td><td>' + b + '</td></tr>';
    let rows = sec(ETAPY[0][1] + ' – ' + dm(D.prez), p.prez.map((r, i) => row(i + 1, '<b>' + x(r.ref) + '</b>' + (r.kto ? ' – ' + x(r.kto) : '') + (r.wpr ? '<div class="d">' + x(r.wpr) + '</div>' : '') + (r.piesn ? '<div class="d">♪ ' + x(r.piesn) + '</div>' : ''))).join(''));
    rows += sec(ETAPY[1][1] + ' – ' + dm(D.kat), p.kat.map((r, i) => row(i + 1, x(r.t) + (r.kto ? ' – <b>' + x(r.kto) + '</b>' : ''))).join(''));
    rows += sec(ETAPY[2][1] + ' – ' + dm(D.kw), p.pyt.filter(Boolean).map((q, i) => row(i + 1, x(q))).join('') + p.domy.map(g => row('🏠', '<b>' + x(g.lider + (g.lider2 ? ' i ' + g.lider2 : '')) + '</b>' + (g.gdzie ? ' (' + x(g.gdzie) + ')' : '') + '<div class="d">' + x(g.osoby.join(', ')) + '</div>')).join(''));
    rows += sec(ETAPY[3][1] + ' – ' + dm(D.ls), '');
    rows += sec(ETAPY[4][1] + ' – ' + dm(D.konw), row('', (p.konw.ref ? '<b>' + x(p.konw.ref) + '</b>' : '') + (p.konw.wpr ? '<div class="d">' + x(p.konw.wpr) + '</div>' : '') + (p.konw.pyt ? '<div class="d">' + x(p.konw.pyt) + '</div>' : '')));
    return '<html><head><meta charset="utf-8"><title>' + x(H.tematy[k]) + '</title><style>body{font-family:Georgia,"Times New Roman",serif;color:#222;margin:24px} h1{font-size:20pt;margin:0 0 4px;color:#7A1E1E} .s{color:#666;margin:0 0 14px}' +
      'table{width:100%;border-collapse:collapse;font-size:11pt} td{border:1px solid #bbb;padding:6px 8px;vertical-align:top} td.n{width:28px;text-align:center;color:#7A1E1E;font-weight:bold} .d{color:#555;font-size:10pt;margin-top:2px}' +
      'tr.day td{background:#7A1E1E;color:#fff;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact} tr{page-break-inside:avoid}</style></head><body>' +
      '<h1>✝ ' + (k + 1) + '. ' + x(H.tematy[k]) + '</h1><p class="s">' + mLabel(k) + (e ? ' · ekipa: ' + x(e.osoby.join(', ')) : '') + '</p><table>' + rows + '</table></body></html>';
  }

  function act(a, v, el) {
    if (a.indexOf('hz') !== 0) return false;
    const H = hz();
    switch (a) {
      case 'hz-open': UI.hzK = +v; go('hz1'); return true;
      case 'hz-size': H.size = +v; break;
      case 'hz-draw': {
        const T = draw(H.size || 5);
        modalState = { kind: 'hzdraw', T: T };
        openModal('Wylosowane ekipy', T.map(e => '<div class="hz-team"><b>' + (e.t >= 0 ? (e.t + 1) + '. ' + esc(H.tematy[e.t]) : 'bez tematu (wszystkie przydzielone)') + '</b><div>' + e.osoby.map(b => e.resp.indexOf(b) >= 0 ? '<b>' + esc(b) + '</b>' : esc(b)).join(', ') + '</div></div>').join('') +
          '<div class="muted mt">Pogrubieni – odpowiedzialni ekipy. Tematy: kolejne jeszcze nieprzydzielone.</div>', '<button class="btn text" data-act="hz-draw">🎲 Jeszcze raz</button><button class="btn" data-act="hz-drawok">Zatwierdź</button>');
        return true;
      }
      case 'hz-drawok': H.ekipy = H.ekipy.concat(modalState.T); closeModal(); break;
      case 'hz-team': modalState = null; teamDialog(v); return true;
      case 'hzt-p': { const m = modalState, i = m.osoby.indexOf(v), r = m.resp.indexOf(v);
        if (i < 0) m.osoby.push(v); else if (r < 0) m.resp.push(v); else { m.osoby.splice(i, 1); m.resp.splice(r, 1); }
        teamDialog(m.id); return true; }
      case 'hzt-ok': { const m = modalState; if (!m.osoby.length) { toast('Wybierz osoby.'); return true; }
        let e = m.id && H.ekipy.find(x => x.id === m.id);
        if (m.t >= 0) H.ekipy.forEach(x => { if (x !== e && x.t === m.t) x.t = -1; });
        if (!e) { e = { id: uuid(), runda: H.ekipy.reduce((n, x) => Math.max(n, x.runda || 1), 1) }; H.ekipy.push(e); }
        e.osoby = m.osoby; e.resp = m.resp.filter(b => m.osoby.indexOf(b) >= 0); e.t = m.t; closeModal(); break; }
      case 'hzt-del': H.ekipy = H.ekipy.filter(x => x.id !== modalState.id); closeModal(); break;
      case 'hz-add': { const p = P(UI.hzK); p[v].push({}); break; }
      case 'hz-del': { const p = P(UI.hzK); p[v].splice(+el.dataset.b, 1); break; }
      case 'hz-katall': { const e = teamOf(UI.hzK), p = P(UI.hzK); if (e) p.kat = e.osoby.map(b => ({ t: '', kto: b })); break; }
      case 'hz-homes': { const p = P(UI.hzK), go2 = () => { p.domy = drawHomes(UI.hzK); save(); render(); };
        if (p.domy.length) confirmBox('Losować ponownie?', 'Obecny podział na grupy domowe zostanie zastąpiony.', 'Losuj', go2); else go2(); return true; }
      case 'hz-smskw': {
        const k = UI.hzK, p = P(k), D = dates(k), q = p.pyt.filter(Boolean).map((x, i) => (i + 1) + '. ' + x).join('\n'), items = [];
        p.domy.forEach(g => [g.lider, g.lider2].filter(Boolean).concat(g.osoby).forEach(b => {
          const tel = S.telefony[b]; if (!tel) return;
          items.push({ tel: tel, text: pokoj() + ', ' + firstName(b) + '!\n\nKwestionariusz – ' + hz().tematy[k] + ': ' + dm(D.kw) + (g.gdzie ? ', ' + g.gdzie : '') + '. Prowadzi: ' + g.lider + (g.lider2 ? ' i ' + g.lider2 : '') + '.' + (q ? '\n\nPytania:\n' + q : '') + '\n\nDo zobaczenia!' });
        }));
        sendAllAuto(items, null, 'grupy domowe'); return true;
      }
      case 'hz-smsteam': {
        const e = teamOf(UI.hzK); if (!e) return true;
        sendAllAuto(e.osoby.filter(b => S.telefony[b]).map(b => ({ tel: S.telefony[b], text: pokoj() + ', ' + firstName(b) + '!\n\n' + teamText(UI.hzK) })), null, 'ekipa');
        return true;
      }
      case 'hz-print': { const n = (UI.hzK + 1) + '. ' + H.tematy[UI.hzK]; if (A && A.printHtml) A.printHtml(docHtml(UI.hzK), n); else toast('Dostępne w aplikacji.'); return true; }
      case 'hz-ls': { S.haslo = H.tematy[UI.hzK]; save(); go('temat'); return true; }
      default: return false;
    }
    save(); render(); return true;
  }
  function change(ch, v, el) {
    if (ch.indexOf('hz') !== 0) return false;
    const H = hz();
    switch (ch) {
      case 'hz-start': if (el.value) H.start = el.value; break;
      case 'hz-dzien': H.dzien = +el.value; break;
      case 'hz-date': { const p = P(UI.hzK); if (el.value) p.daty[v] = el.value; else delete p.daty[v]; break; }
      case 'hz-done': P(UI.hzK).done = el.checked; break;
      case 'hz-sel': { const s = v.split('|'), p = P(UI.hzK); p[s[0]][+s[1]][s[2]] = el.value; save(true); return true; }
      case 'hzt-t': modalState.t = +el.value; return true;
      default: return false;
    }
    save(); render(); return true;
  }
  /** Pola tekstowe (data-in="hz", data-a="sekcja|i|pole"). */
  function input(el) {
    const s = el.dataset.a.split('|'), p = P(UI.hzK);
    if (s[0] === 'pyt') p.pyt[+s[1]] = el.value;
    else if (s[0] === 'konw') p.konw[s[1]] = el.value;
    else if (p[s[0]] && p[s[0]][+s[1]]) p[s[0]][+s[1]][s[2]] = el.value;
    save(true);
  }
  /** Dla Startu/przygotowań: najbliższy etap. */
  function next() {
    if (!S.hz) return null;
    const td = isoD(new Date());
    for (let k = 0; k < hz().tematy.length; k++) { const D = dates(k); const x = ETAPY.find(e => D[e[0]] >= td); if (x && status(k) !== 'done') return { k: k, etap: x[1], d: D[x[0]] }; }
    return null;
  }
  /** Czy osoba jest teraz w ekipie dużego tematu (od startu przygotowania do konwiwencji) – zwraca nazwę tematu. */
  function busy(b) {
    if (!S.hz || !S.hz.ekipy) return '';
    const td = isoD(new Date());
    const e = S.hz.ekipy.find(x => x.t >= 0 && x.osoby.indexOf(b) >= 0 && !P(x.t).done && td >= dates(x.t).przyg && td <= dates(x.t).konw);
    return e ? S.hz.tematy[e.t] : '';
  }
  window.HZ = { busy: busy, view: view, viewTemat: viewTemat, act: act, change: change, input: input, next: next };
})();
