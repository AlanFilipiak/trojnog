/* Przygotowanie – katechezy: mapa głoszeń (miejscowości z kalendarza), najbliższe katechezy, zaproszenie SMS / WhatsApp. */
(function () {
  'use strict';
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const DEF_TPL = 'Pokój! Serdecznie zapraszam Cię na katechezy dla dorosłych{gdzie}{kiedy}.{start} To spotkania o tym, kim jest Jezus Chrystus i co może zmienić w Twoim życiu. Wstęp wolny, nie trzeba się zapisywać.';

  function list() {
    const td = iso(new Date());
    return KAL.alive().filter(e => (e.typ === 'gk' || e.typ === 'kat') && (e.dataDo || e.data) >= td)
      .map(e => ({ e: e, next: KAL.nextOcc(e, td) })).filter(x => x.next)
      .sort((a, b) => (a.next + (a.e.godz || '')).localeCompare(b.next + (b.e.godz || '')));
  }
  function when(e) {
    if (KAL.isCyclic(e)) {
      const PL = ['poniedziałki', 'wtorki', 'środy', 'czwartki', 'piątki', 'soboty', 'niedziele'];
      const names = e.dni.slice().sort().map(x => PL[x - 1]);
      const joined = names.length > 1 ? names.slice(0, -1).join(', ') + ' i ' + names[names.length - 1] : names[0];
      return ' – ' + (names[0] === 'wtorki' ? 'we ' : 'w ') + joined + (e.godz ? ' o ' + e.godz : '');
    }
    return ' – ' + plDate(e.data) + (e.godz ? ' o ' + e.godz : '');
  }
  function inviteText(e) {
    const tpl = S.zapTpl || DEF_TPL;
    const gdzie = [e.gdzie, e.miasto].filter(Boolean).join(', ') + (e.adres ? ' (' + e.adres + ')' : '');
    return tpl.replace('{gdzie}', gdzie ? ' – ' + gdzie : '').replace('{kiedy}', when(e))
      .replace('{start}', KAL.isCyclic(e) ? ' Pierwsza katecheza: ' + plDate(e.data) + '.' : '');
  }

  /* ---- mapa (Leaflet + OpenStreetMap), współrzędne miejscowości z Nominatim, zapamiętywane ---- */
  let map = null, layer = null;
  function geoKey(e) { return [e.adres, e.miasto].filter(Boolean).join(', ') || e.miasto || ''; }
  function geocode(q, cb) {
    S.geo = S.geo || {};
    if (S.geo[q]) { cb(S.geo[q]); return; }
    httpGet('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pl&q=' + encodeURIComponent(q), (ok, t) => {
      let r = null; try { r = JSON.parse(t); } catch (er) { r = null; }
      if (ok && r && r[0]) { S.geo[q] = [+r[0].lat, +r[0].lon]; save(true); cb(S.geo[q]); } else cb(null);
    });
  }
  async function drawMap() {
    const box = document.getElementById('kmap');
    if (!box) return;
    if (!window.L) {
      if (!document.getElementById('lfcss')) { const l = document.createElement('link'); l.id = 'lfcss'; l.rel = 'stylesheet'; l.href = 'lib/leaflet/leaflet.css'; document.head.appendChild(l); }
      try { await loadScript('lib/leaflet/leaflet.js'); } catch (er) { box.textContent = 'Mapa niedostępna.'; return; }
    }
    if (map) { try { map.remove(); } catch (er) { /* stara mapa */ } }
    const myMap = map = L.map(box, { zoomControl: true, attributionControl: true }).setView([53.9, 21.5], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenStreetMap' }).addTo(map);
    const myLayer = layer = L.layerGroup().addTo(map);
    const pts = [];
    const byPlace = {};
    list().forEach(x => { const q = geoKey(x.e); if (q) (byPlace[q] = byPlace[q] || []).push(x); });
    const keys = Object.keys(byPlace);
    if (!keys.length) { document.getElementById('kmapMsg').textContent = 'Dodaj głoszenie z miejscowością – pojawi się na mapie.'; return; }
    let left = keys.length;
    keys.forEach(q => geocode(q, ll => {
      if (myMap !== map) return;   // w międzyczasie narysowano nową mapę
      if (ll) {
        const xs = byPlace[q];
        const html = xs.map(x => '<b>' + esc(x.e.miasto || q) + '</b><br>' + esc(x.e.gdzie || '') + '<br>' + esc(KAL.timeText(x.e)) + '<br>najbliższa: ' + plDate(x.next)).join('<hr>');
        L.marker(ll).addTo(myLayer).bindPopup(html);
        pts.push(ll);
      }
      if (--left === 0) {
        if (pts.length === 1) map.setView(pts[0], 11);
        else if (pts.length) map.fitBounds(pts, { padding: [30, 30] });
        const miss = keys.length - pts.length;
        if (miss) document.getElementById('kmapMsg').textContent = 'Nie znaleziono na mapie: ' + miss + ' miejsc(a) – sprawdź nazwę miejscowości.';
      }
    }));
  }

  function view() {
    const items = list();
    setTimeout(drawMap, 0);
    let h = '<div class="card"><h2>Mapa głoszeń</h2><div id="kmap" class="kmap"></div><div class="muted mt" id="kmapMsg">Mapę przesuwasz palcem, przybliżasz dwoma palcami; trójkąt ją zwija.</div></div>' +
      '<div class="card"><h2>Głoszenie katechez</h2><button class="btn full" data-act="kt-add">＋ Dodaj głoszenie katechez</button>' +
      '<div class="muted mt">Głoszenia dodane przez innych (z ich miejscowościami) pojawiają się tu po synchronizacji kalendarza.</div></div>';
    h += '<div class="card"><h2>Najbliższe katechezy</h2>' + (items.length ? items.map(x => {
      const e = x.e;
      return '<div class="kat"><div class="row"><span class="kdate">' + plDate(x.next).slice(0, 5) + '</span><div class="grow"><b>' + esc(e.miasto || e.gdzie || 'Katechezy') + '</b>' +
        (e.godz ? ' · ' + e.godz : '') + '<div class="muted">' + esc([e.gdzie, e.adres].filter(Boolean).join(', ')) + (KAL.isCyclic(e) ? ' · ' + esc(KAL.timeText(e)) : '') + '</div></div></div>' +
        '<div class="row mt"><button class="btn sm grow" data-act="kt-inv" data-a="' + e.id + '">✉ Zaproś kogoś</button>' +
        (geoKey(e) ? '<button class="btn sm ghost" data-act="kt-geo" data-a="' + e.id + '">🗺</button>' : '') +
        '<button class="btn sm ghost" data-act="kal-edit" data-a="' + e.id + '">Edytuj</button></div></div>';
    }).join('') : '<div class="muted">Brak zaplanowanych katechez.</div>') + '</div>';
    return h;
  }

  function inviteDialog(e) {
    modalState = { kind: 'kinv', id: e.id };
    openModal('Zaproszenie na katechezy', '<div class="muted">Dla osoby spoza Drogi – możesz poprawić treść.</div>' +
      '<textarea id="kinvText" rows="7">' + esc(inviteText(e)) + '</textarea>' +
      '<label class="row mt"><input type="checkbox" id="kinvSave"><span class="grow">Zapamiętaj jako mój szablon</span></label>' +
      '<div class="row mt"><input type="tel" id="kinvTel" class="grow" placeholder="Numer (puste = wybierzesz w SMS)"><button class="btn ghost" data-act="contact" data-a="kinv">📇</button></div>',
      '<button class="btn ghost" data-act="kt-inv-wa">W</button><button class="btn ghost" data-act="kt-inv-share">⇪</button><button class="btn" data-act="kt-inv-sms">✉ SMS</button>');
  }
  function grabInvite() {
    const t = document.getElementById('kinvText').value, sv = document.getElementById('kinvSave').checked;
    if (sv) {   // zapisz jako szablon: konkretne dane wydarzenia zamień z powrotem na znaczniki
      const e = KAL.alive().find(x => x.id === modalState.id);
      let tpl = t;
      if (e) {
        const gdzie = [e.gdzie, e.miasto].filter(Boolean).join(', ') + (e.adres ? ' (' + e.adres + ')' : '');
        if (gdzie) tpl = tpl.replace(' – ' + gdzie, '{gdzie}');
        tpl = tpl.replace(when(e), '{kiedy}');
        if (KAL.isCyclic(e)) tpl = tpl.replace(' Pierwsza katecheza: ' + plDate(e.data) + '.', '{start}');
      }
      S.zapTpl = tpl; save(true);
    }
    return { text: t, tel: document.getElementById('kinvTel').value.trim() };
  }

  function act(a, v, el) {
    switch (a) {
      case 'kt-add': KAL.eventDialog(null, iso(new Date()), 'gk'); return true;
      case 'kt-inv': { const e = KAL.alive().find(x => x.id === v); if (e) inviteDialog(e); return true; }
      case 'kt-geo': { const e = KAL.alive().find(x => x.id === v); if (e) openUrl('geo:0,0?q=' + encodeURIComponent(geoKey(e))); return true; }
      case 'kt-inv-sms': { const g = grabInvite(); openUrl(smsUrl(g.tel ? [g.tel.replace(/\s/g, '')] : [], g.text)); return true; }
      case 'kt-inv-wa': { const g = grabInvite(); openUrl((g.tel ? 'https://wa.me/' + phoneDigits(g.tel) : 'https://wa.me/') + '?text=' + encodeURIComponent(g.text)); return true; }
      case 'kt-inv-share': { const g = grabInvite(); if (A) A.share(g.text); return true; }
    }
    return false;
  }
  window.KAT = { view: view, act: act };
})();
