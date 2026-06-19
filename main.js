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
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

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

  /* --- 3D wireframe globe --- */
  (function () {
    var host = document.querySelector(".hero, .page-hero, .cs-hero");
    if (!host) return;

    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    var cv = document.createElement("canvas");
    cv.className = "hero__globe";
    cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv);

    function hexRGB(h) {
      h = (h || "").trim().replace("#", "");
      if (h.length === 3) h = h[0]+h[0] + h[1]+h[1] + h[2]+h[2];
      var n = parseInt(h, 16);
      if (isNaN(n)) return [0.09, 0.094, 0.10];
      return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
    }
    var col = { line: [0.09,0.094,0.10], accent: [0.69,0.118,0.184] };
    function readColors() {
      var cs = getComputedStyle(root);
      col.line   = hexRGB(cs.getPropertyValue("--ink"));
      col.accent = hexRGB(cs.getPropertyValue("--crimson"));
    }
    readColors();
    new MutationObserver(readColors).observe(root, {
      attributes: true, attributeFilter: ["data-theme"]
    });

    var NLAT = 9, NLON = 14, SEG = 44, segs = [];
    function ring(fn) {
      var prev = null, i, p;
      for (i = 0; i <= SEG; i++) {
        p = fn(i / SEG);
        if (prev) segs.push(prev[0],prev[1],prev[2], p[0],p[1],p[2]);
        prev = p;
      }
    }
    var k;
    for (k = 1; k < NLAT; k++) (function (phi) {
      ring(function (u) { var t = u*Math.PI*2;
        return [Math.cos(phi)*Math.cos(t), Math.sin(phi), Math.cos(phi)*Math.sin(t)]; });
    })(-Math.PI/2 + (k/NLAT)*Math.PI);
    for (k = 0; k < NLON; k++) (function (th) {
      ring(function (u) { var p = -Math.PI/2 + u*Math.PI;
        return [Math.cos(p)*Math.cos(th), Math.sin(p), Math.cos(p)*Math.sin(th)]; });
    })((k/NLON)*Math.PI*2);
    var GEO = new Float32Array(segs);

    var W = 0, H = 0, ry = 0, rx = -0.42, tX = 0, tY = 0, dist = 3.0;
    window.addEventListener("mousemove", function (e) {
      tY = (e.clientX/window.innerWidth - 0.5) * 0.6;
      tX = (e.clientY/window.innerHeight - 0.5) * 0.4;
    }, { passive: true });

    function mul(a, b) {
      var o = new Float32Array(16), i, b0, b1, b2, b3;
      for (i = 0; i < 4; i++) {
        b0=b[i*4]; b1=b[i*4+1]; b2=b[i*4+2]; b3=b[i*4+3];
        o[i*4]   = a[0]*b0 + a[4]*b1 + a[8]*b2  + a[12]*b3;
        o[i*4+1] = a[1]*b0 + a[5]*b1 + a[9]*b2  + a[13]*b3;
        o[i*4+2] = a[2]*b0 + a[6]*b1 + a[10]*b2 + a[14]*b3;
        o[i*4+3] = a[3]*b0 + a[7]*b1 + a[11]*b2 + a[15]*b3;
      }
      return o;
    }
    function persp(fovy, asp, n, f) {
      var t = 1/Math.tan(fovy/2), nf = 1/(n-f), o = new Float32Array(16);
      o[0]=t/asp; o[5]=t; o[10]=(f+n)*nf; o[11]=-1; o[14]=2*f*n*nf; return o;
    }
    function rotY(a){ var c=Math.cos(a),s=Math.sin(a),o=new Float32Array(16);
      o[0]=c; o[2]=-s; o[5]=1; o[8]=s; o[10]=c; o[15]=1; return o; }
    function rotX(a){ var c=Math.cos(a),s=Math.sin(a),o=new Float32Array(16);
      o[0]=1; o[5]=c; o[6]=s; o[9]=-s; o[10]=c; o[15]=1; return o; }
    function trans(x,y,z){ var o=new Float32Array(16);
      o[0]=o[5]=o[10]=o[15]=1; o[12]=x; o[13]=y; o[14]=z; return o; }
    function modelView() {
      return mul(trans(0, 0, -dist),
             mul(rotX(rx + (reduce?0:tX)), rotY(ry + (reduce?0:tY))));
    }

    var gl = cv.getContext("webgl", { antialias: true })
          || cv.getContext("experimental-webgl", { antialias: true });
    var c2 = gl ? null : (cv.getContext && cv.getContext("2d"));
    if (!gl && !c2) return;

    function size() {
      var r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.max(1, Math.round(W*dpr));
      cv.height = Math.max(1, Math.round(H*dpr));
      if (c2) c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(size).observe(host);
    else window.addEventListener("resize", size);

    var draw;
    if (gl) {
      var vsrc =
        "attribute vec3 aPos;uniform mat4 uMV;uniform mat4 uP;uniform float uPt;" +
        "varying float vZ;void main(){vec4 mv=uMV*vec4(aPos,1.0);vZ=mv.z;" +
        "gl_Position=uP*mv;gl_PointSize=uPt;}";
      var fsrc =
        "precision mediump float;varying float vZ;uniform vec3 uColor;" +
        "uniform float uBase;uniform float uDist;void main(){" +
        "float t=clamp(vZ+uDist,-1.0,1.0);float a=uBase*mix(0.12,1.0,t*0.5+0.5);" +
        "gl_FragColor=vec4(uColor,a);}";
      function sh(type, src) {
        var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
      }
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vsrc));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { host.removeChild(cv); return; }

      var aPos = gl.getAttribLocation(prog, "aPos");
      var uMV = gl.getUniformLocation(prog, "uMV"),
          uP  = gl.getUniformLocation(prog, "uP"),
          uColor = gl.getUniformLocation(prog, "uColor"),
          uBase = gl.getUniformLocation(prog, "uBase"),
          uDist = gl.getUniformLocation(prog, "uDist"),
          uPt = gl.getUniformLocation(prog, "uPt");
      var lineBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferData(gl.ARRAY_BUFFER, GEO, gl.STATIC_DRAW);
      var poleBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, poleBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1,0, 0,-1,0]), gl.STATIC_DRAW);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      draw = function () {
        ry += reduce ? 0 : 0.0016;
        gl.viewport(0, 0, cv.width, cv.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(prog);
        gl.uniformMatrix4fv(uMV, false, modelView());
        gl.uniformMatrix4fv(uP, false, persp(0.92, cv.width/cv.height, 0.1, 100));
        gl.uniform1f(uDist, dist);
        gl.enableVertexAttribArray(aPos);
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uPt, 0.0);
        gl.uniform1f(uBase, 0.34);
        gl.uniform3f(uColor, col.line[0], col.line[1], col.line[2]);
        gl.drawArrays(gl.LINES, 0, GEO.length/3);
        gl.bindBuffer(gl.ARRAY_BUFFER, poleBuf);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uPt, 6.0 * dpr);
        gl.uniform1f(uBase, 0.95);
        gl.uniform3f(uColor, col.accent[0], col.accent[1], col.accent[2]);
        gl.drawArrays(gl.POINTS, 0, 2);
      };
    } else {
      var pts = [], gi;
      for (gi = 0; gi < GEO.length; gi += 3) pts.push([GEO[gi], GEO[gi+1], GEO[gi+2]]);
      draw = function () {
        var cx = W*0.5, cy = H*0.5, R = Math.min(W, H)*0.34, focal = 2.4;
        ry += reduce ? 0 : 0.0016;
        var ay = ry + (reduce?0:tY), ax = rx + (reduce?0:tX);
        var cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
        c2.clearRect(0, 0, W, H);
        c2.lineWidth = 1;
        c2.strokeStyle = "rgba(" + (col.line[0]*255|0) + "," + (col.line[1]*255|0) +
          "," + (col.line[2]*255|0) + ",0.18)";
        c2.beginPath();
        for (var i = 0; i < pts.length; i += 2) {
          for (var j = 0; j < 2; j++) {
            var v = pts[i+j], x = v[0], y = v[1], z = v[2];
            var x1 = x*cY - z*sY, z1 = x*sY + z*cY;
            var y2 = y*cX - z1*sX, z2 = y*sX + z1*cX;
            var s = focal/(dist + z2);
            var px = cx + x1*R*s, py = cy + y2*R*s;
            if (j === 0) c2.moveTo(px, py); else c2.lineTo(px, py);
          }
        }
        c2.stroke();
      };
    }

    if (reduce) { draw(); return; }
    var on = true;
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (en) { on = en[0].isIntersecting; }).observe(host);
    (function loop() {
      if (on && W > 0 && cv.clientWidth > 0) draw();
      requestAnimationFrame(loop);
    })();
  })();

  /* --- page transitions: crimson veil --- */
  (function () {
    if (reduce) return;
    var style = document.createElement('style');
    style.textContent =
      '#mj-veil{position:fixed;inset:0;z-index:9998;background:#5A1625;' +
      'transform:translateX(-100%);will-change:transform;pointer-events:none;' +
      'display:flex;align-items:center;justify-content:center;}' +
      '#mj-veil .veil-mark{' +
      'font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;' +
      'font-weight:300;font-size:clamp(2rem,6vw,4rem);letter-spacing:.25em;' +
      'color:rgba(244,240,235,0.28);opacity:0;transition:opacity .3s ease 0s;}' +
      '#mj-veil.veil-on .veil-mark{opacity:1;transition-delay:.12s;}';
    document.head.appendChild(style);
    var veil = document.createElement('div');
    veil.id = 'mj-veil';
    veil.innerHTML = '<span class="veil-mark">Mahek.</span>';
    document.body.appendChild(veil);
    var EASE = 'cubic-bezier(0.76,0,0.24,1)';
    function revealPage() {
      if (sessionStorage.getItem('mj-veil') !== '1') return;
      sessionStorage.removeItem('mj-veil');
      veil.style.transition = 'none';
      veil.style.transform = 'translateX(0)';
      veil.classList.add('veil-on');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          veil.style.transition = 'transform 520ms ' + EASE;
          veil.style.transform = 'translateX(100%)';
          veil.classList.remove('veil-on');
        });
      });
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '/' || a.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      veil.style.transition = 'none';
      veil.style.transform = 'translateX(-100%)';
      veil.style.pointerEvents = 'all';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          veil.style.transition = 'transform 440ms ' + EASE;
          veil.style.transform = 'translateX(0)';
          veil.classList.add('veil-on');
          setTimeout(function () {
            sessionStorage.setItem('mj-veil', '1');
            window.location.href = href;
          }, 450);
        });
      });
    });
    revealPage();
  })();

})();
