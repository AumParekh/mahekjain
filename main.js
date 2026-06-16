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

  /* --- legend "drafting light": cursor-trailed spotlight that reveals a
         blueprint grid beneath the design-system section. Desktop + motion
         only; the layer is created here so no-JS users never get it. --- */
  if (fine && !reduce) {
    var legend = document.querySelector(".legend");
    if (legend) {
      var light = document.createElement("div");
      light.className = "legend__light";
      light.setAttribute("aria-hidden", "true");
      legend.appendChild(light);
      var lx = 0, ly = 0, ltx = 0, lty = 0, lit = false, raf = null;
      function lstep() {
        lx += (ltx - lx) * 0.18; ly += (lty - ly) * 0.18;
        light.style.setProperty("--lx", lx + "px");
        light.style.setProperty("--ly", ly + "px");
        if (Math.abs(ltx - lx) > 0.5 || Math.abs(lty - ly) > 0.5) {
          raf = requestAnimationFrame(lstep);
        } else { raf = null; }
      }
      legend.addEventListener("mousemove", function (e) {
        var r = legend.getBoundingClientRect();
        ltx = e.clientX - r.left; lty = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(lstep);
      });
      legend.addEventListener("mouseenter", function () {
        lit = true; legend.classList.add("is-lit");
      });
      legend.addEventListener("mouseleave", function () {
        lit = false; legend.classList.remove("is-lit");
      });
    }
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

  /* --- 3D wireframe globe (home hero accent) -----------------------------
     Dependency-free: a real perspective projection of a lat/long sphere,
     drawn as hairlines on a 2D canvas — no WebGL engine, no library, ~few KB.
     A spatial form rendered as a flat plan, the site's thesis made literal.
     Progressive enhancement: created only if a .hero exists and the canvas
     2D context is available. Reduced motion → one static frame, no loop. --- */
  var hero = document.querySelector(".hero");
  if (hero) {
    var cv = document.createElement("canvas");
    var ctx = cv.getContext && cv.getContext("2d");
    if (ctx) {
      cv.className = "hero__globe";
      cv.setAttribute("aria-hidden", "true");
      hero.appendChild(cv);

      var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      var W = 0, H = 0;
      function resize() {
        var r = hero.getBoundingClientRect();
        W = r.width; H = r.height;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(resize).observe(hero);
      } else { window.addEventListener("resize", resize); }

      /* theme-aware colours, refreshed when the theme token block swaps */
      var col = { line: "#17181A", accent: "#B11E2F" };
      function readColors() {
        var cs = getComputedStyle(document.documentElement);
        var ln = (cs.getPropertyValue("--ink") || "").trim();
        var ac = (cs.getPropertyValue("--accent") || "").trim();
        // some engines leave var() chains unresolved — fall back to base hex
        if (ln && ln.indexOf("var") < 0) col.line = ln;
        if (ac && ac.indexOf("var") < 0) col.accent = ac;
        else col.accent = (cs.getPropertyValue("--crimson") || col.accent).trim();
      }
      readColors();
      new MutationObserver(readColors).observe(root, {
        attributes: true, attributeFilter: ["data-theme"]
      });

      /* sphere geometry: latitude rings + longitude meridians */
      var NLAT = 9, NLON = 14, SEG = 48;
      function ringLat(phi) {
        var pts = [], i, t;
        for (i = 0; i <= SEG; i++) {
          t = (i / SEG) * Math.PI * 2;
          pts.push([Math.cos(phi) * Math.cos(t), Math.sin(phi), Math.cos(phi) * Math.sin(t)]);
        }
        return pts;
      }
      function ringLon(theta) {
        var pts = [], i, p;
        for (i = 0; i <= SEG; i++) {
          p = -Math.PI / 2 + (i / SEG) * Math.PI;
          pts.push([Math.cos(p) * Math.cos(theta), Math.sin(p), Math.cos(p) * Math.sin(theta)]);
        }
        return pts;
      }
      var rings = [], k;
      for (k = 1; k < NLAT; k++) rings.push(ringLat(-Math.PI / 2 + (k / NLAT) * Math.PI));
      for (k = 0; k < NLON; k++) rings.push(ringLon((k / NLON) * Math.PI * 2));

      var ry = 0, rx = -0.42, txr = 0, tyr = 0;   // rotation + cursor target
      window.addEventListener("mousemove", function (e) {
        tyr = (e.clientX / window.innerWidth - 0.5) * 0.6;
        txr = (e.clientY / window.innerHeight - 0.5) * 0.4;
      }, { passive: true });

      function frame(t) {
        var cx = W * 0.72, cy = H * 0.46;
        var R = Math.min(W, H) * (W < 900 ? 0.30 : 0.36);
        var dist = 3.0, focal = 2.4;
        ry += reduce ? 0 : 0.0016;
        var ay = ry + (reduce ? 0 : tyr), ax = rx + (reduce ? 0 : txr);
        var cosY = Math.cos(ay), sinY = Math.sin(ay);
        var cosX = Math.cos(ax), sinX = Math.sin(ax);
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 1;
        for (var r = 0; r < rings.length; r++) {
          var ring = rings[r];
          ctx.beginPath();
          var depthSum = 0;
          for (var i = 0; i < ring.length; i++) {
            var v = ring[i], x = v[0], y = v[1], z = v[2];
            var x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;       // yaw
            var y2 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;     // pitch
            var s = focal / (dist + z2);
            depthSum += z2;
            var px = cx + x1 * R * s, py = cy + y2 * R * s;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          var depth = depthSum / ring.length;                  // -1 (near) .. 1 (far)
          var alpha = 0.20 - depth * 0.13;                     // far side fades back
          ctx.strokeStyle = col.line;
          ctx.globalAlpha = Math.max(0.05, Math.min(0.30, alpha));
          ctx.stroke();
        }
        // poles — a single touch of crimson, the markup pen
        ctx.fillStyle = col.accent;
        for (var pi = 0; pi < 2; pi++) {
          var py0 = pi === 0 ? 1 : -1;
          var z2 = py0 * sinX, y2 = py0 * cosX;
          var s2 = focal / (dist + z2);
          ctx.globalAlpha = z2 < 0 ? 0.85 : 0.35;
          ctx.beginPath();
          ctx.arc(cx, cy + y2 * R * s2, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (reduce) {
        frame(0);                                  // single static wireframe
      } else {
        var running = true;
        if ("IntersectionObserver" in window) {     // pause when hero off-screen
          new IntersectionObserver(function (en) { running = en[0].isIntersecting; })
            .observe(hero);
        }
        (function loop(t) {
          if (running && W > 0) frame(t);
          requestAnimationFrame(loop);
        })();
      }
    }
  }
})();
