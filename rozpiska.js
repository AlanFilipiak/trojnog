/* Trójnóg – rozpiski w blokach: Wigilia Paschalna (z chrztem), Liturgia pokutna, Konwiwencja (wiele dni, godziny, posiłki), własna.
   Każda rozpiska może mieć datę – wtedy sama wpisuje się do kalendarza (i zmienia razem z nią). Z wydarzenia w kalendarzu
   można przejść do jego przygotowania (osobna rozpiska dla każdego wydarzenia: klucz „rodzaj:idWydarzenia”). */
(function () {
  'use strict';

  const TYPY = {
    wstep: 'Wstęp', czyt: 'Czytanie', ewang: 'Ewangelia', piesn: 'Pieśń', piesnw: 'Pieśń z wprowadzeniem', psalm: 'Psalm', modl: 'Modlitwa',
    dzieci: 'Rozmowa z dziećmi', chrzest: 'Liturgia chrzcielna', mw: 'Modlitwa wiernych', kat: 'Katecheza', mag: 'Magisterium Kościoła',
    slepiec: 'Modlitwa ślepca', kerygmat: 'Kerygmat', prokl: 'Proklamacja', ojcze: 'Ojcze nasz', wol: 'Wołania', film: 'Film', skrut: 'Skrutacja', kwest: 'Kwestionariusz', euch: 'Eucharystia', lit: 'Liturgia', lpok: 'Liturgia pokutna', agapa: 'Agapa',
    pos: 'Posiłek', przerwa: 'Przerwa', inne: 'Inne',
  };
  const DODAJ = ['wstep', 'czyt', 'psalm', 'piesn', 'modl', 'kat', 'mag', 'slepiec', 'dzieci', 'mw', 'inne'];
  const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja', 'Agapa', 'Kawa'];
  const KTO = { wstep: 'Wprowadza', czyt: 'Czyta', ewang: 'Czyta', psalm: 'Czyta', piesnw: 'Wprowadza', modl: 'Prowadzi', dzieci: 'Didaskal', chrzest: 'Wprowadza', mw: 'Kto', kat: 'Prowadzi', mag: 'Czyta',
    slepiec: 'Wprowadza', kerygmat: 'Prowadzi', prokl: 'Prowadzi', ojcze: 'Prowadzi', film: 'Prowadzi', skrut: 'Prowadzi', kwest: 'Prowadzi', euch: 'Przygotowuje', lit: 'Przygotowuje', lpok: 'Przygotowuje', agapa: 'Odpowiada', pos: 'Odpowiada', inne: 'Kto' };
  const NOTE = ['modl', 'inne', 'chrzest', 'kat', 'kerygmat', 'prokl', 'mag', 'slepiec', 'wol', 'film', 'skrut', 'kwest', 'euch', 'agapa', 'pos'];
  const MEAL = ['pos', 'przerwa', 'agapa'];
  const isMeal = b => MEAL.indexOf(b.typ) >= 0;
  /** Menu „＋” pod blokiem: działy. */
  const MENU = [['Słowo', ['wstep', 'czyt', 'ewang', 'piesn', 'psalm', 'e:Psalm responsoryjny', 'e:Responsorium', 'kat', 'kerygmat', 'prokl', 'e:Echo Słowa', 'modl', 'slepiec', 'mw', 'ojcze', 'film', 'skrut', 'dzieci', 'mag', 'kwest']],
    ['Celebracje', ['euch', 'lit', 'lpok', 'agapa']], ['Posiłki i przerwy', ['m:Śniadanie', 'm:Obiad', 'm:Kolacja', 'm:Kawa', 'm:Przerwa']], ['Inne', ['inne']]];
  const MEAL_T = { 'Śniadanie': ['08:00', 45], 'Obiad': ['13:00', 60], 'Kolacja': ['18:30', 60], 'Kawa': ['', 20], 'Przerwa': ['', 15] };
  /** Kto przy bloku: etykieta (Wprowadza / Czyta / …) albo „brak” – bez osoby (losowanie pomija). */
  /** Bloki tylko wewnątrz Eucharystii (między „Eucharystia” a „Śpiew na wyjście”): [nazwa, rodzaj bloku, osoba]. */
  const EU_BL = [['Wprowadzenie do Eucharystii', 'wstep', ''], ['Śpiew', 'piesn', ''], ['Psalm', 'psalm', ''], ['Psalm responsoryjny', 'psalm', ''], ['Responsorium', 'psalm', ''], ['Aklamacja', 'piesn', ''], ['Echo Słowa', 'inne', 'brak'],
    ['Homilia', 'inne', 'brak'], ['Prefacja', 'inne', 'brak'], ['Święty', 'piesn', ''], ['Modlitwa eucharystyczna', 'inne', 'brak'], ['Baranku Boży', 'piesn', ''],
    ['Śpiew na Ciało', 'piesn', ''], ['Śpiew na Krew', 'piesn', ''], ['Modlitwa', 'modl', ''], ['Wołania', 'wol', '']];
  const WOL = ['Prezbiterzy', 'Chłopcy do seminarium Redemptoris Mater', 'Chłopcy do wędrowania', 'Dziewczęta do misji', 'Dziewczęta do klasztoru', 'Dziewczęta do ewangelizacji',
    'Siostry do seminarium', 'Wdowy', 'Rodziny na misję', 'Rodziny do seminarium', 'Grupa różańcowa'];
  const euBlk = name => { const x = EU_BL.find(y => y[0] === name); const b = blk(x[1], name); if (x[2]) b.rola = x[2]; return b; };
  /** Zakres Eucharystii w dniu: id bloków od „Eucharystia” do „Śpiew na wyjście” (włącznie). */
  /** Części: Eucharystia / Liturgia – od bloku otwierającego do „Śpiewu na wyjście” (włącznie). euGrp(d)[id] = 'euch' | 'lit'. */
  const GRP = ['euch', 'lit', 'lpok'];
  function euIds(d) {
    const ids = {}; let on = false;
    d.bloki.forEach(b => { if (GRP.indexOf(b.typ) >= 0) on = true; if (on) ids[b.id] = GRP.indexOf(b.typ) >= 0 ? 'first' : b.euEnd ? 'last' : 'in'; if (b.euEnd) on = false; });
    return ids;
  }
  function euGrp(d) {
    const g = {}; let cur = '';
    d.bloki.forEach(b => { if (GRP.indexOf(b.typ) >= 0) cur = b.typ; if (cur) g[b.id] = cur; if (b.euEnd) cur = ''; });
    return g;
  }
  /** Każda Eucharystia / Liturgia kończy się „Śpiewem na wyjście” (dopisuje, gdy brakuje – np. w starszych rozpiskach). */
  function fixEnds(d) {
    for (let i = 0; i < d.bloki.length; i++) {
      if (GRP.indexOf(d.bloki[i].typ) < 0) continue;
      let j = i + 1; while (j < d.bloki.length && !d.bloki[j].euEnd && GRP.indexOf(d.bloki[j].typ) < 0) j++;
      if (j >= d.bloki.length || !d.bloki[j].euEnd) d.bloki.splice(i + 1, 0, Object.assign(blk('piesn', 'Śpiew na wyjście'), { euEnd: true }));
    }
  }
  /** Bloki „czytane”: wprowadzenie (opcjonalne) i czyta ktoś inny. */
  const isRead = b => b.typ === 'czyt' || b.typ === 'ewang' || b.typ === 'psalm' || b.typ === 'prokl';
  /** Brak osoby przy roli – na czerwono. */
  function missing(b) {
    if (isMeal(b) || b.typ === 'wol') return false;
    if (isRead(b)) return (!b.bezWstepu && !b.kto2) || !b.kto;
    if (b.typ === 'piesnw') return !b.kto2 || !b.kto;
    if (b.typ === 'piesn') return !b.kto;
    return !!roleOf(b) && !b.kto;
  }
  const roleOf = b => b.rola === 'brak' ? '' : (b.rola || KTO[b.typ] || '');
  /** Rodzaje: [klucz, zakładka, tytuł domyślny, rodzaj wydarzenia w kalendarzu]. */
  const KINDS = [['pascha', 'Pascha', 'Wigilia Paschalna', 'pascha'], ['pokutna', 'Liturgia pokutna', 'Liturgia pokutna', 'lp'],
    ['konw', 'Konwiwencja', 'Konwiwencja', 'kon'], ['niest', 'Własna', 'Przygotowanie niestandardowe', 'ls']];
  const EV2KIND = { pascha: 'pascha', lp: 'pokutna', kon: 'konw', kpr: 'konw' };
  const CZASY = [10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240];

  const OT = [['Rdz 1, 1 – 2, 2', 'Stworzenie świata'], ['Rdz 22, 1-18', 'Ofiara Abrahama'], ['Wj 14, 15 – 15, 1', 'Przejście przez Morze Czerwone'],
    ['Iz 54, 5-14', 'Odwieczna miłość Boga'], ['Iz 55, 1-11', 'Zaproszenie do zbawienia'], ['Ba 3, 9-15. 32 – 4, 4', 'Mądrość Boża'], ['Ez 36, 16-28', 'Serce nowe i duch nowy']];
  const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const EWANG = { A: 'Mt 28, 1-10', B: 'Mk 16, 1-7', C: 'Łk 24, 1-12' };
  const DOW = ['nd', 'pn', 'wt', 'śr', 'czw', 'pt', 'sob'];

  const blk = (typ, tytul, ref, czas) => ({ id: uuid(), typ: typ, tytul: tytul || TYPY[typ], ref: ref || '', kto: '', kto2: '', piesn: '', tekst: '', start: '', czas: czas || 0 });
  const day = (data, bloki) => ({ id: uuid(), data: data || '', bloki: bloki || [] });
  function paschaYear() {
    const n = new Date(); let e = easter(n.getFullYear());
    if (e < new Date(n.getFullYear(), n.getMonth(), n.getDate())) e = easter(n.getFullYear() + 1);
    return liturgy(e).cycle;
  }
  function paschaDefault() {
    const b = [blk('wstep', 'Wstęp ogólny')];
    OT.forEach((r, i) => { b.push(blk('czyt', ROM[i] + ' czytanie – ' + r[1], r[0])); b.push(blk('piesnw', 'Psalm / pieśń po ' + ROM[i] + ' czytaniu')); });
    b.push(blk('czyt', 'Epistoła', 'Rz 6, 3-11')); b.push(blk('piesnw', 'Alleluja'));
    b.push(blk('czyt', 'Ewangelia (rok ' + paschaYear() + ')', EWANG[paschaYear()]));
    b.push(blk('dzieci', 'Rozmowa z dziećmi')); b.push(blk('chrzest', 'Liturgia chrzcielna')); b.push(blk('mw', 'Modlitwa wiernych'));
    return [day('', b)];
  }
  function pokutnaDefault() {
    return [day('', [blk('wstep', 'Wstęp ogólny'), blk('piesn', 'Pieśń na wejście'), blk('czyt', 'I czytanie'), blk('piesnw', 'Psalm / pieśń'),
      blk('czyt', 'II czytanie'), blk('piesnw', 'Pieśń przed Ewangelią'), blk('czyt', 'Ewangelia'), blk('inne', 'Rachunek sumienia'),
      blk('inne', 'Spowiedź indywidualna'), blk('mw', 'Modlitwa wiernych'), blk('piesn', 'Pieśń na zakończenie')])];
  }
  function konwDay(data, first) {
    const meal = (n, st, c) => Object.assign(blk('pos', n, '', c), { start: st });
    return day(data, first
      ? [blk('wstep', 'Wstęp ogólny', '', 15), blk('kat', 'Katecheza', '', 60), blk('czyt', 'Czytanie'), blk('mag', 'Magisterium Kościoła'),
        blk('slepiec', 'Wstęp do modlitwy ślepca'), blk('piesn', 'Pieśń', '', 10), meal('Kolacja', '18:30', 60)]
      : [meal('Śniadanie', '08:00', 45), blk('kat', 'Katecheza', '', 60), blk('czyt', 'Czytanie'), meal('Obiad', '13:00', 60)]);
  }
  function konwDefault() { return [konwDay('', true)]; }
  const DEFAULTS = { pascha: paschaDefault, pokutna: pokutnaDefault, konw: konwDefault, niest: () => [day('', [])] };

  const kindOf = key => String(key || '').split(':')[0];
  const KIND = k => KINDS.find(x => x[0] === k) || KINDS[0];
  function migrate(r) {
    if (!r.dni) { r.dni = [day(r.data || '', r.bloki || [])]; delete r.bloki; }
    r.dni.forEach(d => d.bloki.forEach(b => { if (b.start === undefined) b.start = ''; if (b.czas === undefined) b.czas = 0;
      if (b.typ === 'modl' && b.tytul === 'Modlitwa z ręki') b.tytul = 'Modlitwa';
      if (b.typ === 'slepiec' && b.tytul === 'Wstęp do modlitwy ślepca') b.tytul = 'Modlitwa ślepca';
      if (b.typ === 'piesnw' && !b.sv2) { if (b.kto && !b.kto2) { b.kto2 = b.kto; b.kto = ''; } b.sv2 = 1; } }));
    if (!Array.isArray(r.ekipa)) r.ekipa = [];
    r.dni.forEach(fixEnds);
    return r;
  }
  function ensure() {
    S.rozpiski = S.rozpiski || {};
    KINDS.forEach(k => { if (!S.rozpiski[k[0]]) { const r = { tytul: k[2], chrzest: false, dni: DEFAULTS[k[0]]() }; migrate(r); r.ts = 0; r._h = rzHash(r); S.rozpiski[k[0]] = r; } });
    Object.keys(S.rozpiski).forEach(k => migrate(S.rozpiski[k]));
  }
  function key() {
    ensure();
    if (UI.rz && S.rozpiski[UI.rz]) return UI.rz;
    const k = KINDS.some(x => x[0] === kindOf(UI.rz)) ? kindOf(UI.rz) : 'pascha';
    return (UI.rz = k);
  }
  const cur = () => S.rozpiski[key()];
  const multi = r => ['konw', 'niest'].indexOf(kindOf(key())) >= 0;   // konwiwencja i własna rozpiska: dni, godziny, posiłki
  const visible = (r, b) => b.typ !== 'chrzest' || r.chrzest;
  const allBlocks = r => [].concat.apply([], r.dni.map(d => d.bloki));
  function findB(r, id) { for (const d of r.dni) { const i = d.bloki.findIndex(b => b.id === id); if (i >= 0) return { d: d, i: i, b: d.bloki[i] }; } return null; }

  function people() { const r = S.rozpiski && S.rozpiski[UI.rz]; return (r && r.ekipa && r.ekipa.length ? r.ekipa : S.obecni.length ? S.obecni : S.bracia).filter(isAkt); }
  const isSong = b => b.typ === 'piesn' || b.typ === 'piesnw';
  /** Kto widzi przygotowania: odpowiedzialni (odp., 2. odp., współodp.) – wszystkie; pozostali – tylko gdy są w ekipie wydarzenia. */
  function resp() { return typeof canSend === 'function' && S.wspolnoty.some(w => canSend(w)); }
  function canSee(e) { return resp() || !!(e && window.KAL && KAL.inTeam(e)); }
  function planOk(r) { if (resp()) return true; const e = r && r.ev && window.KAL ? KAL.alive().find(x => x.id === r.ev) : null; return canSee(e) && !!e; }

  /* ---------- godziny (konwiwencja): start bloku – wpisany albo koniec poprzedniego ---------- */
  const toMin = t => { const p = String(t || '').split(':'); return p.length === 2 ? +p[0] * 60 + +p[1] : null; };
  const toHm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  /** Godziny bloków dnia „tak jak leci”: start = wpisana godzina albo koniec poprzedniego (gdy poprzedni ma czas trwania).
      Gdy poprzedni blok nie ma czasu – następny jest „cd.” (bez godziny), aż do bloku z wpisaną godziną. */
  function times(d) {
    let t = null;
    return d.bloki.map(b => {
      const s0 = b.start ? toMin(b.start) : t;
      const e0 = s0 !== null && +b.czas ? s0 + +b.czas : null;
      t = e0;
      return { s: s0, e: e0, cd: s0 === null };
    });
  }
  const fmtDur = c => c >= 60 ? Math.floor(c / 60) + ' h' + (c % 60 ? ' ' + c % 60 + ' min' : '') : c + ' min';
  const span = tm => tm.s === null ? 'cd.' : toHm(tm.s) + (tm.e !== null && tm.e !== tm.s ? '–' + toHm(tm.e) : '');

  /* ---------- kalendarz: rozpiska z datą = wydarzenie ---------- */
  /** Nazwa pliku: tytuł + data, np. „Konwiwencja 06.11.2026”. */
  function fileName(r) {
    const d = startDate(r), t = (r.tytul || 'Rozpiska').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return t + (d ? ' ' + d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(0, 4) : '');
  }
  function startDate(r) { return (r.dni.find(d => d.data) || {}).data || ''; }
  function linkEvent(silent) {
    if (!window.KAL) return;
    const k = key(), r = cur(), d0 = startDate(r);
    if (!d0) return;
    const dates = r.dni.map(d => d.data).filter(Boolean).sort();
    const first = r.dni.find(d => d.data === dates[0]), last = r.dni.find(d => d.data === dates[dates.length - 1]);
    const tf = first ? times(first) : [], tl = last ? times(last) : [];
    const godz = r.godz || (multi(r) && tf.length && tf[0].s !== null ? toHm(tf[0].s) : '');
    const endL = multi(r) ? tl.filter(x => x.e !== null).map(x => x.e).pop() : null;
    let e = r.ev ? KAL.alive().find(x => x.id === r.ev) : null;
    const typ = kindOf(k) === 'niest' ? (r.typEv || 'ls') : KIND(kindOf(k))[3];
    if (!e) {
      e = { id: uuid(), typ: typ, data: d0, dataDo: '', godz: '', godzDo: '', gdzie: r.gdzie || '', adres: '', uwagi: '', info: '', agapa: false, agapaInfo: '',
        grupy: [], osoby: [], wszyscy: false, wsp: S.wspAktywna === 'ALL' ? 'all' : S.wspAktywna };
      if (!silent) toast('Dodano do kalendarza: ' + (KAL.TY[typ] || { n: '' }).n + ', ' + plDate(d0) + '.');
    } else e = JSON.parse(JSON.stringify(e));
    e.typ = typ; e.data = dates[0]; e.dataDo = dates.length > 1 ? dates[dates.length - 1] : '';
    e.godz = godz || e.godz || ''; if (endL !== null && endL !== undefined) e.godzDo = toHm(endL);
    if (r.gdzie) e.gdzie = r.gdzie;
    if (r.ekipa && r.ekipa.length) e.osoby = r.ekipa.slice();
    e.rz = k; r.ev = e.id;
    KAL.commitEvent(e);
  }
  /** Z wydarzenia w kalendarzu: otwórz (albo załóż) jego przygotowanie. */
  function openForEvent(e) {
    ensure();
    if (!canSee(e)) { toast('Przygotowanie widzą odpowiedzialni i ekipa tego wydarzenia.'); return; }
    let k = e.rz && S.rozpiski[e.rz] && S.rozpiski[e.rz].ev === e.id ? e.rz : '';
    if (!k) k = Object.keys(S.rozpiski).find(x => S.rozpiski[x].ev === e.id) || '';
    if (!k && e.rzPlan) { if (S.rzHide) delete S.rzHide[e.id]; fromEvents(); k = Object.keys(S.rozpiski).find(x => S.rozpiski[x].ev === e.id) || ''; }
    if (!k && !resp()) { toast('Odpowiedzialny jeszcze nie przygotował rozpiski.'); return; }
    if (!k) {
      const kind = EV2KIND[e.typ] || 'niest';
      const base = S.rozpiski[kind];
      if (base && !base.ev && !startDate(base)) k = kind;   // pusty szablon – wykorzystaj
      else { k = kind + ':' + e.id; S.rozpiski[k] = { tytul: KIND(kind)[2], chrzest: false, dni: DEFAULTS[kind]() }; }
      const r = S.rozpiski[k];
      r.ev = e.id; if (kind === 'niest') r.typEv = e.typ;
      if ((e.osoby || []).length) r.ekipa = e.osoby.slice();
      if (e.gdzie) r.gdzie = e.gdzie;
      if (kind === 'konw') {
        const out = []; let d = e.data;
        const end = e.dataDo && e.dataDo > e.data ? e.dataDo : e.data;
        for (let i = 0; d <= end && i < 14; i++) { out.push(i === 0 ? Object.assign(r.dni[0] || konwDay('', true), { data: d }) : konwDay(d, false)); d = isoAdd(d, 1); }
        r.dni = out;
      } else r.dni[0].data = e.data;
      if (e.godz) r.godz = kind === 'konw' ? '' : e.godz;
      if (kind === 'konw' && e.godz && r.dni[0].bloki[0]) r.dni[0].bloki[0].start = e.godz;
      const ev = Object.assign({}, e, { rz: k }); KAL.commitEvent(ev);
    }
    UI.rz = k; save(); go('rozpiska');
  }
  function isoAdd(d, n) { const p = d.split('-').map(Number), x = new Date(p[0], p[1] - 1, p[2] + n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  const dayLbl = d => d.data ? DOW[new Date(d.data + 'T12:00').getDay()] + ' ' + plDate(d.data).slice(0, 5) : 'bez daty';

  function view() {
    const k = key(), kd = kindOf(k), r = cur(), isP = kd === 'pascha', M = multi(r);
    if (!UI.tp) UI.tp = { id: '', h: null, m: 0 };
    if (!planOk(r)) return '<div class="card"><h2>Przygotowanie</h2><div class="muted">Przygotowania widzą tylko odpowiedzialni wspólnoty i osoby z ekipy, która przygotowuje dane wydarzenie (otwierasz je z kalendarza).</div></div>';
    if (locked(r)) return roView(k, r);
    const R0 = resp();
    let h = !R0 ? '' : '<div class="littabs">' + KINDS.map(x => '<button class="' + (kd === x[0] ? 'on' : '') + '" data-act="rz-go" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    const plans = Object.keys(S.rozpiski).filter(x => kindOf(x) === kd && (!S.rozpiski[x].done || x === k)).sort((a, b) => (startDate(S.rozpiski[a]) || '9').localeCompare(startDate(S.rozpiski[b]) || '9'));
    if (R0 && (plans.length > 1 || kd === 'konw' || kd === 'niest')) h += '<div class="chips">' + plans.map(x => { const p = S.rozpiski[x], sd = startDate(p);
      return '<button class="chip' + (x === k ? ' on' : '') + '" data-act="rz-plan" data-a="' + esc(x) + '">' + esc(sd ? plDate(sd).slice(0, 5) + (p.dni.length > 1 ? '–' + plDate(p.dni[p.dni.length - 1].data || sd).slice(0, 5) : '') : (p.tytul || 'bez daty')) + '</button>'; }).join('') +
      '<button class="chip" data-act="rz-plan-new">＋ Nowa</button></div>';
    const ev = r.ev && window.KAL ? KAL.alive().find(x => x.id === r.ev) : null;
    const endD = r.dni.map(d => d.data).filter(Boolean).sort().pop() || '', past = endD && endD < today();
    if (r.done) h += '<div class="rzban done">✓ <b>Odbyło się</b> – w archiwum przygotowań (' + new Date(r.done).toLocaleDateString('pl-PL') + '). <a class="link inl" data-act="rz-undone">Przywróć do aktywnych</a></div>';
    else if (past && R0) h += '<div class="rzban">To przygotowanie już minęło (' + plDate(endD) + '). <button class="btn sm" data-act="rz-done">✓ Odbyło się – do archiwum</button></div>';
    h += '<div class="card"><h2>' + esc(r.tytul) + '</h2>' +
      (isP ? '<label class="row"><input type="checkbox" data-ch="rz-chrzest"' + (r.chrzest ? ' checked' : '') + '><span class="grow"><b>Jest chrzest</b> – w rozpisce pojawi się liturgia chrzcielna</span></label>'
        : '<input type="text" data-in="rz-tytul" value="' + esc(r.tytul) + '" placeholder="Nazwa">') +
      (M ? '' : '<div class="row mt"><div class="grow"><label class="lbl">Data</label><input type="date" data-ch="rz-data" value="' + esc(r.dni[0].data) + '"></div>' +
        '<div class="grow"><label class="lbl">Godzina</label><button class="tbtn full' + (r.godz ? ' set' : '') + '" data-act="rz-tp" data-a="__godz">' + (r.godz || '--:--') + '</button></div></div>') +
      (kd === 'niest' ? '<label class="lbl">W kalendarzu jako</label><select data-ch="rz-typev">' + ['ls', 'eu', 'lp', 'kon', 'kpr', 'pascha', 'kat', 'skat', 'p-og'].map(t =>
        '<option value="' + t + '"' + ((r.typEv || 'ls') === t ? ' selected' : '') + '>' + esc((window.KAL && KAL.TY[t] || { n: t }).n) + '</option>').join('') + '</select>' : '') +
      '<label class="lbl">Miejsce (opcjonalnie)</label><input type="text" data-in="rz-gdzie" value="' + esc(r.gdzie || '') + '" placeholder="np. Hotel Mazury">' +
      '<div class="muted mt">' + (ev ? '📅 W kalendarzu: ' + esc(KAL.TY[ev.typ] ? KAL.TY[ev.typ].n : '') + ' · ' + plDate(ev.data) + (ev.dataDo ? '–' + plDate(ev.dataDo) : '') + (ev.godz ? ' · ' + ev.godz + (ev.godzDo ? '–' + ev.godzDo : '') : '') +
        ' <a class="link inl" data-act="rz-cal">pokaż ›</a>' : 'Gdy wpiszesz datę, przygotowanie samo pojawi się w kalendarzu.') + '</div>' +
      '<div class="muted mt">' + (M ? '„＋” pod blokiem dodaje kolejny (słowo, celebracje, posiłki) albo dzieli dzień. Bloki przeciągasz za ⠿. Gdy blok nie ma czasu trwania, następny jest „cd.” – aż do bloku z godziną startu.'
        : '„＋” pod blokiem dodaje kolejny, ⠿ przeciąga, ▲▼ przesuwa, kosz usuwa.') + '</div></div>' + ekipaCard(r) + shareCard(r);

    let n = 0;
    r.dni.forEach((d, di) => {
      const tm = M ? times(d) : [];
      if (M) h += '<div class="rzday"><div class="row"><b class="grow">Dzień ' + (di + 1) + '</b><input type="date" class="rzdd" data-ch="rz-ddata" data-a="' + d.id + '" value="' + esc(d.data) + '">' +
        (r.dni.length > 1 ? '<button class="icon sm" data-act="rz-dday" data-a="' + d.id + '" title="Usuń dzień">✕</button>' : '') + '</div>' +
        '<div class="muted">' + esc(dayLbl(d)) + (tm.length && tm[0].s !== null ? ' · od ' + toHm(tm[0].s) + (tm[tm.length - 1].e !== null ? ' do ' + toHm(tm[tm.length - 1].e) : '') : '') + '</div></div>';
      h += '<div class="rzlist">';
      const EU = euIds(d), EG = euGrp(d);
      d.bloki.forEach((b, i) => {
        if (!visible(r, b)) return;
        n++;
        const meal = isMeal(b);
        const tsel = M ? '<button class="tbtn' + (b.start ? ' set' : '') + '" data-act="rz-tp" data-a="' + b.id + '" title="Godzina startu">' + (b.start || (tm[i].s !== null ? toHm(tm[i].s) : 'cd.')) + '</button>' +
          '<select class="rzcz" data-ch="rz-czas" data-a="' + b.id + '" title="Czas trwania"><option value="0">czas —</option>' +
          Array.from(new Set(CZASY.concat(b.czas ? [+b.czas] : []))).sort((x, y) => x - y).map(c => '<option value="' + c + '"' + (+b.czas === c ? ' selected' : '') + '>' + fmtDur(c) + '</option>').join('') + '</select>' : '';
        h += '<div class="rzb' + (b.typ === 'chrzest' ? ' hl' : '') + (meal ? ' meal' : '') + (EU[b.id] ? ' inEu eu-' + EU[b.id] + ' g-' + EG[b.id] : '') + (missing(b) ? ' missing' : '') + '" data-bid="' + b.id + '"><div class="rzh">' +
          '<span class="rzdrag" title="Przytrzymaj i przeciągnij" aria-label="Przeciągnij"><svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg></span>' +
          '<span class="rzn">' + (M ? span(tm[i]) : n) + '</span>' +
          '<div class="grow rztit"><input class="rzt" type="text" data-in="rz-f" data-a="' + b.id + '" data-b="tytul" value="' + esc(b.tytul) + '">' +
          (isRead(b) ? '<div class="rzrefrow"><input class="rzr" type="text" data-in="rz-f" data-a="' + b.id + '" data-b="ref" value="' + esc(b.ref) + '" placeholder="sygnatura, np. Rdz 1, 1-5"><button class="rzrefb" data-act="rz-refpick" data-a="' + b.id + '" title="Wybierz czytanie">▾</button></div>' : '') + '</div>' +
          (M ? '<div class="rztime">' + tsel + '</div>' : '') +
          '<div class="rzctl"><button class="rzmv rzchg" data-act="rz-chg" data-a="' + b.id + '" aria-label="Zmień rodzaj" title="Zmień rodzaj bloku">⇄</button><button class="rzmv" data-act="rz-up" data-a="' + b.id + '"' + (i ? '' : ' disabled') + ' aria-label="W górę">▲</button>' +
          '<button class="rzmv" data-act="rz-down" data-a="' + b.id + '"' + (i < d.bloki.length - 1 ? '' : ' disabled') + ' aria-label="W dół">▼</button>' +
          '<button class="rzdel" data-act="rz-del" data-a="' + b.id + '" aria-label="Usuń"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg></button></div></div>';
        if (isRead(b)) { const lab = b.typ === 'psalm' && b.rola === 'Śpiewa' ? 'Śpiewa' : 'Czyta';
          h += (b.bezWstepu ? '' : row('Wprowadza', b, 'kto2')) + row(lab, b, 'kto') +
          '<div class="rzrole"><button class="chip sm' + (b.bezWstepu ? '' : ' on') + '" data-act="rz-wstep" data-a="' + b.id + '" data-b="1">z wstępem</button><button class="chip sm' + (b.bezWstepu ? ' on' : '') + '" data-act="rz-wstep" data-a="' + b.id + '" data-b="0">bez wstępu</button>' +
          (b.typ === 'czyt' || b.typ === 'ewang' || b.typ === 'prokl' ? '<span class="rzsep"></span><button class="chip sm' + (b.dl === 'k' ? ' on' : '') + '" data-act="rz-dl" data-a="' + b.id + '" data-b="k">krótkie</button><button class="chip sm' + (b.dl === 'd' ? ' on' : '') + '" data-act="rz-dl" data-a="' + b.id + '" data-b="d">długie</button>' : '') +
          (b.typ === 'psalm' ? '<button class="chip sm' + (lab === 'Czyta' ? ' on' : '') + '" data-act="rz-rola" data-a="' + b.id + '" data-b="Czyta">czytany</button><button class="chip sm' + (lab === 'Śpiewa' ? ' on' : '') + '" data-act="rz-rola" data-a="' + b.id + '" data-b="Śpiewa">śpiewany</button>' : '') + '</div>';
          if (b.typ === 'psalm' && lab === 'Śpiewa') h += '<div class="song" data-act="rz-song" data-a="' + b.id + '"><label class="lbl" style="margin:0">Pieśń / psalm ze śpiewnika</label><div class="v' + (b.piesn ? '' : ' empty') + '">' + (b.piesn ? esc(b.piesn) : 'dotknij, aby wybrać') + '</div></div>';
        }
        else if (isSong(b)) h += songRows(b);
        else if (b.typ === 'slepiec') h += (b.rola === 'brak' ? '' : row('Wprowadza', b, 'kto')) +
          '<div class="rzrole"><button class="chip sm' + (b.rola === 'brak' ? '' : ' on') + '" data-act="rz-rola" data-a="' + b.id + '" data-b="Wprowadza">z wstępem</button>' +
          '<button class="chip sm' + (b.rola === 'brak' ? ' on' : '') + '" data-act="rz-rola" data-a="' + b.id + '" data-b="brak">bez wstępu</button></div>';
        else if (b.typ === 'wol') h += '<div class="rzwol">' + WOL.concat(Object.keys(b.wol || {}).filter(x => WOL.indexOf(x) < 0)).map(x =>
          '<label class="row"><input type="checkbox" data-ch="rz-wol" data-a="' + b.id + '" data-b="' + esc(x) + '"' + ((b.wol || {})[x] ? ' checked' : '') + '><span class="grow">' + esc(x) + '</span></label>').join('') +
          '<button class="btn text sm" data-act="rz-woladd" data-a="' + b.id + '">＋ inne wołanie</button></div>';
        else if (KTO[b.typ]) {
          if (roleOf(b)) h += row(roleOf(b), b, 'kto');
          if (!isMeal(b)) h += '<div class="rzrole">' + Array.from(new Set([KTO[b.typ], 'Wprowadza', 'Czyta'])).map(x => '<button class="chip sm' + (roleOf(b) === x ? ' on' : '') + '" data-act="rz-rola" data-a="' + b.id + '" data-b="' + x + '">' + x + '</button>').join('') +
            '<button class="chip sm' + (b.rola === 'brak' ? ' on' : '') + '" data-act="rz-rola" data-a="' + b.id + '" data-b="brak">bez osoby</button></div>';
        }
        if (b.typ === 'piesn' || b.typ === 'piesnw') h += '<div class="song" data-act="rz-song" data-a="' + b.id + '"><label class="lbl" style="margin:0">Pieśń</label>' +
          '<div class="v' + (b.piesn ? '' : ' empty') + '">' + (b.piesn ? esc(b.piesn) : 'dotknij, aby wybrać') + '</div></div>';
        if (b.typ === 'kat' || b.typ === 'mag') h += '<input class="rzr" type="text" data-in="rz-f" data-a="' + b.id + '" data-b="ref" value="' + esc(b.ref) + '" placeholder="' + (b.typ === 'kat' ? 'temat katechezy' : 'dokument, np. Katechizm 1427') + '">';
        if (NOTE.indexOf(b.typ) >= 0) h += '<textarea rows="2" data-in="rz-f" data-a="' + b.id + '" data-b="tekst" placeholder="' + (meal ? 'Uwagi (np. menu, kto zmywa)' : 'Notatka (opcjonalnie)') + '">' + esc(b.tekst) + '</textarea>';
        h += '<button class="rzins" data-act="rz-ins" data-a="' + b.id + '" title="Dodaj pod tym blokiem">＋</button></div>';
      });
      if (!d.bloki.length) h += '<div class="empty-info">Brak bloków.<br><button class="btn ghost mt" data-act="rz-ins" data-a="" data-b="' + d.id + '">＋ Dodaj pierwszy blok</button></div>';
      h += '</div>';
    });
    if (M) h += '<button class="btn full mt" data-act="rz-addday">＋ Dodaj dzień na końcu</button>';
    h += '<div class="card"><h2>Osoby i wysyłka</h2>' + drawBtn('rz-draw', '↻ Losuj wolne miejsca (spośród ' + (r.ekipa.length ? 'ekipy' : 'obecnych') + ')', people().length > 0) +
      '<button class="btn full mt" data-act="rz-share">⇪ Udostępnij rozpiskę</button>' +
      '<button class="btn ghost full mt" data-act="rz-sms">✉ SMS / WhatsApp do wspólnoty</button>' +
      '<div class="row mt"><button class="btn ghost grow" data-act="rz-doc">📄 Dokument (Word)</button><button class="btn ghost grow" data-act="rz-print">🖨 Drukuj / PDF</button></div>' +
      '<div class="row mt"><button class="btn ghost grow" data-act="rz-hist">↺ Historia zmian</button><button class="btn ghost grow" data-act="rz-pdfimp">⇪ Odzyskaj z PDF</button></div>' +
      (!r.done && startDate(r) ? '<button class="btn ghost full mt" data-act="rz-done">✓ Odbyło się – przenieś do archiwum</button>' : '') +
      '<button class="btn text full mt" data-act="rz-reset">' + (kd === 'niest' ? 'Wyczyść rozpiskę' : 'Przywróć gotowy układ (czyści osoby)') + '</button>' +
      (k.indexOf(':') > 0 || plans.length > 1 ? '<button class="btn text full" data-act="rz-plan-del">Usuń tę rozpiskę</button>' : '') + '</div>';
    return h;
  }
  function songRows(b) {
    return (b.typ === 'piesnw' ? row('Wprowadza', b, 'kto2') : '') + row('Śpiewa', b, 'kto') + row('Gra', b, 'gra', kantorFirst(people())) +
      '<div class="rzrole"><button class="chip sm' + (b.typ === 'piesnw' ? ' on' : '') + '" data-act="rz-pw" data-a="' + b.id + '" data-b="1">z wstępem</button>' +
      '<button class="chip sm' + (b.typ === 'piesn' ? ' on' : '') + '" data-act="rz-pw" data-a="' + b.id + '" data-b="0">bez wstępu</button></div>';
  }
  /** Okno po wybraniu pieśni: kto wprowadza, kto śpiewa. */
  function songDialog(b) {
    openModal('Pieśń', '<div class="songsel">♪ ' + esc(b.piesn || 'bez tytułu') + '</div>' + songRows(b) +
      '<button class="btn text full" data-act="rz-song" data-a="' + b.id + '">Zmień pieśń</button>', '<button class="btn" data-act="rz-songok">Gotowe</button>');
    modalState = { kind: 'rzsong', id: b.id };
  }
  /** Kto przygotowuje: osoby (z różnych wspólnot) – potem do wyboru przy blokach i w losowaniu. */
  function ekipaCard(r) {
    return '<div class="card"><h2>Kto przygotowuje (' + r.ekipa.length + ')</h2>' +
      (r.ekipa.length ? '<div class="chips">' + r.ekipa.map(p => '<span class="chip on">' + esc(p) + '</span>').join('') + '</div>'
        : '<div class="muted">Nikogo nie wybrano – przy blokach do wyboru są obecni / cała wspólnota.</div>') +
      '<button class="btn ghost full mt" data-act="rz-ek-open">' + (r.ekipa.length ? 'Zmień osoby' : 'Wybierz osoby') + '</button>' +
      '<div class="muted mt">Tylko te osoby będą na listach przy blokach i w losowaniu' + (r.ev ? '; zobaczą też tę rozpiskę (są ekipą wydarzenia w kalendarzu).' : '.') + '</div></div>';
  }
  function ekipaDialog() {
    const r = cur(), set = new Set(r.ekipa), seen = new Set();
    const secs = S.wspolnoty.map(w => { const l = (wspData(w.id).bracia || []).filter(p => !seen.has(p) && isAkt(p)); l.forEach(p => seen.add(p)); return [w, l]; }).filter(x => x[1].length);
    const extra = r.ekipa.filter(p => !seen.has(p));
    openModal('Kto przygotowuje', secs.map(x => '<div class="sec row"><span class="grow">' + esc(x[0].nazwa) + '</span><button class="btn text sm" data-act="rz-ek-all" data-a="' + x[0].id + '">wszyscy</button></div><div class="chips">' +
        x[1].map(p => '<button class="chip' + (set.has(p) ? ' on' : '') + '" data-act="rz-ek" data-a="' + esc(p) + '">' + esc(p) + '</button>').join('') + '</div>').join('') +
      (extra.length ? '<div class="sec">Spoza list</div><div class="chips">' + extra.map(p => '<button class="chip on" data-act="rz-ek" data-a="' + esc(p) + '">' + esc(p) + ' ✕</button>').join('') + '</div>' : '') +
      '<button class="btn ghost full mt" data-act="rz-ek-add">＋ Osoba spoza listy</button>',
      '<button class="btn text" data-act="rz-ek-clr">Wyczyść</button><button class="btn" data-act="rz-ek-ok">Gotowe (' + r.ekipa.length + ')</button>');
    modalState = { kind: 'rzek' };
  }
  function row(label, b, field, list) {
    return '<div class="who"><span class="t">' + label + '</span>' + personSelect(b[field] || '', 'rz-who', b.id + '|' + field, list || people()) + '</div>';
  }

  function whoText(b) {
    const who = [];
    if (isRead(b)) { if (b.kto2 && !b.bezWstepu) who.push('wprowadza: ' + b.kto2); if (b.kto) who.push((b.typ === 'psalm' && b.rola === 'Śpiewa' ? 'śpiewa: ' : 'czyta: ') + b.kto); }
    else if (isSong(b)) { if (b.typ === 'piesnw' && b.kto2) who.push('wprowadza: ' + b.kto2); if (b.kto) who.push('śpiewa: ' + b.kto); if (b.gra) who.push('gra: ' + b.gra); }
    else if (b.kto && roleOf(b)) who.push(roleOf(b).toLowerCase() + ': ' + b.kto);
    return who;
  }
  function text() {
    const r = cur(), M = multi(r), sd = startDate(r);
    const lines = ['✝ ' + r.tytul + (kindOf(key()) === 'pascha' && r.chrzest ? ' (z chrztem)' : '') + (sd && !M ? ' – ' + plDate(sd) + (r.godz ? ', ' + r.godz : '') : '') + (r.gdzie ? ', ' + r.gdzie : '')];
    let n = 0;
    r.dni.forEach((d, di) => {
      const tm = M ? times(d) : [];
      if (M) lines.push('', 'Dzień ' + (di + 1) + (d.data ? ' – ' + dayLbl(d) : '') + ':');
      d.bloki.forEach((b, i) => {
        if (!visible(r, b)) return;
        n++;
        let l = (M ? span(tm[i]) + ' ' : n + '. ') + b.tytul + (b.ref ? ' (' + b.ref + ')' : '') + ((b.typ === 'czyt' || b.typ === 'ewang' || b.typ === 'prokl') && b.dl ? (b.dl === 'k' ? ' – krótkie' : ' – długie') : '');
        if (b.piesn) l += ': ' + b.piesn;
        const who = whoText(b); if (who.length) l += ' – ' + who.join(', ');
        if (b.typ === 'wol') { const w = Object.keys(b.wol || {}).filter(x => b.wol[x]); if (w.length) l += ': ' + w.join(', '); }
        if (b.tekst) l += ' · ' + b.tekst;
        lines.push(l);
      });
    });
    return lines.join('\n');
  }

  /** Rozpiska jako dokument: do Worda / Dokumentów Google i do druku (PDF). */
  function docHtml() {
    const r = cur(), M = multi(r), e = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let n = 0, rows = '';
    const TH = '<tr><th>' + (M ? 'Godz.' : '#') + '</th><th>Część</th><th>Osoby</th></tr>';
    r.dni.forEach((d, di) => {
      const tm = M ? times(d) : [];
      if (M && di > 0) rows += '</table><div class="pb"></div><table>' + TH;   // każdy dzień od nowej strony
      if (M) rows += '<tr class="day"><td colspan="3">Dzień ' + (di + 1) + (d.data ? ' – ' + e(dayLbl(d)) : '') + '</td></tr>';
      d.bloki.forEach((b, i) => {
        if (!visible(r, b)) return;
        n++;
        const who = whoText(b).map(x => { const p = x.split(': '); return e(p[0]) + ': <b>' + e(p.slice(1).join(': ')) + '</b>'; });
        const wl = b.typ === 'wol' ? Object.keys(b.wol || {}).filter(x => b.wol[x]) : [];
        const det = [b.ref ? e(b.ref) : '', b.piesn ? '♪ ' + e(b.piesn) : '', wl.length ? e(wl.join(', ')) : '', b.tekst ? '<i>' + e(b.tekst) + '</i>' : ''].filter(Boolean).join('<br>');
        const cls = b.typ === 'chrzest' ? ' class="hl"' : isMeal(b) ? ' class="meal"' : '';
        rows += '<tr' + cls + '><td class="n">' + (M ? e(span(tm[i])) : n) + '</td><td><b>' + e(b.tytul) + '</b>' + (det ? '<div class="d">' + det + '</div>' : '') + '</td><td>' + (who.join('<br>') || '&nbsp;') + '</td></tr>';
      });
    });
    const cw = typeof curW === 'function' ? curW() : null, sd = startDate(r);
    return '<html><head><meta charset="utf-8"><title>' + e(r.tytul) + '</title><style>' +
      'body{font-family:Georgia,"Times New Roman",serif;color:#222;margin:24px} h1{font-size:22pt;margin:0 0 4px;color:#7A1E1E} .s{color:#666;margin:0 0 14px;font-size:11pt}' +
      'table{width:100%;border-collapse:collapse;font-size:11pt} td{border:1px solid #bbb;padding:6px 8px;vertical-align:top} td.n{width:' + (M ? '86' : '28') + 'px;text-align:center;color:#7A1E1E;font-weight:bold;white-space:nowrap}' +
      '.d{color:#555;font-size:10pt;margin-top:2px} tr.hl td{background:#e8f1fa} tr.meal td{background:#eef5e6} tr.day td{background:#7A1E1E;color:#fff;font-weight:bold}' +
      'th{background:#f3ead7;border:1px solid #bbb;padding:6px 8px;text-align:left} .pb{page-break-before:always;break-before:page;height:0} tr{page-break-inside:avoid;break-inside:avoid}</style></head><body>' +
      '<h1>✝ ' + e(r.tytul) + '</h1><p class="s">' + (cw ? e(cw.nazwa) + ' · ' : '') + (sd ? plDate(sd) + (M && r.dni.length > 1 ? ' – ' + plDate(r.dni[r.dni.length - 1].data || sd) : '') : plDate(today())) +
      (r.gdzie ? ' · ' + e(r.gdzie) : '') + (kindOf(key()) === 'pascha' && r.chrzest ? ' · z chrztem' : '') + '</p>' +
      '<table>' + TH + rows + '</table></body></html>';
  }

  function draw() {
    const r = cur(), ppl = people().slice();
    if (!ppl.length) return;
    const count = {}; ppl.forEach(p => { count[p] = 0; });
    const slots = [];
    allBlocks(r).forEach(b => {
      if (!visible(r, b) || isMeal(b)) return;
      const fields = isRead(b) ? (b.bezWstepu ? ['kto'] : ['kto2', 'kto']) : b.typ === 'piesnw' ? ['kto2', 'kto'] : b.typ === 'piesn' ? ['kto'] : roleOf(b) ? ['kto'] : [];
      fields.forEach(f => { if (b[f]) { if (count[b[f]] !== undefined) count[b[f]]++; } else slots.push([b, f]); });
    });
    slots.forEach(s => {
      const min = Math.min.apply(null, ppl.map(p => count[p]));
      const pool = ppl.filter(p => count[p] === min);
      const p = pool[Math.floor(Math.random() * pool.length)];
      s[0][s[1]] = p; count[p]++;
    });
    save(); toast('Rozlosowano ' + slots.length + ' miejsc.');
  }
  /* ---------- przeciąganie bloków za ⠿ (w obrębie dnia), reszta się rozsuwa ---------- */
  let drag = null;
  document.addEventListener('pointerdown', ev => {
    const h = ev.target.closest('.rzdrag'); if (!h || UI.view !== 'rozpiska') return;
    const el = h.closest('.rzb'), list = el && el.parentElement; if (!el) return;
    ev.preventDefault();
    drag = { el: el, list: list, y0: ev.clientY, top0: el.getBoundingClientRect().top, ph: document.createElement('div') };
    drag.ph.className = 'rzph'; drag.ph.style.height = el.offsetHeight + 'px';
    el.classList.add('dragging'); el.style.width = el.offsetWidth + 'px'; el.style.left = el.getBoundingClientRect().left + 'px'; el.style.top = drag.top0 + 'px';
    list.insertBefore(drag.ph, el); document.body.appendChild(el);
    try { h.setPointerCapture(ev.pointerId); } catch (e) { /* */ }
  });
  document.addEventListener('pointermove', ev => {
    if (!drag) return;
    ev.preventDefault();
    drag.el.style.top = (drag.top0 + ev.clientY - drag.y0) + 'px';
    const sibs = Array.from(drag.list.querySelectorAll('.rzb')), y = ev.clientY;
    let before = null;
    for (const s2 of sibs) { const r = s2.getBoundingClientRect(); if (y < r.top + r.height / 2) { before = s2; break; } }
    if (before) drag.list.insertBefore(drag.ph, before); else drag.list.appendChild(drag.ph);
    const m = document.getElementById('main'), mr = m.getBoundingClientRect();   // przewijanie przy krawędzi
    if (y < mr.top + 50) m.scrollTop -= 12; else if (y > mr.bottom - 50) m.scrollTop += 12;
  }, { passive: false });
  function dragEnd() {
    if (!drag) return;
    const d0 = drag; drag = null;
    d0.list.insertBefore(d0.el, d0.ph); d0.ph.remove();
    d0.el.classList.remove('dragging'); d0.el.style.width = ''; d0.el.style.top = ''; d0.el.style.left = '';
    const ids = Array.from(d0.list.querySelectorAll('.rzb')).map(x => x.dataset.bid), r = cur();
    const dd = r.dni.find(x => x.bloki.some(b => ids.indexOf(b.id) >= 0)); if (!dd) return;
    const by = {}; dd.bloki.forEach(b => { by[b.id] = b; });
    const hidden = dd.bloki.filter(b => ids.indexOf(b.id) < 0);   // np. ukryta liturgia chrzcielna – zostaje na końcu
    dd.bloki = ids.map(id => by[id]).filter(Boolean).concat(hidden);
    save(); if (multi(r)) linkEvent(true); render();
  }
  document.addEventListener('pointerup', dragEnd);
  document.addEventListener('pointercancel', dragEnd);

  /* ---------- zegar: godzina + minuty co 15, albo wpisane ręcznie ---------- */
  const M_OK = sec => multi(cur()) || sec !== 'Posiłki i przerwy';
  function tpOpen(id) {
    const r = cur(), cur0 = id === '__godz' ? r.godz : ((findB(r, id) || {}).b || {}).start;
    const p = String(cur0 || '').split(':');
    UI.tp = { id: id, h: p.length === 2 ? +p[0] : null, m: p.length === 2 ? +p[1] : 0 };
    tpRender();
  }
  function tpRender() {
    const t = UI.tp, hrs = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
    openModal('Godzina startu', '<div class="tpsel">' + (t.h !== null ? String(t.h).padStart(2, '0') + ':' + String(t.m || 0).padStart(2, '0') : '--:--') + '</div>' +
      '<div class="lbl">Godzina</div><div class="tpgrid">' + hrs.map(x => '<button class="chip' + (t.h === x ? ' on' : '') + '" data-act="rz-tph" data-a="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<div class="lbl">Minuty</div><div class="tpgrid m">' + [0, 15, 30, 45].map(x => '<button class="chip' + ((t.m || 0) === x ? ' on' : '') + '" data-act="rz-tpm" data-a="' + x + '">:' + String(x).padStart(2, '0') + '</button>').join('') + '</div>' +
      '<label class="lbl">albo wpisz ręcznie</label><input type="text" id="tpMan" inputmode="numeric" placeholder="np. 7:40"' + (t.m % 15 ? ' value="' + String(t.h).padStart(2, '0') + ':' + String(t.m).padStart(2, '0') + '"' : '') + '>',
      '<button class="btn text" data-act="rz-tpclr">' + (t.id === '__godz' ? 'Bez godziny' : 'Po poprzednim') + '</button><button class="btn" data-act="rz-tpok">Ustaw</button>');
    modalState = { kind: 'tp' };
  }
  function scrollLast(dayId) {
    setTimeout(() => { const els = document.querySelectorAll('.rzb'); if (els.length) els[els.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
  }
  function addTo(d, nb) { d.bloki.push(nb); save(); if (multi(cur())) linkEvent(true); render(); scrollLast(); }

  function act(a, v, el) {
    if (a.indexOf('rz-') !== 0) return false;
    const r = cur(), f = findB(r, v), b = f && f.b;
    switch (a) {
      case 'rz-go': UI.rz = v; render(); return true;
      case 'rz-open': UI.rz = v; subnavToggle(false); go('rozpiska'); return true;
      case 'rz-plan': UI.rz = v; render(); return true;
      case 'rz-done': confirmBox('Odbyło się?', '„' + (r.tytul || 'Rozpiska') + '” trafi do archiwum przygotowań (Archiwum i Moje przygotowania). Zawsze możesz ją otworzyć albo przywrócić.', 'Do archiwum', () => {
          const k = key(), kd = kindOf(k), rr = S.rozpiski[k]; rr.done = Date.now();
          if (k.indexOf(':') < 0) {   // podstawowa rozpiska rodzaju – przenosimy pod własny klucz, a na jej miejsce nowa, pusta
            const nk = kd + ':a' + uuid().slice(0, 8); S.rozpiski[nk] = rr; delete S.rozpiski[k];
            S.rozpiskiDel = S.rozpiskiDel || {}; S.rozpiskiDel[k] = Date.now();
          }
          const left = Object.keys(S.rozpiski).filter(x => kindOf(x) === kd && !S.rozpiski[x].done);
          UI.rz = left[0] || kd; ensure(); save(); render(); toast('Przeniesiono do archiwum przygotowań.');
        }); return true;
      case 'rz-undone': delete r.done; save(); render(); toast('Przywrócono do aktywnych.'); return true;
      case 'rz-plan-new': { const kd = kindOf(key()), k = kd + ':' + uuid().slice(0, 8); S.rozpiski[k] = { tytul: KIND(kd)[2], chrzest: false, dni: DEFAULTS[kd]() }; UI.rz = k; save(); render(); return true; }
      case 'rz-plan-del': confirmBox('Usunąć tę rozpiskę?', 'Wydarzenie w kalendarzu zostaje.', 'Usuń', () => {
        const k = key(), kd = kindOf(k); snapshot(k, S.rozpiski[k], 'usunięta');
        if (S.rozpiski[k].fromEv) { S.rzHide = S.rzHide || {}; S.rzHide[S.rozpiski[k].ev] = Date.now(); } S.rozpiskiDel = S.rozpiskiDel || {}; S.rozpiskiDel[k] = Date.now();
        delete S.rozpiski[k]; UI.rz = kd; ensure(); save(); render(); }); return true;
      case 'rz-cal': { const e = r.ev && KAL.alive().find(x => x.id === r.ev); if (e) { UI.kalD = e.data; UI.kalM = e.data.slice(0, 8) + '01'; go('kalendarz'); } return true; }
      case 'rz-up': case 'rz-down': {
        if (!f) return true;
        const j = f.i + (a === 'rz-up' ? -1 : 1);
        if (j < 0 || j >= f.d.bloki.length) return true;
        f.d.bloki.splice(f.i, 1); f.d.bloki.splice(j, 0, b); save(); if (multi(r)) linkEvent(true); render(); return true;
      }
      case 'rz-del':
        if (!f) return true;
        confirmBox('Usunąć blok?', b.tytul + (GRP.indexOf(b.typ) >= 0 ? ' (razem ze „Śpiewem na wyjście”; bloki w środku zostają)' : ''), 'Usuń', () => {
          const i0 = f.d.bloki.indexOf(b);
          if (GRP.indexOf(b.typ) >= 0) { const j = f.d.bloki.findIndex((x, k) => k > i0 && x.euEnd); if (j > 0) f.d.bloki.splice(j, 1); }
          f.d.bloki.splice(i0, 1); save(); if (multi(r)) linkEvent(true); render(); });
        return true;
      case 'rz-add': case 'rz-addm2': {
        const d = a === 'rz-addm2' ? r.dni.find(x => x.id === el.dataset.b) : r.dni[r.dni.length - 1];
        if (!d) return true;
        if (a === 'rz-addm2') closeModal();
        if (v === 'inne') { promptBox('Nowy blok', 'Co to za blok? (np. Liturgia światła, Ogłoszenia)', '', name => addTo(d, blk('inne', name, '', multi(r) ? 30 : 0))); return true; }
        const nb = blk(v, v === 'czyt' ? 'Czytanie' : '', '', multi(r) ? ({ kat: 60, czyt: 20, mag: 20 }[v] || 15) : 0);
        addTo(d, nb); return true;
      }
      case 'rz-ins': {
        const tgt = v ? findB(r, v) : null, dayId = v ? (tgt && tgt.d.id) : el.dataset.b;
        modalState = { kind: 'rzins', after: v || '', day: dayId };
        const inEu = !!(tgt && euGrp(tgt.d)[v] === 'euch' && !tgt.b.euEnd), inLit = !!(tgt && ['lit', 'lpok'].indexOf(euGrp(tgt.d)[v]) >= 0 && !tgt.b.euEnd);
        openModal(v && tgt ? 'Dodaj pod: ' + tgt.b.tytul : 'Dodaj blok', (inEu ? '<div class="sec">Eucharystia</div><div class="chips">' + EU_BL.map(x =>
            '<button class="chip keu" data-act="rz-ins2" data-a="e:' + esc(x[0]) + '">＋ ' + esc(x[0]) + '</button>').join('') + '</div>' : '') +
          MENU.filter(m => M_OK(m[0]) && (!(inEu || inLit) || m[0] === 'Słowo' || m[0] === 'Inne')).map(m => '<div class="sec">' + m[0] + '</div><div class="chips">' + m[1].map(t => {
            if (t === 'dzieci' && kindOf(key()) !== 'pascha') return '';
            if (GRP.indexOf(t) >= 0 && (inEu || inLit)) return '';
            const lab = t.indexOf('m:') === 0 || t.indexOf('e:') === 0 ? t.slice(2) : TYPY[t];
            return '<button class="chip' + (t.indexOf('m:') === 0 || t === 'agapa' ? ' kmeal' : '') + '" data-act="rz-ins2" data-a="' + esc(t) + '">＋ ' + esc(lab) + '</button>'; }).join('') + '</div>').join('') +
          (multi(r) && v ? '<div class="sec">Dzień</div><div class="chips"><button class="chip" data-act="rz-ins2" data-a="day">Nowy dzień od następnego bloku</button></div>' : ''));
        modalState = { kind: 'rzins', after: v || '', day: dayId };
        return true;
      }
      case 'rz-ins2': {
        const ms = modalState || {}, d = r.dni.find(x => x.id === ms.day); closeModal(); if (!d) return true;
        const pos = ms.after ? d.bloki.findIndex(x => x.id === ms.after) + 1 : d.bloki.length;
        const put = nb => { d.bloki.splice(pos, 0, nb); save(); if (multi(r)) linkEvent(true); render();
          setTimeout(() => { const el2 = document.querySelector('[data-act=rz-del][data-a="' + nb.id + '"]'); if (el2) el2.closest('.rzb').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); };
        if (v === 'day') {
          const di = r.dni.indexOf(d), moved = d.bloki.splice(pos);
          if (moved[0] && !moved[0].start) moved[0].start = '08:00';   // nowy dzień zaczyna się rano – godzinę łatwo zmienić
          const nd = day(d.data ? isoAdd(d.data, 1) : '', moved);
          r.dni.slice(di + 1).forEach(x => { if (x.data) x.data = isoAdd(x.data, 1); });   // kolejne dni przesuwają się o dzień
          r.dni.splice(di + 1, 0, nd); save(); linkEvent(); render(); return true;
        }
        if (v.indexOf('e:') === 0) { const nb = euBlk(v.slice(2)); put(nb);
          if (nb.typ === 'piesn') setTimeout(() => openSongPicker('', label => { nb.piesn = label; save(); render(); setTimeout(() => songDialog(nb), 0); }), 80);
          return true; }
        if (GRP.indexOf(v) >= 0) {   // Eucharystia / Liturgia: od razu z „Śpiewem na wyjście” – bloki dodajesz pomiędzy
          const nb = blk(v), end = Object.assign(blk('piesn', 'Śpiew na wyjście'), { euEnd: true });
          d.bloki.splice(pos, 0, nb, end); save(); if (multi(r)) linkEvent(true); render(); return true;
        }
        if (v === 'inne') { promptBox('Nowy blok', 'Co to za blok? (np. Liturgia światła, Ogłoszenia)', '', name => put(blk('inne', name))); return true; }
        if (v.indexOf('m:') === 0) { const nm = v.slice(2), mt = MEAL_T[nm] || ['', 30]; put(Object.assign(blk(nm === 'Przerwa' ? 'przerwa' : 'pos', nm, '', mt[1]), { start: multi(r) ? mt[0] : '' })); return true; }
        if (v === 'piesn') { const nb = blk('piesn'); put(nb); setTimeout(() => openSongPicker('', label => { nb.piesn = label; save(); render(); setTimeout(() => songDialog(nb), 0); }), 80); return true; }
        put(blk(v, v === 'czyt' ? 'Czytanie' : '', '', 0));
        return true;
      }
      case 'rz-chg': {
        if (!f) return true;
        const inEu = euGrp(f.d)[v] === 'euch' && b.typ !== 'euch' && !b.euEnd;
        modalState = { kind: 'rzchg', id: v };
        openModal('Zmień rodzaj: ' + b.tytul, (inEu ? '<div class="sec">Eucharystia</div><div class="chips">' + EU_BL.map(x => '<button class="chip keu" data-act="rz-chg2" data-a="e:' + esc(x[0]) + '">' + esc(x[0]) + '</button>').join('') + '</div>' : '') +
          '<div class="sec">Słowo</div><div class="chips">' + MENU[0][1].filter(t => t !== 'dzieci' || kindOf(key()) === 'pascha').map(t => '<button class="chip' + (b.typ === t ? ' on' : '') + '" data-act="rz-chg2" data-a="' + esc(t) + '">' + esc(t.indexOf('e:') === 0 ? t.slice(2) : TYPY[t]) + '</button>').join('') + '</div>' +
          '<div class="muted mt">Osoby, pieśń i notatka zostają.</div>');
        modalState = { kind: 'rzchg', id: v };
        return true;
      }
      case 'rz-chg2': {
        const fb = findB(r, modalState && modalState.id); closeModal(); if (!fb) return true;
        const o = fb.b, wasDef = !o.tytul || o.tytul === TYPY[o.typ] || EU_BL.some(x => x[0] === o.tytul) || o.tytul === 'Czytanie';
        if (v.indexOf('e:') === 0) { const x = EU_BL.find(y => y[0] === v.slice(2)); o.typ = x[1]; o.rola = x[2]; o.tytul = x[0]; }
        else { o.typ = v; o.rola = ''; if (wasDef) o.tytul = TYPY[v]; }
        save(); render(); return true;
      }
      case 'rz-dl': if (b) { b.dl = b.dl === el.dataset.b ? '' : el.dataset.b; save(); render(); } return true;
      case 'rz-refpick': {
        if (!b) return true;
        const cats = typeof readings === 'function' ? readings() : [[], [], [], []], lit = (S.celebration.readings || []).slice(1).filter(Boolean);
        const chip = x => '<button class="chip" data-act="rz-refset" data-a="' + b.id + '" data-b="' + esc(x) + '">' + esc(x) + '</button>';
        modalState = { kind: 'rzref' };
        openModal('Wybierz czytanie', (S.haslo ? '<div class="muted">Temat: <b>' + esc(S.haslo) + '</b></div>' : '<div class="muted">Wybierz temat (Liturgia → Temat), a pojawią się tu czytania do niego.</div>') +
          (lit.length ? '<div class="sec">Z Liturgii Słowa</div><div class="chips">' + lit.map(chip).join('') + '</div>' : '') +
          (b.typ === 'ewang' ? [3, 0, 1, 2] : [0, 1, 2, 3]).map(i => [cats[i], i]).map(([l, i]) => l.length ? '<div class="sec">' + esc(CAT_LABEL[i]) + '</div><div class="chips">' + l.map(chip).join('') + '</div>' : '').join('') +
          '<div class="muted mt">Albo wpisz sygnaturę ręcznie w polu bloku.</div>');
        modalState = { kind: 'rzref' };
        return true;
      }
      case 'rz-refset': if (b) { b.ref = el.dataset.b; closeModal(); save(); render(); } return true;
      case 'rz-hist': histDialog(); return true;
      case 'rz-unlock': {
        const e = r.ev && window.KAL ? KAL.alive().find(x => x.id === r.ev) : null;
        if (!e || !e.rzKey) { toast('Ta rozpiska nie ma kodu edycji.'); return true; }
        promptBox('Kod edycji', 'Wpisz 4 cyfry od osoby, która przygotowuje', '', c => {
          if (codeHash(String(c).trim(), e.id) !== e.rzKey) { toast('Zły kod.'); return; }
          S.rzUnlock = S.rzUnlock || {}; S.rzUnlock[e.id] = true; save(true); render(); toast('Możesz edytować rozpiskę.');
        });
        return true;
      }
      case 'rz-lock': if (S.rzUnlock && r.ev) delete S.rzUnlock[r.ev]; save(true); render(); return true;
      case 'rz-kod': r.kod = String(1000 + Math.floor(Math.random() * 9000)); save(); render(); toast('Nowy kod: ' + r.kod + ' – stary przestaje działać.'); return true;
      case 'rz-histok': {
        const H = histLoad(), it = (H[el.dataset.b] || [])[+v]; if (!it) return true;
        const k = el.dataset.b, old = S.rozpiski[k];
        if (old) snapshot(k, old, 'przed przywróceniem');
        const r2 = JSON.parse(it.r); r2.ts = Date.now(); r2._h = rzHash(r2);
        S.rozpiski[k] = r2; if (S.rozpiskiDel) delete S.rozpiskiDel[k];
        UI.rz = k; closeModal(); save(); render(); toast('Przywrócono wersję z ' + new Date(it.t).toLocaleString('pl-PL') + '.'); return true;
      }
      case 'rz-pdfimp':
        if (!A || !A.pickPdf) { toast('Dostępne w aplikacji na telefonie.'); return true; }
        toast('Wybierz plik PDF z rozpiską (wygenerowany w aplikacji).'); A.pickPdf('rzimp'); return true;
      case 'rz-woladd': promptBox('Inne wołanie', 'Kogo wołamy?', '', n => { n = n.trim(); if (!n || !b) return; b.wol = b.wol || {}; b.wol[n] = true; save(); render(); }); return true;
      case 'rz-rola': if (b) { b.rola = el.dataset.b === KTO[b.typ] ? '' : el.dataset.b; if (b.rola === 'brak') b.kto = ''; save(); render(); } return true;
      case 'rz-wstep': if (b) { b.bezWstepu = el.dataset.b === '0'; if (b.bezWstepu) b.kto2 = ''; save(); render(); } return true;
      case 'rz-tp': tpOpen(v); return true;
      case 'rz-tph': UI.tp.h = +v; tpRender(); return true;
      case 'rz-tpm': UI.tp.m = +v; tpRender(); return true;
      case 'rz-tpok': case 'rz-tpclr': {
        let val = '';
        if (a === 'rz-tpok') {
          const man = ((document.getElementById('tpMan') || {}).value || '').trim();
          const mm = man.match(/^(\d{1,2})[:.,\s]?(\d{2})$/);
          if (man && !mm) { toast('Wpisz godzinę jak 7:40 albo 19:05.'); return true; }
          val = mm ? String(Math.min(23, +mm[1])).padStart(2, '0') + ':' + String(Math.min(59, +mm[2])).padStart(2, '0')
            : UI.tp.h !== null ? String(UI.tp.h).padStart(2, '0') + ':' + String(UI.tp.m || 0).padStart(2, '0') : '';
        }
        const id = UI.tp.id; closeModal();
        if (id === '__godz') r.godz = val; else { const fb = findB(r, id); if (fb) fb.b.start = val; }
        save(); linkEvent(true); render(); return true;
      }
      case 'rz-addm':
        openModal('Dodaj blok', '<div class="chips">' + DODAJ.map(t => '<button class="chip" data-act="rz-addm2" data-a="' + t + '" data-b="' + v + '">＋ ' + TYPY[t] + '</button>').join('') + '</div>');
        return true;
      case 'rz-addpos':
        openModal('Posiłek / przerwa', '<div class="chips">' + POSILKI.map(p => '<button class="chip kmeal" data-act="rz-addpos2" data-a="' + esc(p) + '" data-b="' + v + '">＋ ' + esc(p) + '</button>').join('') +
          '<button class="chip" data-act="rz-addpos2" data-a="Przerwa" data-b="' + v + '">＋ Przerwa</button></div>');
        return true;
      case 'rz-addpos2': {
        const d = r.dni.find(x => x.id === el.dataset.b); closeModal(); if (!d) return true;
        addTo(d, blk(v === 'Przerwa' ? 'przerwa' : 'pos', v, '', v === 'Przerwa' ? 15 : v === 'Kawa' ? 20 : v === 'Śniadanie' ? 45 : 60)); return true;
      }
      case 'rz-addday': {
        const last = r.dni[r.dni.length - 1], d = last && last.data ? isoAdd(last.data, 1) : '';
        r.dni.push(konwDay(d, false)); save(); linkEvent(); render(); scrollLast(); return true;
      }
      case 'rz-dday':
        confirmBox('Usunąć ten dzień?', 'Razem z jego blokami.', 'Usuń', () => { r.dni = r.dni.filter(x => x.id !== v); save(); linkEvent(true); render(); });
        return true;
      case 'rz-song':
        openSongPicker('', label => { b.piesn = label; save(); setTimeout(() => songDialog(b), 0); });
        return true;
      case 'rz-songok': closeModal(); render(); return true;
      case 'rz-pw': if (b) {
          const on = el.dataset.b === '1';
          if (b.tytul === TYPY[b.typ]) b.tytul = on ? TYPY.piesnw : TYPY.piesn;
          b.typ = on ? 'piesnw' : 'piesn'; b.sv2 = 1; if (!on) b.kto2 = '';
          save(); render(); if (modalState && modalState.kind === 'rzsong') songDialog(b);
        } return true;
      case 'rz-ek-open': ekipaDialog(); return true;
      case 'rz-ek': { const i = r.ekipa.indexOf(v); if (i >= 0) r.ekipa.splice(i, 1); else r.ekipa.push(v); save(true); ekipaDialog(); return true; }
      case 'rz-ek-all': { wspData(v).bracia.forEach(p => { if (r.ekipa.indexOf(p) < 0) r.ekipa.push(p); }); save(true); ekipaDialog(); return true; }
      case 'rz-ek-clr': r.ekipa = []; save(true); ekipaDialog(); return true;
      case 'rz-ek-add': promptBox('Osoba spoza listy', 'Imię (np. katechista, ktoś z innej wspólnoty)', '', n => { n = n.trim(); if (n && r.ekipa.indexOf(n) < 0) r.ekipa.push(n); save(true); ekipaDialog(); }); return true;
      case 'rz-ek-ok': closeModal(); save(); linkEvent(true); render(); return true;
      case 'rz-draw': draw(); render(); return true;
      case 'rz-doc': {
        const name = fileName(r) + '.doc';
        if (A && A.exportFile) A.exportFile(docHtml(), name, 'application/msword'); else toast('Dostępne w aplikacji na telefonie.');
        return true;
      }
      case 'rz-print': if (A && A.printHtml) A.printHtml(docHtml().replace(/<title>[^<]*<\/title>/, '<title>' + esc(fileName(r)) + '</title>'), fileName(r)); else toast('Dostępne w aplikacji na telefonie.'); return true;
      case 'rz-share': if (A) A.share(text()); else if (navigator.clipboard) navigator.clipboard.writeText(text()); return true;
      case 'rz-sms': S.msgDraft = text(); S.msgHello = true; save(true); openSmsDialog('msg'); return true;
      case 'rz-reset': {
        const kd = kindOf(key());
        confirmBox(kd === 'niest' ? 'Wyczyścić rozpiskę?' : 'Przywrócić gotowy układ?', 'Bloki i przypisane osoby zostaną zastąpione. Data zostaje.', 'Tak', () => {
          const dates = r.dni.map(d => d.data);
          r.dni = DEFAULTS[kd]();
          if (kd === 'konw') { r.dni = dates.map((d, i) => konwDay(d, i === 0)); if (!r.dni.length) r.dni = konwDefault(); }
          else r.dni[0].data = dates[0] || '';
          save(); render();
        });
        return true;
      }
    }
    return true;
  }
  function change(ch, v, el) {
    if (String(ch).indexOf('rz') !== 0) return false;
    ensure();
    const r = cur();
    if (ch === 'rz-chrzest') { r.chrzest = el.checked; save(); render(); return true; }
    if (ch === 'rz-data') { r.dni[0].data = el.value; save(); linkEvent(); render(); return true; }
    if (ch === 'rz-godz') { r.godz = el.value; save(); linkEvent(true); render(); return true; }
    if (ch === 'rz-typev') { r.typEv = el.value; save(); linkEvent(true); render(); return true; }
    if (ch === 'rz-ddata') {
      const d = r.dni.find(x => x.id === v); if (!d) return true;
      d.data = el.value; r.dni.sort((x, y) => (x.data || '9').localeCompare(y.data || '9')); save(); linkEvent(); render(); return true;
    }
    if (ch === 'rz-start' || ch === 'rz-czas') {
      const f = findB(r, v); if (!f) return true;
      if (ch === 'rz-start') f.b.start = el.value; else f.b.czas = +el.value;
      save(); linkEvent(true); render(); return true;
    }
    if (ch === 'rz-wol') { const f = findB(r, v); if (f) { f.b.wol = f.b.wol || {}; if (el.checked) f.b.wol[el.dataset.b] = true; else delete f.b.wol[el.dataset.b]; save(); } return true; }
    if (ch === 'rz-who') {
      const p = v.split('|'), f = findB(r, p[0]);
      if (!f) return true;
      if (el.value === '__inna__') { render(); promptBox('Inna osoba', 'Imię', '', n => { f.b[p[1]] = n; save(); render(); }); return true; }
      f.b[p[1]] = el.value; save(); render(); return true;
    }
    return false;
  }
  function input(k, el) {
    if (k === 'rz-tytul') { cur().tytul = el.value; save(true); return true; }
    if (k === 'rz-gdzie') { cur().gdzie = el.value; save(true); clearTimeout(input.t); input.t = setTimeout(() => linkEvent(true), 1500); return true; }
    if (k === 'rz-f') { const f = findB(cur(), el.dataset.a); if (f) { f.b[el.dataset.b] = el.value; save(true); } return true; }
    return false;
  }

  /* ---------- zabezpieczenie: znacznik zmian, historia wersji (tylko w tym telefonie), łączenie przy synchronizacji konta ---------- */
  function rzHash(r) {
    const c = Object.assign({}, r); delete c.ts; delete c._h;
    const t = JSON.stringify(c); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return String(h >>> 0);
  }
  /** Wywoływane przy każdym zapisie: zmieniona rozpiska dostaje nowy czas (ts) i kopię w historii. */
  function stamp() {
    if (!S.rozpiski) return;
    Object.keys(S.rozpiski).forEach(k => {
      const r = S.rozpiski[k]; if (!r) return;
      if (r.ev && !r.fromEv && !r.kod) r.kod = String(1000 + Math.floor(Math.random() * 9000));
      const h = rzHash(r);
      if (r._h === undefined) { r._h = h; if (r.ts === undefined) r.ts = 0; return; }
      if (r._h !== h) { r._h = h; r.ts = Date.now(); snapshot(k, r, ''); if (r.ev && !locked(r)) pushPlan(k, r); return; }
      if (r.ev && !r.fromEv && window.KAL && Array.isArray(S.kal)) {   // starsze rozpiski: jeszcze nie wysłane z wydarzeniem
        const e = S.kal.find(x => x.id === r.ev && !x.del);
        if (e && (!e.rzPlan || (r.kod && e.rzKey !== codeHash(r.kod, e.id)))) pushPlan(k, r);
      }
    });
  }
  const HIST = 'rz-hist.json';
  function histLoad() { try { return JSON.parse((A && A.loadText ? A.loadText(HIST) : localStorage.getItem('pz_' + HIST)) || '{}') || {}; } catch (e) { return {}; } }
  function histSave(H) { const t = JSON.stringify(H); try { if (A && A.saveText) A.saveText(HIST, t); else localStorage.setItem('pz_' + HIST, t); } catch (e) { /* brak miejsca */ } }
  /** Kopia rozpiski: najwyżej co 10 min (nowsza zastępuje ostatnią), 25 wersji na rozpiskę. */
  function snapshot(k, r, why) {
    if (!r || !r.dni) return;
    const H = histLoad(), l = H[k] = H[k] || [], now = Date.now(), js = JSON.stringify(r);
    if (l.length && l[0].r === js) return;
    const it = { t: now, r: js, why: why || '' };
    if (!why && l.length && !l[0].why && now - l[0].t < 600000) l[0] = it; else l.unshift(it);
    H[k] = l.slice(0, 25); histSave(H);
  }
  function histDialog() {
    const H = histLoad(), rows = [];
    Object.keys(H).forEach(k => (H[k] || []).forEach((it, i) => { let r = null; try { r = JSON.parse(it.r); } catch (e) { /* */ } if (r) rows.push({ k: k, i: i, t: it.t, why: it.why, r: r }); }));
    rows.sort((a, b) => b.t - a.t);
    modalState = { kind: 'rzhist' };
    openModal('Historia zmian rozpisek', rows.length ? '<div class="muted">Kopie zapisują się same (w tym telefonie). Dotknij „Przywróć”, żeby wrócić do wersji – obecna też trafi do historii.</div>' +
      rows.slice(0, 60).map(x => { const nb = x.r.dni.reduce((a, d) => a + d.bloki.length, 0), sd = startDate(x.r);
        return '<div class="row chk"><span class="grow"><b>' + esc(x.r.tytul || '') + '</b>' + (sd ? ' · ' + plDate(sd).slice(0, 5) : '') + '<br><span class="muted">' +
          new Date(x.t).toLocaleString('pl-PL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' · ' + x.r.dni.length + ' dn. · ' + nb + ' bloków' + (x.why ? ' · ' + esc(x.why) : '') + (S.rozpiski[x.k] ? '' : ' · <b>usunięta</b>') + '</span></span>' +
          '<button class="btn sm" data-act="rz-histok" data-a="' + x.i + '" data-b="' + esc(x.k) + '">Przywróć</button></div>'; }).join('')
      : '<div class="muted">Historia jest jeszcze pusta – zapisuje się od tej wersji przy każdej zmianie.</div>');
    modalState = { kind: 'rzhist' };
  }
  /** Łączenie rozpisek przy synchronizacji „Mojego konta” – każda rozpiska osobno, wygrywa nowsza; nic nie znika po cichu. */
  function merge(loc, rem, delL, delR) {
    loc = loc || {}; rem = rem || {};
    const del = Object.assign({}, delR || {}, delL || {}); Object.keys(delR || {}).forEach(k => { del[k] = Math.max(del[k] || 0, delR[k]); });
    const out = {}; let changed = false;
    Array.from(new Set(Object.keys(loc).concat(Object.keys(rem)))).forEach(k => {
      const a = loc[k], b = rem[k], ta = a ? (a.ts || 0) : -1, tb = b ? (b.ts || 0) : -1;
      const nbl = x => x && x.dni ? x.dni.reduce((q, d) => q + d.bloki.length, 0) : 0;
      let w = ta > tb ? a : tb > ta ? b : (nbl(b) > nbl(a) ? b : a);
      if (del[k] && del[k] >= Math.max(ta, tb)) { if (a) snapshot(k, a, 'usunięta na innym urządzeniu'); return; }
      if (a && b && w === b && rzHash(a) !== rzHash(b)) snapshot(k, a, 'przed synchronizacją');
      if (w === a && b !== undefined && (!b || rzHash(a) !== rzHash(b))) changed = true;
      if (w === a && !b) changed = true;
      out[k] = w;
    });
    return { rz: out, del: del, changed: changed };
  }

  /* ---------- odzyskiwanie z PDF wygenerowanego w aplikacji (Drukuj / PDF) ---------- */
  const LABELS = { wprowadza: 'kto2', czyta: 'kto', 'śpiewa': 'kto', prowadzi: 'kto', odpowiada: 'kto', przygotowuje: 'kto', didaskal: 'kto', kto: 'kto' };
  function guessType(t) {
    const x = String(t || '').toLowerCase().trim();
    if (x === 'śpiew na wyjście') return ['piesn', { euEnd: true }];
    const eu = EU_BL.find(y => y[0].toLowerCase() === x); if (eu) return [eu[1], eu[2] ? { rola: eu[2] } : {}];
    for (const k of Object.keys(TYPY)) if (TYPY[k].toLowerCase() === x) return [k, {}];
    if (POSILKI.some(m => m.toLowerCase() === x)) return ['pos', {}];
    if (x === 'przerwa') return ['przerwa', {}];
    if (/^ewangelia/.test(x)) return ['ewang', {}];
    if (/czytanie|epistoła/.test(x)) return ['czyt', {}];
    if (/^psalm|responsorium/.test(x)) return ['psalm', {}];
    if (/pieśń|śpiew|alleluja/.test(x)) return ['piesn', {}];
    if (/modlitwa wiernych/.test(x)) return ['mw', {}];
    if (/modlitwa ślepca/.test(x)) return ['slepiec', {}];
    if (/modlitwa/.test(x)) return ['modl', {}];
    if (/^wstęp/.test(x)) return ['wstep', {}];
    return ['inne', {}];
  }
  async function pdfLines(b64) {
    if (!window.pdfjsLib) { await loadScript('lib/pdf.worker.min.js'); await loadScript('lib/pdf.min.js'); }
    let bytes = b64;
    if (typeof b64 === 'string') { const bin = atob(b64); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
    const pdf = await pdfjsLib.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true }).promise;
    const lines = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const items = (await (await pdf.getPage(p)).getTextContent()).items.filter(it => it.str && it.str.trim());
      const rows = [];
      items.forEach(it => { const y = it.transform[5], x = it.transform[4]; let r = rows.find(q => Math.abs(q.y - y) < 3); if (!r) rows.push(r = { y: y, it: [] }); r.it.push({ x: x, s: it.str }); });
      rows.sort((a, b) => b.y - a.y).forEach(r => { r.it.sort((a, b) => a.x - b.x); lines.push(r.it); });
    }
    return lines;
  }
  function parsePlan(lines) {
    const txt = l => l.map(i => i.s).join(' ').replace(/\s+/g, ' ').trim();
    let hi = lines.findIndex(l => /Część/.test(txt(l)) && /Osoby/.test(txt(l)));
    if (hi < 0) throw new Error('to nie wygląda na rozpiskę z aplikacji');
    const H = lines[hi], xC = H.find(i => /Część/.test(i.s)).x, xO = H.find(i => /Osoby/.test(i.s)).x;
    const title = (lines.slice(0, hi).map(txt).find(t => /✝|^[A-ZŁŚŻŹĆŃÓĘĄ]/.test(t)) || 'Odzyskana rozpiska').replace(/^✝\s*/, '');
    const sub = lines.slice(0, hi).map(txt).join(' ');
    const yr = (sub.match(/\d{2}\.\d{2}\.(\d{4})/) || [])[1] || String(new Date().getFullYear());
    const r = { tytul: title, chrzest: /z chrztem/.test(sub), dni: [], ekipa: [] };
    let d = null, b = null;
    const hdr = txt(H);
    const isoOf = dm => { const m = dm.match(/(\d{2})\.(\d{2})/); return m ? yr + '-' + m[2] + '-' + m[1] : ''; };
    lines.slice(hi + 1).forEach(l => {
      const t = txt(l); if (!t || t === hdr) return;
      const md = t.match(/^Dzień\s+\d+(?:\s*[–-]\s*\S+\s+(\d{2}\.\d{2}))?/);
      if (md) { d = day(md[1] ? isoOf(md[1]) : '', []); r.dni.push(d); b = null; return; }
      const c0 = l.filter(i => i.x < xC - 4).map(i => i.s).join(' ').trim(), c1 = l.filter(i => i.x >= xC - 4 && i.x < xO - 4).map(i => i.s).join(' ').trim(),
        c2 = l.filter(i => i.x >= xO - 4).map(i => i.s).join(' ').trim();
      if (!d) { d = day('', []); r.dni.push(d); }
      if (c0) {
        const g = guessType(c1); b = Object.assign(blk(g[0], c1), g[1]); d.bloki.push(b); b._who = c2;
        const tm = c0.match(/(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?/);
        if (tm) { b.start = tm[1].padStart(5, '0'); if (tm[2]) { const dd = toMin(tm[2]) - toMin(tm[1]); if (dd > 0) b.czas = dd; } }
        return;
      }
      if (!b) return;
      if (c2) b._who += ' ' + c2;
      if (!c1) return;
      if (/^♪/.test(c1)) b.piesn = c1.replace(/^♪\s*/, '');
      else if (b.typ === 'wol') { b.wol = b.wol || {}; c1.split(/,\s*/).forEach(x => { if (x.trim()) b.wol[x.trim()] = true; }); }
      else if (!b.ref && isRead(b) && /\d/.test(c1) && c1.length < 40) b.ref = c1;
      else if (!b.ref && (b.typ === 'kat' || b.typ === 'mag') && !b.tekst) b.ref = c1;
      else b.tekst = (b.tekst ? b.tekst + ' ' : '') + c1;
    });
    r.dni.forEach(dd => dd.bloki.forEach(x => {
      const w = String(x._who || ''); delete x._who;
      const re = /(wprowadza|czyta|śpiewa|gra|prowadzi|odpowiada|przygotowuje|didaskal|kto):\s*/gi; let m, last = null;
      const parts = []; while ((m = re.exec(w))) { if (last) parts.push([last[1], w.slice(last.end, m.index).trim()]); last = { 1: m[1].toLowerCase(), end: re.lastIndex }; }
      if (last) parts.push([last[1], w.slice(last.end).trim()]);
      parts.forEach(([lab, who]) => {
        const f = lab === 'gra' ? 'gra' : isSong(x) || isRead(x) ? (lab === 'wprowadza' ? 'kto2' : 'kto') : 'kto';
        x[f] = who; if (!isRead(x) && !isSong(x) && lab !== (KTO[x.typ] || '').toLowerCase()) x.rola = lab.charAt(0).toUpperCase() + lab.slice(1);
        if (isSong(x) && lab === 'wprowadza') x.typ = 'piesnw';
        if (who && r.ekipa.indexOf(who) < 0) r.ekipa.push(who);
      });
      if (isRead(x) && x.kto && !x.kto2 && !/wprowadza/i.test(w)) x.bezWstepu = true;
    }));
    // godziny wyliczane (koniec poprzedniego bloku) zostawiamy puste – jak w oryginale
    r.dni.forEach(dd => { let end = null; dd.bloki.forEach((x, i) => {
      const st = x.start ? toMin(x.start) : null;
      if (i > 0 && st !== null && st === end) x.start = '';
      end = st !== null ? (x.czas ? st + x.czas : null) : (end !== null && x.czas ? end + x.czas : null);
    }); });
    if (!r.dni.length) r.dni.push(day('', []));
    return r;
  }
  async function importB64(b64) {
    const r = parsePlan(await pdfLines(b64));
    const t = r.tytul.toLowerCase(), kd = /wigilia paschalna|pascha/.test(t) ? 'pascha' : /pokutn/.test(t) ? 'pokutna' : /konwiwencj/.test(t) || r.dni.length > 1 ? 'konw' : 'niest';
    migrate(r);
    const k = kd + ':' + uuid().slice(0, 8), sd = startDate(r);
    if (sd && window.KAL) { const ev = KAL.alive().find(e => e.data === sd && (e.typ === KIND(kd)[3] || (kd === 'konw' && e.typ === 'kpr'))); if (ev) r.ev = ev.id; }
    r.ts = Date.now(); r._h = rzHash(r);
    S.rozpiski[k] = r; snapshot(k, r, 'odzyskana z PDF'); UI.rz = k; save(); go('rozpiska');
    const nb = r.dni.reduce((a, d2) => a + d2.bloki.length, 0);
    toast('Odzyskano „' + r.tytul + '”: ' + r.dni.length + ' dn., ' + nb + ' bloków. Sprawdź osoby i godziny.');
    return nb;
  }
  async function importPicked() {
    try { const b64 = A && A.pdfBytes ? await A.pdfBytes('rzimp') : A && A.pdfBase64 ? A.pdfBase64('rzimp') : ''; if (!b64 || !b64.length) throw new Error('nie można odczytać pliku'); await importB64(b64); }
    catch (e) { toast('Nie udało się odzyskać: ' + e.message); }
  }

  /* ---------- rozpiska dla ekipy: jedzie razem z wydarzeniem w kalendarzu (przez arkusz) ---------- */
  function codeHash(c, id) { const t = String(c) + '|' + id + '|trojnog'; let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) | 0; return String(h >>> 0); }
  const EMPTYB = { kto: '', kto2: '', piesn: '', tekst: '', start: '', ref: '' };
  /** Wersja do wysłania: bez pustych pól, bez kodu i znaczników urządzenia. */
  function pack(r, kind) {
    return { kind: kind, tytul: r.tytul, chrzest: !!r.chrzest, godz: r.godz || '', gdzie: r.gdzie || '', typEv: r.typEv || '', ekipa: (r.ekipa || []).slice(),
      dni: r.dni.map(d => ({ id: d.id, data: d.data, bloki: d.bloki.map(b => { const o = {}; Object.keys(b).forEach(x => { const v = b[x]; if (v === '' || v === 0 || v === false || v === null || v === undefined) return; o[x] = v; }); return o; }) })) };
  }
  function unpack(c) {
    const r = { tytul: c.tytul, chrzest: !!c.chrzest, godz: c.godz || '', gdzie: c.gdzie || '', typEv: c.typEv || '', ekipa: (c.ekipa || []).slice(),
      dni: (c.dni || []).map(d => ({ id: d.id || uuid(), data: d.data || '', bloki: (d.bloki || []).map(b => Object.assign({}, EMPTYB, { czas: 0, tytul: TYPY[b.typ] || '' }, b)) })) };
    if (!r.typEv) delete r.typEv;
    return migrate(r);
  }
  let kalT = null, bigWarn = false;
  function pushPlan(k, r) {
    if (!window.KAL || !r.ev || !Array.isArray(S.kal)) return;
    const e = S.kal.find(x => x.id === r.ev && !x.del); if (!e) return;
    const c = pack(r, kindOf(k));
    if (JSON.stringify(c).length > 45000) { if (!bigWarn) { bigWarn = true; toast('Rozpiska jest za duża, by wysłać ją ekipie przez arkusz.'); } return; }
    e.rzPlan = c; e.rzTs = r.ts || Date.now();
    if (!r.fromEv && r.kod) e.rzKey = codeHash(r.kod, e.id);
    e.ts = Date.now();
    clearTimeout(kalT); kalT = setTimeout(() => { if (window.KAL && KAL.syncKal) KAL.syncKal(false); }, 2500);
  }
  /** Z kalendarza: rozpiski od innych (ekipa) i nowsze wersje własnych (edytowane kodem przez ekipę). */
  function fromEvents() {
    if (!window.KAL) return false;
    ensure();
    let ch = false;
    KAL.alive().forEach(e => {
      if (!e.rzPlan) return;
      const k = Object.keys(S.rozpiski).find(x => S.rozpiski[x].ev === e.id);
      const loc = k ? S.rozpiski[k] : null;
      if (loc) {
        if ((e.rzTs || 0) <= (loc.ts || 0)) return;
        snapshot(k, loc, 'przed zmianą od ekipy');
        const nr = unpack(e.rzPlan); ['ev', 'kod', 'fromEv'].forEach(f => { if (loc[f] !== undefined) nr[f] = loc[f]; });
        nr.ts = e.rzTs; nr._h = rzHash(nr); S.rozpiski[k] = nr; ch = true; return;
      }
      if ((S.rzHide || {})[e.id] || !canSee(e)) return;
      const kind = e.rzPlan.kind || EV2KIND[e.typ] || 'niest', nk = kind + ':e' + e.id.slice(0, 8);
      const nr = unpack(e.rzPlan); nr.ev = e.id; nr.fromEv = true; nr.ts = e.rzTs || 0; nr._h = rzHash(nr);
      S.rozpiski[nk] = nr; ch = true;
    });
    return ch;
  }
  const locked = r => !!(r && r.fromEv && !(S.rzUnlock || {})[r.ev]);
  /** Karta pod ekipą: kod edycji (u przygotowującego) albo informacja dla ekipy. */
  function shareCard(r) {
    if (!r.ev) return '';
    if (r.fromEv) return '<div class="card"><h2>Rozpiska od ekipy</h2><div class="muted">Edytujesz kodem – zmiany zobaczą wszyscy z ekipy.</div><button class="btn text full mt" data-act="rz-lock">Zakończ edycję</button></div>';
    return '<div class="card"><h2>Dla ekipy</h2><div class="muted">Osoby z „Kto przygotowuje” widzą tę rozpiskę w kalendarzu (podgląd). Żeby mogły ją zmieniać, podaj im kod:</div>' +
      '<div class="row mt"><span class="grow kodbig">🔑 ' + esc(r.kod || '----') + '</span><button class="btn text" data-act="rz-kod">Nowy kod</button></div></div>';
  }
  /** Podgląd dla ekipy (bez edycji): Twoje zadania + cała rozpiska. */
  function roView(k, r) {
    const me = S.owner, mine = [];
    r.dni.forEach(d => d.bloki.forEach(b => { if (me && (b.kto === me || b.kto2 === me)) mine.push((d.data ? plDate(d.data).slice(0, 5) + ' · ' : '') + (b.start ? b.start + ' · ' : '') + b.tytul + (b.kto2 === me ? ' (wprowadzasz)' : '')); }));
    const doc = docHtml().replace('</style>', 'body{margin:0;padding:6px;}</style>');
    return '<div class="card"><h2>' + esc(r.tytul) + '</h2>' + (r.gdzie ? '<div>📍 ' + esc(r.gdzie) + '</div>' : '') +
      '<div class="muted">Podgląd rozpiski od osoby przygotowującej. Zmiany robi ona albo osoba z kodem edycji.</div>' +
      (mine.length ? '<div class="sec">Twoje zadania</div>' + mine.map(x => '<div class="mytask">• ' + esc(x) + '</div>').join('') : '') +
      '<div class="row mt"><button class="btn ghost grow" data-act="rz-unlock">🔒 Mam kod edycji</button><button class="btn ghost grow" data-act="rz-print">Drukuj / PDF</button></div></div>' +
      '<iframe class="rzro" srcdoc="' + esc(doc) + '" onload="this.style.height=(this.contentDocument.body.scrollHeight+24)+\'px\'"></iframe>';
  }
  /** Moje przygotowania: rozpiski z datą, w których jestem w ekipie albo mam przydział. */
  function mine() {
    ensure();
    const me = S.owner, out = [];
    if (!me) return out;
    Object.keys(S.rozpiski).forEach(k => {
      const r = S.rozpiski[k], sd = startDate(r); if (!sd) return;
      const roles = [];
      r.dni.forEach(d => d.bloki.forEach(b => { if (b.kto === me || b.kto2 === me) roles.push(b.tytul + (b.kto2 === me && b.kto !== me ? ' (wprowadzasz)' : '')); }));
      const inEk = (r.ekipa || []).indexOf(me) >= 0;
      if (!roles.length && !inEk) return;
      const dates = r.dni.map(d => d.data).filter(Boolean).sort();
      out.push({ k: k, tytul: r.tytul, od: dates[0], doD: dates[dates.length - 1], roles: roles, ekipa: inEk, gdzie: r.gdzie || '', kind: kindOf(k), done: !!r.done });
    });
    return out;
  }
  function openKey(k) { UI.rz = k; go('rozpiska'); }

  /** Archiwum przygotowań: rozpiski oznaczone „Odbyło się”. */
  function archived() {
    ensure();
    return Object.keys(S.rozpiski).filter(k => S.rozpiski[k].done).map(k => { const r = S.rozpiski[k], ds = r.dni.map(d => d.data).filter(Boolean).sort();
      return { k: k, tytul: r.tytul, od: ds[0] || '', doD: ds[ds.length - 1] || '', done: r.done, n: r.dni.reduce((a, d) => a + d.bloki.length, 0), kind: kindOf(k) }; })
      .sort((a, b) => (b.od || '').localeCompare(a.od || ''));
  }
  window.RZ = { archived: archived, fromEvents: fromEvents, mine: mine, openKey: openKey, KINDS: KINDS, stamp: stamp, merge: merge, snapshot: snapshot, importPicked: importPicked, importB64: importB64, docHtml: () => docHtml(), resp: resp, canSee: canSee, view: view, act: act, change: change, input: input, text: text, ensure: ensure, openForEvent: openForEvent, hasPlan: e => !!(e && (e.rz || EV2KIND[e.typ])) };
})();
