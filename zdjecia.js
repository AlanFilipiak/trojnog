/* Przygotowanie – zdjęcia: aparat / galeria, album w aplikacji (pliki w Obrazy/Przygotowanie), przypisanie do wydarzenia. */
(function () {
  'use strict';
  function ensure() { if (!Array.isArray(S.zdjecia)) S.zdjecia = []; }
  ensure();
  const src = (u, w) => photoUrl(u, w);
  let pendingEv = null;

  window.onPhoto = function (uri) {
    ensure();
    if (S.zdjecia.some(z => z.uri === uri)) return;
    S.zdjecia.unshift({ id: uuid(), uri: uri, ts: Date.now(), opis: '', ev: pendingEv || '' });
    save();
    toast(pendingEv ? 'Zdjęcie dodane do wydarzenia.' : 'Zdjęcie dodane do albumu.');
    if (UI.view === 'zdjecia' || UI.view === 'kalendarz') render();
  };
  function take(ev) { pendingEv = ev || null; if (A && A.takePhoto) A.takePhoto(); else toast('Dostępne w aplikacji na telefonie.'); }
  function pick(ev) { pendingEv = ev || null; if (A && A.pickPhotos) A.pickPhotos(); else toast('Dostępne w aplikacji na telefonie.'); }

  function evLabel(id) {
    const e = (S.kal || []).find(x => x.id === id && !x.del);
    if (!e) return '';
    const t = { eu: 'Eucharystia', ls: 'Liturgia Słowa', lp: 'Liturgia pokutna', kon: 'Konwiwencja', pascha: 'Pascha', kpr: 'Konwiwencja początku roku', gk: 'Głoszenie katechez', kat: 'Katecheza', skat: 'Spotkanie z katechistami' }[e.typ] || 'Przygotowanie';
    return t + ' ' + plDate(e.data);
  }
  function thumbs(list, w) {
    return '<div class="phgrid">' + list.map(z => '<button class="ph" data-act="ph-open" data-a="' + z.id + '"><img loading="lazy" src="' + src(z.uri, w || 360) + '" alt=""></button>').join('') + '</div>';
  }

  function view() {
    ensure();
    UI.phF = UI.phF || 'all';
    let list = S.zdjecia;
    if (UI.phF === 'ev') list = list.filter(z => z.ev);
    let h = '<div class="card"><h2>Zdjęcia</h2><div class="row"><button class="btn grow" data-act="ph-take">📷 Zrób zdjęcie</button><button class="btn ghost grow" data-act="ph-pick">🖼 Z galerii</button></div>' +
      '<div class="muted mt">Zdjęcia z aparatu zapisują się w telefonie w folderze <b>Obrazy / Przygotowanie</b> (widać je też w Galerii). Zostają w tym urządzeniu – nie wysyłają się do arkusza.</div></div>';
    h += '<div class="chips">' + [['all', 'Wszystkie (' + S.zdjecia.length + ')'], ['ev', 'Przy wydarzeniach']].map(x =>
      '<button class="chip' + (UI.phF === x[0] ? ' on' : '') + '" data-act="ph-f" data-a="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    if (!list.length) return h + '<div class="empty-info">Brak zdjęć.</div>';
    // grupowanie po miesiącach
    const by = {};
    list.forEach(z => { const d = new Date(z.ts), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); (by[k] = by[k] || []).push(z); });
    const MON = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
    Object.keys(by).sort().reverse().forEach(k => {
      h += '<div class="sec">' + MON[+k.slice(5) - 1] + ' ' + k.slice(0, 4) + '</div>' + thumbs(by[k]);
    });
    return h;
  }

  function photoDialog(z) {
    modalState = { kind: 'ph', id: z.id };
    const evs = (S.kal || []).filter(e => !e.del).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 60);
    openModal('Zdjęcie', '<img class="phbig" src="' + src(z.uri, 1200) + '" alt="" data-act="ph-full">' +
      '<div class="muted">' + new Date(z.ts).toLocaleString('pl-PL') + '</div>' +
      '<label class="lbl">Opis</label><input type="text" id="phOpis" value="' + esc(z.opis || '') + '" placeholder="np. agapa po Eucharystii">' +
      '<label class="lbl">Wydarzenie</label><select id="phEv"><option value="">— bez wydarzenia —</option>' + evs.map(e =>
        '<option value="' + e.id + '"' + (z.ev === e.id ? ' selected' : '') + '>' + esc(evLabel(e.id)) + (e.gdzie ? ' · ' + esc(e.gdzie) : '') + '</option>').join('') + '</select>' +
      '<div class="row mt"><button class="btn ghost grow" data-act="ph-gal">Otwórz w galerii</button><button class="btn ghost grow" data-act="ph-share">Udostępnij</button></div>',
      '<button class="btn text" data-act="ph-del">Usuń z albumu</button><button class="btn" data-act="ph-ok">Zapisz</button>');
  }

  /** Miniatury na karcie wydarzenia w kalendarzu. */
  function forEvent(id) {
    ensure();
    const l = S.zdjecia.filter(z => z.ev === id);
    return l.length ? '<div class="phrow">' + l.slice(0, 6).map(z => '<img loading="lazy" src="' + src(z.uri, 200) + '" data-act="ph-open" data-a="' + z.id + '" alt="">').join('') + '</div>' : '';
  }

  function act(a, v, el) {
    const m = modalState;
    switch (a) {
      case 'ph-take': take(v); return true;
      case 'ph-pick': pick(v); return true;
      case 'ph-f': UI.phF = v; render(); return true;
      case 'ph-open': { const z = S.zdjecia.find(x => x.id === v); if (z) photoDialog(z); return true; }
      case 'ph-full': case 'ph-gal': { const z = S.zdjecia.find(x => x.id === m.id); if (z && A && A.openPhoto) A.openPhoto(z.uri); return true; }
      case 'ph-share': { const z = S.zdjecia.find(x => x.id === m.id); if (z && A && A.sharePhoto) A.sharePhoto(z.uri); return true; }
      case 'ph-ok': {
        const z = S.zdjecia.find(x => x.id === m.id);
        if (z) { z.opis = document.getElementById('phOpis').value.trim(); z.ev = document.getElementById('phEv').value; }
        closeModal(); save(); render(); return true;
      }
      case 'ph-del':
        closeModal();
        confirmBox('Usunąć z albumu?', 'Zdjęcie zniknie z aplikacji, ale zostanie w Galerii telefonu.', 'Usuń', () => {
          S.zdjecia = S.zdjecia.filter(x => x.id !== m.id); save(); render();
        });
        return true;
    }
    return false;
  }

  window.ZDJ = { view: view, act: act, forEvent: forEvent, ensure: ensure };
})();
