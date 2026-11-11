/* =========================================================================
   01 · INTI — state global, util, loop animasi, tema
   ========================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js", "is-loading");

  var App = (window.App = {});
  App.root = root;
  App.RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  App.FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  App.$ = function (s, c) {
    return (c || document).querySelector(s);
  };
  App.$$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };
  App.clamp = function (v, a, b) {
    return Math.min(b, Math.max(a, v));
  };
  App.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };
  App.map = function (v, a, b, c, d) {
    return c + (d - c) * ((v - a) / (b - a));
  };
  App.ease = {
    out: function (t) {
      return 1 - Math.pow(1 - t, 4);
    },
    expo: function (t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    },
    io: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
  };

  App.dom = function (fn) {
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", fn)
      : fn();
  };
  App.W = innerWidth;
  App.H = innerHeight;
  App.mouse = {
    x: App.W / 2,
    y: App.H / 2,
    nx: 0,
    ny: 0,
    seen: false,
    down: false,
  };
  App.scroll = {
    y: window.pageYOffset,
    s: window.pageYOffset,
    prev: window.pageYOffset,
    vel: 0,
    max: 1,
    p: 0,
  };

  /* ---------- registri ---------- */
  var ticks = [],
    resizers = [],
    themeFns = [],
    readyFns = [];
  App.tick = function (fn) {
    ticks.push(fn);
  };
  App.onResize = function (fn) {
    resizers.push(fn);
  };
  App.onTheme = function (fn) {
    themeFns.push(fn);
  };
  App.isReady = false;
  App.onReady = function (fn) {
    App.isReady ? fn() : readyFns.push(fn);
  };
  App.setReady = function () {
    if (App.isReady) return;
    App.isReady = true;
    root.classList.remove("is-loading");
    root.classList.add("is-ready");
    readyFns.forEach(function (f) {
      safe(f);
    });
  };
  var warned = {};
  function safe(fn, a, b) {
    try {
      fn(a, b);
    } catch (e) {
      var k = String(e && e.message);
      if (!warned[k]) {
        warned[k] = 1;
        console.error(e);
      }
    }
  }

  /* ---------- warna dari token CSS ---------- */
  App.rgb = function (hex) {
    hex = String(hex).trim().replace("#", "");
    if (hex.length === 3)
      hex = hex
        .split("")
        .map(function (c) {
          return c + c;
        })
        .join("");
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  App.rgba = function (c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  };
  App.colors = {};
  App.effectiveTheme = function () {
    var t = root.getAttribute("data-theme");
    return (
      t ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  };
  function readColors() {
    var cs = getComputedStyle(root);
    var g = function (n) {
      return cs.getPropertyValue(n).trim() || "#888888";
    };
    App.isDark = App.effectiveTheme() === "dark";
    App.colors = {
      ink: App.rgb(g("--ink")),
      accent: App.rgb(g("--accent")),
      cool: App.rgb(g("--cool")),
      bg: App.rgb(g("--bg")),
      bg2: App.rgb(g("--bg-2")),
    };
    var b = App.$("#themeBtn");
    if (b) b.setAttribute("data-mode", App.isDark ? "dark" : "light");
    themeFns.forEach(function (f) {
      safe(f);
    });
  }
  App.readColors = readColors;

  /* ---------- tema: terang / gelap dengan lingkaran yang meluas ---------- */
  try {
    var saved = localStorage.getItem("ak-theme");
    if (saved === "dark" || saved === "light")
      root.setAttribute("data-theme", saved);
  } catch (e) {}
  matchMedia("(prefers-color-scheme: dark)").addEventListener(
    "change",
    readColors,
  );
  App.dom(function () {
    readColors();
    var btn = App.$("#themeBtn");
    btn.addEventListener("click", function (e) {
      var next = App.effectiveTheme() === "dark" ? "light" : "dark";
      var apply = function () {
        root.setAttribute("data-theme", next);
        try {
          localStorage.setItem("ak-theme", next);
        } catch (err) {}
        readColors();
      };
      if (document.startViewTransition && !App.RM) {
        var r = btn.getBoundingClientRect(),
          x = r.left + r.width / 2,
          y = r.top + r.height / 2;
        var rad = Math.hypot(
          Math.max(x, innerWidth - x),
          Math.max(y, innerHeight - y),
        );
        var vt;
        try {
          vt = document.startViewTransition(apply);
        } catch (err) {
          apply();
          return;
        }
        vt.ready
          .then(function () {
            root.animate(
              {
                clipPath: [
                  "circle(0px at " + x + "px " + y + "px)",
                  "circle(" + rad + "px at " + x + "px " + y + "px)",
                ],
              },
              {
                duration: 900,
                easing: "cubic-bezier(.76,0,.24,1)",
                pseudoElement: "::view-transition-new(root)",
              },
            );
          })
          .catch(function () {});
      } else {
        apply();
      }
    });
  });

  /* ---------- input ---------- */
  addEventListener(
    "pointermove",
    function (e) {
      var m = App.mouse;
      m.x = e.clientX;
      m.y = e.clientY;
      m.nx = (e.clientX / App.W) * 2 - 1;
      m.ny = (e.clientY / App.H) * 2 - 1;
      m.seen = true;
    },
    { passive: true },
  );
  addEventListener(
    "pointerdown",
    function () {
      App.mouse.down = true;
    },
    { passive: true },
  );
  addEventListener(
    "pointerup",
    function () {
      App.mouse.down = false;
    },
    { passive: true },
  );

  /* ---------- resize ---------- */
  var rt;
  function doResize() {
    App.W = innerWidth;
    App.H = innerHeight;
    var d = document.documentElement;
    App.scroll.max = Math.max(1, d.scrollHeight - App.H);
    resizers.forEach(function (f) {
      safe(f);
    });
  }
  App.relayout = doResize;
  addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(doResize, 120);
  });
  addEventListener("load", function () {
    setTimeout(doResize, 60);
  });
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () {
      setTimeout(doResize, 60);
    });

  /* ---------- loop utama ---------- */
  var last = performance.now(),
    hidden = false;
  document.addEventListener("visibilitychange", function () {
    hidden = document.hidden;
    last = performance.now();
  });
  function loop(now) {
    requestAnimationFrame(loop);
    if (hidden) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var sc = App.scroll,
      y = window.pageYOffset;
    var v = (y - sc.prev) / Math.max(dt * 60, 0.001);
    sc.vel = App.lerp(sc.vel, App.clamp(v, -80, 80), 0.18);
    sc.prev = y;
    sc.y = y;
    sc.s = App.lerp(sc.s, y, 1 - Math.pow(0.0009, dt));
    if (Math.abs(sc.s - y) < 0.05) sc.s = y;
    sc.max = Math.max(1, root.scrollHeight - App.H);
    sc.p = App.clamp(y / sc.max, 0, 1);
    for (var i = 0; i < ticks.length; i++) safe(ticks[i], dt, now / 1000);
  }
  App.dom(function () {
    doResize();
    requestAnimationFrame(loop);
  });
})();

/* =========================================================================
   02 · INTRO — preloader, pecah teks, scramble, reveal saat scroll
   ========================================================================= */
(function () {
  "use strict";
  var A = window.App,
    $ = A.$,
    $$ = A.$$,
    clamp = A.clamp;

  /* ---------- scramble teks ---------- */
  var GLYPHS = "!<>-_\\/[]{}=+*^?#";
  A.scramble = function (el, to, dur) {
    dur = dur || 700;
    var from = el.textContent,
      len = Math.max(from.length, to.length),
      q = [],
      i;
    for (i = 0; i < len; i++) {
      var s = Math.random() * dur * 0.35;
      q.push({
        f: from[i] || "",
        t: to[i] || "",
        s: s,
        e: s + dur * 0.3 + Math.random() * dur * 0.35,
        c: "",
        n: 0,
      });
    }
    var token = (el._sc = {}),
      t0 = performance.now();
    (function step(now) {
      if (el._sc !== token) return;
      var t = now - t0,
        out = "",
        done = 0;
      q.forEach(function (o) {
        if (t >= o.e) {
          done++;
          out += o.t;
        } else if (t >= o.s) {
          if (!o.c || now - o.n > 60) {
            o.c = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            o.n = now;
          }
          out += o.c;
        } else out += o.f;
      });
      el.textContent = out;
      if (done < len) requestAnimationFrame(step);
      else el.textContent = to;
    })(t0);
  };
  $$("[data-scramble]").forEach(function (el) {
    var txt = el.textContent;
    el.addEventListener("mouseenter", function () {
      if (!A.RM) A.scramble(el, txt, 500);
    });
    el.addEventListener("focus", function () {
      if (!A.RM) A.scramble(el, txt, 500);
    });
  });

  /* ---------- pecah teks (kata / huruf) ---------- */
  function splitNode(node, mode, ctx) {
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
      if (ch.nodeType === 3) {
        var frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          var w = document.createElement("span");
          w.className = "w";
          w.setAttribute("aria-hidden", "true");
          if (mode === "words") {
            var wi = document.createElement("span");
            wi.className = "wi";
            wi.textContent = tok;
            wi.style.setProperty("--i", ctx.i++);
            w.appendChild(wi);
          } else {
            Array.from(tok).forEach(function (chr) {
              var c = document.createElement("span");
              c.className = "c";
              c.textContent = chr;
              c.style.setProperty("--i", ctx.i++);
              w.appendChild(c);
            });
          }
          frag.appendChild(w);
        });
        ch.parentNode.replaceChild(frag, ch);
      } else if (ch.nodeType === 1 && ch.tagName !== "BR")
        splitNode(ch, mode, ctx);
    });
  }
  $$("[data-split]").forEach(function (el) {
    var mode = el.getAttribute("data-split") === "words" ? "words" : "chars";
    if (!el.hasAttribute("aria-label") && /^H[1-6]$/.test(el.tagName))
      el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    splitNode(el, mode, { i: 0 });
  });

  /* ---------- rotator peran di hero ---------- */
  var role = $("#role");
  if (role && !A.RM) {
    var roles = [
        "Hamba Tuhan",
        "Frontend Developer",
        "Video Editor",
        "Motion Designer",
        "Graphic Designer ",
      ],
      ri = 0;
    A.onReady(function () {
      setInterval(function () {
        ri = (ri + 1) % roles.length;
        A.scramble(role, roles[ri], 800);
      }, 3000);
    });
  }

  /* ---------- reveal saat masuk viewport ---------- */
  var items = $$("[data-reveal],[data-split]");
  function show(el) {
    el.classList.add("in");
  }
  if (!("IntersectionObserver" in window) || A.RM) {
    items.forEach(show);
  } else {
    var io = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            e.target._vis = true;
            if (A.isReady) {
              show(e.target);
              io.unobserve(e.target);
            }
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach(function (el) {
      io.observe(el);
    });
    A.onReady(function () {
      items.forEach(function (el) {
        if (el._vis) {
          show(el);
          io.unobserve(el);
        }
      });
    });
  }

  /* ---------- preloader ---------- */
  var pre = $("#pre"),
    num = $("#preNum"),
    word = $("#preWord"),
    bar = $("#preBar");
  var words = ["Halo", "Hello", "Hola", "Bonjour", "Ciao", "Salam", "Shalom"];
  function finish() {
    if (!pre || pre.classList.contains("is-done")) return;
    pre.classList.add("is-done");
    setTimeout(function () {
      A.setReady();
    }, 380);
    setTimeout(function () {
      pre.remove();
    }, 1800);
  }
  if (A.RM || !pre) {
    if (pre) pre.remove();
    A.setReady();
  } else {
    var seen = false;
    try {
      seen = sessionStorage.getItem("ak-seen") === "1";
      sessionStorage.setItem("ak-seen", "1");
    } catch (e) {}
    var dur = seen ? 1700 : 3000,
      t0 = performance.now();
    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1),
        e = A.ease.io(p);
      num.textContent = String(Math.round(e * 100)).padStart(3, "0");
      bar.style.transform = "scaleX(" + e + ")";
      word.textContent =
        words[Math.min(words.length - 1, Math.floor(p * words.length))];
      if (p < 1) requestAnimationFrame(step);
      else setTimeout(finish, 220);
    })(t0);
    setTimeout(finish, 5000); /* pengaman */
  }
})();

/* =========================================================================
   03 · INTERAKSI — kursor kustom, tombol magnetik, tilt 3D, spotlight
   ========================================================================= */
(function () {
  "use strict";
  var A = window.App,
    $ = A.$,
    $$ = A.$$,
    lerp = A.lerp;

  /* ---------- kursor: titik presisi + cincin yang tertinggal ---------- */
  if (A.FINE && !A.RM) {
    var cur = $("#cur"),
      ring = $("#curRing"),
      lab = $("span", ring);
    A.root.classList.add("has-cursor");
    cur.classList.add("is-hidden");
    ring.classList.add("is-hidden");
    var rx = A.mouse.x,
      ry = A.mouse.y,
      shown = false;
    A.tick(function (dt) {
      var m = A.mouse;
      if (!shown && m.seen) {
        shown = true;
        rx = m.x;
        ry = m.y;
        cur.classList.remove("is-hidden");
        ring.classList.remove("is-hidden");
      }
      var k = 1 - Math.pow(0.0008, dt);
      rx = lerp(rx, m.x, k);
      ry = lerp(ry, m.y, k);
      cur.style.transform =
        "translate3d(" + m.x + "px," + m.y + "px,0) translate(-50%,-50%)";
      ring.style.transform =
        "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
    });
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest ? e.target.closest("[data-cursor]") : null;
      if (t) {
        lab.textContent = t.getAttribute("data-cursor");
        ring.classList.add("is-label");
        ring.classList.remove("is-link");
        return;
      }
      ring.classList.remove("is-label");
      ring.classList.toggle(
        "is-link",
        !!(
          e.target.closest && e.target.closest('a,button,.chip,[role="button"]')
        ),
      );
    });
    document.addEventListener("pointerdown", function () {
      ring.classList.add("is-down");
    });
    document.addEventListener("pointerup", function () {
      ring.classList.remove("is-down");
    });
    document.documentElement.addEventListener("pointerleave", function () {
      cur.classList.add("is-hidden");
      ring.classList.add("is-hidden");
    });
    document.documentElement.addEventListener("pointerenter", function () {
      if (shown) {
        cur.classList.remove("is-hidden");
        ring.classList.remove("is-hidden");
      }
    });
  }

  /* ---------- tombol magnetik ---------- */
  if (A.FINE && !A.RM) {
    var mags = $$("[data-magnet]").map(function (el) {
      return { el: el, inner: $(".btn__t", el), x: 0, y: 0 };
    });
    A.tick(function () {
      var m = A.mouse;
      for (var i = 0; i < mags.length; i++) {
        var o = mags[i],
          r = o.el.getBoundingClientRect();
        var cx = r.left + r.width / 2 - o.x,
          cy = r.top + r.height / 2 - o.y;
        var dx = m.x - cx,
          dy = m.y - cy,
          d = Math.hypot(dx, dy),
          rad = Math.max(r.width, r.height) * 0.85;
        var tx = 0,
          ty = 0;
        if (m.seen && d < rad && r.bottom > 0 && r.top < A.H) {
          tx = dx * 0.3;
          ty = dy * 0.3;
        }
        o.x = lerp(o.x, tx, 0.16);
        o.y = lerp(o.y, ty, 0.16);
        if (Math.abs(o.x) < 0.02 && Math.abs(o.y) < 0.02 && !tx && !ty) {
          o.x = o.y = 0;
          o.el.style.transform = "";
          if (o.inner) o.inner.style.transform = "";
          continue;
        }
        o.el.style.transform =
          "translate3d(" + o.x.toFixed(2) + "px," + o.y.toFixed(2) + "px,0)";
        if (o.inner)
          o.inner.style.transform =
            "translate3d(" +
            (o.x * 0.35).toFixed(2) +
            "px," +
            (o.y * 0.35).toFixed(2) +
            "px,0)";
      }
    });
  }

  /* ---------- tilt 3D + kilau ---------- */
  $$("[data-tilt]").forEach(function (el) {
    var max = el.classList.contains("card__in") ? 7 : 9;
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" || A.RM) return;
      var r = el.getBoundingClientRect(),
        px = (e.clientX - r.left) / r.width,
        py = (e.clientY - r.top) / r.height;
      el.style.transform =
        "rotateY(" +
        ((px - 0.5) * 2 * max).toFixed(2) +
        "deg) rotateX(" +
        (-(py - 0.5) * 2 * max).toFixed(2) +
        "deg) scale3d(1.015,1.015,1)";
      el.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
    });
    el.addEventListener("pointerleave", function () {
      el.style.transform = "";
    });
  });

  /* ---------- spotlight yang mengikuti kursor ---------- */
  $$("[data-spot]").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });
})();

/* =========================================================================
   04 · ORB HERO — globe partikel 3D + tiga orbit berlabel (Canvas 2D)
   Proyeksi perspektif dihitung manual; bisa diseret, bereaksi pada kursor,
   kecepatan scroll, dan menggembung di titik yang didekati kursor.
   ========================================================================= */
(function () {
  "use strict";
  var A = window.App,
    $ = A.$,
    clamp = A.clamp,
    lerp = A.lerp;
  var cv = $("#orb");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = 0,
    H = 0,
    dpr = 1,
    R = 100,
    OX = 0,
    OY = 0,
    F = 7;
  var N = A.W < 700 ? 380 : 640;
  var pts = [],
    i;
  for (i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2,
      r = Math.sqrt(1 - y * y),
      th = i * 2.399963;
    pts.push({
      x: Math.cos(th) * r,
      y: y,
      z: Math.sin(th) * r,
      ph: Math.random() * 6.283,
      b: i % 29 === 0,
    });
  }
  var rings = [
    {
      r: 1.4,
      tx: 0.42,
      tz: 0.15,
      sp: 0.42,
      nodes: ["React", "WebGL", "Next.js"],
    },
    {
      r: 1.68,
      tx: -0.95,
      tz: 0.55,
      sp: -0.3,
      nodes: ["UI", "Motion", "3D", "API"],
    },
    {
      r: 1.96,
      tx: 0.2,
      tz: -0.75,
      sp: 0.2,
      nodes: ["Figma", "Node", "TS"],
    },
  ];
  rings.forEach(function (g) {
    g.a = Math.random() * 6.28;
    g.pp = [];
    g.nn = [];
    for (var k = 0; k <= 96; k++) g.pp.push({ x: 0, y: 0, z: 0 });
    g.nodes.forEach(function () {
      g.nn.push({ x: 0, y: 0, z: 0, k: 1 });
    });
  });

  var yawBase = 0.6,
    pitchBase = -0.28,
    vyaw = 0,
    vpitch = 0,
    drag = false,
    lx = 0,
    ly = 0,
    vis = true;
  var yaw = 0,
    pitch = 0,
    cyw,
    syw,
    cpt,
    spt;
  var P = { x: 0, y: 0, z: 0, k: 1 };

  function size() {
    var rc = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rc.width;
    H = rc.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.19;
    OX = W / 2;
    OY = H / 2;
  }
  function proj(x, y, z, o) {
    var x1 = x * cyw + z * syw,
      z1 = -x * syw + z * cyw;
    var y1 = y * cpt - z1 * spt,
      z2 = y * spt + z1 * cpt;
    var k = F / (F - z2);
    o.x = OX + x1 * R * k;
    o.y = OY + y1 * R * k;
    o.z = z2;
    o.k = k;
    return o;
  }
  function tilt(x, y, z, tx, tz, o) {
    var c = Math.cos(tx),
      s = Math.sin(tx),
      y1 = y * c - z * s,
      z1 = y * s + z * c;
    c = Math.cos(tz);
    s = Math.sin(tz);
    o.x = x * c - y1 * s;
    o.y = x * s + y1 * c;
    o.z = z1;
    return o;
  }
  var T = { x: 0, y: 0, z: 0 };

  function line(a, b, rgb, al) {
    ctx.strokeStyle = A.rgba(rgb, al);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function updateRings(t) {
    rings.forEach(function (g) {
      for (var k = 0; k <= 96; k++) {
        var a = (k / 96) * 6.2832;
        tilt(Math.cos(a) * g.r, 0, Math.sin(a) * g.r, g.tx, g.tz, T);
        proj(T.x, T.y, T.z, g.pp[k]);
      }
      g.nodes.forEach(function (_, n) {
        var a = g.a + (n * 6.2832) / g.nodes.length;
        tilt(Math.cos(a) * g.r, 0, Math.sin(a) * g.r, g.tx, g.tz, T);
        proj(T.x, T.y, T.z, g.nn[n]);
      });
    });
  }
  function drawRings(front) {
    var col = A.colors,
      acc = col.accent,
      ink = col.ink;
    ctx.setLineDash([2, 7]);
    ctx.lineWidth = 1;
    rings.forEach(function (g) {
      for (var k = 0; k < 96; k++) {
        var a = g.pp[k],
          b = g.pp[k + 1],
          z = (a.z + b.z) / 2;
        if (z >= 0 !== front) continue;
        line(a, b, ink, A.map(z, -2, 2, 0.1, 0.5));
      }
    });
    ctx.setLineDash([]);
    rings.forEach(function (g) {
      g.nodes.forEach(function (label, n) {
        var p = g.nn[n];
        if (p.z >= 0 !== front) return;
        var d = A.clamp((p.z + 2) / 4, 0, 1);
        /* ekor orbit */
        ctx.lineWidth = 2;
        var prev = null,
          dir = g.sp > 0 ? -1 : 1;
        for (var s = 0; s <= 22; s++) {
          var a = g.a + (n * 6.2832) / g.nodes.length + dir * s * 0.045;
          tilt(Math.cos(a) * g.r, 0, Math.sin(a) * g.r, g.tx, g.tz, T);
          var q = proj(T.x, T.y, T.z, { x: 0, y: 0, z: 0, k: 1 });
          if (prev) line(prev, q, acc, (1 - s / 22) * 0.55 * (0.4 + d));
          prev = q;
        }
        /* titik + label */
        var rad = 3.2 * p.k;
        ctx.fillStyle = A.rgba(acc, 0.18 * (0.4 + d));
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 2.6, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = A.rgba(acc, 0.5 + 0.5 * d);
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, 6.2832);
        ctx.fill();
        ctx.font =
          "500 " +
          Math.round(10.5 * clamp(p.k, 0.85, 1.25)) +
          'px "JetBrains Mono",ui-monospace,monospace';
        ctx.fillStyle = A.rgba(ink, 0.45 + 0.55 * d);
        ctx.fillText(label, p.x + 10 * p.k, p.y - 8 * p.k);
      });
    });
  }

  function frame(dt, t) {
    var col = A.colors;
    if (!col.ink) return;
    var rc = cv.getBoundingClientRect(),
      m = A.mouse;
    var mx = m.x - rc.left,
      my = m.y - rc.top;
    var on = m.seen && !drag && mx > -R && mx < W + R && my > -R && my < H + R;

    /* rotasi: otomatis + kecepatan scroll + seret + parallax kursor */
    if (!drag) {
      yawBase += dt * 0.2 + vyaw;
      pitchBase += vpitch;
      vyaw *= 0.94;
      vpitch *= 0.94;
    }
    yawBase += A.scroll.vel * 0.0012;
    pitchBase = clamp(pitchBase, -1.1, 1.1);
    var ty = m.seen ? m.nx * 0.35 : 0,
      tp = m.seen ? m.ny * 0.22 : 0;
    yaw = lerp(yaw, yawBase + ty, 0.08);
    pitch = lerp(pitch, pitchBase + tp, 0.08);
    cyw = Math.cos(yaw);
    syw = Math.sin(yaw);
    cpt = Math.cos(pitch);
    spt = Math.sin(pitch);
    rings.forEach(function (g) {
      g.a += g.sp * dt;
    });

    ctx.clearRect(0, 0, W, H);
    var cool = col.cool,
      acc = col.accent,
      ink = col.ink,
      a,
      b,
      k,
      j;
    updateRings(t);
    drawRings(false);

    /* kerangka lintang/bujur */
    ctx.lineWidth = 1;
    for (k = -3; k <= 3; k++) {
      var ph = k * 0.38,
        cph = Math.cos(ph),
        sph = Math.sin(ph);
      a = null;
      for (j = 0; j <= 48; j++) {
        var an = (j / 48) * 6.2832;
        b = proj(Math.cos(an) * cph, sph, Math.sin(an) * cph, {
          x: 0,
          y: 0,
          z: 0,
          k: 1,
        });
        if (a) line(a, b, cool, A.map((a.z + b.z) / 2, -1, 1, 0.03, 0.2));
        a = b;
      }
    }
    for (k = 0; k < 10; k++) {
      var be = (k * Math.PI) / 10,
        cb = Math.cos(be),
        sb = Math.sin(be);
      a = null;
      for (j = 0; j <= 48; j++) {
        var an2 = (j / 48) * 6.2832;
        b = proj(Math.cos(an2) * cb, Math.sin(an2), Math.cos(an2) * sb, {
          x: 0,
          y: 0,
          z: 0,
          k: 1,
        });
        if (a) line(a, b, cool, A.map((a.z + b.z) / 2, -1, 1, 0.02, 0.16));
        a = b;
      }
    }

    /* titik permukaan: gelombang halus + gembung dekat kursor */
    for (i = 0; i < N; i++) {
      var p = pts[i],
        rad = 1 + 0.035 * Math.sin(t * 1.4 + p.ph + p.y * 5);
      proj(p.x * rad, p.y * rad, p.z * rad, P);
      var bulge = 0;
      if (on && P.z > -0.2) {
        var d = Math.hypot(P.x - mx, P.y - my);
        if (d < R * 0.8) {
          bulge = Math.pow(1 - d / (R * 0.8), 2);
          rad += 0.34 * bulge;
          proj(p.x * rad, p.y * rad, p.z * rad, P);
        }
      }
      var dn = (P.z + 1.1) / 2.2;
      var hot = bulge > 0.06 || p.b;
      var sz = (hot ? 2.1 : 0.85 + 1.2 * dn) * P.k * (1 + bulge * 1.4);
      ctx.fillStyle = hot
        ? A.rgba(acc, 0.35 + 0.65 * dn)
        : A.rgba(cool, 0.12 + 0.8 * dn * dn);
      ctx.beginPath();
      ctx.arc(P.x, P.y, sz, 0, 6.2832);
      ctx.fill();
      if (p.b && P.z > -0.3) {
        var pu = (t * 0.9 + p.ph) % 1;
        ctx.strokeStyle = A.rgba(acc, (1 - pu) * 0.45 * dn);
        ctx.beginPath();
        ctx.arc(P.x, P.y, sz + pu * 14 * P.k, 0, 6.2832);
        ctx.stroke();
      }
    }
    drawRings(true);
  }

  /* ---------- seret untuk memutar ---------- */
  cv.addEventListener("pointerdown", function (e) {
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
    vyaw = vpitch = 0;
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (err) {}
  });
  cv.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - lx,
      dy = e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
    yawBase += dx * 0.009;
    pitchBase -= dy * 0.007;
    vyaw = dx * 0.0016;
    vpitch = -dy * 0.0012;
  });
  function up() {
    drag = false;
  }
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);

  /* ---------- siklus hidup ---------- */
  if ("IntersectionObserver" in window)
    new IntersectionObserver(function (es) {
      vis = es[0].isIntersecting;
    }).observe(cv);
  size();
  A.onResize(function () {
    size();
    if (A.RM) frame(0, 0);
  });
  A.onTheme(function () {
    if (A.RM) frame(0, 0);
  });
  if (A.RM) {
    A.onReady(function () {
      frame(0, 0);
    });
  } else
    A.tick(function (dt, t) {
      if (vis) frame(dt, t);
    });
})();

/* =========================================================================
   05 · MEDAN PARTIKEL — latar fixed di belakang semua section
   Partikel berparalaks terhadap scroll, menolak kursor, tersambung ke kursor,
   dan terdorong gelombang kejut saat halaman diklik / disentuh.
   ========================================================================= */
(function () {
  "use strict";
  var A = window.App,
    $ = A.$,
    clamp = A.clamp;
  var cv = $("#field");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = 0,
    H = 0,
    ps = [],
    ripples = [];
  var LINK = 125,
    MR = 150,
    ML = 190;

  function build() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = A.W;
    H = A.H;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = clamp(Math.round((W * H) / 17000), 36, 110);
    ps = [];
    for (var i = 0; i < n; i++) {
      ps.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.8 + Math.random() * 1.6,
        z: 0.2 + Math.random() * 0.8,
        ph: Math.random() * 6.28,
        sy: 0,
      });
    }
  }

  addEventListener(
    "pointerdown",
    function (e) {
      ripples.push({ x: e.clientX, y: e.clientY, t: 0 });
    },
    { passive: true },
  );

  function frame(dt, t) {
    var col = A.colors;
    if (!col.cool) return;
    var m = A.mouse,
      off = A.scroll.s,
      i,
      j,
      p,
      q,
      dx,
      dy,
      d;
    ctx.clearRect(0, 0, W, H);

    for (i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt;
      if (ripples[i].t > 1.3) ripples.splice(i, 1);
    }

    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      p.vx += Math.sin(t * 0.5 + p.ph) * 0.0035;
      p.vy += Math.cos(t * 0.4 + p.ph) * 0.0035;
      p.vx += 0;
      p.vy += -A.scroll.vel * 0.0016 * p.z;
      p.sy = (((p.y - off * p.z * 0.22) % H) + H) % H;

      if (m.seen) {
        dx = p.x - m.x;
        dy = p.sy - m.y;
        d = Math.hypot(dx, dy);
        if (d < MR && d > 0.1) {
          var f = (1 - d / MR) * 0.9;
          p.vx += (dx / d) * f * 0.35;
          p.vy += (dy / d) * f * 0.35;
        }
      }
      for (j = 0; j < ripples.length; j++) {
        var rp = ripples[j],
          rr = rp.t * 520;
        dx = p.x - rp.x;
        dy = p.sy - rp.y;
        d = Math.hypot(dx, dy);
        if (Math.abs(d - rr) < 55 && d > 0.1) {
          var g = (1 - rp.t / 1.3) * 1.4;
          p.vx += (dx / d) * g;
          p.vy += (dy / d) * g;
        }
      }
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = W + 20;
      else if (p.x > W + 20) p.x = -20;
    }

    ctx.lineWidth = 1;
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      for (j = i + 1; j < ps.length; j++) {
        q = ps[j];
        dx = p.x - q.x;
        if (dx > LINK || dx < -LINK) continue;
        dy = p.sy - q.sy;
        d = dx * dx + dy * dy;
        if (d < LINK * LINK) {
          ctx.strokeStyle = A.rgba(
            col.cool,
            (1 - Math.sqrt(d) / LINK) * 0.3 * Math.min(p.z, q.z) * 1.6,
          );
          ctx.beginPath();
          ctx.moveTo(p.x, p.sy);
          ctx.lineTo(q.x, q.sy);
          ctx.stroke();
        }
      }
      if (m.seen) {
        dx = p.x - m.x;
        dy = p.sy - m.y;
        d = Math.hypot(dx, dy);
        if (d < ML) {
          ctx.strokeStyle = A.rgba(col.accent, (1 - d / ML) * 0.55);
          ctx.beginPath();
          ctx.moveTo(p.x, p.sy);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }
    }
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      dx = p.x - m.x;
      dy = p.sy - m.y;
      var near = m.seen && dx * dx + dy * dy < ML * ML;
      ctx.fillStyle = near
        ? A.rgba(col.accent, 0.9)
        : A.rgba(col.cool, 0.35 + 0.4 * p.z);
      ctx.beginPath();
      ctx.arc(p.x, p.sy, p.r * (near ? 1.5 : 1), 0, 6.2832);
      ctx.fill();
    }
    for (i = 0; i < ripples.length; i++) {
      var r0 = ripples[i];
      ctx.strokeStyle = A.rgba(col.accent, (1 - r0.t / 1.3) * 0.35);
      ctx.beginPath();
      ctx.arc(r0.x, r0.y, r0.t * 520, 0, 6.2832);
      ctx.stroke();
    }
  }

  build();
  A.onResize(function () {
    build();
    if (A.RM) frame(0, 0);
  });
  A.onTheme(function () {
    if (A.RM) frame(0, 0);
  });
  if (A.RM)
    A.onReady(function () {
      frame(0, 0);
    });
  else A.tick(frame);
})();

/* =========================================================================
   06 · SENI GENERATIF — thumbnail proyek (5 algoritma) + matriks titik kartu ID
   Hanya digambar saat terlihat di layar.
   ========================================================================= */
(function () {
  "use strict";
  var A = window.App,
    $$ = A.$$,
    clamp = A.clamp;
  var TAU = 6.2832;
  function n2(x, y, t) {
    return (
      (Math.sin(x * 1.7 + t) +
        Math.sin(y * 1.3 - t * 0.8) +
        Math.sin((x + y) * 0.9 + t * 0.5)) /
      3
    );
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function fillBg(o, a) {
    o.c.fillStyle =
      "rgba(" +
      o.bg[0] +
      "," +
      o.bg[1] +
      "," +
      o.bg[2] +
      "," +
      (a == null ? 1 : a) +
      ")";
    o.c.fillRect(0, 0, o.W, o.H);
  }

  var TYPES = {
    /* Tera: medan aliran partikel dengan jejak memudar */
    flow: {
      bg: [7, 24, 28],
      init: function (o) {
        o.d.p = [];
        var n = Math.round(clamp((o.W * o.H) / 2600, 120, 340));
        for (var i = 0; i < n; i++)
          o.d.p.push({
            x: Math.random() * o.W,
            y: Math.random() * o.H,
            a: i % 4 === 0,
          });
        fillBg(o);
      },
      draw: function (o, t) {
        var c = o.c;
        fillBg(o, 0.1);
        c.lineWidth = 1.2;
        o.d.p.forEach(function (p) {
          var ang = n2(p.x * 0.006, p.y * 0.006, t * 0.35) * TAU,
            px = p.x,
            py = p.y;
          p.x += Math.cos(ang) * 1.7;
          p.y += Math.sin(ang) * 1.7;
          c.strokeStyle = p.a ? "rgba(255,179,71,.85)" : "rgba(79,214,196,.7)";
          c.beginPath();
          c.moveTo(px, py);
          c.lineTo(p.x, p.y);
          c.stroke();
          if (p.x < 0 || p.x > o.W || p.y < 0 || p.y > o.H) {
            p.x = Math.random() * o.W;
            p.y = Math.random() * o.H;
          }
        });
      },
    },
    /* Pasar Kita: kota isometrik yang bergelombang */
    city: {
      bg: [26, 15, 6],
      init: function () {},
      draw: function (o, t) {
        var c = o.c,
          G = 11,
          s = Math.min(o.W / (G * 1.5), o.H / (G * 0.9)) * 0.62,
          tw = s,
          th = s * 0.5;
        fillBg(o);
        var cx = o.W / 2,
          cy = o.H * 0.5 - G * th * 0.55;
        for (var k = 0; k < G * 2 - 1; k++) {
          for (var gx = 0; gx < G; gx++) {
            var gy = k - gx;
            if (gy < 0 || gy >= G) continue;
            var h =
              ((Math.sin(gx * 0.8 + t * 1.3) + Math.cos(gy * 0.7 - t * 1.1)) *
                0.5 +
                1) *
                s *
                1.15 +
              s * 0.12;
            var X = cx + (gx - gy) * tw,
              Y = cy + (gx + gy) * th,
              hot = (gx + gy) % 5 === 0;
            c.fillStyle = hot ? "#FF7A59" : "#FFB347";
            c.beginPath();
            c.moveTo(X, Y - h);
            c.lineTo(X + tw, Y - h + th);
            c.lineTo(X, Y - h + th * 2);
            c.lineTo(X - tw, Y - h + th);
            c.closePath();
            c.fill();
            c.fillStyle = hot ? "#B5391F" : "#B5701A";
            c.beginPath();
            c.moveTo(X - tw, Y - h + th);
            c.lineTo(X, Y - h + th * 2);
            c.lineTo(X, Y + th * 2);
            c.lineTo(X - tw, Y + th);
            c.closePath();
            c.fill();
            c.fillStyle = hot ? "#8C2A15" : "#7D4A10";
            c.beginPath();
            c.moveTo(X + tw, Y - h + th);
            c.lineTo(X, Y - h + th * 2);
            c.lineTo(X, Y + th * 2);
            c.lineTo(X + tw, Y + th);
            c.closePath();
            c.fill();
          }
        }
      },
    },
    /* Lumen Atlas: peta titik kepulauan + lengkung rute yang berdenyut */
    atlas: {
      bg: [6, 27, 46],
      init: function (o) {
        var d = o.d,
          cols = Math.round(clamp(o.W / 11, 28, 90)),
          rows = Math.round(((cols * o.H) / o.W) * 1.05);
        d.dots = [];
        d.sx = o.W / cols;
        d.sy = o.H / rows;
        for (var gy = 0; gy < rows; gy++)
          for (var gx = 0; gx < cols; gx++) {
            var u = gx / cols,
              v = gy / rows;
            var m =
              Math.sin(u * 11 + 1.2) * Math.cos(v * 9 - 0.4) +
              Math.sin(u * 5 + v * 7) * 0.6 +
              (v > 0.35 && v < 0.75 ? 0.35 : -0.15) -
              Math.abs(u - 0.5) * 0.5;
            if (m > 0.38)
              d.dots.push({ x: (gx + 0.5) * d.sx, y: (gy + 0.5) * d.sy });
          }
        d.arcs = [];
        for (var i = 0; i < 5 && d.dots.length > 10; i++)
          d.arcs.push({
            a: d.dots[Math.floor(Math.random() * d.dots.length)],
            b: d.dots[Math.floor(Math.random() * d.dots.length)],
          });
      },
      draw: function (o, t) {
        var c = o.c,
          d = o.d;
        fillBg(o);
        var px = o.W * (0.5 + 0.35 * Math.sin(t * 0.6)),
          py = o.H * (0.5 + 0.3 * Math.cos(t * 0.45));
        d.dots.forEach(function (p) {
          var dist = Math.hypot(p.x - px, p.y - py),
            w = Math.max(0, 1 - dist / (o.W * 0.35));
          c.fillStyle =
            w > 0.05
              ? "rgba(255,179,71," + (0.4 + w * 0.6) + ")"
              : "rgba(124,199,255,.55)";
          c.beginPath();
          c.arc(p.x, p.y, 1.3 + w * 2.6, 0, TAU);
          c.fill();
        });
        c.lineWidth = 1.6;
        c.setLineDash([6, 8]);
        c.lineDashOffset = -t * 30;
        d.arcs.forEach(function (r) {
          var mx = (r.a.x + r.b.x) / 2,
            my =
              Math.min(r.a.y, r.b.y) -
              Math.hypot(r.a.x - r.b.x, r.a.y - r.b.y) * 0.35;
          c.strokeStyle = "rgba(255,179,71,.85)";
          c.beginPath();
          c.moveTo(r.a.x, r.a.y);
          c.quadraticCurveTo(mx, my, r.b.x, r.b.y);
          c.stroke();
        });
        c.setLineDash([]);
      },
    },
    /* Sarana: sel sistem desain yang berubah bentuk */
    morph: {
      bg: [14, 18, 24],
      init: function () {},
      draw: function (o, t) {
        var c = o.c,
          cols = 9,
          rows = Math.max(4, Math.round((cols * o.H) / o.W)),
          s = o.W / cols,
          pal = ["#4FD6C4", "#FFB347", "#E7F1EF"];
        fillBg(o);
        for (var gy = 0; gy < rows; gy++)
          for (var gx = 0; gx < cols; gx++) {
            var w = Math.sin(t * 1.3 + (gx + gy) * 0.55) * 0.5 + 0.5,
              sc = 0.34 + 0.5 * w,
              sz = s * sc;
            c.fillStyle = pal[(gx + gy * 2) % 3];
            c.globalAlpha = 0.45 + 0.55 * w;
            rr(
              c,
              (gx + 0.5) * s - sz / 2,
              (gy + 0.5) * s - sz / 2 + (o.H - rows * s) / 2,
              sz,
              sz,
              (sz / 2) * w,
            );
            c.fill();
          }
        c.globalAlpha = 1;
      },
    },
    /* Gema: garis punggung bukit bergaya gelombang audio */
    ridge: {
      bg: [11, 21, 20],
      init: function () {},
      draw: function (o, t) {
        var c = o.c,
          L = 24,
          top = o.H * 0.2,
          gap = (o.H * 0.72) / L,
          seg = 90;
        fillBg(o);
        c.lineWidth = 1.5;
        for (var i = 0; i < L; i++) {
          var y0 = top + i * gap;
          c.beginPath();
          for (var k = 0; k <= seg; k++) {
            var u = k / seg,
              x = u * o.W,
              env = Math.exp(-Math.pow((u - 0.5) * 3.2, 2));
            var y =
              y0 -
              env *
                (o.H * 0.17) *
                (0.55 + 0.45 * n2(u * 9 + i * 0.35, i * 0.5, t * 1.6)) *
                (0.5 + 0.5 * Math.sin(t * 2 + i * 0.2 + u * 6));
            k ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          c.lineTo(o.W, o.H);
          c.lineTo(0, o.H);
          c.closePath();
          fillBg2(c, o);
          c.fill();
          c.strokeStyle = "rgba(255,179,71," + (0.35 + (0.65 * i) / L) + ")";
          c.beginPath();
          for (var k2 = 0; k2 <= seg; k2++) {
            var u2 = k2 / seg,
              x2 = u2 * o.W,
              env2 = Math.exp(-Math.pow((u2 - 0.5) * 3.2, 2));
            var y2 =
              y0 -
              env2 *
                (o.H * 0.17) *
                (0.55 + 0.45 * n2(u2 * 9 + i * 0.35, i * 0.5, t * 1.6)) *
                (0.5 + 0.5 * Math.sin(t * 2 + i * 0.2 + u2 * 6));
            k2 ? c.lineTo(x2, y2) : c.moveTo(x2, y2);
          }
          c.stroke();
        }
      },
    },
    /* Kartu ID: matriks titik yang mengikuti warna tema */
    dots: {
      theme: true,
      init: function () {},
      draw: function (o, t) {
        var c = o.c,
          col = A.colors;
        if (!col.cool) return;
        c.clearRect(0, 0, o.W, o.H);
        var n = 16,
          s = o.W / n;
        for (var gy = 0; gy < Math.round(o.H / s); gy++)
          for (var gx = 0; gx < n; gx++) {
            var w =
              Math.sin(t * 1.4 + Math.hypot(gx - n / 2, gy - n / 2) * 0.7) *
                0.5 +
              0.5;
            c.fillStyle =
              w > 0.86
                ? A.rgba(col.accent, 0.9)
                : A.rgba(col.cool, 0.12 + 0.4 * w);
            c.beginPath();
            c.arc((gx + 0.5) * s, (gy + 0.5) * s, s * (0.08 + 0.2 * w), 0, TAU);
            c.fill();
          }
      },
    },
  };
  function fillBg2(c, o) {
    c.fillStyle = "rgb(" + o.bg[0] + "," + o.bg[1] + "," + o.bg[2] + ")";
  }

  /* ---------- registrasi canvas ---------- */
  var arts = [];
  $$("canvas[data-art]").forEach(function (cv) {
    var type = TYPES[cv.getAttribute("data-art")];
    if (!type) return;
    var o = {
      cv: cv,
      c: cv.getContext("2d"),
      type: type,
      bg: type.bg || [0, 0, 0],
      d: {},
      vis: false,
      W: 0,
      H: 0,
    };
    arts.push(o);
  });
  function size(o) {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    o.W = o.cv.clientWidth || 300;
    o.H = o.cv.clientHeight || 200;
    o.cv.width = Math.round(o.W * dpr);
    o.cv.height = Math.round(o.H * dpr);
    o.c.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.type.init(o);
    if (A.RM || !o.vis) o.type.draw(o, 3, 0);
  }
  arts.forEach(size);
  A.onResize(function () {
    arts.forEach(size);
  });
  A.onTheme(function () {
    arts.forEach(function (o) {
      if (o.type.theme && (A.RM || !o.vis)) o.type.draw(o, 3, 0);
    });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          for (var i = 0; i < arts.length; i++)
            if (arts[i].cv === e.target) arts[i].vis = e.isIntersecting;
        });
      },
      { rootMargin: "80px" },
    );
    arts.forEach(function (o) {
      io.observe(o.cv);
    });
  } else
    arts.forEach(function (o) {
      o.vis = true;
    });

  if (!A.RM)
    A.tick(function (dt, t) {
      for (var i = 0; i < arts.length; i++)
        if (arts[i].vis) arts[i].type.draw(arts[i], t, dt);
    });
})();

/* =========================================================================
   07 · ANIMASI TERHUBUNG SCROLL
   progres, navigasi, parallax hero, kata menyala, marquee, reel horizontal,
   garis waktu, dan judul kontak berbobot variabel.
   ========================================================================= */
(function () {
  "use strict";
  var A = window.App,
    $ = A.$,
    $$ = A.$$,
    clamp = A.clamp,
    lerp = A.lerp;
  function inView(r, pad) {
    pad = pad || 0;
    return r.bottom > -pad && r.top < A.H + pad;
  }
  function damp(dt, k) {
    return 1 - Math.pow(k, dt);
  }

  /* ---------- progres + navigasi ---------- */
  var bar = $("#progress"),
    nav = $("#nav");
  var spy = $$("[data-spy]").map(function (a) {
    return {
      a: a,
      el: document.getElementById(a.getAttribute("data-spy")),
    };
  });
  var lastY = 0,
    navHidden = false,
    curSpy = null;
  A.tick(function () {
    var y = A.scroll.y;
    bar.style.transform = "scaleX(" + A.scroll.p.toFixed(4) + ")";
    nav.classList.toggle("is-scrolled", y > 30);
    var down = y > lastY + 2,
      up = y < lastY - 2;
    if (
      y > 500 &&
      down &&
      !navHidden &&
      !A.root.classList.contains("menu-open")
    ) {
      navHidden = true;
      nav.classList.add("is-hidden");
    } else if ((up || y < 300) && navHidden) {
      navHidden = false;
      nav.classList.remove("is-hidden");
    }
    if (down || up) lastY = y;
    var active = null;
    for (var i = 0; i < spy.length; i++) {
      if (spy[i].el && spy[i].el.getBoundingClientRect().top <= A.H * 0.45)
        active = spy[i];
    }
    if (active !== curSpy) {
      curSpy = active;
      spy.forEach(function (s) {
        s.a.classList.toggle("is-active", s === active);
      });
    }
  });

  /* ---------- hero: parallax berlapis saat scroll ---------- */
  var heroCopy = $("#heroCopy"),
    orbCv = $("#orb"),
    hero = $("#top");
  if (!A.RM && heroCopy && orbCv) {
    A.tick(function () {
      var s = A.scroll.s;
      if (s > A.H * 1.3) return;
      var f = clamp(s / (A.H * 0.9), 0, 1);
      heroCopy.style.transform =
        "translate3d(0," + (s * 0.16).toFixed(1) + "px,0)";
      heroCopy.style.opacity = (1 - f * 0.85).toFixed(3);
      orbCv.style.transform =
        "translate3d(0," +
        (s * 0.08).toFixed(1) +
        "px,0) scale(" +
        (1 + f * 0.12).toFixed(3) +
        ")";
    });
  }

  /* ---------- kata menyala mengikuti scroll ---------- */
  var about = $("#aboutText"),
    words = [];
  if (about) {
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            var s = document.createElement("span");
            s.className = "hw";
            s.textContent = tok;
            words.push(s);
            frag.appendChild(s);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) wrap(ch);
      });
    })(about);
    var lit = -1;
    A.tick(function () {
      if (A.RM) return;
      var r = about.getBoundingClientRect();
      if (!inView(r, 200)) return;
      var q = clamp((A.H * 0.82 - r.top) / (r.height + A.H * 0.44), 0, 1),
        n = Math.round(q * words.length);
      if (n === lit) return;
      for (var i = 0; i < words.length; i++)
        words[i].classList.toggle("on", i < n);
      lit = n;
    });
  }

  /* ---------- marquee dengan kecepatan & kemiringan dari scroll ---------- */
  var marqs = $$("[data-marq]").map(function (el) {
    return {
      el: el,
      track: $(".marq__track", el),
      item: $(".marq__item", el),
      dir: parseFloat(el.getAttribute("data-marq")) || -1,
      pos: 0,
      w: 1,
    };
  });
  function setupMarq() {
    marqs.forEach(function (m) {
      $$(".marq__item", m.track)
        .slice(1)
        .forEach(function (n) {
          n.remove();
        });
      m.w = m.item.getBoundingClientRect().width || 1;
      var copies = Math.ceil(m.el.clientWidth / m.w) + 1;
      for (var i = 0; i < copies; i++)
        m.track.appendChild(m.item.cloneNode(true));
    });
  }
  setupMarq();
  A.onResize(setupMarq);
  A.tick(function (dt) {
    var vel = A.scroll.vel;
    marqs.forEach(function (m) {
      var r = m.el.getBoundingClientRect();
      if (!inView(r)) return;
      if (!A.RM) m.pos += m.dir * (56 * dt + Math.abs(vel) * 0.45);
      m.pos = (((m.pos % m.w) + m.w) % m.w) - m.w;
      m.track.style.transform =
        "translate3d(" +
        m.pos.toFixed(2) +
        "px,0,0) skewX(" +
        (A.RM ? 0 : clamp(-vel * 0.35, -9, 9)).toFixed(2) +
        "deg)";
    });
  });

  /* ---------- reel proyek: pin + geser horizontal ---------- */
  var reel = $("#reel"),
    track = $("#track"),
    fill = $("#reelFill"),
    count = $("#reelCount");
  var cards = $$(".card", track || document),
    arts = cards.map(function (c) {
      return $("canvas", c);
    });
  var dist = 0,
    stack = false,
    rx = 0,
    lastIdx = 0;
  function measure() {
    if (!reel) return;
    stack = A.W <= 900;
    reel.classList.toggle("is-stack", stack);
    if (stack) {
      reel.style.height = "";
      track.style.transform = "";
      cards.forEach(function (c) {
        c.style.transform = "";
      });
      arts.forEach(function (a) {
        a.style.transform = "";
      });
      return;
    }
    var stick = $(".reel__stick", reel);
    dist = Math.max(0, track.scrollWidth - A.W);
    reel.style.height = dist + stick.offsetHeight + "px";
  }
  measure();
  A.onResize(measure);
  A.tick(function (dt) {
    if (!reel || stack) return;
    var r = reel.getBoundingClientRect();
    if (!inView(r, 200)) return;
    var p = dist ? clamp(-r.top / dist, 0, 1) : 0;
    rx = lerp(rx, -p * dist, damp(dt, 0.0006));
    track.style.transform = "translate3d(" + rx.toFixed(2) + "px,0,0)";
    fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
    var idx = Math.min(cards.length, Math.floor(p * cards.length * 0.999) + 1);
    if (idx !== lastIdx) {
      lastIdx = idx;
      count.textContent = idx + " / " + cards.length;
    }
    var skew = A.RM ? 0 : clamp(-A.scroll.vel * 0.09, -5, 5);
    for (var i = 0; i < cards.length; i++) {
      var cr = cards[i].getBoundingClientRect();
      if (cr.right < -100 || cr.left > A.W + 100) continue;
      var off = (cr.left + cr.width / 2 - A.W / 2) / A.W;
      cards[i].style.transform =
        "skewX(" +
        skew.toFixed(2) +
        "deg) scale(" +
        (1 - Math.min(Math.abs(off), 1) * 0.05).toFixed(3) +
        ")";
      if (arts[i])
        arts[i].style.transform =
          "translate3d(" + clamp(-off * 70, -45, 45).toFixed(1) + "px,0,0)";
    }
  });

  /* ---------- garis waktu yang digambar scroll ---------- */
  var tl = $("#tl"),
    tlFill = $("#tlFill"),
    tlItems = $$(".tl__item");
  if (tl)
    A.tick(function () {
      var r = tl.getBoundingClientRect();
      if (!inView(r, 100)) return;
      var px = clamp(A.H * 0.62 - r.top, 0, r.height);
      tlFill.style.transform = "scaleY(" + (px / r.height).toFixed(4) + ")";
      tlItems.forEach(function (it) {
        it.classList.toggle(
          "on",
          it.getBoundingClientRect().top - r.top + 8 <= px,
        );
      });
    });

  /* ---------- judul kontak: bobot huruf bereaksi pada kursor ---------- */
  var ct = $("#cTitle");
  if (ct) {
    var chars = $$(".c", ct);
    A.tick(function (dt, t) {
      var r = ct.getBoundingClientRect();
      if (!inView(r)) return;
      var m = A.mouse,
        rects = chars.map(function (c) {
          return c.getBoundingClientRect();
        });
      for (var i = 0; i < chars.length; i++) {
        var cr = rects[i],
          base = A.RM
            ? 340
            : 300 + 150 * (Math.sin(t * 1.2 + i * 0.5) * 0.5 + 0.5),
          boost = 0;
        if (m.seen && !A.RM) {
          var dx = cr.left + cr.width / 2 - m.x,
            dy = cr.top + cr.height / 2 - m.y;
          boost = 480 * Math.exp(-(dx * dx + dy * dy) / (2 * 140 * 140));
        }
        chars[i].style.setProperty(
          "--wg",
          Math.round(clamp(base + boost, 200, 800)),
        );
      }
    });
  }
})();

/* =========================================================================
   08 · UI — counter, menu, anchor halus, jam, salin email
   ========================================================================= */
(function () {
  "use strict";
  var A = window.App,
    $ = A.$,
    $$ = A.$$;
  var fmt = function (n, dec) {
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  };

  /* ---------- counter angka ---------- */
  var stats = $(".stats");
  if (stats && "IntersectionObserver" in window && !A.RM) {
    var nums = $$("[data-count]", stats),
      done = false;
    var io = new IntersectionObserver(
      function (es) {
        if (done || !es[0].isIntersecting || !A.isReady) return;
        done = true;
        io.disconnect();
        nums.forEach(function (el, k) {
          var to = parseFloat(el.getAttribute("data-count")),
            dec = parseInt(el.getAttribute("data-dec") || "0", 10),
            t0 = performance.now() + k * 120,
            dur = 1900;
          (function step(now) {
            var p = A.clamp((now - t0) / dur, 0, 1);
            el.textContent = fmt(to * A.ease.expo(p), dec);
            if (p < 1) requestAnimationFrame(step);
          })(performance.now());
        });
      },
      { threshold: 0.35 },
    );
    A.onReady(function () {
      io.observe(stats);
    });
  }

  /* ---------- toast ---------- */
  var toast = $("#toast"),
    tt;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(tt);
    tt = setTimeout(function () {
      toast.classList.remove("is-on");
    }, 2200);
  }

  /* ---------- menu ponsel ---------- */
  var burger = $("#burger"),
    menu = $("#menu");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    A.root.classList.toggle("menu-open", open);
    A.root.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () {
    setMenu(burger.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  addEventListener("resize", function () {
    if (innerWidth > 900) setMenu(false);
  });

  /* ---------- anchor: gulir halus ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      setMenu(false);
      var y =
        id === "top" ? 0 : el.getBoundingClientRect().top + window.pageYOffset;
      setTimeout(
        function () {
          window.scrollTo({ top: y, behavior: A.RM ? "auto" : "smooth" });
        },
        A.root.classList.contains("menu-open") ? 0 : 0,
      );
    });
  });
  $("#toTop").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: A.RM ? "auto" : "smooth" });
  });

  /* ---------- jam Jakarta ---------- */
  var clocks = $$("[data-clock]"),
    f;
  try {
    f = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (e) {
    f = null;
  }
  function tickClock() {
    if (!f) return;
    var s = f.format(new Date()).replace(/\./g, ":");
    clocks.forEach(function (c) {
      c.textContent = s;
    });
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- salin email ---------- */
  var copy = $("#copyMail"),
    addr = $("#mailAddr"),
    label = $(".btn__t", copy);
  function fallbackCopy() {
    try {
      var r = document.createRange();
      r.selectNodeContents(addr);
      var s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      return document.execCommand("copy");
    } catch (e) {
      return false;
    }
  }
  copy.addEventListener("click", function () {
    var text = addr.textContent.trim();
    var ok = function () {
      say("Email tersalin");
      if (!A.RM) A.scramble(label, "Tersalin", 500);
      setTimeout(function () {
        A.scramble(label, "Salin email", 500);
      }, 1800);
    };
    var fail = function () {
      say(fallbackCopy() ? "Email tersalin" : "Pilih alamat lalu salin manual");
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(ok, fail);
    else fail();
  });
})();
