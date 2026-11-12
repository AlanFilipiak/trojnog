/* Przygotowanie – wygląd: powitanie dnia, własna ikona (logo + skrót na ekranie), zdjęcie w tle za mgłą, ramka do kadrowania. */
(function () {
  'use strict';
  const isoNow = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const load = n => { try { return A && A.loadText ? A.loadText(n) || '' : localStorage.getItem('pz_' + n) || ''; } catch (e) { return ''; } };
  const store = (n, t) => { try { if (A && A.saveText) A.saveText(n, t); else localStorage.setItem('pz_' + n, t); } catch (e) { /* brak miejsca */ } };
  const photoSrc = u => /^content:/.test(u) ? 'https://app.przygotowanie/photo?w=1600&u=' + encodeURIComponent(u) : u;

  /* ---------- powitanie przy pierwszym otwarciu w danym dniu ---------- */
  function hello() {
    if (S.lastHello === isoNow()) return false;
    S.lastHello = isoNow(); save(true);
    modalState = { kind: 'hello' };
    openModal(isOktawa() ? 'Chrystus zmartwychwstał!' : 'Pokój Tobie!',
      '<div class="hello-pop"><img src="' + esc(logoSrc()) + '" alt="" class="hp-logo">' +
      '<p>Ta aplikacja to tylko narzędzie. Nie zastąpi spotkania z drugim człowiekiem.</p>' +
      '<p>Zadzwoń do kogoś, umów się na rozmowę. Usłysz jego głos, spójrz mu w oczy.</p>' +
      '<p><b>Troszcz się o relacje.</b></p></div>',
      '<button class="btn" data-act="hello-ok">Amen, idę dalej</button>');
    const f = document.querySelector('#modal .sh-f [data-act=close]'); if (f) f.remove();
    return true;
  }

  /* ---------- logo / ikona ---------- */
  let LOGO = load('logo.dat'), BG = load('bg.dat');
  function logoSrc() { return LOGO || 'witraz.png'; }
  function applyLogo() {
    document.querySelectorAll('img.logo, img.locklogo').forEach(i => { i.src = logoSrc(); });
  }
  function applyBg() {
    let el = document.getElementById('bgimg');
    if (!BG) { if (el) el.remove(); document.body.classList.remove('hasbg'); return; }
    if (!el) { el = document.createElement('div'); el.id = 'bgimg'; document.body.prepend(el); }
    el.style.backgroundImage = 'url("' + BG + '")';
    document.documentElement.style.setProperty('--bgfog', String(1 - (S.bgVis === undefined ? 0.16 : S.bgVis)));
    document.body.classList.add('hasbg');
  }

  /* ---------- ramka do kadrowania (przesuwanie palcem, powiększanie dwoma palcami, środkowanie) ---------- */
  let CR = null;
  function cropper(uri, kind) {
    const round = kind === 'logo';
    CR = { kind: kind, s: 1, x: 0, y: 0, img: null };
    modalState = { kind: 'crop' };
    openModal(round ? 'Ikona – ustaw kadr' : 'Tło – ustaw kadr',
      '<div class="crop' + (round ? ' round' : '') + '" id="cropBox"><img id="cropImg" alt="" draggable="false"></div>' +
      '<input type="range" id="cropZoom" min="1" max="4" step="0.01" value="1" aria-label="Powiększenie">' +
      '<div class="muted">Przesuń palcem, powiększ suwakiem lub dwoma palcami.</div>',
      '<button class="btn ghost" data-act="crop-center">Wyśrodkuj</button><button class="btn" data-act="crop-ok">Zapisz</button>');
    const img = document.getElementById('cropImg');
    img.onload = () => { CR.img = img; fit(); };
    img.onerror = () => toast('Nie udało się wczytać zdjęcia.');
    img.src = photoSrc(uri);
    const box = document.getElementById('cropBox');
    let t0 = null;
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    box.addEventListener('touchstart', e => {
      if (!CR) return;
      if (e.touches.length === 2) t0 = { d: dist(e.touches[0], e.touches[1]), s: CR.s };
      else t0 = { cx: e.touches[0].clientX, cy: e.touches[0].clientY, x: CR.x, y: CR.y };
    }, { passive: true });
    box.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!CR) return;
      if (t0 && t0.d && e.touches.length === 2) CR.s = Math.max(1, Math.min(4, t0.s * dist(e.touches[0], e.touches[1]) / t0.d));
      else if (t0 && t0.cx !== undefined) { CR.x = t0.x + e.touches[0].clientX - t0.cx; CR.y = t0.y + e.touches[0].clientY - t0.cy; }
      apply();
    }, { passive: false });
    let md = null;   // mysz (podgląd w przeglądarce)
    box.addEventListener('mousedown', e => { md = { cx: e.clientX, cy: e.clientY, x: CR.x, y: CR.y }; });
    window.addEventListener('mouseup', () => { md = null; });
    box.addEventListener('mousemove', e => { if (md && CR) { CR.x = md.x + e.clientX - md.cx; CR.y = md.y + e.clientY - md.cy; apply(); } });
    document.getElementById('cropZoom').addEventListener('input', e => { if (CR) { CR.s = +e.target.value; apply(); } });
  }
  /** Bazowa skala: obraz pokrywa całą ramkę. */
  function base() {
    const box = document.getElementById('cropBox'), i = CR.img;
    return Math.max(box.clientWidth / i.naturalWidth, box.clientHeight / i.naturalHeight);
  }
  function clamp() {
    const box = document.getElementById('cropBox'), i = CR.img, k = base() * CR.s;
    const mx = Math.max(0, (i.naturalWidth * k - box.clientWidth) / 2), my = Math.max(0, (i.naturalHeight * k - box.clientHeight) / 2);
    CR.x = Math.max(-mx, Math.min(mx, CR.x)); CR.y = Math.max(-my, Math.min(my, CR.y));
  }
  function apply() {
    if (!CR || !CR.img) return;
    clamp();
    const box = document.getElementById('cropBox'), i = CR.img, k = base() * CR.s;
    i.style.width = i.naturalWidth * k + 'px'; i.style.height = i.naturalHeight * k + 'px';
    i.style.left = (box.clientWidth - i.naturalWidth * k) / 2 + CR.x + 'px';
    i.style.top = (box.clientHeight - i.naturalHeight * k) / 2 + CR.y + 'px';
    const z = document.getElementById('cropZoom'); if (z && +z.value !== CR.s) z.value = CR.s;
  }
  function fit() { CR.s = 1; CR.x = 0; CR.y = 0; apply(); }
  /** Wycina widoczny fragment ramki do obrazu o zadanej wielkości. */
  function cropRender() {
    if (!CR || !CR.img) throw new Error('brak');
    const box = document.getElementById('cropBox'), i = CR.img, k = base() * CR.s;
    const W = CR.kind === 'logo' ? 512 : 1080, H = CR.kind === 'logo' ? 512 : Math.round(1080 * box.clientHeight / box.clientWidth);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), f = W / box.clientWidth;
    const left = (box.clientWidth - i.naturalWidth * k) / 2 + CR.x, top = (box.clientHeight - i.naturalHeight * k) / 2 + CR.y;
    if (CR.kind === 'logo') { g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.clip(); }
    g.drawImage(i, left * f, top * f, i.naturalWidth * k * f, i.naturalHeight * k * f);
    return CR.kind === 'logo' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82);
  }

  window.onImagePicked = function (target, uri) { cropper(uri, target); };

  /* ---------- karta w Ustawieniach ---------- */
  function card() {
    const vis = S.bgVis === undefined ? 0.16 : S.bgVis;
    return '<div class="card"><h2>Logo i tło</h2>' +
      '<div class="row"><img src="' + esc(logoSrc()) + '" alt="" class="wy-logo"><div class="grow"><b>Ikona</b><div class="muted">W nagłówku aplikacji i na skrócie na ekranie głównym.</div></div></div>' +
      '<div class="row mt"><button class="btn ghost grow" data-act="wy-logo">Wybierz zdjęcie</button>' + (LOGO ? '<button class="btn text" data-act="wy-logo-del">Domyślna</button>' : '') + '</div>' +
      '<button class="btn ghost full mt" data-act="wy-pin">＋ Dodaj skrót z tą ikoną na ekran główny</button>' +
      '<div class="sec">Zdjęcie w tle</div>' +
      (BG ? '<div class="wy-bg" style="background-image:url(&quot;' + BG + '&quot;)"></div>' : '<div class="muted">Brak – tło jednolite.</div>') +
      '<div class="row mt"><button class="btn ghost grow" data-act="wy-bg">Wybierz zdjęcie</button>' + (BG ? '<button class="btn text" data-act="wy-bg-del">Usuń</button>' : '') + '</div>' +
      (BG ? '<label class="lbl">Widoczność tła (mgła)</label><input type="range" min="0.05" max="0.35" step="0.01" value="' + vis + '" data-ch="wy-vis">' : '') +
      '<div class="muted mt">Tło jest mocno przymglone – w trybie jasnym i ciemnym tekst zostaje czytelny.</div></div>';
  }

  function act(a, v, el) {
    switch (a) {
      case 'hello-ok': closeModal(); if (typeof showNewsOnce === 'function') setTimeout(showNewsOnce, 200); return true;
      case 'wy-logo': case 'wy-bg':
        if (A && A.pickImage) A.pickImage(a === 'wy-logo' ? 'logo' : 'bg'); else toast('Dostępne w aplikacji na telefonie.');
        return true;
      case 'crop-center': if (CR && CR.img) fit(); return true;
      case 'crop-ok': {
        if (!CR || !CR.img) return true;
        let data;
        try { data = cropRender(); } catch (e) { toast('Nie udało się przyciąć zdjęcia.'); return true; }
        if (CR.kind === 'logo') { LOGO = data; store('logo.dat', data); applyLogo(); }
        else { BG = data; store('bg.dat', data); applyBg(); }
        CR = null; closeModal(); render2(); toast('Zapisano.');
        return true;
      }
      case 'wy-logo-del': LOGO = ''; store('logo.dat', ''); applyLogo(); render2(); return true;
      case 'wy-bg-del': BG = ''; store('bg.dat', ''); applyBg(); render2(); return true;
      case 'wy-pin': {
        if (!A || !A.pinShortcut) { toast('Dostępne w aplikacji na telefonie.'); return true; }
        const make = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.src = src; });
        make(logoSrc()).then(im => {
          const c = document.createElement('canvas'); c.width = c.height = 192;
          const g = c.getContext('2d'); g.beginPath(); g.arc(96, 96, 96, 0, Math.PI * 2); g.clip();
          const k = Math.max(192 / im.naturalWidth, 192 / im.naturalHeight);
          g.drawImage(im, (192 - im.naturalWidth * k) / 2, (192 - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
          const ok = A.pinShortcut(c.toDataURL('image/png').split(',')[1], 'Trójnóg');
          toast(ok ? 'Potwierdź dodanie skrótu na ekranie.' : 'Ten telefon nie pozwala dodać skrótu.');
        });
        return true;
      }
    }
    return false;
  }
  function render2() { if (UI.view === 'wiecej') render(); }
  function change(ch, v, el) {
    if (ch === 'wy-vis') { S.bgVis = +el.value; save(true); applyBg(); return true; }
    return false;
  }

  window.WYG = { card: card, act: act, change: change, hello: hello, applyLogo: applyLogo, applyBg: applyBg };
  applyLogo(); applyBg();
  setTimeout(() => { if (!hello() && typeof showNewsOnce === 'function') showNewsOnce(); }, 600);
})();
