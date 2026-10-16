/* =========================================================================
   js/app.js — Japan car cycle
   Hash routes (#/ · #/stock · #/company · #/request), header behaviour,
   GBP/JPY switch, vehicle cards, stock filtering and the online
   Vehicle Request Form (mirrors the printed hearing sheet, 13 questions).
   Depends on js/data.js (window.JCC) and js/fx.js (window.JccFX).
   ========================================================================= */
(function () {
  "use strict";

  var CONTACT_EMAIL = "info@japancarcycle.example"; /* TODO: real address */
  var STORE_CCY = "jcc.ccy";
  var STORE_DRAFT = "jcc.requestDraft";

  var D = window.JCC;
  var FX = window.JccFX || {};
  var ccy = readStore(STORE_CCY) === "JPY" ? "JPY" : "GBP";

  /* ---------- storage (guarded: private mode / blocked storage) ---------- */

  function readStore(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeStore(key, value) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function km(n) { return n.toLocaleString("en-GB") + " km"; }

  /* ---------- toast ---------- */

  var toastTimer = null;
  function toast(msg) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2600);
  }

  /* ---------- header ---------- */

  function initHeader() {
    var header = $("#siteHeader");
    var toggle = $("#menuToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = document.body.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    $all(".site-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        document.body.classList.remove("nav-open");
        if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
      }
    });
    var onScroll = function () {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    $all("[data-ccy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setCcy(btn.getAttribute("data-ccy"));
      });
    });
    syncCcyButtons();
  }

  function syncCcyButtons() {
    $all("[data-ccy]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-ccy") === ccy ? "true" : "false");
    });
  }

  function setCcy(next) {
    if (next === ccy) return;
    ccy = next;
    writeStore(STORE_CCY, ccy);
    syncCcyButtons();
    $all("[data-price-gbp]").forEach(function (el) {
      var txt = D.money(+el.getAttribute("data-price-gbp"), ccy);
      el.removeAttribute("data-odo-text");
      el.textContent = txt;
      if (FX.odometer) FX.odometer(el);
    });
    toast(ccy === "GBP" ? "PRICES IN GBP £" : "PRICES IN JPY ¥ — INDICATIVE RATE £1 = ¥" + D.GBP_TO_JPY);
  }

  /* ---------- vehicle card ---------- */

  function bodyLabel(key) {
    for (var i = 0; i < D.bodies.length; i++) if (D.bodies[i].key === key) return D.bodies[i].label;
    return key.toUpperCase();
  }

  function buildCard(v, index) {
    var art = document.createElement("article");
    art.className = "card reveal";
    art.style.transitionDelay = ((index % 3) * 90) + "ms";
    var name = v.make + " " + v.model;
    var price = D.money(v.gbp, ccy);
    art.innerHTML =
      '<p class="card__no"><span>NO.' + String(index + 1).padStart(2, "0") + '</span>' +
        '<span class="card__tag">' + esc(bodyLabel(v.body)) + '</span></p>' +
      '<div class="card__inner">' +
        (v.img
          ? '<div class="card__face card__front card__front--photo' + (v.fit === "cover" ? " card__front--cover" : "") + '"><img src="' + v.img + '" alt="' + esc(name + " " + v.grade) + '" loading="lazy">'
          : '<div class="card__face card__front">' + D.carSVG(v.body)) +
          '<span class="card__plate">' + esc(v.id) + ' / ' + v.year + '</span>' +
          '<button type="button" class="card__flipbtn" aria-label="Show specification">↻</button>' +
        '</div>' +
        '<div class="card__face card__back">' +
          '<dl>' +
            '<dt>STOCK</dt><dd>' + esc(v.id) + '</dd>' +
            '<dt>GRADE</dt><dd>' + esc(v.grade) + '</dd>' +
            '<dt>YEAR</dt><dd>' + v.year + '</dd>' +
            '<dt>MILEAGE</dt><dd>' + km(v.km) + '</dd>' +
            '<dt>ENGINE</dt><dd>' + esc(v.engine) + '</dd>' +
            '<dt>SEATS</dt><dd>' + v.seats + '</dd>' +
            '<dt>AUCTION</dt><dd>GRADE ' + esc(v.score) + '</dd>' +
          '</dl>' +
          '<div class="card__backfoot">' +
            '<span class="card__bcode" aria-hidden="true"></span>' +
            '<a class="card__enquire" href="#/request?v=' + encodeURIComponent(v.id) + '">ENQUIRE →</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card__cap">' +
        '<h3 class="card__name">' + esc(name) + '<span class="card__sub">' + esc(v.grade) + ' · ' + v.year + ' · ' + km(v.km) + '</span></h3>' +
        '<p class="card__price"><span data-odo data-price-gbp="' + v.gbp + '">' + price + '</span><small>CIF SOUTHAMPTON</small></p>' +
      '</div>';
    var flip = art.querySelector(".card__flipbtn");
    flip.addEventListener("click", function () { art.classList.add("is-flipped"); });
    art.querySelector(".card__back").addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      art.classList.remove("is-flipped");
    });
    return art;
  }

  function afterRender(root) {
    if (FX.observe) FX.observe(root);
    if (FX.odometerOnView) FX.odometerOnView(root);
    if (FX.bindScramble) FX.bindScramble(root);
  }

  /* ---------- HOME: featured ---------- */

  function renderFeatured() {
    var grid = $("#featuredGrid");
    if (!grid) return;
    var list = D.vehicles.filter(function (v) { return v.featured; }).slice(0, 3);
    list.forEach(function (v, i) { grid.appendChild(buildCard(v, i)); });
    afterRender(grid);
  }

  /* ---------- STOCK ---------- */

  var stockState = { body: "all", q: "", sort: "new" };

  function renderChips() {
    var wrap = $("#bodyChips");
    if (!wrap) return;
    var all = [{ key: "all", label: "ALL" }].concat(D.bodies);
    wrap.innerHTML = all.map(function (b) {
      var count = b.key === "all" ? D.vehicles.length
        : D.vehicles.filter(function (v) { return v.body === b.key; }).length;
      if (!count) return "";
      return '<button type="button" class="chip" data-body="' + b.key + '" aria-pressed="' +
        (stockState.body === b.key) + '">' + esc(b.label) + ' (' + count + ')</button>';
    }).join("");
    $all(".chip", wrap).forEach(function (chip) {
      chip.addEventListener("click", function () {
        stockState.body = chip.getAttribute("data-body");
        $all(".chip", wrap).forEach(function (c) {
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        renderStock();
      });
    });
  }

  function visibleStock() {
    var q = stockState.q.trim().toLowerCase();
    var list = D.vehicles.filter(function (v) {
      if (stockState.body !== "all" && v.body !== stockState.body) return false;
      if (!q) return true;
      return (v.make + " " + v.model + " " + v.grade + " " + v.id + " " + v.fuel + " " + v.year)
        .toLowerCase().indexOf(q) !== -1;
    });
    var s = stockState.sort;
    list.sort(function (a, b) {
      if (s === "price-asc") return a.gbp - b.gbp;
      if (s === "price-desc") return b.gbp - a.gbp;
      if (s === "km-asc") return a.km - b.km;
      if (s === "year-desc") return b.year - a.year;
      return a.id < b.id ? 1 : -1; /* newest stock number first */
    });
    return list;
  }

  function renderStock() {
    var grid = $("#stockGrid");
    if (!grid) return;
    var list = visibleStock();
    grid.innerHTML = "";
    list.forEach(function (v, i) { grid.appendChild(buildCard(v, i)); });
    $("#stockEmpty").hidden = list.length > 0;
    $("#stockCount").textContent = String(list.length).padStart(2, "0") + " / " +
      String(D.vehicles.length).padStart(2, "0") + " VEHICLES";
    afterRender(grid);
    if (FX.refreshRail) FX.refreshRail();
  }

  function initStock() {
    renderChips();
    var search = $("#stockSearch");
    var sort = $("#stockSort");
    var t = null;
    search.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { stockState.q = search.value; renderStock(); }, 120);
    });
    sort.addEventListener("change", function () { stockState.sort = sort.value; renderStock(); });
    renderStock();
  }

  /* ---------- REQUEST form ---------- */

  var RADIO_LABELS = {}; /* name -> {value: label}, filled from markup */

  function formData(form) {
    var data = {};
    $all("input, textarea, select", form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
      else if (el.type === "checkbox") { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    });
    return data;
  }

  function fillForm(form, data) {
    Object.keys(data || {}).forEach(function (name) {
      $all('[name="' + name + '"]', form).forEach(function (el) {
        if (el.type === "radio" || el.type === "checkbox") el.checked = el.value === data[name];
        else el.value = data[name];
      });
    });
  }

  function label(name, value) {
    return (RADIO_LABELS[name] && RADIO_LABELS[name][value]) || value || "—";
  }

  function summary(d) {
    var colour = d.colour === "other" ? "Other: " + (d.colour_other || "—") : label("colour", d.colour);
    var amount = Number(d.budget_amount);
    var budget = d.budget_amount
      ? (d.budget_ccy === "JPY" ? "¥" : "£") + (isNaN(amount) ? d.budget_amount : amount.toLocaleString("en-GB"))
      : "—";
    var rows = [
      ["VEHICLE PREFERENCES", null],
      ["01 Make and model", d.make_model || "—"],
      ["02 Model year", (d.year_from || "—") + " to " + (d.year_to || "—")],
      ["03 Budget", budget + " (" + (d.budget_ccy || "GBP") + ")"],
      ["04 Maximum mileage", d.max_km ? Number(d.max_km).toLocaleString("en-GB") + " km" : "—"],
      ["HISTORY AND EQUIPMENT", null],
      ["05 Exterior colour", colour],
      ["06 Accident / repair history", label("repair", d.repair)],
      ["07 Smoking history", label("smoking", d.smoking)],
      ["08 Sunroof", label("sunroof", d.sunroof)],
      ["09 Leather seats", label("leather", d.leather)],
      ["10 Number of seats", label("seats", d.seats)],
      ["ESSENTIAL CONDITIONS", null],
      ["11 Other must-have features", d.must_have || "—"],
      ["12 Unacceptable conditions", d.unacceptable || "—"],
      ["13 Top priority", label("priority", d.priority)],
      ["CONTACT", null],
      ["Name", d.name || "—"],
      ["Email", d.email || "—"],
      ["Phone", d.phone || "—"],
      ["Town / postcode", d.location || "—"],
      ["Preferred contact", label("contact_pref", d.contact_pref)]
    ];
    return rows.map(function (r) {
      return r[1] === null ? "\n— " + r[0] + " —" : r[0] + ": " + r[1];
    }).join("\n").replace(/^\n/, "");
  }

  function makeRef() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, "0"); };
    return "JCC-REQ-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) +
      "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function validate(form) {
    var ok = true;
    var first = null;
    ["make_model", "name", "email"].forEach(function (name) {
      var el = form.elements[name];
      var wrap = el.closest(".field, .q");
      var bad = !el.value.trim() || (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      if (wrap) wrap.classList.toggle("is-invalid", bad);
      if (bad) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  }

  function prefillFromStock(id) {
    var form = $("#requestForm");
    if (!form || !id) return;
    var v = null;
    D.vehicles.forEach(function (x) { if (x.id === id) v = x; });
    if (!v) return;
    fillForm(form, {
      make_model: v.make + " " + v.model + " " + v.grade + " (stock " + v.id + ")",
      year_from: String(v.year),
      year_to: String(v.year),
      budget_ccy: "GBP",
      budget_amount: String(v.gbp),
      max_km: String(Math.ceil(v.km / 10000) * 10000)
    });
    saveDraft();
    toast("FORM PRE-FILLED WITH " + v.id);
  }

  function saveDraft() {
    var form = $("#requestForm");
    if (form) writeStore(STORE_DRAFT, JSON.stringify(formData(form)));
  }

  function initRequest() {
    var form = $("#requestForm");
    if (!form) return;

    $all('input[type="radio"]', form).forEach(function (el) {
      var txt = el.parentNode.querySelector("span");
      RADIO_LABELS[el.name] = RADIO_LABELS[el.name] || {};
      RADIO_LABELS[el.name][el.value] = txt ? txt.textContent.trim() : el.value;
    });

    try {
      var draft = JSON.parse(readStore(STORE_DRAFT) || "null");
      if (draft) fillForm(form, draft);
    } catch (e) {}

    var otherInput = form.elements.colour_other;
    otherInput.addEventListener("focus", function () {
      var r = form.querySelector('input[name="colour"][value="other"]');
      if (r) r.checked = true;
    });

    form.addEventListener("input", function (e) {
      var wrap = e.target.closest(".is-invalid");
      if (wrap) wrap.classList.remove("is-invalid");
      saveDraft();
    });
    form.addEventListener("change", saveDraft);

    var done = $("#requestDone");
    var lastText = "";
    var lastRef = "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) { toast("PLEASE COMPLETE THE REQUIRED FIELDS"); return; }
      lastRef = makeRef();
      lastText = "Vehicle Request — " + lastRef + "\n\n" + summary(formData(form));
      $("#requestRef").textContent = lastRef;
      $("#requestAddr").textContent = CONTACT_EMAIL;
      $("#requestSummary").textContent = lastText;
      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ behavior: FX.REDUCED ? "auto" : "smooth", block: "start" });
    });

    $("#reqMail").addEventListener("click", function () {
      var href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Vehicle Request " + lastRef) +
        "&body=" + encodeURIComponent(lastText);
      window.location.href = href;
    });

    $("#reqCopy").addEventListener("click", function () {
      var ok = function () { toast("REQUEST COPIED TO CLIPBOARD"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastText).then(ok, function () { toast("COPY FAILED — SELECT THE TEXT ABOVE"); });
      } else {
        toast("COPY NOT AVAILABLE — SELECT THE TEXT ABOVE");
      }
    });

    $("#reqEdit").addEventListener("click", function () {
      done.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: FX.REDUCED ? "auto" : "smooth", block: "start" });
    });

    $("#reqReset").addEventListener("click", function () {
      form.reset();
      writeStore(STORE_DRAFT, null);
      $all(".is-invalid", form).forEach(function (el) { el.classList.remove("is-invalid"); });
      toast("FORM CLEARED");
    });
  }

  /* ---------- router ---------- */

  var PAGES = ["home", "stock", "calculator", "company", "request"];
  var current = null;

  function parseHash() {
    var h = (window.location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("?");
    var page = parts[0] || "home";
    var params = {};
    (parts[1] || "").split("&").forEach(function (kv) {
      if (!kv) return;
      var p = kv.split("=");
      params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
    });
    if (PAGES.indexOf(page) === -1) {
      /* in-page anchors such as #main fall through to the current page */
      return { page: current || "home", params: {}, anchor: h };
    }
    return { page: page, params: params };
  }

  function route() {
    var r = parseHash();
    if (r.anchor) return;
    var changed = r.page !== current;
    PAGES.forEach(function (p) {
      var el = document.querySelector('[data-page="' + p + '"]');
      if (!el) return;
      el.hidden = p !== r.page;
      if (p === r.page && changed) {
        el.classList.remove("is-entering");
        void el.offsetWidth;
        el.classList.add("is-entering");
      }
    });
    $all(".site-nav a, .footer-nav a").forEach(function (a) {
      var target = (a.getAttribute("href") || "").replace(/^#\/?/, "") || "home";
      if (target === r.page) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    current = r.page;
    var titles = {
      home: "Japan car cycle — Used vehicles from Japan to the UK",
      stock: "Stock — Japan car cycle",
      calculator: "Import cost calculator — Japan car cycle",
      company: "Company — Japan car cycle",
      request: "Vehicle Request — Japan car cycle"
    };
    document.title = titles[r.page];
    if (r.page === "request" && r.params.v) prefillFromStock(r.params.v);
    if (changed) window.scrollTo(0, 0);
    if (FX.observe) FX.observe(document);
    if (FX.odometerOnView) FX.odometerOnView(document);
    if (FX.refreshRail) FX.refreshRail();
  }

  /* ---------- hero car + route parallax ---------- */

  function initRoad() {
    var car = $("#heroCar");
    if (car) car.innerHTML = D.carSVG("minivan", true);
    var route = $(".route");
    var media = route && $(".route__media", route);
    if (!media || FX.REDUCED) return;
    var ticking = false;
    var update = function () {
      ticking = false;
      if (!route.offsetParent) return;
      var r = route.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      media.style.transform = "translateY(" + (p * -9).toFixed(2) + "%)";
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- boot ---------- */

  function init() {
    initHeader();
    initRoad();
    renderFeatured();
    initStock();
    initRequest();
    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
    window.addEventListener("hashchange", route);
    route();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
