/* Renders a PDF into the page with PDF.js.
   The long boards here are far taller than a browser will allow in one canvas
   (iOS Safari in particular), so each page is drawn as a stack of tiles, each
   rendered only when it nears the viewport and released again when it is well
   past, which keeps memory bounded on phones.
   Progressive enhancement: the fallback link below the viewer works on its own,
   and stays put if anything here fails. */
(function () {
  'use strict';

  var VER = '3.11.174';
  // two sources: if one CDN is unreachable or the path moves, try the other
  var SOURCES = [
    { lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + VER + '/pdf.min.js',
      worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + VER + '/pdf.worker.min.js' },
    { lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VER + '/build/pdf.min.js',
      worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + VER + '/build/pdf.worker.min.js' }
  ];
  var MAX_W  = 2200;   // cap render width in device px, to bound memory
  var TILE_H = 1400;   // max canvas height per tile, safely under browser limits
  var NEAR   = '1500px 0px';

  var root = document.querySelector('[data-pdf]');
  if (!root) return;
  var url    = root.getAttribute('data-pdf');
  var status = document.getElementById('pv-status');

  function say(msg) { if (status) { status.textContent = msg; status.hidden = false; } }
  function fail()   { root.classList.add('pv-failed'); say('This PDF could not be displayed here. Open it with the link below.'); }

  function attempt(i) {
    if (i >= SOURCES.length) return fail();
    var src = SOURCES[i];
    var script = document.createElement('script');
    script.src = src.lib;
    script.onerror = function () { attempt(i + 1); };
    script.onload = function () {
      if (!window.pdfjsLib) return attempt(i + 1);
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = src.worker;
        pdfjsLib.getDocument(url).promise.then(build).catch(function () { attempt(i + 1); });
      } catch (e) { attempt(i + 1); }
    };
    document.head.appendChild(script);
  }
  attempt(0);

  function build(pdf) {
    var dpr     = Math.min(window.devicePixelRatio || 1, 2);
    var cssW    = root.clientWidth || 1000;
    var targetW = Math.min(Math.round(cssW * dpr), MAX_W);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) draw(pdf, e.target);
        else release(e.target);
      });
    }, { rootMargin: NEAR });

    var chain = Promise.resolve();
    for (var n = 1; n <= pdf.numPages; n++) chain = chain.then(addPage(pdf, n, targetW, io));
    chain.then(function () { if (status) status.hidden = true; }).catch(fail);
  }

  function addPage(pdf, num, targetW, io) {
    return function () {
      return pdf.getPage(num).then(function (page) {
        var base  = page.getViewport({ scale: 1 });
        var scale = targetW / base.width;
        var vp    = page.getViewport({ scale: scale });
        var count = Math.ceil(vp.height / TILE_H);
        var wrap  = document.createElement('div');
        wrap.className = 'pv-page';
        for (var t = 0; t < count; t++) {
          var h = Math.min(TILE_H, vp.height - t * TILE_H);
          var slot = document.createElement('div');
          slot.className = 'pv-tile';
          // reserve the exact space up front so nothing shifts as tiles arrive
          slot.style.aspectRatio = Math.round(vp.width) + ' / ' + Math.round(h);
          slot.dataset.page  = num;
          slot.dataset.y     = t * TILE_H;
          slot.dataset.w     = Math.round(vp.width);
          slot.dataset.h     = Math.round(h);
          slot.dataset.scale = scale;
          wrap.appendChild(slot);
          io.observe(slot);
        }
        root.appendChild(wrap);
      });
    };
  }

  function draw(pdf, slot) {
    if (slot.dataset.busy || slot.firstChild) return;
    slot.dataset.busy = '1';
    pdf.getPage(+slot.dataset.page).then(function (page) {
      var c = document.createElement('canvas');
      c.width  = +slot.dataset.w;
      c.height = +slot.dataset.h;
      var vp = page.getViewport({ scale: +slot.dataset.scale });
      return page.render({
        canvasContext: c.getContext('2d', { alpha: false }),
        viewport: vp,
        transform: [1, 0, 0, 1, 0, -(+slot.dataset.y)]   // shift to this tile's slice
      }).promise.then(function () {
        if (!slot.firstChild) slot.appendChild(c);
        slot.dataset.busy = '';
      });
    }).catch(function () { slot.dataset.busy = ''; });
  }

  function release(slot) {
    var c = slot.firstChild;
    if (!c || slot.dataset.busy) return;
    c.width = 0; c.height = 0;      // free the backing store, not just the node
    slot.removeChild(c);
  }
})();
