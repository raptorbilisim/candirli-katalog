/* Çandırlı Branda — çevrilebilir katalog görüntüleyici (StPageFlip üzerinde) */
(function () {
  'use strict';

  var veri = JSON.parse(document.getElementById('katalog-veri').textContent);
  var N = veri.sayfalar.length;
  var ORAN = veri.en / veri.boy;
  var $ = function (s) { return document.querySelector(s); };

  var sahne = $('#sahne'), kitap = $('#kitap'), sayac = $('#sayac'), ipucu = $('#ipucu');
  var dGeri = $('#d-geri'), dIleri = $('#d-ileri'), dKucuk = $('#d-kucuk'), dZoom = $('#d-zoom'), dTam = $('#d-tam');
  var okGeri = $('.ok-geri'), okIleri = $('.ok-ileri');
  var dlgKucuk = $('#kucukler'), izgara = $('#izgara');
  var dlgZoom = $('#zoom'), zKaydir = $('#zoom-kaydir'), zIcerik = $('#zoom-icerik'), zEtiket = $('#zoom-etiket');

  document.documentElement.style.setProperty('--oran', veri.en + ' / ' + veri.boy);

  function iki(n) { return (n < 10 ? '0' : '') + n; }
  function adres(i, kucuk) { return (kucuk ? 'kucuk/' : 'sayfalar/') + 's' + iki(i + 1) + '.jpg?v=' + veri.surum; }
  function etiket(i) { var b = veri.sayfalar[i].b; return 'Sayfa ' + (i + 1) + (b ? ' — ' + b : ''); }
  function sinirla(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- sayfa öğeleri + tembel yükleme ---------- */
  var sayfalar = veri.sayfalar.map(function (s, i) {
    var el = document.createElement('div');
    el.className = 'sayfa ' + (i % 2 ? 'sol' : 'sag') + (i === 0 || i === N - 1 ? ' uc' : '');
    el.setAttribute('data-density', i === 0 || i === N - 1 ? 'hard' : 'soft');
    var lq = document.createElement('div');
    lq.className = 'lq';
    lq.style.backgroundImage = 'url(' + s.lq + ')';
    var img = document.createElement('img');
    img.alt = etiket(i);
    img.width = veri.en; img.height = veri.boy;
    img.decoding = 'async'; img.draggable = false;
    el.appendChild(lq); el.appendChild(img);
    return { el: el, img: img, lq: lq, istendi: false };
  });

  function yukle(i, oncelik) {
    if (i < 0 || i >= N) return;
    var s = sayfalar[i];
    if (s.istendi) return;
    s.istendi = true;
    s.img.addEventListener('load', function () {
      s.bitti = true;
      s.el.classList.add('hazir');
      setTimeout(function () { if (s.lq.parentNode) s.lq.remove(); }, 450);
    }, { once: true });
    s.img.addEventListener('error', function () { s.bitti = true; }, { once: true });
    if (oncelik) s.img.fetchPriority = oncelik;
    s.img.src = adres(i);
  }
  /* önce görünen sayfa(lar), onlar gelince (en geç 1,5 sn) komşu açılımlar */
  function cevreyiYukle(i) {
    var g = gorunen(i), bitti = false;
    g.forEach(function (k) { yukle(k, 'high'); });
    function komsular() {
      if (bitti) return;
      bitti = true;
      [1, 2, 3, -1, -2, 4, 5].forEach(function (d) { yukle(g[0] + d, 'low'); });
    }
    var bekleyen = g.filter(function (k) { return !sayfalar[k].bitti; });
    if (!bekleyen.length) return komsular();
    var kalan = bekleyen.length;
    bekleyen.forEach(function (k) {
      var im = sayfalar[k].img, f = function () { if (--kalan <= 0) komsular(); };
      im.addEventListener('load', f, { once: true });
      im.addEventListener('error', f, { once: true });
    });
    setTimeout(komsular, 1500);
  }

  /* ---------- yerleşim ---------- */
  var pf = null, mod = null;

  var darSorgu = window.matchMedia('(max-width: 800px), (orientation: portrait)');   /* CSS ile aynı eşik */
  function tekMi() { return darSorgu.matches; }
  function olc() {
    var cs = getComputedStyle(sahne);
    var w = sahne.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = sahne.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var tek = tekMi();
    var pw = Math.max(60, Math.floor(Math.min(tek ? w : w / 2, h * ORAN)));
    return { tek: tek, pw: pw };
  }
  function boyutla(o) {
    kitap.style.width = (o.tek ? o.pw : o.pw * 2) + 'px';
    kitap.style.setProperty('--pw', o.pw + 'px');
    kitap.classList.toggle('cift', !o.tek);
  }

  function gorunen(i) {
    if (mod !== 'cift') return [i];
    if (i === 0) return [0];
    if (i % 2 === 1 && i + 1 < N) return [i, i + 1];
    return [i];
  }
  function simdiki() { return pf ? pf.getCurrentPageIndex() : 0; }

  /* kapak ve tek kalan son sayfa açılımda ortalansın */
  function kaydir(ayriliyor) {
    var k = 0;
    if (mod === 'cift' && !ayriliyor) {
      var i = simdiki();
      if (i === 0) k = -1;
      else if (i === N - 1 && N % 2 === 0) k = 1;
    }
    kitap.style.transform = k ? 'translateX(' + (k * 25) + '%)' : '';
    kitap.classList.toggle('kapakta', k === -1);
    kitap.classList.toggle('sonda', k === 1);
  }

  function kur(baslangic) {
    var o = olc();
    mod = o.tek ? 'tek' : 'cift';
    boyutla(o);
    if (pf) {
      var eski = pf;
      pf = null;
      try { eski.getRender().render = function () {}; eski.destroy(); } catch (e) { /* yok say */ }
    }
    var blok = document.createElement('div');
    blok.className = 'blok';
    kitap.appendChild(blok);
    pf = new St.PageFlip(blok, {
      width: veri.en, height: veri.boy, size: 'stretch',
      minWidth: o.tek ? 100000 : 50, maxWidth: 4000, minHeight: 50, maxHeight: 6000,
      usePortrait: o.tek, showCover: true, autoSize: true, startPage: baslangic,
      drawShadow: true, maxShadowOpacity: 0.4, flippingTime: 750,
      mobileScrollSupport: true, swipeDistance: 30, showPageCorners: true,
      disableFlipByClick: true, clickEventForward: true, useMouseEvents: true
    });
    pf.on('flip', function (e) { degisti(e.data); });
    pf.on('changeState', function (e) {
      if (e.data === 'flipping') { kaydir(true); ipucuGizle(); }
      else if (e.data === 'read') kaydir();
    });
    pf.loadFromHTML(sayfalar.map(function (s) { return s.el; }));
    /* Düğme/tuş/kaydırma ile çevirme köşe kısıtına takılmasın (dikey modda flipPrev aksi halde çalışmıyor);
       kullanıcının sayfaya tıklaması kütüphanede yalnız köşede çevirir, kenar tıklamasını biz yönetiyoruz. */
    var fc = pf.getFlipController(), proto = Object.getPrototypeOf(fc), ayar = pf.getSettings();
    ['flipNext', 'flipPrev'].forEach(function (ad) {
      fc[ad] = function (kose) {
        ayar.disableFlipByClick = false;
        try { return proto[ad].call(fc, kose); } finally { ayar.disableFlipByClick = true; }
      };
    });
    blok.style.minWidth = '0px';
    blok.style.minHeight = '0px';
    pf.update();
    degisti(simdiki());
  }

  /* ---------- durum değişince ---------- */
  function hashSayfa() {
    var m = /(?:^#|&)s=(\d+)/.exec(location.hash);
    return m ? sinirla(parseInt(m[1], 10) - 1, 0, N - 1) : null;
  }

  function degisti(i) {
    if (!pf) return;
    var g = gorunen(i);
    sayac.textContent = (g.length === 2 ? (g[0] + 1) + '-' + (g[1] + 1) : (g[0] + 1)) + ' / ' + N;
    var basta = i === 0, sonda = g[g.length - 1] >= N - 1;
    dGeri.disabled = okGeri.disabled = basta;
    dIleri.disabled = okIleri.disabled = sonda;
    cevreyiYukle(i);
    kaydir();
    var h = hashSayfa();
    if (!(h !== null && g.indexOf(h) >= 0) && !(h === null && i === 0)) {
      try { history.replaceState(null, '', i === 0 ? location.pathname + location.search : '#s=' + (i + 1)); } catch (e) { /* yok say */ }
    }
  }

  function ileri() { if (pf) pf.flipNext('bottom'); }
  function geri() { if (pf) pf.flipPrev('bottom'); }
  function git(i) {
    if (!pf) return;
    i = sinirla(i, 0, N - 1);
    if (gorunen(simdiki()).indexOf(i) >= 0) return;
    pf.flip(i, 'bottom');
  }

  /* ---------- tıklama: kenar = çevir, çift tık = yakınlaştır ---------- */
  function gorunurAlan() {
    var r = kitap.getBoundingClientRect(), i = simdiki();
    if (mod === 'cift') {
      var pw = r.width / 2;
      if (i === 0) return { sol: r.left + pw, en: pw, ust: r.top, boy: r.height };
      if (i === N - 1 && N % 2 === 0) return { sol: r.left, en: pw, ust: r.top, boy: r.height };
    }
    return { sol: r.left, en: r.width, ust: r.top, boy: r.height };
  }
  function noktadakiSayfa(x, y) {
    var r = kitap.getBoundingClientRect(), i = simdiki(), g = gorunen(i);
    var pw = mod === 'cift' ? r.width / 2 : r.width, hedef = g[0], x0 = r.left;
    if (mod === 'cift') {
      var sagda = x >= r.left + pw;
      if (g.length === 2) { hedef = sagda ? g[1] : g[0]; x0 = sagda ? r.left + pw : r.left; }
      else x0 = i === 0 ? r.left + pw : r.left;
    }
    return { i: hedef, fx: sinirla((x - x0) / pw, 0, 1), fy: sinirla((y - r.top) / r.height, 0, 1) };
  }

  var basX = 0, basY = 0, sonTik = 0, sonX = 0, sonY = 0, tikZaman = null;
  kitap.addEventListener('pointerdown', function (e) { basX = e.clientX; basY = e.clientY; }, true);
  kitap.addEventListener('click', function (e) {
    if (!pf || Math.abs(e.clientX - basX) > 8 || Math.abs(e.clientY - basY) > 8) return;
    var simdi = Date.now(), x = e.clientX, y = e.clientY;
    if (simdi - sonTik < 330 && Math.abs(x - sonX) < 30 && Math.abs(y - sonY) < 30) {
      clearTimeout(tikZaman); tikZaman = null; sonTik = 0;
      zoomAc(noktadakiSayfa(x, y));
      return;
    }
    sonTik = simdi; sonX = x; sonY = y;
    var durum = pf.getState();
    if (durum === 'flipping' || durum === 'user_fold') return;   // köşe tıklamasını kütüphane çevirdi
    clearTimeout(tikZaman);
    tikZaman = setTimeout(function () {
      tikZaman = null;
      var a = gorunurAlan(), f = (x - a.sol) / a.en;
      if (f < 0.3) geri(); else if (f > 0.7) ileri();
    }, 260);
  });
  /* kitap üzerinde tarayıcı kaydırması/fling başlamasın (yoksa kaydırmadan sonraki ilk dokunuş yutulabiliyor) */
  kitap.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
  kitap.addEventListener('mousemove', function (e) {
    var a = gorunurAlan(), f = (e.clientX - a.sol) / a.en;
    kitap.classList.toggle('tiklanir', (f < 0.3 && !dGeri.disabled) || (f > 0.7 && !dIleri.disabled));
  });

  /* ---------- düğmeler ve klavye ---------- */
  dGeri.addEventListener('click', geri);
  dIleri.addEventListener('click', ileri);
  okGeri.addEventListener('click', geri);
  okIleri.addEventListener('click', ileri);

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || dlgKucuk.open || dlgZoom.open) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') ileri();
    else if (k === 'ArrowLeft' || k === 'PageUp') geri();
    else if (k === 'Home') git(0);
    else if (k === 'End') git(N - 1);
    else return;
    e.preventDefault();
  });

  window.addEventListener('hashchange', function () {
    var h = hashSayfa();
    if (h !== null) git(h);
  });

  var rZaman = null;
  window.addEventListener('resize', function () {
    if (!pf) return;
    var o = olc();
    if ((o.tek ? 'tek' : 'cift') !== mod) {
      clearTimeout(rZaman);
      rZaman = setTimeout(function () { kur(simdiki()); }, 150);
      return;
    }
    boyutla(o);
    pf.update();
  });

  /* ---------- küçük resimler ---------- */
  var kucukDugmeler = veri.sayfalar.map(function (s, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'kucuk';
    b.setAttribute('aria-label', etiket(i));
    var img = document.createElement('img');
    img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    img.width = 240; img.height = Math.round(240 / ORAN);
    img.setAttribute('data-src', adres(i, true));
    var ad = document.createElement('span');
    ad.className = 'kucuk-ad';
    var no = document.createElement('b');
    no.textContent = i + 1;
    ad.appendChild(no);
    ad.appendChild(document.createTextNode(s.b || ''));
    b.appendChild(img); b.appendChild(ad);
    b.addEventListener('click', function () { dlgKucuk.close(); git(i); });
    li.appendChild(b); izgara.appendChild(li);
    return b;
  });

  dKucuk.addEventListener('click', function () {
    var g = gorunen(simdiki());
    kucukDugmeler.forEach(function (b, i) {
      if (g.indexOf(i) >= 0) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    dlgKucuk.showModal();
    izgara.querySelectorAll('img[data-src]').forEach(function (im) {
      im.src = im.getAttribute('data-src'); im.removeAttribute('data-src');
    });
    var hedef = kucukDugmeler[g[0]];
    hedef.scrollIntoView({ block: 'center' });
    hedef.focus({ preventScroll: true });
  });

  [dlgKucuk, dlgZoom].forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-kapat]')) d.close();
    });
  });

  /* ---------- yakınlaştırma ---------- */
  function zoomGenislik() {
    var pw = parseFloat(kitap.style.getPropertyValue('--pw')) || 400;
    return Math.round(Math.min(veri.en, Math.max(pw * 2.2, Math.min(window.innerWidth - 40, veri.en))));
  }
  function zoomAc(nokta) {
    if (!pf) return;
    var g = gorunen(simdiki()), w = zoomGenislik();
    zIcerik.textContent = '';
    zIcerik.style.setProperty('--zw', w + 'px');
    g.forEach(function (k) {
      var im = document.createElement('img');
      im.className = 'zoom-img'; im.alt = etiket(k); im.draggable = false;
      im.width = veri.en; im.height = veri.boy;
      im.src = adres(k);
      zIcerik.appendChild(im);
    });
    zEtiket.textContent = g.length === 2 ? 'Sayfa ' + (g[0] + 1) + '-' + (g[1] + 1) : etiket(g[0]);
    dlgZoom.showModal();
    zoomAcilis = Date.now();
    zKaydir.focus({ preventScroll: true });
    var cs = getComputedStyle(zIcerik), pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop);
    var ox = zIcerik.offsetLeft + pl, oy = pt;
    if (nokta && g.indexOf(nokta.i) >= 0) {
      var x = ox + g.indexOf(nokta.i) * w + nokta.fx * w, y = oy + nokta.fy * (w / ORAN);
      zKaydir.scrollLeft = x - zKaydir.clientWidth / 2;
      zKaydir.scrollTop = y - zKaydir.clientHeight / 2;
    } else {
      zKaydir.scrollLeft = (zKaydir.scrollWidth - zKaydir.clientWidth) / 2 * (g.length === 2 ? 0 : 1);
      zKaydir.scrollTop = 0;
    }
  }
  dZoom.addEventListener('click', function () { zoomAc(null); });

  var suruk = null, sonOynadi = false, zoomAcilis = 0;
  zKaydir.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    suruk = { x: e.clientX, y: e.clientY, l: zKaydir.scrollLeft, t: zKaydir.scrollTop, oynadi: false };
    zKaydir.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  zKaydir.addEventListener('pointermove', function (e) {
    if (!suruk) return;
    var dx = e.clientX - suruk.x, dy = e.clientY - suruk.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) { suruk.oynadi = true; zKaydir.classList.add('suruk'); }
    zKaydir.scrollLeft = suruk.l - dx;
    zKaydir.scrollTop = suruk.t - dy;
  });
  function surukBitir() { sonOynadi = !!(suruk && suruk.oynadi); suruk = null; zKaydir.classList.remove('suruk'); }
  zKaydir.addEventListener('pointerup', surukBitir);
  zKaydir.addEventListener('pointercancel', surukBitir);
  zKaydir.addEventListener('dblclick', function () { if (Date.now() - zoomAcilis > 500) dlgZoom.close(); });
  zKaydir.addEventListener('click', function (e) {   /* görselin dışına (boşluğa) tıklama kapatır */
    if (!sonOynadi && (e.target === zKaydir || e.target === zIcerik)) dlgZoom.close();
    sonOynadi = false;
  });

  /* ---------- tam ekran ---------- */
  var tamDestek = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (!tamDestek) dTam.hidden = true;
  function tamAcik() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  dTam.addEventListener('click', function () {
    var p;
    try {
      if (tamAcik()) p = (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { var el = document.documentElement; p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); }
    } catch (e) { /* yok say */ }
    if (p && p.catch) p.catch(function () {});
  });
  function tamGuncelle() {
    var a = tamAcik();
    dTam.classList.toggle('acik', a);
    dTam.setAttribute('aria-pressed', a ? 'true' : 'false');
    dTam.setAttribute('aria-label', a ? 'Tam ekrandan çık' : 'Tam ekran');
  }
  document.addEventListener('fullscreenchange', tamGuncelle);
  document.addEventListener('webkitfullscreenchange', tamGuncelle);

  /* ---------- ipucu ---------- */
  var ipucuZaman = null;
  function ipucuGizle() { clearTimeout(ipucuZaman); ipucu.classList.add('gizli'); }
  if (window.matchMedia && matchMedia('(pointer: fine)').matches) {
    ipucu.textContent = 'Çevirmek için sayfa kenarına tıklayın, sürükleyin ya da ← → tuşlarını kullanın · Yakınlaştırmak için çift tıklayın';
    ipucuZaman = setTimeout(ipucuGizle, 9000);
  }

  /* ---------- başlat ---------- */
  var baslangic = hashSayfa() || 0;
  if (window.St && St.PageFlip) {
    kur(baslangic);
  } else {
    /* yedek: kütüphane yoksa sayfaları alt alta göster */
    kitap.classList.add('yedek');
    sayfalar.forEach(function (s, i) { s.img.loading = 'lazy'; yukle(i); kitap.appendChild(s.el); });
    [dGeri, dIleri, dZoom].forEach(function (b) { b.disabled = true; });
    sayac.textContent = N + ' sayfa';
  }
})();
