/* =========================================================================
   js/catalog.js — CATALOGUE: Japanese dealer listings mirrored in English
   List (#/catalog) with make chips, search and sort; detail (#/catalog/<id>)
   with gallery, price block, key facts, condition, equipment and specs.
   Data: js/catalog-data.js (window.SAE_CATALOG). Photos load from the
   source site. window.SaeCatalog = { init, showDetail }.
   ========================================================================= */
(function () {
  "use strict";

  var CARS = window.SAE_CATALOG || [];
  var D = window.JCC;
  var FX = window.JccFX || {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function yen(n) { return "¥" + Number(n).toLocaleString("en-GB"); }
  function gbp(n) {
    var rate = (D && D.GBP_TO_JPY) || 209;
    return "≈ £" + Math.round(n / rate).toLocaleString("en-GB");
  }
  function km(n) { return n == null ? "—" : n.toLocaleString("en-GB") + " km"; }
  function ico(name) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }

  function findCar(id) {
    for (var i = 0; i < CARS.length; i++) if (CARS[i].id === id) return CARS[i];
    return null;
  }

  function afterRender(root) {
    if (FX.observe) FX.observe(root);
    if (FX.bindScramble) FX.bindScramble(root);
  }

  /* ---------- list ---------- */

  var state = { make: "all", q: "", sort: "price-desc" };

  function makes() {
    var m = {};
    CARS.forEach(function (c) { m[c.make] = (m[c.make] || 0) + 1; });
    return Object.keys(m).sort().map(function (k) { return { key: k, count: m[k] }; });
  }

  function renderChips() {
    var wrap = $("#catChips");
    if (!wrap) return;
    var all = [{ key: "all", count: CARS.length }].concat(makes());
    wrap.innerHTML = all.map(function (m) {
      return '<button type="button" class="chip" data-make="' + esc(m.key) + '" aria-pressed="' + (state.make === m.key) + '">' +
        esc(m.key === "all" ? "ALL" : m.key.toUpperCase()) + " (" + m.count + ")</button>";
    }).join("");
    $all(".chip", wrap).forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.make = chip.getAttribute("data-make");
        $all(".chip", wrap).forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
        renderList();
      });
    });
  }

  function visible() {
    var q = state.q.trim().toLowerCase();
    var list = CARS.filter(function (c) {
      if (state.make !== "all" && c.make !== state.make) return false;
      if (!q) return true;
      return (c.make + " " + c.model + " " + c.grade + " " + c.color + " " + c.id + " " + c.fuel + " " + c.year)
        .toLowerCase().indexOf(q) !== -1;
    });
    var s = state.sort;
    list.sort(function (a, b) {
      if (s === "price-asc") return a.priceTotal - b.priceTotal;
      if (s === "km-asc") return (a.km || 0) - (b.km || 0);
      if (s === "year-desc") return (b.year || 0) - (a.year || 0);
      return b.priceTotal - a.priceTotal;
    });
    return list;
  }

  function cardHTML(c, i) {
    var tag = c.highlights.indexOf("One owner") !== -1 ? "ONE OWNER" :
              c.highlights.indexOf("Registered, unused") !== -1 ? "UNUSED" : c.fuel.toUpperCase();
    return '<li class="ccard reveal" style="transition-delay:' + ((i % 3) * 70) + 'ms">' +
      '<a class="ccard__link" href="#/catalog/' + esc(c.id) + '">' +
        '<figure class="ccard__media"><img src="' + esc(c.images[0] || c.thumb) + '" alt="' + esc(c.make + " " + c.model + " " + c.grade) + '" loading="lazy" referrerpolicy="no-referrer">' +
          '<figcaption class="ccard__tag">' + esc(tag) + '</figcaption></figure>' +
        '<p class="ccard__k"><span>' + esc(c.make.toUpperCase()) + '</span><span>ID ' + esc(c.id) + '</span></p>' +
        '<h3 class="ccard__name">' + esc(c.model) + '</h3>' +
        '<p class="ccard__grade">' + esc(c.grade || "—") + '</p>' +
        '<p class="ccard__meta">' + esc(c.year) + ' · ' + esc(km(c.km)) + ' · ' + esc(c.drive) + ' · ' + esc(c.transmission) + '</p>' +
        '<p class="ccard__price"><span class="ccard__jpy">' + esc(yen(c.priceTotal)) + '</span><span class="ccard__gbp">' + esc(gbp(c.priceTotal)) + ' · TOTAL INCL. TAX</span></p>' +
      '</a></li>';
  }

  function renderList() {
    var grid = $("#catGrid");
    if (!grid) return;
    var list = visible();
    grid.innerHTML = list.map(cardHTML).join("");
    $("#catEmpty").hidden = list.length > 0;
    $("#catCount").textContent = String(list.length).padStart(2, "0") + " / " + String(CARS.length).padStart(2, "0") + " LISTINGS";
    afterRender(grid);
    if (FX.refreshRail) FX.refreshRail();
  }

  function initList() {
    if (!$("#catGrid")) return;
    renderChips();
    var search = $("#catSearch");
    var sort = $("#catSort");
    var t = null;
    search.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = search.value; renderList(); }, 120);
    });
    sort.addEventListener("change", function () { state.sort = sort.value; renderList(); });
    var prices = CARS.map(function (c) { return c.priceTotal; });
    var lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
    var range = $("#catRange");
    if (range) range.textContent = yen(lo) + " – " + yen(hi);
    renderList();
  }

  /* ---------- detail ---------- */

  function stars(v) {
    if (v == null) return '<span class="cdet__na">—</span>';
    var out = "";
    for (var i = 1; i <= 5; i++) out += '<i class="' + (i <= Math.round(v) ? "is-on" : "") + '"></i>';
    return '<span class="cdet__stars" aria-label="' + v + ' out of 5">' + out + '</span><b>' + v.toFixed(1) + '</b>';
  }

  function equipmentHTML(c) {
    var total = 0, on = 0;
    var blocks = Object.keys(c.equipment).map(function (cat) {
      var items = c.equipment[cat];
      on += items.length;
      if (!items.length) return "";
      return '<div class="cdet__eqcat"><p class="cdet__eqk">' + esc(cat.toUpperCase()) + '</p><ul class="pstep__details">' +
        items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
    return blocks || '<p class="cdet__na">No equipment flags published for this listing.</p>';
  }

  function showDetail(id) {
    var root = $("#catDetail");
    if (!root) return;
    var c = findCar(id);
    if (!c) {
      root.innerHTML = '<p class="calc-msg calc-msg--error">Listing ' + esc(id) + ' is not in this catalogue. <a href="#/catalog">Back to the catalogue →</a></p>';
      return;
    }
    var idx = CARS.indexOf(c);
    var prev = CARS[(idx - 1 + CARS.length) % CARS.length];
    var next = CARS[(idx + 1) % CARS.length];
    var imgs = c.images.length ? c.images : [c.thumb];

    root.innerHTML =
      '<p class="proc-back"><a href="#/catalog" data-scramble>← BACK TO THE CATALOGUE</a></p>' +
      '<header class="cdet__head">' +
        '<p class="page-eyebrow"><span><span class="duo" aria-hidden="true"></span>' + esc(c.make.toUpperCase()) + ' · ID ' + esc(c.id) + '</span><span>' + esc(c.storeBrand.toUpperCase()) + (c.storePref ? ' · ' + esc(c.storePref.toUpperCase()) : '') + '</span></p>' +
        '<h1 class="cdet__title">' + esc(c.model) + '</h1>' +
        '<p class="cdet__grade">' + esc(c.grade || "") + (c.grade ? ' · ' : '') + esc(c.year) + ' · ' + esc(c.color) + '</p>' +
        (c.highlights.length ? '<ul class="cdet__hl">' + c.highlights.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul>" : "") +
      '</header>' +

      '<div class="cdet__grid">' +
        '<section class="cdet__gallery" aria-label="Photos">' +
          '<figure class="cdet__main"><img id="catMainImg" src="' + esc(imgs[0]) + '" alt="' + esc(c.make + " " + c.model) + ' — photo 1" referrerpolicy="no-referrer">' +
            '<figcaption class="photo__cap"><span class="duo" aria-hidden="true"></span><span id="catImgCount">1 / ' + imgs.length + '</span></figcaption></figure>' +
          (imgs.length > 1 ? '<ul class="cdet__thumbs">' + imgs.map(function (u, i) {
            return '<li><button type="button" data-i="' + i + '" aria-pressed="' + (i === 0) + '"><img src="' + esc(u) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button></li>';
          }).join("") + "</ul>" : "") +
          '<p class="cdet__credit">Photos and listing data © the selling dealer, shown from <a href="' + esc(c.sourceUrl) + '" target="_blank" rel="noopener">221616.com</a> for demonstration.</p>' +
        '</section>' +

        '<aside class="cdet__side">' +
          '<div class="cdet__price">' +
            '<p class="calc-total__name">' + ico("tag") + '<span>Total price — <em>incl. tax &amp; fees</em></span></p>' +
            '<p class="cdet__jpy">' + esc(yen(c.priceTotal)) + '</p>' +
            '<p class="cdet__gbp">' + esc(gbp(c.priceTotal)) + ' at £1 = ¥' + ((D && D.GBP_TO_JPY) || 209) + '</p>' +
            '<dl class="cdet__pricerows">' +
              '<div><dt>Vehicle price</dt><dd>' + esc(yen(c.priceVehicle)) + '</dd></div>' +
              '<div><dt>Japanese registration &amp; fees</dt><dd>' + esc(yen(c.priceFees)) + '</dd></div>' +
            '</dl>' +
          '</div>' +
          '<dl class="cdet__facts">' +
            fact("car", "Year", c.year) + fact("size", "Mileage", km(c.km)) + fact("stamp", "Inspection valid to", c.inspection) +
            fact("list", "Seats", c.seats) + fact("truck", "Drive", c.drive) + fact("fee", "Transmission", c.transmission) +
            fact("ship", "Fuel", c.fuel) + fact("sum", "Engine", c.displacement) +
          '</dl>' +
          '<div class="cdet__actions">' +
            '<a class="btn btn--solid" href="#/calculator?jpy=' + c.priceVehicle + '&size=' + esc(c.sizeKey) + '">Estimate UK landed cost →</a>' +
            '<a class="btn" href="#/request?v=' + esc(c.id) + '">Request this vehicle</a>' +
          '</div>' +
        '</aside>' +
      '</div>' +

      '<section class="cdet__block" aria-labelledby="cdCond">' +
        '<h2 class="cdet__h" id="cdCond">' + ico("approve") + '<span>Condition — dealer assessment</span></h2>' +
        '<dl class="cdet__cond">' +
          '<div><dt>Accident / repair history</dt><dd>' + esc(c.repair) + '</dd></div>' +
          '<div><dt>Exterior</dt><dd>' + stars(c.extRating) + '</dd></div>' +
          '<div><dt>Interior</dt><dd>' + stars(c.intRating) + '</dd></div>' +
          '<div><dt>Service records</dt><dd>' + (c.records ? "Available" : "Not available") + '</dd></div>' +
          '<div><dt>Rental history</dt><dd>' + (c.rental ? "Yes" : "None") + '</dd></div>' +
        '</dl>' +
      '</section>' +

      '<section class="cdet__block" aria-labelledby="cdEq">' +
        '<h2 class="cdet__h" id="cdEq">' + ico("check") + '<span>Equipment</span></h2>' +
        equipmentHTML(c) +
      '</section>' +

      '<section class="cdet__block" aria-labelledby="cdSpec">' +
        '<h2 class="cdet__h" id="cdSpec">' + ico("doc") + '<span>Specification</span></h2>' +
        '<dl class="cdet__spec">' +
          spec("Model code", c.modelCode) + spec("Dimensions (L × W × H)", c.dims) + spec("Kerb weight", c.weight) +
          spec("Turning radius", c.turning) + spec("Steering", c.handle) + spec("Colour", c.color) +
          spec("Displayed at", c.storeBrand + (c.storePref ? " — " + c.storePref : "")) + spec("Listing ID", c.id) +
        '</dl>' +
      '</section>' +

      '<nav class="cdet__nav" aria-label="Other listings">' +
        '<a href="#/catalog/' + esc(prev.id) + '">← ' + esc(prev.make + " " + prev.model) + '</a>' +
        '<a href="#/catalog/' + esc(next.id) + '">' + esc(next.make + " " + next.model) + ' →</a>' +
      '</nav>';

    /* gallery */
    var main = $("#catMainImg", root);
    var count = $("#catImgCount", root);
    $all(".cdet__thumbs button", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-i");
        main.src = imgs[i];
        main.alt = c.make + " " + c.model + " — photo " + (i + 1);
        count.textContent = (i + 1) + " / " + imgs.length;
        $all(".cdet__thumbs button", root).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      });
    });
    main.addEventListener("error", function () { main.classList.add("is-missing"); });
    document.title = c.make + " " + c.model + " — Catalogue — Samurai Auto Export";
    afterRender(root);
  }

  function fact(icon, k, v) {
    return '<div>' + ico(icon) + '<dt>' + esc(k) + '</dt><dd>' + esc(v == null ? "—" : v) + '</dd></div>';
  }
  function spec(k, v) {
    return '<div><dt>' + esc(k) + '</dt><dd>' + esc(v == null || v === "" ? "—" : v) + '</dd></div>';
  }

  function init() { initList(); }

  window.SaeCatalog = { init: init, showDetail: showDetail, find: findCar };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
