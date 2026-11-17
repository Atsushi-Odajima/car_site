/* =========================================================================
   js/ink.js — Samurai Auto Export ink-wash background
   White ground. Ink blooms bleed in, spread and dissolve like liquid.
   Most blooms are "photo blooms": a grayscale road / port / highway scene
   seen only through the bloom's feathered shape, as if the ink
   carried the picture with it. Plain black, orange and lime washes sit in
   between so the colour cycle of the original ink survives.
   Tone cycle: p p k p p o p p l  (p = photo)
   Photo sources: window.JCC_INK_PHOTOS — array of URLs or {src, whole}.
   `whole` draws the entire picture instead of a random crop (unused now that
   the backgrounds are scenery only, kept for cut-out images).
   Auto-initialises on load. window.JccInk = { pause(), resume() }.
   ========================================================================= */
(function () {
  "use strict";

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var CYCLE = ["p", "p", "k", "p", "p", "o", "p", "p", "l"];
  var MAX_BLOOMS = 7;
  var COLORS = {
    k: [24, 24, 24],     /* sumi black */
    o: [240, 120, 50],   /* form orange */
    l: [170, 222, 40]    /* form lime, a touch deeper so it reads on white */
  };

  var canvas = null;
  var ctx = null;
  var DPR = 1;
  var W = 0;
  var H = 0;
  var blooms = [];
  var cycleIdx = 0;
  var rafId = null;
  var spawnTimer = null;
  var paused = false;
  var photos = [];
  var photoIdx = 0;

  function loadPhotos() {
    var list = window.JCC_INK_PHOTOS || [];
    for (var i = 0; i < list.length; i++) {
      (function (entry) {
        var src = typeof entry === "string" ? entry : entry.src;
        var whole = typeof entry === "string" ? false : !!entry.whole;
        var img = new Image();
        img.decoding = "async";
        img.onload = function () {
          photos.push({ img: img, whole: whole });
          /* the first picture joins straight away instead of waiting its turn */
          if (photos.length === 1 && !paused && !REDUCED && blooms.length < MAX_BLOOMS) spawn("p");
        };
        img.src = src;
      })(list[i]);
    }
  }

  function nextPhoto() {
    if (!photos.length) return null;
    return photos[photoIdx++ % photos.length];
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* Irregular closed blob path through smoothed random spokes. */
  function blobPath(c, cx, cy, r) {
    var n = 12 + Math.floor(Math.random() * 4);
    var pts = [];
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2;
      var rr = r * rand(0.68, 1.32);
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    c.beginPath();
    c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (var j = 0; j < n; j++) {
      var p = pts[j];
      var q = pts[(j + 1) % n];
      c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c.closePath();
  }

  /* One bloom pre-rendered to an offscreen sprite: faint wash + bleed +
     dense core + satellite droplets, all feathered. */
  function makeSprite(rgb, photo) {
    var S = photo ? 640 : 512;
    var off = document.createElement("canvas");
    off.width = S;
    off.height = S;
    var c = off.getContext("2d");
    var hasFilter = typeof c.filter === "string";
    var col = function (a) {
      return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
    };
    var cx = S / 2;
    var cy = S / 2;

    /* photo blooms get a denser, wider body so the picture reads through */
    var A = photo ? [0.45, 0.70, 0.95] : [0.20, 0.30, 0.50];
    var R = photo ? [0.36, 0.28, 0.18] : [0.30, 0.22, 0.13];

    if (hasFilter) c.filter = "blur(26px)";
    c.fillStyle = col(A[0]);
    blobPath(c, cx, cy, S * R[0]);
    c.fill();

    if (hasFilter) c.filter = "blur(14px)";
    c.fillStyle = col(A[1]);
    blobPath(c, cx + rand(-14, 14), cy + rand(-14, 14), S * R[1]);
    c.fill();

    if (hasFilter) c.filter = "blur(6px)";
    c.fillStyle = col(A[2]);
    blobPath(c, cx + rand(-10, 10), cy + rand(-10, 10), S * R[2]);
    c.fill();

    if (hasFilter) c.filter = "blur(8px)";
    var drops = 2 + Math.floor(Math.random() * 4);
    for (var i = 0; i < drops; i++) {
      var ang = rand(0, Math.PI * 2);
      var d = rand(S * 0.26, S * 0.40);
      c.fillStyle = col(rand(0.15, 0.30));
      blobPath(c, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, rand(S * 0.02, S * 0.05));
      c.fill();
    }
    if (hasFilter) c.filter = "none";

    /* photo bloom: keep the bloom's alpha, replace its colour with the
       picture — a random crop for scenery, the whole image for a car */
    if (photo) {
      var img = photo.img;
      c.globalCompositeOperation = "source-in";
      c.globalAlpha = 1;
      if (photo.whole) {
        var box = S * 0.74;
        var k = Math.min(box / img.width, box / img.height);
        var dw = img.width * k;
        var dh = img.height * k;
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, S, S);
        c.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
      } else {
        var side = Math.min(img.width, img.height) * rand(0.62, 0.9);
        var sx = rand(0, img.width - side);
        var sy = rand(0, img.height - side);
        c.drawImage(img, sx, sy, side, side, 0, 0, S, S);
      }
      /* lift the blacks so page text stays readable over the picture */
      c.globalCompositeOperation = "source-atop";
      c.fillStyle = "rgba(255,255,255,0.3)";
      c.fillRect(0, 0, S, S);
      c.globalCompositeOperation = "source-over";
    }
    return off;
  }

  function spawn(forceTone) {
    var tone = forceTone || CYCLE[cycleIdx % CYCLE.length];
    if (!forceTone) cycleIdx++;
    var photo = tone === "p" ? nextPhoto() : null;
    if (tone === "p" && !photo) tone = "k";
    var vmin = Math.min(W, H);
    /* photo blooms spread across the whole viewport, ink stays inside it */
    blooms.push({
      sprite: makeSprite(COLORS[tone] || COLORS.k, photo),
      x: photo ? rand(W * 0.02, W * 0.98) : rand(W * 0.08, W * 0.92),
      y: photo ? rand(H * 0.05, H * 0.95) : rand(H * 0.10, H * 0.90),
      size: vmin * (photo ? (photo.whole ? rand(0.9, 1.3) : rand(1.0, 1.6)) : rand(0.55, 1.0)),
      rot: photo ? rand(-0.06, 0.06) : rand(0, Math.PI * 2),
      drift: photo ? rand(-0.3, 0.3) : rand(-1, 1),
      born: performance.now(),
      dur: photo ? rand(12000, 17000) : rand(9000, 13000),
      peak: (photo ? rand(0.6, 0.78) : tone === "k" ? rand(0.22, 0.32) : rand(0.4, 0.55)) * (photo && vmin < 500 ? 0.8 : 1)
    });
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function schedule() {
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(function () {
      if (!paused) {
        if (blooms.length < MAX_BLOOMS) spawn();
        schedule();
      }
    }, rand(1500, 2600));
  }

  function frame(now) {
    rafId = null;
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "multiply";
    var alive = [];
    for (var i = 0; i < blooms.length; i++) {
      var b = blooms[i];
      var t = (now - b.born) / b.dur;
      if (t >= 1) continue;
      alive.push(b);
      /* bleed in fast, dissolve slowly */
      var env = t < 0.16
        ? easeOutCubic(t / 0.16)
        : 1 - Math.pow((t - 0.16) / 0.84, 1.6);
      var sc = 0.55 + 0.45 * easeOutCubic(clamp01(t / 0.72));
      var s = b.size * sc;
      ctx.save();
      ctx.globalAlpha = clamp01(env) * b.peak;
      ctx.translate(b.x, b.y - t * 30);
      ctx.rotate(b.rot + t * 0.06 * b.drift);
      ctx.drawImage(b.sprite, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    blooms = alive;
    ctx.globalCompositeOperation = "source-over";
    if (blooms.length && !paused) rafId = requestAnimationFrame(frame);
  }

  function resize() {
    if (!canvas) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (REDUCED) paintStatic();
  }

  /* Reduced motion: two motionless faint washes, no colour cycle. */
  function paintStatic() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.06;
    var vmin = Math.min(W, H);
    ctx.drawImage(makeSprite(COLORS.k), W * 0.12, H * 0.08, vmin * 0.8, vmin * 0.8);
    ctx.drawImage(makeSprite(COLORS.o), W * 0.55, H * 0.45, vmin * 0.9, vmin * 0.9);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function pause() {
    paused = true;
    clearTimeout(spawnTimer);
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function resume() {
    if (!paused || REDUCED) return;
    paused = false;
    schedule();
    if (blooms.length && !rafId) rafId = requestAnimationFrame(frame);
  }

  function init() {
    if (canvas || !document.body || document.body.classList.contains("no-ink")) return;
    canvas = document.createElement("canvas");
    canvas.id = "inkCanvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;transition:opacity .4s;";
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else resume();
    });
    if (REDUCED) { paintStatic(); return; }
    loadPhotos();
    /* first blooms are plain ink; pictures join as soon as they load */
    spawn("k");
    spawn("o");
    schedule();
  }

  /* the page tells the ink how visible it may be (1 behind the hero, 0 elsewhere) */
  var shown = 1;
  function setOpacity(v) {
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    if (!canvas) return;
    canvas.style.opacity = String(v);
    if (v === 0 && shown !== 0) pause();
    if (v > 0 && shown === 0) resume();
    shown = v;
  }

  window.JccInk = { pause: pause, resume: resume, setOpacity: setOpacity };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
