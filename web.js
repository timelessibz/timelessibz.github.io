// Web del canal TIMELESS IBZ (motor/web.py). Sin cookies ni rastreadores: el reproductor de YouTube
// (youtube-nocookie.com) solo se carga cuando alguien pulsa un vídeo.
(function () {
  'use strict';
  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var suave = quieto ? 'auto' : 'smooth';
  var $ = function (s, d) { return (d || document).querySelector(s); };
  var $$ = function (s, d) { return Array.prototype.slice.call((d || document).querySelectorAll(s)); };

  function reproducir(caja, inicio) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + caja.getAttribute('data-id') + '?autoplay=1&rel=0&modestbranding=1&playsinline=1' +
      (inicio ? '&start=' + inicio : '');
    f.title = caja.getAttribute('data-titulo') || 'TIMELESS IBZ';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    caja.innerHTML = '';
    caja.appendChild(f);
  }

  // ---------- ficha de una sesión: el reproductor sigue el tracklist ----------
  var ficha = $('.ficha__video .video');
  var filas = $$('.pistas li[data-t]');
  var barra = $('.sonando');
  var player = null, actual = -1, cargando = false, sinFlotar = false;
  var pedido = parseInt(new URLSearchParams(location.search).get('t'), 10);

  function cargaApi() {
    return new Promise(function (ok, mal) {
      if (window.YT && window.YT.Player) return ok();
      var previo = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (previo) previo(); ok(); };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = mal;
      document.head.appendChild(s);
      setTimeout(mal, 8000);
    });
  }

  function tocaFicha(t) {
    t = Math.max(0, Math.floor(t || 0));
    if (player && player.seekTo) { player.seekTo(t, true); player.playVideo(); marca(indice(t)); return; }
    if (cargando) return;
    cargando = true;
    cargaApi().then(function () {
      var div = document.createElement('div');
      ficha.innerHTML = ''; ficha.appendChild(div);
      player = new YT.Player(div, {
        host: 'https://www.youtube-nocookie.com', videoId: ficha.getAttribute('data-id'),
        playerVars: { autoplay: 1, start: t, rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: function (e) { e.target.playVideo(); setInterval(vigila, 1000); } }
      });
    }).catch(function () { reproducir(ficha, t); });            // sin la API (bloqueada): el reproductor de siempre
  }

  function indice(t) {
    var i = -1;
    filas.forEach(function (f, k) { if (+f.getAttribute('data-t') <= t + 0.5) i = k; });
    return i;
  }

  function marca(i) {
    if (i === actual || i < 0) return;
    if (filas[actual]) filas[actual].classList.remove('sonando-fila');
    $$('.pistas .pedida').forEach(function (x) { x.classList.remove('pedida'); });
    actual = i;
    var f = filas[i];
    f.classList.add('sonando-fila');
    if (barra) {
      barra.hidden = false;
      document.body.classList.add('con-barra');
      $('.sonando__t', barra).textContent = f.querySelector('.pista__t').textContent;
      $('.sonando__quien', barra).textContent = f.querySelector('.pista__quien').textContent;
      $('.sonando__titulo', barra).textContent = f.querySelector('.pista__titulo').textContent;
      $('[data-salto="-1"]', barra).disabled = i === 0;
      $('[data-salto="1"]', barra).disabled = i === filas.length - 1;
    }
  }

  function vigila() {
    if (!player || !player.getCurrentTime) return;
    var t = player.getCurrentTime();
    if (player.getPlayerState() === 1 || t > 0) marca(indice(t));
  }

  if (ficha) {
    // vídeo flotante: si bajas leyendo el tracklist mientras suena, el set se queda en una esquina
    var hueco = ficha.parentNode;
    var cerrar = document.createElement('button');
    cerrar.type = 'button'; cerrar.className = 'flotante__cerrar'; cerrar.setAttribute('aria-label', 'Close the mini player'); cerrar.textContent = '×';
    cerrar.addEventListener('click', function (e) { e.stopPropagation(); sinFlotar = true; ficha.classList.remove('video--flotante'); });
    ficha.appendChild(cerrar);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var fuera = !es[0].isIntersecting && es[0].boundingClientRect.top < 0;
        ficha.classList.toggle('video--flotante', fuera && !!player && !sinFlotar);
        if (!fuera) sinFlotar = false;
        if (cerrar.parentNode !== ficha) ficha.appendChild(cerrar);
      }, { threshold: 0.15 }).observe(hueco);
    }
    if (pedido >= 0 && filas.length) {                         // llega desde «?t=»: el tema marcado y el play arrancará ahí
      var k = indice(pedido);
      if (filas[k]) { filas[k].classList.add('pedida'); setTimeout(function () { filas[k].scrollIntoView({ behavior: suave, block: 'center' }); }, 300); }
      var pista = $('.ficha__video .play');
      if (pista) pista.setAttribute('data-desde', filas[k] ? filas[k].querySelector('.pista__t').textContent : '');
    }
  }

  // ---------- clics ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.video button');
    if (b) {
      e.preventDefault();
      var caja = b.closest('.video');
      if (caja === ficha) tocaFicha(pedido >= 0 ? pedido : 0); else reproducir(caja);
      return;
    }
    var fila = e.target.closest('.pistas li[data-t]');
    if (fila && ficha && !e.target.closest('a:not(.pista__t)')) {        // la fila entera; los artistas siguen siendo enlaces
      e.preventDefault();
      tocaFicha(+fila.getAttribute('data-t'));
      if (ficha.getBoundingClientRect().bottom < 0 || ficha.getBoundingClientRect().top > innerHeight) {
        if (!player) hueco.scrollIntoView({ behavior: suave, block: 'center' });
      }
      return;
    }
    var salto = e.target.closest('[data-salto]');
    if (salto && filas.length) { var j = actual + +salto.getAttribute('data-salto'); if (filas[j]) tocaFicha(+filas[j].getAttribute('data-t')); return; }
    if (e.target.closest('.sonando__arriba')) { sinFlotar = false; hueco.scrollIntoView({ behavior: suave, block: 'center' }); return; }
    var flecha = e.target.closest('.flecha');
    if (flecha) {
      var pista2 = flecha.closest('section').querySelector('.shorts');
      pista2.scrollBy({ left: +flecha.getAttribute('data-dir') * pista2.clientWidth * 0.85, behavior: suave });
      return;
    }
    if (e.target.closest('.compartir')) { comparte(e.target.closest('.compartir')); return; }
  });

  // ---------- compartir ----------
  function comparte(boton) {
    var datos = { title: document.title, url: location.origin + location.pathname };
    var texto = $('span', boton), antes = texto.textContent;
    var hecho = function (msg) { texto.textContent = msg; setTimeout(function () { texto.textContent = antes; }, 2200); };
    if (navigator.share) { navigator.share(datos).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(datos.url).then(function () { hecho('Link copied ✓'); }, function () { hecho(datos.url); });
    else hecho(datos.url);
  }

  // ---------- carruseles: las flechas se apagan en los extremos ----------
  $$('.flechas').forEach(function (g) {
    var pista = g.closest('section').querySelector('.shorts');
    var mira = function () {
      g.children[0].disabled = pista.scrollLeft < 8;
      g.children[1].disabled = pista.scrollLeft + pista.clientWidth > pista.scrollWidth - 8;
    };
    pista.addEventListener('scroll', mira, { passive: true }); addEventListener('resize', mira); mira();
  });

  // ---------- barra y menú del móvil ----------
  var cabecera = $('.barra');
  if (cabecera && document.body.classList.contains('inicio')) {
    var mira = function () { cabecera.classList.toggle('solida', scrollY > 60); };
    addEventListener('scroll', mira, { passive: true }); mira();
  }
  var botonMenu = $('.menu-boton');
  function menu(abrir) {
    document.body.classList.toggle('menu-abierto', abrir);
    botonMenu.setAttribute('aria-expanded', String(abrir));
    botonMenu.setAttribute('aria-label', abrir ? 'Close menu' : 'Open menu');
  }
  if (botonMenu) {
    botonMenu.addEventListener('click', function () { menu(!document.body.classList.contains('menu-abierto')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
    $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });
  }

  // vídeo de portada: quieto si se pide menos movimiento o ahorro de datos
  var fondo = $('.heroe__video');
  if (fondo && (quieto || (navigator.connection && navigator.connection.saveData))) { fondo.removeAttribute('autoplay'); fondo.pause(); }

  // entrada al hacer scroll
  var nodos = $$('.aparece');
  if ('IntersectionObserver' in window && !quieto) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('visto'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    nodos.forEach(function (n) { io.observe(n); });
  } else {
    nodos.forEach(function (n) { n.classList.add('visto'); });
  }

  // ---------- archivo: buscador por tema o artista, con el tema encontrado y su minuto ----------
  var q = $('#q');
  if (q) {
    var tarjetas = $$('.rejilla--archivo .sesion');
    var cuenta = $('.buscador__cuenta'), vacio = $('.vacio');
    var indiceB = null, serie = '';
    var plano = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var filtra = function () {
      var palabras = plano(q.value.trim()).split(/\s+/).filter(Boolean), n = 0;
      tarjetas.forEach(function (c) {
        var slug = c.getAttribute('data-slug'), d = indiceB ? indiceB[slug] : null;
        var viejo = $('.coincide', c); if (viejo) viejo.remove();
        var temas = d ? d[1] : [];
        var todo = d ? d[0] + ' ' + temas.map(function (x) { return plano(x[2]); }).join(' ') : '';
        var ok = (!serie || c.getAttribute('data-serie') === serie) && palabras.every(function (p) { return todo.indexOf(p) >= 0; });
        c.hidden = !ok;
        if (!ok) return;
        n++; c.classList.add('visto');
        if (!palabras.length) return;
        var hay = temas.filter(function (x) { var t = plano(x[2]); return palabras.every(function (p) { return t.indexOf(p) >= 0; }); }).slice(0, 3);
        if (!hay.length) return;
        var ul = document.createElement('ul'); ul.className = 'coincide';
        ul.innerHTML = hay.map(function (x) {
          return '<li><a href="' + slug + '/?t=' + x[0] + '"><span>' + x[1] + '</span>' + esc(x[2]) + '</a></li>';
        }).join('');
        c.appendChild(ul);
      });
      cuenta.textContent = palabras.length || serie ? n + (n === 1 ? ' session' : ' sessions') : '';
      vacio.hidden = n > 0;
      var url = new URL(location.href);
      if (q.value.trim()) url.searchParams.set('q', q.value.trim()); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    };
    var carga = function () {
      if (indiceB) return Promise.resolve();
      return fetch('../search.json').then(function (r) { return r.json(); }).then(function (j) { indiceB = j; });
    };
    q.addEventListener('input', function () { carga().then(filtra); });
    $$('.filtro').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.filtro').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        serie = b.getAttribute('data-serie'); carga().then(filtra);
      });
    });
    var inicial = new URLSearchParams(location.search).get('q');
    if (inicial) { q.value = inicial; carga().then(filtra); }
    q.closest('form').addEventListener('submit', function (e) { e.preventDefault(); q.blur(); });
    var arriba = $('#busca-q'); if (arriba) arriba.value = inicial || '';
  }
})();
