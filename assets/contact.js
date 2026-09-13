/* Contact popup for the "get in touch" button.
   Progressive enhancement: the button keeps its mailto href, so if this script
   never runs the click still opens a mail client. */
(function () {
  'use strict';

  var EMAIL    = 'mahekjain324@gmail.com';
  var PHONE    = '+91 99130 63933';
  var PHONE_TEL= '+919913063933';
  var LINKEDIN = 'https://www.linkedin.com/in/mahek-jain-547782246';
  var RESUME   = '/MahekJainDesignerResume.pdf';

  var triggers = document.querySelectorAll('[data-contact]');
  if (!triggers.length || !document.body) return;

  var css = document.createElement('style');
  css.textContent = [
    '.cm-back{position:fixed;inset:0;z-index:500;background:rgba(25,25,25,.72);opacity:0;',
      'visibility:hidden;transition:opacity .45s cubic-bezier(.82,0,.18,1),visibility .45s;',
      'display:flex;align-items:center;justify-content:center;padding:24px}',
    '.cm-back.is-open{opacity:1;visibility:visible}',
    '.cm-card{background:#EFEDEA;color:#191919;width:100%;max-width:440px;padding:clamp(28px,4vw,40px);',
      'transform:translateY(14px);transition:transform .45s cubic-bezier(.82,0,.18,1);',
      'max-height:calc(100vh - 48px);overflow-y:auto}',
    '.cm-back.is-open .cm-card{transform:translateY(0)}',
    '.cm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:clamp(20px,3vw,28px)}',
    '.cm-title{font-family:"Playfair Display",serif;font-weight:500;font-size:clamp(24px,3vw,34px);line-height:1.1;letter-spacing:-.015em}',
    '.cm-x{background:none;border:0;cursor:pointer;color:inherit;font:inherit;font-size:26px;line-height:1;padding:0 2px;opacity:.5;transition:opacity .3s}',
    '.cm-x:hover{opacity:1}',
    '.cm-row{display:block;padding:14px 0;border-top:1px solid rgba(25,25,25,.16)}',
    '.cm-row:last-child{border-bottom:1px solid rgba(25,25,25,.16)}',
    '.cm-k{font-family:"Kumbh Sans",sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.5;display:block;margin-bottom:5px}',
    '.cm-v{font-family:"Kumbh Sans",sans-serif;font-weight:700;font-size:15px;line-height:1.35;word-break:break-word;',
      'display:inline-block;position:relative;padding-bottom:2px;color:inherit;text-decoration:none}',
    'a.cm-v::after{content:"";position:absolute;left:0;bottom:0;width:0;height:1.5px;background:currentColor;transition:width .4s cubic-bezier(.98,0,.02,1)}',
    'a.cm-v:hover::after{width:100%}'
  ].join('');
  document.head.appendChild(css);

  function row(label, value, href, blank) {
    var tag = href ? 'a' : 'span';
    var el = document.createElement(tag);
    el.className = 'cm-v';
    el.textContent = value;
    if (href) {
      el.href = href;
      if (blank) { el.target = '_blank'; el.rel = 'noopener'; }
    }
    var wrap = document.createElement('div');
    wrap.className = 'cm-row';
    var k = document.createElement('span');
    k.className = 'cm-k';
    k.textContent = label;
    wrap.appendChild(k); wrap.appendChild(el);
    return wrap;
  }

  var back = document.createElement('div');
  back.className = 'cm-back';
  back.setAttribute('role', 'dialog');
  back.setAttribute('aria-modal', 'true');
  back.setAttribute('aria-labelledby', 'cm-title');
  back.hidden = false;

  var card = document.createElement('div');
  card.className = 'cm-card';

  var head = document.createElement('div');
  head.className = 'cm-head';
  var h = document.createElement('div');
  h.className = 'cm-title'; h.id = 'cm-title'; h.textContent = 'Get in touch';
  var x = document.createElement('button');
  x.className = 'cm-x'; x.type = 'button';
  x.setAttribute('aria-label', 'Close');
  x.innerHTML = '&times;';
  head.appendChild(h); head.appendChild(x);

  card.appendChild(head);
  card.appendChild(row('Email', EMAIL, 'mailto:' + EMAIL));
  card.appendChild(row('Phone', PHONE, 'tel:' + PHONE_TEL));
  card.appendChild(row('LinkedIn', 'Mahek Jain', LINKEDIN, true));
  card.appendChild(row('Resume', 'Open the PDF', RESUME, true));
  back.appendChild(card);
  document.body.appendChild(back);

  var last = null;
  function focusable() { return back.querySelectorAll('a[href],button'); }

  function open(e) {
    if (e) e.preventDefault();
    last = document.activeElement;
    back.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    var f = focusable();
    if (f.length) f[0].focus();
    document.addEventListener('keydown', onKey);
  }
  function close() {
    back.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (last && last.focus) last.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    var f = focusable();
    if (!f.length) return;
    var first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  }

  x.addEventListener('click', close);
  back.addEventListener('click', function (e) { if (e.target === back) close(); });
  Array.prototype.forEach.call(triggers, function (t) { t.addEventListener('click', open); });
})();
