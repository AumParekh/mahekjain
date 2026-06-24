/* Shared interactions — loaded by every route.
   Dependency-free vanilla JS + Lenis smooth scroll + GSAP (loaded via CDN). */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- preloader -------------------------------------------- */
  (function () {
    var el = document.getElementById("preloader");
    if (!el) return;
    if (sessionStorage.getItem("pre_done")) { el.style.display = "none"; return; }
    var pctEl = document.getElementById("pre-pct");
    var start = null;
    var dur   = 2400;
    function tick(ts) {
      if (!start) start = ts;
      var p     = reduce ? 1 : Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (pctEl) pctEl.textContent = Math.round(eased * 100);
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        el.classList.add("pre--done");
        setTimeout(function () {
          el.style.display = "none";
          sessionStorage.setItem("pre_done", "1");
        }, 750);
      }
    }
    requestAnimationFrame(tick);
  })();

  /* --- Lenis smooth scroll ----------------------------------- */
  if (typeof Lenis !== "undefined" && !reduce) {
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    function lenisRaf(t) { lenis.raf(t); requestAnimationFrame(lenisRaf); }
    requestAnimationFrame(lenisRaf);
  }

  /* --- nav: stuck state + scroll progress ------------------- */
  var nav      = document.querySelector(".nav");
  var progress = document.querySelector(".nav__progress");
  function onScroll() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 40);
    if (progress) {
      var h   = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- mobile menu toggle ----------------------------------- */
  if (nav) {
    var toggle = nav.querySelector(".nav__toggle");
    var links  = nav.querySelector(".nav__links");
    if (toggle && links) {
      function closeMenu() {
        links.classList.remove("open");
        nav.classList.remove("menu-open");
        toggle.textContent = "Menu";
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        nav.classList.toggle("menu-open", open);
        toggle.textContent = open ? "×" : "Menu";
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.style.overflow = open ? "hidden" : "";
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", closeMenu);
      });
    }
  }

  /* --- scroll reveals --------------------------------------- */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* --- word-by-word hero reveal ----------------------------- */
  var words = document.querySelectorAll(".word");
  if (words.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      words.forEach(function (w) { w.classList.add("in"); });
    } else {
      words.forEach(function (w, i) {
        var inner = w.querySelector("span");
        if (inner) inner.style.transitionDelay = (i * 0.07) + "s";
        setTimeout(function () { w.classList.add("in"); }, 120);
      });
    }
  }

  /* --- magnetic buttons ------------------------------------- */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduce) {
    document.querySelectorAll("[data-magnet]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r  = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + mx * 0.15 + "px," + my * 0.2 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* --- count-up stats --------------------------------------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el     = en.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var t0     = null;
        var dur    = reduce ? 0 : 1200;
        function step(ts) {
          if (!t0) t0 = ts;
          var p      = dur ? Math.min((ts - t0) / dur, 1) : 1;
          var eased  = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* --- active-section nav highlight (home long-scroll) ------ */
  var sectionLinks = document.querySelectorAll('.nav__links a[href^="#"]');
  if (sectionLinks.length && "IntersectionObserver" in window) {
    var map = {};
    sectionLinks.forEach(function (a) {
      var id  = a.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = a;
    });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          sectionLinks.forEach(function (a) { a.classList.remove("active"); });
          if (map[en.target.id]) map[en.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { sio.observe(document.getElementById(id)); });
  }

  /* --- aria-current nav ------------------------------------- */
  document.querySelectorAll("nav a[href]").forEach(function (link) {
    try {
      var lp = new URL(link.getAttribute("href"), window.location.href).pathname;
      if (lp === window.location.pathname) link.setAttribute("aria-current", "page");
    } catch (e) {}
  });

  /* --- animated bridge rows --------------------------------- */
  (function () {
    var rows = document.querySelectorAll(".bridge-row");
    if (!rows.length || reduce) return;
    rows.forEach(function (row, i) {
      row.style.opacity    = "0";
      row.style.transform  = "translateY(18px)";
      row.style.transition =
        "opacity 0.55s cubic-bezier(.22,1,.36,1) " + (i * 110) + "ms," +
        "transform 0.55s cubic-bezier(.22,1,.36,1) " + (i * 110) + "ms";
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) {
          entries[0].target.style.opacity   = "1";
          entries[0].target.style.transform = "translateY(0)";
          obs.disconnect();
        }
      }, { threshold: 0.15 }).observe(row);
    });
  })();

  /* --- favicon pulse on tab hide ---------------------------- */
  (function () {
    var faviconEl    = document.querySelector("link[rel~='icon']");
    var originalHref = faviconEl ? faviconEl.href : null;
    var canvas       = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    var ctx    = canvas.getContext("2d");
    var animId = null;
    function drawDot(o) {
      ctx.clearRect(0, 0, 32, 32);
      ctx.beginPath(); ctx.arc(16, 16, 11, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(25,25,25," + o + ")"; ctx.fill();
    }
    function startPulse() {
      var frame = 0;
      (function pulse() {
        frame++;
        drawDot(0.35 + 0.65 * Math.abs(Math.sin(frame * 0.07)));
        if (faviconEl) faviconEl.href = canvas.toDataURL("image/png");
        animId = requestAnimationFrame(pulse);
      })();
    }
    function stopPulse() {
      if (animId) cancelAnimationFrame(animId);
      if (faviconEl && originalHref) faviconEl.href = originalHref;
    }
    document.addEventListener("visibilitychange", function () {
      document.hidden ? startPulse() : stopPulse();
    });
  })();

})();
