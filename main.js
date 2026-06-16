/* Shared interactions — loaded by every route.
   Dependency-free, progressively enhanced: the site is fully usable
   with this file blocked. Each block guards its own feature. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* --- theme: persisted, defaults to the user's OS preference --- */
  var root = document.documentElement;
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("mj-theme", t); } catch (e) {}
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    });
  }
  // initial theme is applied by an inline script in <head> to avoid a flash.
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

  /* --- drafting crosshair cursor --- */
  if (fine && !reduce) {
    var cur = document.createElement("div");
    cur.className = "cursor";
    cur.innerHTML = '<span class="cursor__ring"></span>';
    document.body.appendChild(cur);
    var cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener("mousemove", function (e) { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = "translate(" + cx + "px," + cy + "px)";
      requestAnimationFrame(loop);
    })();
    var hot = "a, button, .btn, .pcard, .tool, .post, .cmethod, [data-hot]";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(hot)) cur.classList.add("is-hot");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest(hot)) cur.classList.remove("is-hot");
    });
  }

  /* --- nav: stuck state, scroll progress, mobile toggle --- */
  var nav = document.querySelector(".nav");
  var progress = document.querySelector(".nav__progress");
  function onScroll() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 40);
    if (progress) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (nav) {
    var toggle = nav.querySelector(".nav__toggle");
    var links = nav.querySelector(".nav__links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        toggle.textContent = open ? "Close" : "Menu";
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        document.body.style.overflow = open ? "hidden" : "";
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          links.classList.remove("open"); toggle.textContent = "Menu";
          toggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        });
      });
    }
  }

  /* --- scroll reveals --- */
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

  /* --- word-by-word hero reveal --- */
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

  /* --- magnetic buttons (subtle) --- */
  if (fine && !reduce) {
    document.querySelectorAll("[data-magnet]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + mx * 0.15 + "px," + my * 0.2 + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* --- count-up stats --- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, target = parseFloat(el.getAttribute("data-count")), t0 = null;
        var dur = reduce ? 0 : 1200;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = dur ? Math.min((ts - t0) / dur, 1) : 1;
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* --- active-section nav highlight (home long-scroll) --- */
  var sectionLinks = document.querySelectorAll('.nav__links a[href^="#"]');
  if (sectionLinks.length && "IntersectionObserver" in window) {
    var map = {};
    sectionLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
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
})();
