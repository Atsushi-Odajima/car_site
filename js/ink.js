/* =========================================================================
   js/ink.js — Japan car cycle ink-wash background
   White ground. Ink blooms bleed in, spread and dissolve like liquid.
   Tone cycle: black ×3 → orange → black ×3 → lime → (repeat)
   Auto-initialises on load. window.JccInk = { pause(), resume() }.
   ========================================================================= */
(function () {
  "use strict";

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  var CYCLE = ["k", "k", "k", "o", "k", "k", "k", "l"];
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
  function makeSprite(rgb) {
    var S = 512;
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

    if (hasFilter) c.filter = "blur(26px)";
    c.fillStyle = col(0.20);
    blobPath(c, cx, cy, S * 0.30);
    c.fill();

    if (hasFilter) c.filter = "blur(14px)";
    c.fillStyle = col(0.30);
    blobPath(c, cx + rand(-14, 14), cy + rand(-14, 14), S * 0.22);
    c.fill();

    if (hasFilter) c.filter = "blur(6px)";
    c.fillStyle = col(0.50);
    blobPath(c, cx + rand(-10, 10), cy + rand(-10, 10), S * 0.13);
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
    return off;
  }

  function spawn() {
    var tone = CYCLE[cycleIdx % CYCLE.length];
    cycleIdx++;
    var vmin = Math.min(W, H);
    blooms.push({
      sprite: makeSprite(COLORS[tone]),
      x: rand(W * 0.08, W * 0.92),
      y: rand(H * 0.10, H * 0.90),
      size: vmin * rand(0.55, 1.0),
      rot: rand(0, Math.PI * 2),
      drift: rand(-1, 1),
      born: performance.now(),
      dur: rand(9000, 13000),
      peak: tone === "k" ? rand(0.26, 0.38) : rand(0.42, 0.58)
    });
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function schedule() {
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(function () {
      if (!paused) {
        if (blooms.length < 4) spawn();
        schedule();
      }
    }, rand(3200, 5200));
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
      "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;";
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else resume();
    });
    if (REDUCED) { paintStatic(); return; }
    spawn();
    schedule();
  }

  window.JccInk = { pause: pause, resume: resume };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
