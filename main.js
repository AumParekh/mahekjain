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

  /* --- 3D wireframe globe — real WebGL, on every page --------------------
     Raw WebGL (no engine, no library): an MVP matrix + GLSL shaders draw a
     lat/long sphere as gl.LINES — a spatial form in true 3D, the site's
     thesis made literal, in every page's hero. Reduced motion -> one static
     frame. Where WebGL is unavailable it falls back to a 2D-canvas
     projection of the same sphere. Injected via JS so the no-JS hero stays
     clean; hidden < 760px; pauses while the hero is off-screen. */
  (function () {
    var host = document.querySelector(".hero, .page-hero, .cs-hero");
    if (!host) return;

    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    var cv = document.createElement("canvas");
    cv.className = "hero__globe";
    cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv);

    /* theme-aware colours as 0..1 rgb, refreshed when the token block swaps */
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

    /* lat/long sphere -> flat array of line-segment vertex pairs */
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

    /* 4x4 column-major matrix helpers (gl-matrix conventions) */
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
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);                 // wireframe
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uPt, 0.0);
        gl.uniform1f(uBase, 0.34);
        gl.uniform3f(uColor, col.line[0], col.line[1], col.line[2]);
        gl.drawArrays(gl.LINES, 0, GEO.length/3);
        gl.bindBuffer(gl.ARRAY_BUFFER, poleBuf);                 // crimson poles
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uPt, 6.0 * dpr);
        gl.uniform1f(uBase, 0.95);
        gl.uniform3f(uColor, col.accent[0], col.accent[1], col.accent[2]);
        gl.drawArrays(gl.POINTS, 0, 2);
      };
    } else {
      /* no WebGL: project the same sphere onto a 2D canvas */
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

    if (reduce) { draw(); return; }              // single static frame
    var on = true;
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (en) { on = en[0].isIntersecting; }).observe(host);
    (function loop() {
      if (on && W > 0 && cv.clientWidth > 0) draw();
      requestAnimationFrame(loop);
    })();
  })();
})();

/* ======================================================================
   WORMHOLE ROUTE TRANSITION
   A two-pass WebGL portal between routes: pass 1 renders an animated
   noise/starfield tunnel to a texture (render-to-texture); pass 2 warps
   that texture on a single full-screen quad — radial distortion +
   chromatic aberration + a spiral UV twist toward a vanishing centre —
   driven by one normalised progress value (0->1). The outgoing page is
   pulled into the centre (live transform synced to the same progress);
   the swap happens under the opaque "deep" phase; the incoming page
   emerges outward. Falls back to a quick fade where WebGL is missing and
   is fully disabled under prefers-reduced-motion. ~840ms, eased. Mobile-
   safe (DPR-capped, no pointer needed). This is an MPA, so the in-phase
   and out-phase are handed off across the navigation via sessionStorage.
   ====================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "wh-nav";
  var DUR_IN = 420, DUR_OUT = 520;
  var busy = false, glState, ACC = [0.69, 0.12, 0.18], PET = [0.075, 0.306, 0.282];

  var VSRC = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}";
  var SCENE_FS =
    "precision mediump float;uniform vec2 uRes;uniform float uTime;" +
    "uniform vec3 uAccent;uniform vec3 uAccent2;uniform vec3 uVoid;" +
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);" +
    "float a=hash(i),b=hash(i+vec2(1.0,0.0)),c=hash(i+vec2(0.0,1.0)),d=hash(i+vec2(1.0,1.0));" +
    "return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}" +
    "void main(){vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;" +
    "float r=length(uv)+1e-4;float a=atan(uv.y,uv.x);" +
    "float depth=0.35/r+uTime*0.5;vec2 tc=vec2(a*1.2732,depth);" +
    "float n=noise(tc*2.5)*0.6+noise(tc*5.5)*0.3;" +            // softer nebula
    "float core=smoothstep(0.62,0.0,r);" +                      // 1 at the centre
    "vec3 neb=mix(uAccent2,uAccent,core);" +                    // petrol -> crimson inward
    "vec3 col=mix(uVoid,neb,clamp(n*0.55+core*0.65,0.0,1.0));" +
    "float cell=hash(floor(vec2(a*3.0,depth*1.2)));" +          // gentler star streaks
    "float star=smoothstep(0.96,1.0,cell)*smoothstep(0.0,0.5,fract(depth*0.6+cell));" +
    "col+=mix(uAccent2,vec3(1.0),0.5)*star*0.8;" +
    "gl_FragColor=vec4(col,1.0);}";
  var WARP_FS =
    "precision mediump float;uniform sampler2D uScene;uniform vec2 uRes;uniform float uProgress;" +
    "void main(){vec2 c=(gl_FragCoord.xy-0.5*uRes)/uRes.y;" +
    "float r=length(c)+1e-4;float ang=atan(c.y,c.x);" +
    "float inten=1.0-abs(uProgress*2.0-1.0);float dir=uProgress<0.5?1.0:-1.0;" +
    "ang+=(0.5/(r+0.14))*inten*dir;" +                          // gentler twist
    "float rr=r*(1.0-0.55*inten*clamp(1.0-r,0.0,1.0));" +
    "vec2 wc=vec2(cos(ang),sin(ang))*rr;" +
    "vec2 uv=vec2(wc.x*uRes.y/uRes.x,wc.y)+0.5;" +
    "vec2 dv=c/r;float ca=0.016*inten;" +
    "float R=texture2D(uScene,uv+dv*ca).r;" +
    "float G=texture2D(uScene,uv).g;" +
    "float B=texture2D(uScene,uv-dv*ca).b;" +
    "float alpha=smoothstep(0.0,0.42,inten);" +                 // smoother reveal
    "gl_FragColor=vec4(vec3(R,G,B)*alpha,alpha);}";

  function hexRGB(h) {
    h = (h || "").trim().replace("#", "");
    if (h.length === 3) h = h[0]+h[0] + h[1]+h[1] + h[2]+h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return [0.69, 0.12, 0.18];
    return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
  }
  function readAcc() {
    try {
      var cs = getComputedStyle(document.documentElement);
      ACC = hexRGB(cs.getPropertyValue("--crimson"));
      PET = hexRGB(cs.getPropertyValue("--petrol"));
    } catch (e) {}
  }
  function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function animateHalf(dur, onFrame, done) {
    var start;
    function step(ts) {
      if (start === undefined) start = ts;
      var t = Math.min((ts - start)/dur, 1);
      onFrame(ease(t));
      if (t < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  function ensureGL() {
    if (glState !== undefined) return !!glState;
    var canvas = document.createElement("canvas");
    canvas.className = "wh-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "none";
    var gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false })
          || canvas.getContext("experimental-webgl");
    if (!gl) { glState = null; return false; }
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    function prog(vs, fs) {
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    }
    var sceneP = prog(VSRC, SCENE_FS), warpP = prog(VSRC, WARP_FS);
    if (!sceneP || !warpP) { glState = null; return false; }
    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    glState = {
      gl: gl, canvas: canvas, sceneP: sceneP, warpP: warpP, quad: quad,
      tex: gl.createTexture(), fbo: gl.createFramebuffer(), w: 0, h: 0,
      loc: {
        sPos: gl.getAttribLocation(sceneP, "aPos"), sRes: gl.getUniformLocation(sceneP, "uRes"),
        sTime: gl.getUniformLocation(sceneP, "uTime"), sAcc: gl.getUniformLocation(sceneP, "uAccent"),
        sAcc2: gl.getUniformLocation(sceneP, "uAccent2"), sVoid: gl.getUniformLocation(sceneP, "uVoid"),
        wPos: gl.getAttribLocation(warpP, "aPos"), wRes: gl.getUniformLocation(warpP, "uRes"),
        wScene: gl.getUniformLocation(warpP, "uScene"), wProg: gl.getUniformLocation(warpP, "uProgress")
      }
    };
    resizeGL();
    return true;
  }
  function resizeGL() {
    if (!glState) return;
    var gl = glState.gl, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(window.innerWidth*dpr));
    var h = Math.max(1, Math.round(window.innerHeight*dpr));
    glState.canvas.width = w; glState.canvas.height = h; glState.w = w; glState.h = h;
    gl.bindTexture(gl.TEXTURE_2D, glState.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, glState.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glState.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function renderGL(p) {
    var s = glState, gl = s.gl, w = s.w, h = s.h, t = performance.now()/1000, L = s.loc;
    gl.bindFramebuffer(gl.FRAMEBUFFER, s.fbo);          // pass 1: tunnel -> texture
    gl.viewport(0, 0, w, h);
    gl.disable(gl.BLEND);
    gl.useProgram(s.sceneP);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.quad);
    gl.enableVertexAttribArray(L.sPos); gl.vertexAttribPointer(L.sPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(L.sRes, w, h); gl.uniform1f(L.sTime, t);
    gl.uniform3f(L.sAcc, ACC[0], ACC[1], ACC[2]); gl.uniform3f(L.sAcc2, PET[0], PET[1], PET[2]);
    gl.uniform3f(L.sVoid, 0.082, 0.055, 0.075);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);           // pass 2: warp -> screen
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(s.warpP);
    gl.bindBuffer(gl.ARRAY_BUFFER, s.quad);
    gl.enableVertexAttribArray(L.wPos); gl.vertexAttribPointer(L.wPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.tex); gl.uniform1i(L.wScene, 0);
    gl.uniform2f(L.wRes, w, h); gl.uniform1f(L.wProg, p);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function showCanvas() {
    if (!glState) return;
    /* append to <html>, NOT <body> — body is transformed during the warp and
       would otherwise distort the full-screen overlay itself. */
    if (!glState.canvas.parentNode) document.documentElement.appendChild(glState.canvas);
    glState.canvas.style.display = "block";
  }
  function hideCanvas() { if (glState && glState.canvas) glState.canvas.style.display = "none"; }

  /* live page transform — sucks the view toward the vanishing centre */
  function warpStart() {
    document.body.classList.add("wh-warp");
    document.body.style.transformOrigin = "50% " + (window.scrollY + window.innerHeight/2) + "px";
    document.documentElement.style.overflow = "hidden";   // clip rotation overflow
  }
  function warpEnd() {
    document.body.classList.remove("wh-warp");
    document.body.style.transform = ""; document.body.style.opacity = "";
    document.body.style.transformOrigin = "";
    document.documentElement.style.overflow = "";
  }
  function setBody(k, isIn) {
    var kk = isIn ? k : (1 - k);                        // 0 = settled, 1 = consumed
    var scale = 1 - 0.16*kk, rot = 13*kk*(isIn ? 1 : -1), op = 1 - 0.6*kk;
    document.body.style.transform = "rotate(" + rot + "deg) scale(" + scale + ")";
    document.body.style.opacity = op;
  }

  function go(href) { try { sessionStorage.setItem(KEY, "1"); } catch (e) {} location.href = href; }

  function playIn(href) {
    if (busy) return; busy = true; readAcc();
    if (!ensureGL()) {                                  // fallback: quick fade
      var f = document.createElement("div"); f.className = "wh-fade"; f.style.opacity = "0";
      document.documentElement.appendChild(f);
      animateHalf(260, function (k) { f.style.opacity = k; }, function () { go(href); });
      return;
    }
    warpStart(); showCanvas();
    animateHalf(DUR_IN, function (k) { renderGL(0.5*k); setBody(k, true); },
      function () { go(href); });
  }

  function playOut() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    var de = document.documentElement;
    if (reduce) { de.classList.remove("wh-emerging"); return; }
    readAcc();
    if (!ensureGL()) {                                  // fallback: fade the cover out
      animateHalf(300, function (k) { de.style.setProperty("--wh-cover-op", 1 - k); },
        function () { de.classList.remove("wh-emerging"); de.style.removeProperty("--wh-cover-op"); });
      return;
    }
    busy = true; warpStart(); showCanvas();
    renderGL(0.5);                                      // paint an opaque frame first,
    de.classList.remove("wh-emerging");                // then drop the instant cover
    animateHalf(DUR_OUT, function (k) { renderGL(0.5 + 0.5*k); setBody(k, false); },
      function () { hideCanvas(); warpEnd(); busy = false; });
  }

  function navable(a) {
    if (!a) return null;
    if (a.target && a.target !== "_self") return null;
    if (a.hasAttribute("download")) return null;
    var raw = a.getAttribute("href"); if (!raw) return null;
    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return null; }
    if (url.origin !== location.origin) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.href === location.href) return null;
    if (url.pathname === location.pathname && url.hash) return null;  // in-page anchor
    return url.href;
  }

  document.addEventListener("click", function (e) {
    if (reduce) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    var href = navable(a);
    if (!href) return;
    e.preventDefault();
    if (busy) return;
    playIn(href);
  });

  window.addEventListener("resize", function () { if (glState) resizeGL(); }, { passive: true });

  /* incoming page: if we arrived through the portal, play the emerge half */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {                                  // restored from bfcache — reset
      busy = false; warpEnd(); hideCanvas();
      document.documentElement.classList.remove("wh-emerging");
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      return;
    }
  });

  try { if (sessionStorage.getItem(KEY)) playOut(); } catch (e) {}
})();
