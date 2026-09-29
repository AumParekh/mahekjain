/* Warms the next page while the pointer is still on a card, so the click
   feels instant. Pure hint: nothing breaks if it never runs, and a card is an
   ordinary link either way.
   - mouse: after a short hover-intent delay, fetch the page plus anything the
     card lists in data-prefetch (e.g. the viewer script and the PDF). The delay
     stops fly-by hovers from pulling a multi-megabyte file.
   - touch / keyboard: fetch only the page itself, which is a few KB, because a
     touch that starts a scroll would otherwise waste mobile data.
   - skipped entirely when the browser asks to save data. */
(function () {
  'use strict';
  var cards = document.querySelectorAll('a[data-prefetch], a.gcell');
  if (!cards.length || !document.head) return;

  var conn = navigator.connection || {};
  if (conn.saveData) return;

  var done = {};
  function warm(url) {
    if (!url || done[url]) return;
    done[url] = true;
    var l = document.createElement('link');
    l.rel = 'prefetch';
    l.href = url;
    document.head.appendChild(l);
  }
  function pageOf(a) { return (a.getAttribute('href') || '').split('#')[0]; }

  Array.prototype.forEach.call(cards, function (a) {
    var page = pageOf(a);
    // links back to this same page (or to nowhere) have nothing to fetch
    var self = location.pathname.split('/').pop() || 'index.html';
    if (!page || page === self) return;
    var extras = (a.getAttribute('data-prefetch') || '').split(/\s+/).filter(Boolean);
    var timer = null;

    a.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      warm(page);
      timer = setTimeout(function () { extras.forEach(warm); }, 150);
    });
    a.addEventListener('pointerleave', function () { clearTimeout(timer); });
    a.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') warm(page);
    });
    a.addEventListener('focus', function () { warm(page); });
  });
})();
