/* Trójnóg – tryb „na celebrację” (kolejne kroki liturgii na jednym ekranie) i dział Kantorzy (tonacje, wydruk). */
(function () {
  'use strict';
  const nrOf = lbl => { const m = String(lbl || '').match(/nr\s*(\d+)/); return m ? +m[1] : 0; };
  const songName = lbl => String(lbl || '').replace(/\s*—\s*nr\s*\d+\s*$/, '');
  const trOf = nr => (S.trSong || {})[nr] || 0;
  const keyName = n => n === 0 ? 'oryginał' : (n > 0 ? '+' : '−') + Math.abs(n);

  /* ---------- kroki celebracji ---------- */
  function stepsLS() {
    const c = S.celebration, who = i => c.who[i] || '', st = [];
    st.push({ t: 'Wstęp ogólny', w: who(0), r: c.readings[0] || '' });
    for (let i = 1; i <= 4; i++) {
      if (c.songs[i - 1]) st.push({ t: 'Pieśń – ' + SONG_LABELS[i - 1].toLowerCase(), s: c.songs[i - 1] });
      st.push({ t: (i === 4 ? 'Ewangelia' : 'Czytanie ' + i + ' – ' + READ_DESC[i].toLowerCase()), w: who(i), r: c.readings[i] || '' });
    }
    if (c.songs[4]) st.push({ t: 'Pieśń – ' + SONG_LABELS[4].toLowerCase(), s: c.songs[4] });
    st.push({ t: 'Homilia, modlitwa wiernych, Ojcze nasz' });
    if (c.songs[5]) st.push({ t: 'Pieśń – wyjście', s: c.songs[5] });
    return st;
  }
  function stepsEU() {
    const e = S.eucharystia, w = r => e.who[r] || '', st = [];
    st.push({ t: 'Wstęp ogólny', w: w('Wstęp ogólny') });
    if (e.songs[0]) st.push({ t: 'Pieśń na wejście', s: e.songs[0] });
    st.push({ t: 'Czytanie 1', w: w('Czytanie 1') }, { t: 'Czytanie 2', w: w('Czytanie 2') }, { t: 'Ewangelia', w: w('Ewangelia') });
    st.push({ t: 'Modlitwa wiernych', w: w('Modlitwa wiernych') });
    if (e.songs[1]) st.push({ t: 'Znak pokoju – przygotowanie darów', s: e.songs[1] });
    if (e.songs[2]) st.push({ t: 'Komunia', s: e.songs[2] });
    if (e.songs[3]) st.push({ t: 'Komunia (2)', s: e.songs[3] });
    if (e.songs[4]) st.push({ t: 'Pieśń na wyjście', s: e.songs[4] });
    return st;
  }
  let CM = null;
  function open(kind) {
    const st = kind === 'eu' ? stepsEU() : stepsLS();
    CM = { k: kind, i: 0, st: st };
    if (A && A.keepScreen) A.keepScreen(true);
    draw();
  }
  function close() {
    CM = null; const o = document.getElementById('celmode'); if (o) o.remove(); const bb = document.getElementById('cmBack'); if (bb) bb.remove();
    if (A && A.keepScreen) A.keepScreen(false);
  }
  function draw() {
    let o = document.getElementById('celmode');
    if (!o) { o = document.createElement('div'); o.id = 'celmode'; o.className = 'celmode'; document.body.appendChild(o); }
    const x = CM.st[CM.i], n = CM.st.length, nr = x.s ? nrOf(x.s) : 0;
    const body = x.s ? '<div class="cm-song">♪ ' + esc(songName(x.s)) + '</div>' + (nr ? '<div class="cm-sub">tonacja: ' + keyName(trOf(nr)) + '</div><button class="btn cm-b" data-act="cm-song" data-a="' + nr + '">🎼 Pokaż pieśń</button>' : '')
      : (x.r ? '<div class="cm-ref">' + esc(x.r) + '</div><button class="btn ghost cm-b" data-act="cm-read" data-a="' + esc(x.r) + '">📖 Tekst czytania</button>' : '');
    o.innerHTML = '<div class="cm-top"><span class="grow">' + (CM.k === 'eu' ? 'Eucharystia' : 'Liturgia Słowa' + (S.haslo ? ' · ' + esc(S.haslo) : '')) + ' · ' + (CM.i + 1) + '/' + n + '</span><button class="pvb" data-act="cm-close">✕</button></div>' +
      '<div class="cm-main" data-act="cm-tap"><div class="cm-t">' + esc(x.t) + '</div>' + (x.w ? '<div class="cm-w">' + esc(x.w) + '</div>' : '') + body +
      (CM.st[CM.i + 1] ? '<div class="cm-next">Dalej: ' + esc(CM.st[CM.i + 1].t) + (CM.st[CM.i + 1].w ? ' – ' + esc(CM.st[CM.i + 1].w) : '') + '</div>' : '<div class="cm-next">Koniec</div>') + '</div>' +
      '<div class="cm-nav"><button class="btn ghost" data-act="cm-go" data-a="-1"' + (CM.i ? '' : ' disabled') + '>◀</button><button class="btn" data-act="cm-go" data-a="1"' + (CM.i < n - 1 ? '' : ' disabled') + '>Dalej ▶</button></div>';
  }

  /* ---------- Kantorzy ---------- */
  function kList() {
    const out = [], seen = {};
    const add = (lbl, from) => { const nr = nrOf(lbl); if (!lbl || seen[lbl]) return; seen[lbl] = 1; out.push({ l: lbl, nr: nr, f: from }); };
    S.celebration.songs.forEach((x, i) => add(x, 'Słowo – ' + SONG_LABELS[i]));
    S.eucharystia.songs.forEach((x, i) => add(x, 'Eucharystia – ' + EU_SONGS[i]));
    (S.kantor || []).forEach(x => add(x, 'dodana'));
    return out;
  }
  function view() {
    const L = kList();
    let h = '<div class="card"><h2>Kantorzy</h2><div class="muted">Pieśni z przygotowania Liturgii Słowa i Eucharystii oraz dodane przez Ciebie. Suwak zmienia tonację (pół tonu na kreskę) – akordy podmieniają się w pieśni i na wydruku. Tonacja zapisuje się przy pieśni.</div></div>';
    if (!pdfPages('songbook')) h += '<div class="notice">Najpierw wskaż plik śpiewnika (Śpiewnik → Wskaż plik).</div>';
    h += '<div class="card">' + (L.length ? L.map(x => {
      const t = trOf(x.nr);
      return '<div class="kt"><div class="row"><span class="grow"><b>' + esc(songName(x.l)) + '</b><br><span class="muted">' + esc(x.f) + (x.nr ? ' · nr ' + x.nr : '') + '</span></span>' +
        (x.nr ? '<button class="icon" data-act="kt-view" data-a="' + x.nr + '" title="Podgląd">👁</button>' : '') + (x.nr && window.LIB && LIB.notesPage(x.nr) >= 0 ? '<button class="icon" data-act="notes" data-a="' + LIB.notesPage(x.nr) + '" title="Nuty">♫</button>' : '') + (x.f === 'dodana' ? '<button class="icon" data-act="kt-del" data-a="' + esc(x.l) + '" title="Usuń z listy">✕</button>' : '') + '</div>' +
        (x.nr ? '<div class="row kt-s"><span class="muted">♭</span><input type="range" class="grow" min="-6" max="5" step="1" value="' + t + '" data-ch="kt-tr" data-a="' + x.nr + '"><span class="muted">♯</span><b class="kt-v" id="ktv' + x.nr + '">' + keyName(t) + '</b></div>' : '') + '</div>';
    }).join('') : '<div class="muted">Brak pieśni – wybierz je w przygotowaniu albo dodaj niżej.</div>') +
      '<button class="btn ghost full mt" data-act="kt-add">＋ Dodaj pieśń</button>' +
      (L.length ? '<button class="btn full mt" data-act="kt-print">🖨 Drukuj wszystkie w swoich tonacjach</button>' + (S.kantor && S.kantor.length ? '<button class="btn text full" data-act="kt-clear">Wyczyść dodane</button>' : '') : '') + '</div>';
    return h;
  }
  async function printAll() {
    const L = kList().filter(x => x.nr);
    if (!L.length || !window.LIB) { toast('Brak pieśni ze śpiewnika.'); return; }
    toast('Przygotowuję wydruk ' + L.length + ' pieśni…');
    try {
      let body = '';
      for (const x of L) {
        const st = songPage(x.nr); let pages = [st];
        if (typeof SPMAP !== 'undefined' && SPMAP) { const nx = Object.keys(SPMAP).map(k => SPMAP[k]).filter(p => p > st).sort((a, b) => a - b)[0]; if (nx !== undefined) { pages = []; for (let p = st; p <= Math.min(nx - 1, st + 3); p++) pages.push(p); } }
        for (const p of pages) body += '<img src="' + await LIB.renderTr('songbook', p, trOf(x.nr), 1400) + '">';
      }
      const title = 'Pieśni – kantorzy';
      const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title><style>@page{margin:8mm}body{margin:0}img{width:100%;display:block;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>' + body + '</body></html>';
      if (A && A.printHtml) A.printHtml(html, title); else toast('Drukowanie dostępne w aplikacji.');
    } catch (e) { toast('Nie udało się przygotować wydruku.'); }
  }

  function act(a, v) {
    switch (a) {
      case 'cel-mode': open(v); return true;
      case 'cm-close': close(); return true;
      case 'cm-go': if (CM) { CM.i = Math.max(0, Math.min(CM.st.length - 1, CM.i + (+v))); draw(); } return true;
      case 'cm-tap': return true;
      case 'cm-song': case 'kt-view': openSongView(+v, 0); return true;
      case 'cm-read': { const o = document.getElementById('celmode'); if (o) o.classList.add('away');
        if (!document.getElementById('cmBack')) document.body.insertAdjacentHTML('beforeend', '<button id="cmBack" class="cm-backbtn" data-act="cm-back">↩ Celebracja</button>');
        openBible(v); return true; }
      case 'cm-back': { const o = document.getElementById('celmode'), b = document.getElementById('cmBack'); if (o) o.classList.remove('away'); if (b) b.remove(); return true; }
      case 'kt-add': openSongPicker('', lbl => { S.kantor = (S.kantor || []).concat(lbl); save(true); closeModal(); render(); }); return true;
      case 'kt-del': S.kantor = (S.kantor || []).filter(x => x !== v); save(true); render(); return true;
      case 'kt-clear': S.kantor = []; save(true); render(); return true;
      case 'kt-print': printAll(); return true;
    }
    return false;
  }
  function change(ch, v, el) {
    if (ch !== 'kt-tr') return false;
    S.trSong = S.trSong || {}; const n = +el.value; if (n) S.trSong[v] = n; else delete S.trSong[v]; save(true);
    const b = document.getElementById('ktv' + v); if (b) b.textContent = keyName(n);
    return true;
  }
  document.addEventListener('input', e => { const el = e.target; if (el && el.dataset && el.dataset.ch === 'kt-tr') { const b = document.getElementById('ktv' + el.dataset.a); if (b) b.textContent = keyName(+el.value); } });
  window.CEL = { open: open, close: close, view: view, act: act, change: change, active: () => !!CM };
})();
